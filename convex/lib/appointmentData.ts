import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function requireMyBusiness(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
  const business = await ctx.db.query("businesses")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject)).unique();
  if (!business) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
  return business;
}

// Confirmed appointments stay within one local date and have integer-minute starts
// and positive integer-minute durations. Even after changing the opening/grid,
// at most 1440 non-overlapping starts can fit. Read one extra and fail closed:
// a limit must NEVER silently hide a conflict. Cancelled history is unbounded
// and must never consume this limit: it is read via paginated history indexes.
export async function confirmedAppointmentsForDate(ctx: QueryCtx, businessId: Id<"businesses">, date: string) {
  const appointments = await ctx.db.query("appointments")
    .withIndex("by_businessId_and_date_and_status", (q) => q.eq("businessId", businessId).eq("date", date).eq("status", "confirmed"))
    .take(1441);
  if (appointments.length > 1440) throw new ConvexError({ code: "DAY_CAPACITY_EXCEEDED" });
  return appointments.sort((a, b) => a.start - b.start);
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}
