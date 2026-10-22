import { Temporal } from "@js-temporal/polyfill";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { requireMyBusiness } from "./lib/appointmentData";
import { isLocalDate } from "../lib/local-date";

// Read-only visual context. Booking/rescheduling keep scheduleForDate as their
// transactional authority. At most 42 dates, one exception per indexed key.
export const getMyCalendarSchedule = query({
  args: { from: v.string(), until: v.string() },
  returns: v.array(v.object({ date: v.string(), configured: v.boolean(), special: v.boolean(), isOpen: v.boolean(), start: v.union(v.string(), v.null()), end: v.union(v.string(), v.null()) })),
  handler: async (ctx, { from, until }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(from) || !isLocalDate(until) || from > until) throw new ConvexError({ code: "INVALID_RANGE" });
    const first = Temporal.PlainDate.from(from), last = Temporal.PlainDate.from(until);
    if (first.until(last).days > 41) throw new ConvexError({ code: "INVALID_RANGE" });
    const [week, specials] = await Promise.all([
      ctx.db.query("weeklySchedules").withIndex("by_businessId", q => q.eq("businessId", business._id)).unique(),
      ctx.db.query("specialDates").withIndex("by_businessId_and_date", q => q.eq("businessId", business._id).gte("date", from).lte("date", until)).take(42),
    ]);
    const byDate = new Map(specials.filter(row => row.active).map(row => [row.date, row]));
    const days = [];
    for (let date = first; Temporal.PlainDate.compare(date, last) <= 0; date = date.add({ days: 1 })) {
      const special = byDate.get(date.toString());
      const day = special ?? week?.days.find(row => row.dayOfWeek === date.dayOfWeek);
      days.push({ date: date.toString(), configured: !!(special || week), special: !!special, isOpen: day?.isOpen ?? false, start: day?.start ?? null, end: day?.end ?? null });
    }
    return days;
  },
});
