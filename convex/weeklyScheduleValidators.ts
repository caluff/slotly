import { v } from "convex/values";

// Shared storage/API shape only; semantic validation runs in the mutation.
export const weeklyScheduleDay = v.object({
  dayOfWeek: v.number(),
  isOpen: v.boolean(),
  start: v.union(v.string(), v.null()),
  end: v.union(v.string(), v.null()),
});
