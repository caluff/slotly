import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";

const schedule = v.object({
  _id: v.id("weeklySchedules"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  days: v.array(weeklyScheduleDay),
});
const localTime = /^([01]\d|2[0-3]):[0-5]\d$/;

async function requireMyBusiness(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
  const business = await ctx.db.query("businesses")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject)).unique();
  if (!business) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
  return business;
}

export const getMyWeeklySchedule = query({
  args: {},
  returns: v.union(schedule, v.null()),
  handler: async (ctx) => {
    const business = await requireMyBusiness(ctx);
    return await ctx.db.query("weeklySchedules")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id)).unique();
  },
});

export const saveMyWeeklySchedule = mutation({
  args: { days: v.array(weeklyScheduleDay) },
  returns: v.id("weeklySchedules"),
  handler: async (ctx, { days }) => {
    const business = await requireMyBusiness(ctx);
    if (days.length !== 7 || new Set(days.map((day) => day.dayOfWeek)).size !== 7 ||
      days.some((day) => !Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 1 || day.dayOfWeek > 7)) {
      throw new ConvexError({ code: "INVALID_WEEK" });
    }

    // Validate the whole week before writing. Hours are local wall-clock HH:mm
    // in business.timeZone, never dates or UTC instants. ISO days: Mon=1, Sun=7.
    const normalized = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((day) => {
      if (!day.isOpen) return { ...day, start: null, end: null };
      for (const field of ["start", "end"] as const) {
        if (day[field] === null || !localTime.test(day[field])) {
          throw new ConvexError({ code: "INVALID_TIME", dayOfWeek: day.dayOfWeek, field });
        }
      }
      // Fixed-width 24h strings have the same order as minutes within a day.
      if (day.end! <= day.start!) {
        throw new ConvexError({ code: "INVALID_INTERVAL", dayOfWeek: day.dayOfWeek, field: "end" });
      }
      return day;
    });

    // Indexed read + insert/patch in one transaction. OCC retries competing
    // first saves; both must observe/update the same business configuration.
    const existing = await ctx.db.query("weeklySchedules")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id)).unique();
    if (existing) {
      await ctx.db.patch("weeklySchedules", existing._id, { days: normalized });
      return existing._id;
    }
    return await ctx.db.insert("weeklySchedules", { businessId: business._id, days: normalized });
  },
});
