import { v } from "convex/values";

export const managementDetails = v.object({ businessName: v.string(), serviceName: v.string(), date: v.string(),
  start: v.number(), end: v.number(), timeZone: v.string(),
  state: v.union(v.literal("confirmed"), v.literal("cancelled"), v.literal("completed"), v.literal("no_show")), revision: v.string() });
export const managementView = v.object({ ...managementDetails.fields, canCancel: v.boolean() });
export const publicAccessFields = {
  businessId: v.id("businesses"), appointmentId: v.id("appointments"), secretHash: v.string(), createdAt: v.number(), expiresAt: v.number(), revokedAt: v.optional(v.number()),
  cancellation: v.optional(v.object({ operationId: v.string(), requestedRevision: v.string(), cancelledRevision: v.string(), version: v.number(), cancelledAt: v.number() })),
};
