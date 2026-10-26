import { v } from "convex/values";
import { managementView } from "./publicManagementValidators";

export const rescheduleReceiptFields = {
  accessId: v.id("publicBookingAccesses"), operationId: v.string(), requestedRevision: v.string(),
  requestedDate: v.string(), requestedStart: v.number(), resultRevision: v.string(),
  version: v.number(), rescheduledAt: v.optional(v.number()),
  outcome: v.union(v.literal("rescheduled"), v.literal("unchanged")),
};
export const moveFailure = v.object({ ok: v.literal(false), code: v.union(v.literal("INVALID_ACCESS"), v.literal("INVALID_COMMAND"),
  v.literal("CONTEXT_CHANGED"), v.literal("NOT_RESCHEDULABLE"), v.literal("INVALID_DATE"), v.literal("SLOT_UNAVAILABLE"),
  v.literal("SLOT_TAKEN"), v.literal("RATE_LIMITED")), retryAfter: v.optional(v.number()) });
export const moveResult = v.union(moveFailure, v.object({ ok: v.literal(true),
  outcome: v.union(v.literal("rescheduled"), v.literal("unchanged"), v.literal("already_applied")), view: managementView }));
export const moveOptions = v.union(moveFailure, v.object({ ok: v.literal(true), date: v.string(), revision: v.string(),
  status: v.union(v.literal("available"), v.literal("unconfigured"), v.literal("week_closed"), v.literal("day_closed"),
    v.literal("past_date"), v.literal("empty"), v.literal("time_change")), omittedForTimeChange: v.boolean(),
  slots: v.array(v.object({ start: v.number(), end: v.number(), startTime: v.string(), endTime: v.string() })) }));
