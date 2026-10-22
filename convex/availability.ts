import { ConvexError, v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";
import { specialDay } from "./specialDateValidators";
import { scheduleForDate } from "./lib/scheduleForDate";
import { generateAvailability } from "./lib/availability";
import { isLocalDate } from "../lib/local-date";
import { confirmedAppointmentsForDate, overlaps, requireMyAppointment, requireMyBusiness } from "./lib/appointmentData";
import { activeBlocksForDate } from "./lib/timeBlocks";

const selectedService = v.object({ id: v.id("services"), name: v.string(), durationMinutes: v.number() });
const availabilityResult = v.object({
  status: v.union(v.literal("available"), v.literal("unconfigured"), v.literal("week_closed"),
    v.literal("day_closed"), v.literal("past_date"), v.literal("empty"), v.literal("time_change")),
  slots: v.array(v.object({ start: v.number(), end: v.number(), startTime: v.string(), endTime: v.string() })),
  omittedForTimeChange: v.boolean(),
  generatedAt: v.number(), date: v.string(), timeZone: v.string(), service: selectedService,
});

// One consistent, indexed snapshot. It is internal because the action alone
// exposes derived options, never private schedules or another account's IDs.
export const getSource = internalQuery({
  args: { serviceId: v.id("services"), date: v.string() },
  returns: v.object({ timeZone: v.string(), service: selectedService, days: v.union(v.array(weeklyScheduleDay), v.null()), specialDay: v.union(specialDay, v.null()),
    occupied: v.array(v.object({ start: v.number(), end: v.number() })) }),
  handler: async (ctx, { serviceId, date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const service = await ctx.db.get("services", serviceId);
    if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    const schedule = await scheduleForDate(ctx, business._id, date);
    return {
      timeZone: business.timeZone,
      service: { id: service._id, name: service.name, durationMinutes: service.durationMinutes },
      ...schedule,
      occupied: [...await confirmedAppointmentsForDate(ctx, business._id, date), ...await activeBlocksForDate(ctx, business._id, date)].map(({ start, end }) => ({ start, end })),
    };
  },
});

// An uncached read action supplies authoritative current time. A query using
// Date.now would not rerun when time passes; accepting client "now" is unsafe.
export const getMyAvailability = action({
  args: { serviceId: v.id("services"), date: v.string() },
  returns: availabilityResult,
  handler: async (ctx, { serviceId, date }): Promise<Infer<typeof availabilityResult>> => {
    if (!await ctx.auth.getUserIdentity()) throw new ConvexError({ code: "UNAUTHENTICATED" });
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const source = await ctx.runQuery(internal.availability.getSource, { serviceId, date });
    const generatedAt = Date.now();
    const result = generateAvailability({ date, ...source, durationMinutes: source.service.durationMinutes, now: generatedAt });
    const slots = result.slots.filter((slot) => !source.occupied.some((saved) => overlaps(slot, saved)));
    return {
      ...result, slots, status: result.status === "available" && slots.length === 0 ? "empty" : result.status,
      generatedAt, date, timeZone: source.timeZone, service: source.service,
    };
  },
});

export const getRescheduleSource = internalQuery({
  args: { appointmentId: v.id("appointments"), date: v.string() },
  returns: v.object({ timeZone: v.string(), service: selectedService, originalStart: v.number(), version: v.number(),
    days: v.union(v.array(weeklyScheduleDay), v.null()), specialDay: v.union(specialDay, v.null()), occupied: v.array(v.object({ start: v.number(), end: v.number() })) }),
  handler: async (ctx, { appointmentId, date }) => {
    const { business, saved } = await requireMyAppointment(ctx, appointmentId);
    if (saved.status !== "confirmed") throw new ConvexError({ code: "APPOINTMENT_CANCELLED" });
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const service = await ctx.db.get("services", saved.serviceId);
    if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    const schedule = await scheduleForDate(ctx, business._id, date);
    const occupied = (await confirmedAppointmentsForDate(ctx, business._id, date))
      .filter((row) => row._id !== saved._id).map(({ start, end }) => ({ start, end }));
    occupied.push(...(await activeBlocksForDate(ctx, business._id, date)).map(({ start, end }) => ({ start, end })));
    return { timeZone: business.timeZone, service: { id: service._id, name: service.name, durationMinutes: service.durationMinutes },
      originalStart: saved.start, version: saved.version ?? 0, ...schedule, occupied };
  },
});

const rescheduleAvailability = v.object({ ...availabilityResult.fields, version: v.number() });
export const getMyRescheduleAvailability = action({
  args: { appointmentId: v.id("appointments"), date: v.string() }, returns: rescheduleAvailability,
  handler: async (ctx, args): Promise<Infer<typeof rescheduleAvailability>> => {
    if (!await ctx.auth.getUserIdentity()) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const source = await ctx.runQuery(internal.availability.getRescheduleSource, args);
    const generatedAt = Date.now();
    if (source.originalStart <= generatedAt) throw new ConvexError({ code: "APPOINTMENT_STARTED" });
    const result = generateAvailability({ date: args.date, ...source, durationMinutes: source.service.durationMinutes, now: generatedAt });
    const slots = result.slots.filter((slot) => slot.start > generatedAt && !source.occupied.some((row) => overlaps(slot, row)));
    return { ...result, slots, status: result.status === "available" && !slots.length ? "empty" : result.status,
      generatedAt, date: args.date, timeZone: source.timeZone, service: source.service, version: source.version };
  },
});
