import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";
import { specialDateFields } from "./specialDateValidators";
import { timeBlockFields } from "./timeBlockValidators";
import { noticeAppointmentSnapshot } from "./noticeValidators";
import { emailEventFields } from "./emailConfirmationValidators";
import { publicAccessFields } from "./publicManagementValidators";
import { rescheduleReceiptFields } from "./publicReschedulingValidators";

export default defineSchema({
  publicRescheduleReceipts: defineTable(rescheduleReceiptFields).index("by_accessId_and_operationId", ["accessId", "operationId"]),
  publicBookingAccesses: defineTable(publicAccessFields).index("by_secretHash", ["secretHash"]).index("by_appointmentId", ["appointmentId"]),
  emailConfirmations: defineTable(emailEventFields).index("by_appointmentId", ["appointmentId"]),
  clients: defineTable({
    businessId: v.id("businesses"), name: v.string(), normalizedName: v.string(),
    createdAt: v.number(), creationKey: v.optional(v.string()), email: v.optional(v.string()),
  }).index("by_businessId_and_normalizedName", ["businessId", "normalizedName"])
    .index("by_businessId_and_creationKey", ["businessId", "creationKey"])
    .index("by_businessId_and_email", ["businessId", "email"]),
  clientCreationReceipts: defineTable({
    businessId: v.id("businesses"), operationId: v.string(), requestedName: v.string(), email: v.string(),
    clientId: v.id("clients"), clientName: v.string(), clientCreatedAt: v.number(),
    outcome: v.union(v.literal("created"), v.literal("reused")),
  }).index("by_businessId_and_operationId", ["businessId", "operationId"]),
  privateBookingReceipts: defineTable({
    businessId: v.id("businesses"), operationId: v.string(), requestHash: v.string(),
    appointmentId: v.id("appointments"), serviceId: v.id("services"), clientId: v.id("clients"),
    clientName: v.string(), serviceName: v.string(), date: v.string(), start: v.number(), end: v.number(),
  }).index("by_businessId_and_operationId", ["businessId", "operationId"]),
  appointmentNotices: defineTable({
    businessId: v.id("businesses"), appointmentId: v.id("appointments"), version: v.number(), start: v.number(),
    kind: v.union(v.literal("reminder"), v.literal("absence")), stage: v.number(), readStage: v.optional(v.number()),
    systemStage: v.optional(v.number()), systemOperationId: v.optional(v.string()), active: v.boolean(), updatedAt: v.number(),
    snapshot: v.optional(noticeAppointmentSnapshot),
  }).index("by_appointmentId_and_version", ["appointmentId", "version"])
    .index("by_businessId_and_active_and_start", ["businessId", "active", "start"])
    .index("by_businessId_and_updatedAt", ["businessId", "updatedAt"]),
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
    emailConfirmationsEnabled: v.optional(v.boolean()),
    emailConfirmationsVersion: v.optional(v.number()),
  }).index("by_ownerId", ["ownerId"])
    .index("by_publicBookingSlug", ["publicBookingSlug"]),
  publicBookingReceipts: defineTable({
    businessId: v.id("businesses"),
    attemptKey: v.string(),
    requestHash: v.optional(v.string()),
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
    clientId: v.optional(v.id("clients")),
    date: v.string(),
    start: v.number(),
    end: v.number(),
    status: v.union(v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show")),
    cancelledAt: v.optional(v.number()),
    version: v.optional(v.number()),
    rescheduledAt: v.optional(v.number()),
    rescheduledFromVersion: v.optional(v.number()),
    resultAt: v.optional(v.number()),
    automationEnabled: v.optional(v.boolean()),
    autoNoShowSuppressed: v.optional(v.boolean()),
    arrivedAt: v.optional(v.number()),
    holdsSlot: v.optional(v.boolean()),
    lastResultOperationId: v.optional(v.string()),
    lastResultExpectedVersion: v.optional(v.number()),
    lastResultValue: v.optional(v.string()),
    resultUndo: v.optional(v.object({ operationId: v.string(), version: v.number(), status: v.literal("confirmed"), resultAt: v.optional(v.number()),
      kind: v.optional(v.union(v.literal("arrival"), v.literal("auto_no_show"))), arrivedAt: v.optional(v.number()), holdsSlot: v.optional(v.boolean()) })),
  }).index("by_businessId_and_date", ["businessId", "date"])
    .index("by_businessId_and_date_and_status", ["businessId", "date", "status"])
    .index("by_businessId_and_date_and_holdsSlot", ["businessId", "date", "holdsSlot"])
    .index("by_businessId_and_status_and_start", ["businessId", "status", "start"])
    .index("by_businessId_and_date_and_start", ["businessId", "date", "start"])
    .index("by_businessId_and_clientId_and_start", ["businessId", "clientId", "start"])
    .index("by_businessId_and_serviceId_and_date_and_start", ["businessId", "serviceId", "date", "start"]),
});
