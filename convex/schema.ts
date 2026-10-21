import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";

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
  weeklySchedules: defineTable({
    businessId: v.id("businesses"),
    days: v.array(weeklyScheduleDay),
  }).index("by_businessId", ["businessId"]),
  appointments: defineTable({
    businessId: v.id("businesses"),
    serviceId: v.id("services"),
    serviceName: v.string(),
    clientName: v.string(),
    date: v.string(),
    start: v.number(),
    end: v.number(),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
    cancelledAt: v.optional(v.number()),
    version: v.optional(v.number()),
    rescheduledAt: v.optional(v.number()),
    rescheduledFromVersion: v.optional(v.number()),
  }).index("by_businessId_and_date", ["businessId", "date"])
    .index("by_businessId_and_date_and_status", ["businessId", "date", "status"])
    .index("by_businessId_and_date_and_start", ["businessId", "date", "start"])
    .index("by_businessId_and_serviceId_and_date_and_start", ["businessId", "serviceId", "date", "start"]),
});
