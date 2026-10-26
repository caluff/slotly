import { v } from "convex/values";
// Private publication snapshot. No command receipts or owner identifiers.
export const noticeAppointmentSnapshot = v.object({
  _id: v.id("appointments"),
  serviceId: v.id("services"),
  serviceName: v.string(),
  clientName: v.string(),
  date: v.string(),
  start: v.number(),
  end: v.number(),
  status: v.union(
    v.literal("confirmed"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("no_show"),
  ),
  version: v.number(),
  cancelledAt: v.optional(v.number()),
  resultAt: v.optional(v.number()),
  rescheduledAt: v.optional(v.number()),
});
