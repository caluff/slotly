import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { invalidateNotice } from "./appointmentAttention";

// Both callers have already checked authority, revision, confirmed state and
// future start. Keep the original owner's transition and attention invalidation.
export async function commitCancellation(ctx: MutationCtx, saved: Doc<"appointments">, cancelledAt: number, version: number) {
  await invalidateNotice(ctx, saved);
  await ctx.db.patch("appointments", saved._id, { status: "cancelled", cancelledAt, version, resultUndo: undefined });
}
