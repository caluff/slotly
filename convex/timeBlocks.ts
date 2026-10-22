import { Temporal } from "@js-temporal/polyfill";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { confirmedAppointmentsForDate, overlaps, requireMyBusiness } from "./lib/appointmentData";
import { activeBlocksForDate } from "./lib/timeBlocks";
import { timeBlockContext, timeBlockDetail, timeBlockSummary, timeBlockValue } from "./timeBlockValidators";
import { isLocalDate } from "../lib/local-date";
import { localTimePattern } from "../lib/special-date-schema";

function detail(row: Doc<"timeBlocks">) {
  const { _id, date, start, end, timeZone, version, startTime, endTime, reason, active, updatedAt } = row;
  return { _id, date, start, end, timeZone, version, startTime, endTime, reason, active, updatedAt };
}
function checkOperation(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new ConvexError({ code: "INVALID_OPERATION" });
}

export const getMyOccupation = query({
  args: { date: v.string() }, returns: v.array(v.object({ start: v.number(), end: v.number() })),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    return (await activeBlocksForDate(ctx, business._id, date)).map(({ start, end }) => ({ start, end }));
  },
});

export const getMyTimeBlock = query({
  args: { id: v.id("timeBlocks") }, returns: timeBlockDetail,
  handler: async (ctx, { id }) => {
    const business = await requireMyBusiness(ctx);
    const row = await ctx.db.get("timeBlocks", id);
    if (!row || row.businessId !== business._id) throw new ConvexError({ code: "TIME_BLOCK_NOT_FOUND" });
    return detail(row);
  },
});

// Grid DTO deliberately omits reasons and command receipts. Drain every page,
// including empty intermediate pages; range includes adjacent month dates.
export const listMyTimeBlocks = query({
  args: { from: v.string(), until: v.string(), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(timeBlockSummary),
  handler: async (ctx, { from, until, paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(from) || !isLocalDate(until) || from > until || Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(until)).days > 41) throw new ConvexError({ code: "INVALID_RANGE" });
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems < 1) throw new ConvexError({ code: "INVALID_PAGINATION" });
    const result = await ctx.db.query("timeBlocks")
      .withIndex("by_businessId_and_active_and_date", q => q.eq("businessId", business._id).eq("active", true).gte("date", from).lte("date", until))
      .paginate({ ...paginationOpts, numItems: Math.min(100, paginationOpts.numItems), maximumRowsRead: 100, maximumBytesRead: 256_000 });
    return { ...result, page: result.page.map(({ _id, date, start, end, timeZone, version }) => ({ _id, date, start, end, timeZone, version })) };
  },
});

export const changeMyTimeBlock = mutation({
  args: { expected: timeBlockContext, value: v.union(timeBlockValue, v.null()), operationId: v.string() },
  returns: v.object({ outcome: v.union(v.literal("changed"), v.literal("unchanged"), v.literal("already_applied")), block: timeBlockDetail }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    checkOperation(args.operationId);
    if (args.expected && (!Number.isSafeInteger(args.expected.version) || args.expected.version < 1 || args.expected.version >= Number.MAX_SAFE_INTEGER)) throw new ConvexError({ code: "INVALID_VERSION" });
    const value = args.value && { ...args.value, reason: args.value.reason.trim() };
    if (value && value.reason.length > 240) throw new ConvexError({ code: "INVALID_REASON" });
    const fingerprint = JSON.stringify(value);
    // Creation identity survives all edits/deletion. A lost response retried
    // after another transition acknowledges identity, never replays the write.
    if (!args.expected) {
      const prior = await ctx.db.query("timeBlocks").withIndex("by_businessId_and_creationKey", q => q.eq("businessId", business._id).eq("creationKey", args.operationId)).unique();
      if (prior) {
        if (prior.creationValue !== fingerprint) throw new ConvexError({ code: "TIME_BLOCK_CONFLICT" });
        return { outcome: "already_applied" as const, block: detail(prior) };
      }
    }
    const saved = args.expected ? await ctx.db.get("timeBlocks", args.expected.id) : null;
    if (args.expected && (!saved || saved.businessId !== business._id)) throw new ConvexError({ code: "TIME_BLOCK_NOT_FOUND" });
    const sameValue = saved && (value === null ? !saved.active : saved.active && saved.date === value.date && saved.startTime === value.startTime && saved.endTime === value.endTime && saved.reason === value.reason);
    if (saved && sameValue && saved.lastOperationId === args.operationId && saved.lastExpectedVersion === args.expected?.version) return { outcome: "already_applied" as const, block: detail(saved) };
    if (saved && (saved.version !== args.expected?.version || !saved.active)) throw new ConvexError({ code: "TIME_BLOCK_CONFLICT" });
    if (!value && !saved) throw new ConvexError({ code: "TIME_BLOCK_NOT_FOUND" });
    if (sameValue) return { outcome: "unchanged" as const, block: detail(saved!) };
    const now = Date.now();
    if (saved && saved.start <= now) throw new ConvexError({ code: "TIME_BLOCK_STARTED" });
    const command = { version: (saved?.version ?? 0) + 1, updatedAt: now, lastOperationId: args.operationId, lastExpectedVersion: args.expected?.version ?? null };
    if (value === null) {
      await ctx.db.patch("timeBlocks", saved!._id, { ...command, active: false });
      return { outcome: "changed" as const, block: detail({ ...saved!, ...command, active: false }) };
    }
    if (!isLocalDate(value.date)) throw new ConvexError({ code: "INVALID_DATE" });
    if (!localTimePattern.test(value.startTime) || !localTimePattern.test(value.endTime)) throw new ConvexError({ code: "INVALID_TIME" });
    if (value.startTime >= value.endTime) throw new ConvexError({ code: "INVALID_INTERVAL" });
    let start, end;
    try {
      start = Temporal.PlainDate.from(value.date).toPlainDateTime(value.startTime).toZonedDateTime(business.timeZone, { disambiguation: "reject" });
      end = Temporal.PlainDate.from(value.date).toPlainDateTime(value.endTime).toZonedDateTime(business.timeZone, { disambiguation: "reject" });
    } catch { throw new ConvexError({ code: "TIME_CHANGE" }); }
    if (start.offsetNanoseconds !== end.offsetNanoseconds) throw new ConvexError({ code: "TIME_CHANGE" });
    if (start.epochMilliseconds <= now) throw new ConvexError({ code: "TIME_BLOCK_STARTED" });
    const interval = { start: start.epochMilliseconds, end: end.epochMilliseconds };
    if ((await confirmedAppointmentsForDate(ctx, business._id, value.date)).some(row => overlaps(interval, row))) throw new ConvexError({ code: "TIME_BLOCK_APPOINTMENT_CONFLICT" });
    if ((await activeBlocksForDate(ctx, business._id, value.date)).some(row => row._id !== saved?._id && overlaps(interval, row))) throw new ConvexError({ code: "TIME_BLOCK_OVERLAP" });
    const fields = { ...value, ...interval, ...command, timeZone: business.timeZone, active: true };
    const id = saved ? saved._id : await ctx.db.insert("timeBlocks", { businessId: business._id, creationKey: args.operationId, creationValue: fingerprint, ...fields });
    if (saved) await ctx.db.patch("timeBlocks", id, fields);
    return { outcome: "changed" as const, block: detail((await ctx.db.get("timeBlocks", id))!) };
  },
});
