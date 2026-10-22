import { v } from "convex/values";

export const timeBlockValue = v.object({ date: v.string(), startTime: v.string(), endTime: v.string(), reason: v.string() });
export const timeBlockFields = {
  businessId: v.id("businesses"), date: v.string(), startTime: v.string(), endTime: v.string(), reason: v.string(),
  start: v.number(), end: v.number(), timeZone: v.string(), active: v.boolean(), version: v.number(), updatedAt: v.number(),
  creationKey: v.string(), creationValue: v.string(), lastOperationId: v.string(), lastExpectedVersion: v.union(v.number(), v.null()),
};
export const timeBlockSummary = v.object({ _id: v.id("timeBlocks"), date: v.string(), start: v.number(), end: v.number(), timeZone: v.string(), version: v.number() });
export const timeBlockDetail = v.object({ ...timeBlockSummary.fields, startTime: v.string(), endTime: v.string(), reason: v.string(), active: v.boolean(), updatedAt: v.number() });
export const timeBlockContext = v.union(v.null(), v.object({ id: v.id("timeBlocks"), version: v.number() }));
