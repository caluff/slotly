import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Minute endpoints, one civil day, no active overlaps: at most 1440 blocks.
// Tombstones never consume the capacity bound. Fail closed on corrupt data.
export async function activeBlocksForDate(ctx: QueryCtx, businessId: Id<"businesses">, date: string) {
  const rows = await ctx.db.query("timeBlocks")
    .withIndex("by_businessId_and_active_and_date", q => q.eq("businessId", businessId).eq("active", true).eq("date", date)).take(1441);
  if (rows.length > 1440) throw new ConvexError({ code: "DAY_CAPACITY_EXCEEDED" });
  return rows;
}
