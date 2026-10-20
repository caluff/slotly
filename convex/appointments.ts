import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { appointmentsForDate, overlaps, requireMyBusiness } from "./lib/appointmentData";
import { generateAvailability } from "./lib/availability";
import { appointmentSchema } from "../lib/appointment-schema";
import { isLocalDate } from "../lib/local-date";

const appointment = v.object({
  _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
  clientName: v.string(), start: v.number(), end: v.number(), status: v.literal("confirmed"),
});

export const listMyAppointments = query({
  args: { date: v.string() },
  returns: v.array(appointment),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const rows = await appointmentsForDate(ctx, business._id, date);
    return rows.map(({ _id, serviceId, serviceName, clientName, start, end, status }) =>
      ({ _id, serviceId, serviceName, clientName, start, end, status }));
  },
});

export const createMyAppointment = mutation({
  args: { serviceId: v.id("services"), date: v.string(), start: v.number(), clientName: v.string() },
  returns: v.id("appointments"),
  handler: async (ctx, { serviceId, date, start, clientName }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const parsed = appointmentSchema.safeParse({ clientName, start: String(start) });
    if (!parsed.success) throw new ConvexError({ code: "INVALID_CLIENT_NAME" });
    if (!Number.isSafeInteger(start) || start <= Date.now()) throw new ConvexError({ code: "SLOT_UNAVAILABLE" });
    const service = await ctx.db.get("services", serviceId);
    if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    const schedule = await ctx.db.query("weeklySchedules")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id)).unique();
    // Reuse ALL temporal rules from the preview, including current weekly
    // hours, 15-minute grid from opening, real duration, zone and DST policy.
    const slot = generateAvailability({ date, timeZone: business.timeZone, days: schedule?.days ?? null,
      durationMinutes: service.durationMinutes, now: Date.now() }).slots.find((option) => option.start === start);
    if (!slot) throw new ConvexError({ code: "SLOT_UNAVAILABLE" });
    // Read the COMPLETE business/day range (not service-scoped), including an
    // empty range, in THIS mutation. An insertion into that range invalidates
    // concurrent read sets; Convex OCC retries and rechecks before committing.
    const existing = await appointmentsForDate(ctx, business._id, date);
    if (existing.some((saved) => overlaps(slot, saved))) throw new ConvexError({ code: "SLOT_TAKEN" });
    return await ctx.db.insert("appointments", {
      businessId: business._id, serviceId, serviceName: service.name,
      clientName: parsed.data.clientName, date, start: slot.start, end: slot.end, status: "confirmed",
    });
  },
});
