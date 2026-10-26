import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { invalidateNotice, scheduleAttention } from "./appointmentAttention";

// Callers keep their own authority/replay/no-op guards. This is the original
// owner's effective transition, shared without changing its attention context.
export async function commitRescheduling(ctx: MutationCtx, saved: Doc<"appointments">, date: string,
  slot: { start: number; end: number }, now: number, version: number) {
  await invalidateNotice(ctx, saved);
  await ctx.db.patch("appointments", saved._id, { date, start: slot.start, end: slot.end,
    version: version + 1, rescheduledAt: now, rescheduledFromVersion: version, resultUndo: undefined,
    ...(saved.autoNoShowSuppressed ? { autoNoShowSuppressed: undefined } : {}) });
  await scheduleAttention(ctx, (await ctx.db.get("appointments", saved._id))!);
}
