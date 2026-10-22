import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Every preview and confirmation resolves the same two indexed reads. In a
// mutation, even the missing exception key participates in the OCC read set.
export async function scheduleForDate(ctx: QueryCtx, businessId: Id<"businesses">, date: string) {
  const schedule = await ctx.db.query("weeklySchedules").withIndex("by_businessId", (q) => q.eq("businessId", businessId)).unique();
  const special = await ctx.db.query("specialDates").withIndex("by_businessId_and_date", (q) => q.eq("businessId", businessId).eq("date", date)).unique();
  return { days: schedule?.days ?? null,
    specialDay: special?.active ? { isOpen: special.isOpen, start: special.start, end: special.end } : null };
}
