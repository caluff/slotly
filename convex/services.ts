import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireMyBusiness } from "./lib/appointmentData";
import { serviceDetail, serviceUndo } from "./serviceValidators";
import { validServiceDuration } from "../lib/service-duration";

function detail(row: Doc<"services">) {
  const { _id, _creationTime, businessId, name, durationMinutes, updatedAt } = row;
  return { _id, _creationTime, businessId, name, durationMinutes, version: row.version ?? 0, archived: row.archived === true,
    ...(updatedAt === undefined ? {} : { updatedAt }) };
}
function operation(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new ConvexError({ code: "INVALID_OPERATION" });
}
function checkName(value: string) {
  const name = value.trim();
  if (!name || name.length > 100) throw new ConvexError({ code: "INVALID_NAME" });
  return name;
}

// Only the current server-recorded operation can be undone. The client gets a
// revision ticket, never permission to supply an arbitrary replacement snapshot.
function undoTicket(row: Doc<"services">, operationId: string) {
  const undo = row.undoSnapshot;
  return undo && undo.operationId === operationId && undo.version === (row.version ?? 0)
    ? { id: row._id, version: undo.version, operationId } : null;
}

export const getMyServiceUndo = query({
  args: { id: v.id("services"), operationId: v.string() }, returns: v.union(serviceUndo, v.null()),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    const row = await ctx.db.get("services", args.id);
    if (!row || row.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    operation(args.operationId);
    return undoTicket(row, args.operationId);
  },
});

export const listMyServices = query({
  args: { paginationOpts: paginationOptsValidator, archived: v.optional(v.boolean()) },
  returns: paginationResultValidator(serviceDetail),
  handler: async (ctx, { paginationOpts, archived }) => {
    const business = await requireMyBusiness(ctx);
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
    // Undefined and false sort before true, including legacy active rows.
    const indexed = archived === undefined
      ? ctx.db.query("services").withIndex("by_businessId", q => q.eq("businessId", business._id))
      : archived ? ctx.db.query("services").withIndex("by_businessId_and_archived", q => q.eq("businessId", business._id).eq("archived", true))
        : ctx.db.query("services").withIndex("by_businessId_and_archived", q => q.eq("businessId", business._id).lt("archived", true));
    const page = await indexed.order("desc").paginate({ ...paginationOpts, numItems: Math.min(paginationOpts.numItems, 50), maximumRowsRead: 100, maximumBytesRead: 128_000 });
    return { ...page, page: page.page.map(detail) };
  },
});

export const getMyService = query({
  args: { id: v.id("services") }, returns: serviceDetail,
  handler: async (ctx, { id }) => {
    const business = await requireMyBusiness(ctx);
    const row = await ctx.db.get("services", id);
    if (!row || row.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    return detail(row);
  },
});

export const createMyService = mutation({
  args: { name: v.string(), durationMinutes: v.number(), operationId: v.string() }, returns: v.id("services"),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    operation(args.operationId);
    const name = checkName(args.name);
    if (!validServiceDuration(args.durationMinutes)) throw new ConvexError({ code: "INVALID_DURATION" });
    const creationValue = JSON.stringify([name, args.durationMinutes]);
    const prior = await ctx.db.query("services").withIndex("by_businessId_and_creationKey", q => q.eq("businessId", business._id).eq("creationKey", args.operationId)).unique();
    if (prior) {
      if (prior.creationValue !== creationValue) throw new ConvexError({ code: "SERVICE_CONFLICT" });
      return prior._id;
    }
    return await ctx.db.insert("services", { businessId: business._id, name, durationMinutes: args.durationMinutes,
      archived: false, version: 0, creationKey: args.operationId, creationValue,
      undoSnapshot: { operationId: args.operationId, version: 0, kind: "create", name, durationMinutes: args.durationMinutes, archived: true } });
  },
});

