import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";
import { specialDateFields } from "./specialDateValidators";
import { timeBlockFields } from "./timeBlockValidators";

export default defineSchema({
  timeBlocks: defineTable(timeBlockFields)
    .index("by_businessId_and_active_and_date", ["businessId", "active", "date"])
    .index("by_businessId_and_creationKey", ["businessId", "creationKey"]),
  specialDates: defineTable(specialDateFields)
    .index("by_businessId_and_date", ["businessId", "date"])
    .index("by_businessId_and_active_and_date", ["businessId", "active", "date"]),
  businesses: defineTable({
    ownerId: v.string(),
    name: v.string(),
    timeZone: v.string(),
    publicBookingSlug: v.optional(v.string()),
    publicBookingEnabled: v.optional(v.boolean()),
  }).index("by_ownerId", ["ownerId"])
    .index("by_publicBookingSlug", ["publicBookingSlug"]),
  publicBookingReceipts: defineTable({
    businessId: v.id("businesses"),
    attemptKey: v.string(),
    appointmentId: v.id("appointments"),
    serviceId: v.id("services"),
    clientName: v.string(),
    date: v.string(),
    start: v.number(),
    end: v.number(),
    serviceName: v.string(),
    timeZone: v.string(),
  }).index("by_businessId_and_attemptKey", ["businessId", "attemptKey"]),
  services: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    durationMinutes: v.number(),
    archived: v.optional(v.boolean()),
    version: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    creationKey: v.optional(v.string()),
    creationValue: v.optional(v.string()),
    lastOperationId: v.optional(v.string()),
    lastExpectedVersion: v.optional(v.number()),
    lastValue: v.optional(v.string()),
    undoSnapshot: v.optional(v.object({
      operationId: v.string(), version: v.number(), kind: v.union(v.literal("create"), v.literal("edit")),
      name: v.string(), durationMinutes: v.number(), archived: v.boolean(),
    })),
  }).index("by_businessId", ["businessId"])
    .index("by_businessId_and_archived", ["businessId", "archived"])
    .index("by_businessId_and_creationKey", ["businessId", "creationKey"]),
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
