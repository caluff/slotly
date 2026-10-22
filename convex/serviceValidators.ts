import { v } from "convex/values";

// Public booking context contains only catalogue data, never ownership or
// command receipts. Legacy documents start at revision zero.
export const serviceContext = v.object({ name: v.string(), durationMinutes: v.number(), version: v.number() });
export const serviceUndo = v.object({ id: v.id("services"), version: v.number(), operationId: v.string() });
export const serviceOption = v.object({ id: v.id("services"), ...serviceContext.fields });
export const serviceDetail = v.object({
  _id: v.id("services"), _creationTime: v.number(), businessId: v.id("businesses"),
  ...serviceContext.fields, archived: v.boolean(), updatedAt: v.optional(v.number()),
});