export const changeMyService = mutation({
  args: { id: v.id("services"), expectedVersion: v.number(), operationId: v.string(),
    change: v.union(v.object({ kind: v.literal("edit"), name: v.string(), durationMinutes: v.optional(v.number()) }),
      v.object({ kind: v.literal("archive") }), v.object({ kind: v.literal("restore") })) },
  returns: v.object({ outcome: v.union(v.literal("changed"), v.literal("unchanged"), v.literal("already_applied")), service: serviceDetail, undo: v.union(serviceUndo, v.null()) }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    const saved = await ctx.db.get("services", args.id);
    if (!saved || saved.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    operation(args.operationId);
    if (!Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 0 || args.expectedVersion >= Number.MAX_SAFE_INTEGER) throw new ConvexError({ code: "INVALID_VERSION" });
    const change = args.change.kind === "edit" ? { ...args.change, name: checkName(args.change.name) } : args.change;
    // Omission preserves a legacy duration. Explicit duration obeys today's rule.
    if (change.kind === "edit" && change.durationMinutes !== undefined && !validServiceDuration(change.durationMinutes)) throw new ConvexError({ code: "INVALID_DURATION" });
    const fingerprint = JSON.stringify(change.kind === "edit" ? ["edit", change.name, change.durationMinutes ?? null] : [change.kind]);
    if (saved.lastOperationId === args.operationId && saved.lastExpectedVersion === args.expectedVersion && saved.lastValue === fingerprint) return { outcome: "already_applied" as const, service: detail(saved), undo: undoTicket(saved, args.operationId) };
    if ((saved.version ?? 0) !== args.expectedVersion || saved.lastOperationId === args.operationId) throw new ConvexError({ code: "SERVICE_CONFLICT" });
    if (change.kind === "edit" && saved.archived === true) throw new ConvexError({ code: "SERVICE_CONFLICT" });
    const value = change.kind === "edit" ? { name: change.name, durationMinutes: change.durationMinutes ?? saved.durationMinutes, archived: false }
      : { name: saved.name, durationMinutes: saved.durationMinutes, archived: change.kind === "archive" };
    if (value.name === saved.name && value.durationMinutes === saved.durationMinutes && value.archived === (saved.archived === true)) return { outcome: "unchanged" as const, service: detail(saved), undo: null };
    const fields = { ...value, version: args.expectedVersion + 1, updatedAt: Date.now(), lastOperationId: args.operationId,
      lastExpectedVersion: args.expectedVersion, lastValue: fingerprint,
      undoSnapshot: change.kind === "edit" ? { operationId: args.operationId, version: args.expectedVersion + 1, kind: "edit" as const,
        name: saved.name, durationMinutes: saved.durationMinutes, archived: saved.archived === true } : undefined };
    await ctx.db.patch("services", saved._id, fields);
    const result = { ...saved, ...fields };
    return { outcome: "changed" as const, service: detail(result), undo: undoTicket(result, args.operationId) };
  },
});

export const undoMyService = mutation({
  args: { id: v.id("services"), expectedVersion: v.number(), targetOperationId: v.string(), operationId: v.string() },
  returns: v.object({ outcome: v.union(v.literal("changed"), v.literal("already_applied")), service: serviceDetail }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    const saved = await ctx.db.get("services", args.id);
    if (!saved || saved.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    operation(args.operationId); operation(args.targetOperationId);
    if (!Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 0 || args.expectedVersion >= Number.MAX_SAFE_INTEGER) throw new ConvexError({ code: "INVALID_VERSION" });
    const fingerprint = JSON.stringify(["undo", args.targetOperationId]);
    if (saved.lastOperationId === args.operationId && saved.lastExpectedVersion === args.expectedVersion && saved.lastValue === fingerprint) return { outcome: "already_applied" as const, service: detail(saved) };
    const undo = saved.undoSnapshot;
    if ((saved.version ?? 0) !== args.expectedVersion || !undo || undo.operationId !== args.targetOperationId || undo.version !== args.expectedVersion
      || args.operationId === args.targetOperationId || saved.lastOperationId === args.operationId) throw new ConvexError({ code: "SERVICE_CONFLICT" });
    // A previous legacy duration (e.g. 46) is trusted ONLY from this snapshot,
    // captured by an effective authenticated edit. No client value bypasses the
    // normal catalogue duration rule. Undo creates another revision, not ABA.
    const fields = { name: undo.name, durationMinutes: undo.durationMinutes, archived: undo.kind === "create" ? true : undo.archived,
      version: args.expectedVersion + 1, updatedAt: Date.now(), lastOperationId: args.operationId,
      lastExpectedVersion: args.expectedVersion, lastValue: fingerprint, undoSnapshot: undefined };
    await ctx.db.patch("services", saved._id, fields);
    return { outcome: "changed" as const, service: detail({ ...saved, ...fields }) };
  },
});
