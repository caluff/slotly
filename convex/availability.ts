import { ConvexError, v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";
import { generateAvailability } from "./lib/availability";
import { isLocalDate } from "../lib/local-date";

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
  args: { serviceId: v.id("services") },
  returns: v.object({ timeZone: v.string(), service: selectedService, days: v.union(v.array(weeklyScheduleDay), v.null()) }),
  handler: async (ctx, { serviceId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const business = await ctx.db.query("businesses")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject)).unique();
    if (!business) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
    const service = await ctx.db.get("services", serviceId);
    if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    const schedule = await ctx.db.query("weeklySchedules")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id)).unique();
    return {
      timeZone: business.timeZone,
      service: { id: service._id, name: service.name, durationMinutes: service.durationMinutes },
      days: schedule?.days ?? null,
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
    const source = await ctx.runQuery(internal.availability.getSource, { serviceId });
    const generatedAt = Date.now();
    return {
      ...generateAvailability({ date, ...source, durationMinutes: source.service.durationMinutes, now: generatedAt }),
      generatedAt, date, timeZone: source.timeZone, service: source.service,
    };
  },
});
