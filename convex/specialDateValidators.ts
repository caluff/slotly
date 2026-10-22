import { v } from "convex/values";

export const specialDay = v.object({ isOpen: v.boolean(), start: v.union(v.string(), v.null()), end: v.union(v.string(), v.null()) });
export const specialDateFields = {
  businessId: v.id("businesses"), date: v.string(), active: v.boolean(), ...specialDay.fields,
  version: v.number(), updatedAt: v.number(), lastOperationId: v.string(), lastExpectedVersion: v.union(v.number(), v.null()),
};
export const specialDateDocument = v.object({ _id: v.id("specialDates"), _creationTime: v.number(), ...specialDateFields });
export const specialDateContext = v.union(v.null(), v.object({ id: v.id("specialDates"), version: v.number() }));
