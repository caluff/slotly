import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  businesses: defineTable({
    ownerId: v.string(),
    name: v.string(),
    timeZone: v.string(),
  }).index("by_ownerId", ["ownerId"]),
  services: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    durationMinutes: v.number(),
  }).index("by_businessId", ["businessId"]),
});
