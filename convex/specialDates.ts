import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { confirmedAppointmentsForDate, requireMyBusiness } from "./lib/appointmentData";
import { specialDateContext, specialDateDocument, specialDay } from "./specialDateValidators";
import { isLocalDate } from "../lib/local-date";
import { isIanaTimeZone, localTimePattern } from "../lib/special-date-schema";

function validateDate(date: string, timeZone: string) {
  if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
  if (!isIanaTimeZone(timeZone)) throw new ConvexError({ code: "INVALID_TIME_ZONE" });
}

export const getMySpecialDate = query({
  args: { date: v.string() }, returns: v.object({ configuration: v.union(specialDateDocument, v.null()), confirmedAppointments: v.number() }),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    validateDate(date, business.timeZone);
    const configuration = await ctx.db.query("specialDates").withIndex("by_businessId_and_date", (q) => q.eq("businessId", business._id).eq("date", date)).unique();
    return { configuration, confirmedAppointments: (await confirmedAppointmentsForDate(ctx, business._id, date)).length };
  },
});

export const listMySpecialDates = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(specialDateDocument),
  handler: async (ctx, { paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
    return await ctx.db.query("specialDates")
      .withIndex("by_businessId_and_active_and_date", (q) => q.eq("businessId", business._id).eq("active", true))
      .order("asc").paginate({ ...paginationOpts, numItems: Math.min(50, paginationOpts.numItems), maximumRowsRead: 100 });
  },
});

// One command for save/restore: the frozen context is mandatory even when the
// desired value equals the current one. Tombstones preserve identity against ABA.
export const changeMySpecialDate = mutation({
  args: { date: v.string(), value: v.union(specialDay, v.null()), expected: specialDateContext, operationId: v.string() },
  returns: v.object({ outcome: v.union(v.literal("changed"), v.literal("unchanged"), v.literal("already_applied")),
    configuration: v.union(specialDateDocument, v.null()), confirmedAppointments: v.number() }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    validateDate(args.date, business.timeZone);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(args.operationId)) throw new ConvexError({ code: "INVALID_OPERATION" });
    if (args.expected && (!Number.isSafeInteger(args.expected.version) || args.expected.version < 1 || args.expected.version >= Number.MAX_SAFE_INTEGER)) throw new ConvexError({ code: "INVALID_VERSION" });
    const value = args.value === null ? null : args.value.isOpen ? args.value : { isOpen: false, start: null, end: null };
    if (value?.isOpen) {
      if (!value.start || !value.end || !localTimePattern.test(value.start) || !localTimePattern.test(value.end)) throw new ConvexError({ code: "INVALID_TIME" });
      if (value.start >= value.end) throw new ConvexError({ code: "INVALID_INTERVAL" });
    }
    const saved = await ctx.db.query("specialDates").withIndex("by_businessId_and_date", (q) => q.eq("businessId", business._id).eq("date", args.date)).unique();
    const sameValue = value === null ? !saved?.active : saved?.active === true && saved.isOpen === value.isOpen && saved.start === value.start && saved.end === value.end;
    // This range read is in the WRITE transaction as well: an appointment that
    // wins first is preserved and included in the warning, even after a preview.
    const confirmedAppointments = (await confirmedAppointmentsForDate(ctx, business._id, args.date)).length;
    const result = (outcome: "changed" | "unchanged" | "already_applied", configuration = saved) => ({ outcome, configuration, confirmedAppointments });
    const expectedVersion = args.expected?.version ?? null;
    if (saved && saved.lastOperationId === args.operationId && saved.lastExpectedVersion === expectedVersion &&
      (args.expected === null || args.expected.id === saved._id) && sameValue) return result("already_applied");
    if (saved ? !args.expected || args.expected.id !== saved._id || args.expected.version !== saved.version : args.expected !== null) {
      throw new ConvexError({ code: "SPECIAL_DATE_CONFLICT" });
    }
    if (sameValue) return result("unchanged");
    const fields = { active: value !== null, isOpen: value?.isOpen ?? false, start: value?.start ?? null, end: value?.end ?? null,
      version: (saved?.version ?? 0) + 1, updatedAt: Date.now(), lastOperationId: args.operationId, lastExpectedVersion: expectedVersion };
    const id = saved ? saved._id : await ctx.db.insert("specialDates", { businessId: business._id, date: args.date, ...fields });
    if (saved) await ctx.db.patch("specialDates", id, fields);
    return result("changed", await ctx.db.get("specialDates", id));
  },
});
