import { Temporal } from "@js-temporal/polyfill";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { generateAvailability } from "./availability";
import { overlaps } from "./appointmentData";

export function bookingMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith("0000")) throw new ConvexError({ code: "INVALID_MONTH" });
  const first = Temporal.PlainDate.from(`${month}-01`);
  return { first, from: first.toString(), until: first.with({ day: first.daysInMonth }).toString() };
}

// One bounded snapshot for the week's rules, exceptions and service. Dates are
// candidates only; occupancy and server time determine the final public flags.
export async function openBookingDates(ctx: QueryCtx, businessId: Id<"businesses">, serviceId: Id<"services">, month: string) {
  const { first, from, until } = bookingMonth(month);
  const service = await ctx.db.get("services", serviceId);
  if (!service || service.businessId !== businessId || service.archived === true) return null;
  const [week, specials] = await Promise.all([
    ctx.db.query("weeklySchedules").withIndex("by_businessId", q => q.eq("businessId", businessId)).unique(),
    ctx.db.query("specialDates").withIndex("by_businessId_and_date", q => q.eq("businessId", businessId).gte("date", from).lte("date", until)).take(32),
  ]);
  const exceptions = new Map(specials.filter(row => row.active).map(row => [row.date, row]));
  return Array.from({ length: first.daysInMonth }, (_, index) => first.add({ days: index }))
    .filter(day => (exceptions.get(day.toString()) ?? week?.days.find(item => item.dayOfWeek === day.dayOfWeek))?.isOpen)
    .map(day => day.toString());
}

type Source = { timeZone: string; service: { durationMinutes: number }; days: { dayOfWeek: number; isOpen: boolean; start: string | null; end: string | null }[] | null; specialDay: { isOpen: boolean; start: string | null; end: string | null } | null; occupied: { start: number; end: number }[] };
export async function availableBookingDates(dates: string[], load: (date: string) => Promise<Source | null>, now: number) {
  const available: string[] = [];
  // A valid dense month can exceed a single query's document budget. Each day
  // gets its existing consistent indexed snapshot, four at a time, max31days.
  // This is an advisory calendar, never a month-wide transactional reservation.
  for (let index = 0; index < dates.length; index += 4) {
    const flags = await Promise.all(dates.slice(index, index + 4).map(async date => {
      const source = await load(date);
      if (!source) return null;
      const result = generateAvailability({ ...source, date, now, durationMinutes: source.service.durationMinutes });
      return result.slots.some(slot => slot.start > now && !source.occupied.some(row => overlaps(slot, row))) ? date : "";
    }));
    if (flags.includes(null)) return null;
    available.push(...flags.filter((day): day is string => !!day));
  }
  return available;
}
