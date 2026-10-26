import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { action, internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { bookableSlot, checkVersion, confirmedAppointmentsForDate, occupyingAppointmentsForDate, requireMyAppointment, requireMyBusiness } from "./lib/appointmentData";
import { applyAutomaticAbsence, attentionJobArgs, inArrivalWindow, invalidateNotice, publishReminder, reminderStage, scheduleAttention } from "./lib/appointmentAttention";
import { isLocalDate } from "../lib/local-date";
import { appointmentDateBounds, appointmentFilterError, normalizeClientSearch } from "../lib/appointment-search";
import { selectedAppointmentStatuses } from "../lib/appointment-status";
import { clientForEmail, requireMyClient } from "./lib/clientIdentity";
import { privateCreationArgs, privateCreationCommand, privateCreationReceipt, presentCreation, creationSnapshot } from "./lib/privateCreation";
import { enqueueConfirmation } from "./lib/emailConfirmation";
import { commitCancellation } from "./lib/appointmentCancellation";
import { commitRescheduling } from "./lib/appointmentRescheduling";

const appointmentStatus = v.union(v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show"));
const resultUndo = v.object({ appointmentId: v.id("appointments"), version: v.number(), operationId: v.string() });

const appointment = v.object({
  _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
  clientName: v.string(), start: v.number(), end: v.number(), status: appointmentStatus,
});

const historyAppointment = v.object({
  _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
  clientName: v.string(), clientId: v.optional(v.id("clients")), date: v.string(), start: v.number(), end: v.number(),
  status: appointmentStatus, cancelledAt: v.optional(v.number()), resultAt: v.optional(v.number()),
  version: v.number(), rescheduledAt: v.optional(v.number()),
});

export function publicAppointment(row: import("./_generated/dataModel").Doc<"appointments">) {
  const { _id, serviceId, serviceName, clientName, date, start, end, status, cancelledAt, rescheduledAt, resultAt } = row;
  return { _id, serviceId, serviceName, clientName, date, start, end, status, version: row.version ?? 0,
    ...(row.clientId === undefined ? {} : { clientId: row.clientId }),
    ...(cancelledAt === undefined ? {} : { cancelledAt }), ...(rescheduledAt === undefined ? {} : { rescheduledAt }),
    ...(resultAt === undefined ? {} : { resultAt }) };
}

// Keeps an open confirmation reactive even if a remote move leaves its filters.
export const getMyAppointment = query({
  args: { appointmentId: v.id("appointments") }, returns: historyAppointment,
  handler: async (ctx, { appointmentId }) => publicAppointment((await requireMyAppointment(ctx, appointmentId)).saved),
});

// Bounded reactive occupation, not historical listing. History (including
// cancellations) is always paginated through searchMyAppointments.
export const listMyConfirmedAppointments = query({
  args: { date: v.string() },
  returns: v.array(appointment),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const rows = await confirmedAppointmentsForDate(ctx, business._id, date);
    return rows.map(({ _id, serviceId, serviceName, clientName, start, end, status }) =>
      ({ _id, serviceId, serviceName, clientName, start, end, status }));
  },
});

export const listMyOccupyingAppointments = query({
  args: { date: v.string() }, returns: v.array(appointment),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    return (await occupyingAppointmentsForDate(ctx, business._id, date)).map(({ _id, serviceId, serviceName, clientName, start, end, status }) =>
      ({ _id, serviceId, serviceName, clientName, start, end, status }));
  },
});

// Page the whole owned index, including past and distant years. Only the
// normalized name is a residual predicate, applied on this bounded server page.
// Preserve pagination metadata even for zero matches: an empty intermediate
// page does NOT mean that the search is exhausted.
export const searchMyAppointments = query({
  args: {
    client: v.string(), serviceId: v.optional(v.id("services")), status: v.optional(v.string()),
    period: v.union(v.literal("todas"), v.literal("proximas"), v.literal("pasadas")),
    from: v.string(), until: v.string(), referenceDate: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(historyAppointment),
  handler: async (ctx, { client, serviceId, status, period, from, until, referenceDate, paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    const filters = { client, service: serviceId ?? "", status, period, from, until };
    if (appointmentFilterError(filters)) throw new ConvexError({ code: "INVALID_FILTERS" });
    if ((referenceDate !== undefined && !isLocalDate(referenceDate)) || (period !== "todas" && !referenceDate)) {
      throw new ConvexError({ code: "INVALID_REFERENCE_DATE" });
    }
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
    if (serviceId) {
      const service = await ctx.db.get("services", serviceId);
      if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    }
    if (status === "none") return { page: [], isDone: true, continueCursor: "" };
    const bounds = appointmentDateBounds(filters, referenceDate);
    if (bounds.empty) return { page: [], isDone: true, continueCursor: "" };
    const indexed = serviceId
      ? ctx.db.query("appointments").withIndex("by_businessId_and_serviceId_and_date_and_start", (q) => {
        const owned = q.eq("businessId", business._id).eq("serviceId", serviceId);
        const lower = bounds.from ? owned.gte("date", bounds.from) : owned;
        if (bounds.before && (!bounds.until || bounds.before <= bounds.until)) return lower.lt("date", bounds.before);
        return bounds.until ? lower.lte("date", bounds.until) : lower;
      })
      : ctx.db.query("appointments").withIndex("by_businessId_and_date_and_start", (q) => {
        const owned = q.eq("businessId", business._id);
        const lower = bounds.from ? owned.gte("date", bounds.from) : owned;
        if (bounds.before && (!bounds.until || bounds.before <= bounds.until)) return lower.lt("date", bounds.before);
        return bounds.until ? lower.lte("date", bounds.until) : lower;
      });
    const page = await indexed.order("asc").paginate({ ...paginationOpts,
      numItems: Math.min(paginationOpts.numItems, 100), maximumRowsRead: 200, maximumBytesRead: 256_000 });
    const needle = normalizeClientSearch(client);
    return { ...page, page: page.page
      .filter((row) => selectedAppointmentStatuses(status)!.includes(row.status) && (!needle || normalizeClientSearch(row.clientName).includes(needle)))
      .map(publicAppointment) };
  },
});

export const getMyAppointmentCreation = query({
  args: privateCreationArgs, returns: v.union(creationSnapshot, v.null()),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), command = await privateCreationCommand(args);
    const prior = await privateCreationReceipt(ctx, business._id, args, command.requestHash);
    return prior ? presentCreation(prior) : null;
  },
});
export const createMyAppointment = mutation({
  args: privateCreationArgs,
  returns: v.object({ outcome: v.union(v.literal("created"), v.literal("already_applied")), appointmentId: v.id("appointments") }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), command = await privateCreationCommand(args);
    const prior = await privateCreationReceipt(ctx, business._id, args, command.requestHash);
    if (prior) return { outcome: "already_applied" as const, appointmentId: prior.appointmentId };
    const linked = args.clientId === undefined ? null : await requireMyClient(ctx, business._id, args.clientId);
    const { slot, service } = await bookableSlot(ctx, business, args.serviceId, args.date, args.start, Date.now(), undefined, args.expectedService);
    // Nothing is created until every availability/context check has succeeded.
    // Any later exception rolls client, appointment and receipt back together.
    const savedClient = linked ?? (await clientForEmail(ctx, business._id, command.name, command.email!)).client;
    const clientName = linked?.name ?? command.name;
    const appointmentId = await ctx.db.insert("appointments", { businessId: business._id, serviceId: service._id, serviceName: service.name,
      clientId: savedClient._id, clientName, date: args.date, start: slot.start, end: slot.end, status: "confirmed", automationEnabled: true });
    const created = (await ctx.db.get("appointments", appointmentId))!;
    await scheduleAttention(ctx, created);
    await enqueueConfirmation(ctx, business, created, linked ? linked.email : command.email);
    await ctx.db.insert("privateBookingReceipts", { businessId: business._id, operationId: args.operationId, requestHash: command.requestHash,
      appointmentId, clientId: savedClient._id, clientName, serviceId: service._id, serviceName: service.name, date: args.date, start: slot.start, end: slot.end });
    return { outcome: "created" as const, appointmentId };
  },
});

export const cancelMyAppointment = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number() },
  returns: v.object({ outcome: v.union(v.literal("cancelled"), v.literal("already_cancelled")), cancelledAt: v.number() }),
  handler: async (ctx, { appointmentId, expectedVersion }) => {
    const { saved } = await requireMyAppointment(ctx, appointmentId);
    if (saved.status === "cancelled") {
      if (saved.cancelledAt === undefined) throw new ConvexError({ code: "INVALID_APPOINTMENT_STATE" });
      return { outcome: "already_cancelled" as const, cancelledAt: saved.cancelledAt };
    }
    if (saved.status !== "confirmed") throw new ConvexError({ code: "APPOINTMENT_NOT_CONFIRMED" });
    checkVersion(saved.version ?? 0, expectedVersion);
    const cancelledAt = Date.now();
    if (saved.start <= cancelledAt) throw new ConvexError({ code: "APPOINTMENT_STARTED" });
    // The read and status/index transition share a transaction. OCC retries a
    // concurrent cancellation or creation reading this confirmed range.
    await commitCancellation(ctx, saved, cancelledAt, expectedVersion + 1);
    return { outcome: "cancelled" as const, cancelledAt };
  },
});

export const rescheduleMyAppointment = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number(), date: v.string(), start: v.number() },
  returns: v.object({ outcome: v.union(v.literal("rescheduled"), v.literal("already_rescheduled"), v.literal("unchanged")),
    version: v.number(), rescheduledAt: v.optional(v.number()), date: v.string(), start: v.number(), end: v.number() }),
  handler: async (ctx, { appointmentId, expectedVersion, date, start }) => {
    const { business, saved } = await requireMyAppointment(ctx, appointmentId);
    if (saved.status !== "confirmed") throw new ConvexError({ code: saved.status === "cancelled" ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_NOT_CONFIRMED" });
    const version = saved.version ?? 0;
    const response = { version, date: saved.date, start: saved.start, end: saved.end,
      ...(saved.rescheduledAt === undefined ? {} : { rescheduledAt: saved.rescheduledAt }) };
    // Only the immediately preceding effective move can be replayed. Once any
    // later transition commits, this old request conflicts instead of reverting it.
    if (Number.isSafeInteger(expectedVersion) && expectedVersion >= 0 && version === expectedVersion + 1
      && saved.rescheduledFromVersion === expectedVersion && saved.date === date && saved.start === start) {
      return { ...response, outcome: "already_rescheduled" as const };
    }
    checkVersion(version, expectedVersion);
    const now = Date.now();
    if (saved.start <= now) throw new ConvexError({ code: "APPOINTMENT_STARTED" });
    const { slot } = await bookableSlot(ctx, business, saved.serviceId, date, start, now, saved._id, undefined, (saved.end - saved.start) / 60_000);
    if (saved.date === date && saved.start === start && saved.end === slot.end) return { ...response, outcome: "unchanged" as const };
    await commitRescheduling(ctx, saved, date, slot, now, version);
    return { outcome: "rescheduled" as const, version: version + 1, rescheduledAt: now, date, start: slot.start, end: slot.end };
  },
});

function resultOperation(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new ConvexError({ code: "INVALID_OPERATION" });
}
function resultTicket(row: import("./_generated/dataModel").Doc<"appointments">) {
  return row.resultUndo && row.resultUndo.version === (row.version ?? 0)
    ? { appointmentId: row._id, version: row.resultUndo.version, operationId: row.resultUndo.operationId } : null;
}
const resultResponse = v.object({ outcome: v.union(v.literal("changed"), v.literal("unchanged"), v.literal("already_applied")),
  appointment: historyAppointment, undo: v.union(resultUndo, v.null()) });

export const markMyAppointmentResult = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number(), operationId: v.string(), result: v.union(v.literal("completed"), v.literal("no_show")) },
  returns: resultResponse,
  handler: applyAppointmentResult,
});

// Shared transaction implementation; server time is read here, never supplied
// by an application caller. The isolated engine also exercises its exact edge.
export async function applyAppointmentResult(ctx: MutationCtx, args: { appointmentId: Id<"appointments">; expectedVersion: number; operationId: string; result: "completed" | "no_show" }) {
    const { saved } = await requireMyAppointment(ctx, args.appointmentId);
    resultOperation(args.operationId);
    const version = saved.version ?? 0;
    const fingerprint = JSON.stringify(["result", args.result]);
    // Only the immediately preceding effective command is replayable. A later
    // transition, including undo -> same result (ABA), invalidates old commands.
    if (version === args.expectedVersion + 1 && saved.lastResultOperationId === args.operationId
      && saved.lastResultExpectedVersion === args.expectedVersion && saved.lastResultValue === fingerprint) {
      return { outcome: "already_applied" as const, appointment: publicAppointment(saved), undo: resultTicket(saved) };
    }
    checkVersion(version, args.expectedVersion);
    if (saved.lastResultOperationId === args.operationId) throw new ConvexError({ code: "APPOINTMENT_CONFLICT" });
    const now = Date.now();
    if (saved.end > now) throw new ConvexError({ code: "APPOINTMENT_NOT_ENDED" });
    if (saved.status === args.result) return { outcome: "unchanged" as const, appointment: publicAppointment(saved), undo: null };
    if (saved.status !== "confirmed") throw new ConvexError({ code: "APPOINTMENT_NOT_CONFIRMED" });
    const fields = { status: args.result, resultAt: now, version: version + 1, lastResultOperationId: args.operationId,
      lastResultExpectedVersion: version, lastResultValue: fingerprint,
      resultUndo: { operationId: args.operationId, version: version + 1, status: "confirmed" as const,
        ...(saved.resultAt === undefined ? {} : { resultAt: saved.resultAt }) } };
    await invalidateNotice(ctx, saved);
    await ctx.db.patch("appointments", saved._id, fields);
    const row = { ...saved, ...fields };
    return { outcome: "changed" as const, appointment: publicAppointment(row), undo: resultTicket(row) };
}

export const undoMyAppointmentResult = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number(), targetOperationId: v.string(), operationId: v.string() },
  returns: v.object({ outcome: v.union(v.literal("changed"), v.literal("already_applied")), appointment: historyAppointment }),
  handler: async (ctx, args) => {
    const { saved } = await requireMyAppointment(ctx, args.appointmentId);
    resultOperation(args.operationId);
    // Server-generated absence tickets are verified against the owned snapshot.
    if (!args.targetOperationId.startsWith("auto_no_show:")) resultOperation(args.targetOperationId);
    const version = saved.version ?? 0, fingerprint = JSON.stringify(["undo-result", args.targetOperationId]);
    if (version === args.expectedVersion + 1 && saved.lastResultOperationId === args.operationId
      && saved.lastResultExpectedVersion === args.expectedVersion && saved.lastResultValue === fingerprint) {
      return { outcome: "already_applied" as const, appointment: publicAppointment(saved) };
    }
    checkVersion(version, args.expectedVersion);
    const snapshot = saved.resultUndo;
    if (!snapshot || snapshot.version !== version || snapshot.operationId !== args.targetOperationId
      || args.operationId === args.targetOperationId || saved.lastResultOperationId === args.operationId
      || (saved.status !== "completed" && saved.status !== "no_show")) throw new ConvexError({ code: "APPOINTMENT_CONFLICT" });
    // Never create or move a booking, restore a cancellation, or revive a future
    // occupied interval. Only the recorded prior result fields can be restored.
    if (snapshot.kind !== "arrival" && saved.end > Date.now()) throw new ConvexError({ code: "APPOINTMENT_NOT_ENDED" });
    const fields = { status: snapshot.status, resultAt: snapshot.resultAt, version: version + 1,
      lastResultOperationId: args.operationId, lastResultExpectedVersion: version, lastResultValue: fingerprint, resultUndo: undefined,
      ...(snapshot.kind === "arrival" ? {arrivedAt: snapshot.arrivedAt, holdsSlot: snapshot.holdsSlot} : {}),
      ...(saved.automationEnabled ? {autoNoShowSuppressed: true} : {}) };
    await invalidateNotice(ctx, saved);
    await ctx.db.patch("appointments", saved._id, fields);
    return { outcome: "changed" as const, appointment: publicAppointment({ ...saved, ...fields }) };
  },
});


export const runAppointmentReminder = internalMutation({ args: attentionJobArgs, returns: v.null(), handler: publishReminder });
export const runAppointmentAbsence = internalMutation({ args: attentionJobArgs, returns: v.null(), handler: applyAutomaticAbsence });

const windowCommand = { appointmentId: v.id("appointments"), expectedVersion: v.number(), operationId: v.string() };
export async function applyArrivalWindowCommand(ctx: MutationCtx, args: {appointmentId: Id<"appointments">; expectedVersion:number; operationId:string}, kind: "arrival" | "cancel") {
  const {saved} = await requireMyAppointment(ctx, args.appointmentId);
  resultOperation(args.operationId);
  const version = saved.version ?? 0, fingerprint = JSON.stringify(["arrival-window", kind]);
  if (version === args.expectedVersion + 1 && saved.lastResultOperationId === args.operationId
    && saved.lastResultExpectedVersion === args.expectedVersion && saved.lastResultValue === fingerprint) {
    return {outcome:"already_applied" as const, appointment:publicAppointment(saved), undo:resultTicket(saved)};
  }
  checkVersion(version, args.expectedVersion);
  if (saved.lastResultOperationId === args.operationId) throw new ConvexError({code:"APPOINTMENT_CONFLICT"});
  if (saved.status !== "confirmed") throw new ConvexError({code:"APPOINTMENT_NOT_CONFIRMED"});
  const now = Date.now();
  if (!inArrivalWindow(saved.start, now) || now >= saved.end) throw new ConvexError({code:"ARRIVAL_WINDOW_CLOSED"});
  await invalidateNotice(ctx, saved);
  const fields = {version:version+1, lastResultOperationId:args.operationId, lastResultExpectedVersion:version, lastResultValue:fingerprint,
    ...(kind === "arrival" ? {status:"completed" as const, resultAt:now, arrivedAt:now, holdsSlot:true,
      resultUndo:{operationId:args.operationId, version:version+1, status:"confirmed" as const, kind:"arrival" as const,
        ...(saved.resultAt === undefined ? {} : {resultAt:saved.resultAt}),
        ...(saved.arrivedAt === undefined ? {} : {arrivedAt:saved.arrivedAt}), ...(saved.holdsSlot === undefined ? {} : {holdsSlot:saved.holdsSlot})}}
      : {status:"cancelled" as const, cancelledAt:now, resultUndo:undefined})};
  await ctx.db.patch("appointments", saved._id, fields);
  const row = {...saved,...fields};
  return {outcome:"changed" as const, appointment:publicAppointment(row), undo:resultTicket(row)};
}
export const arriveMyAppointment = mutation({ args:windowCommand, returns:resultResponse, handler:async (ctx,args) => applyArrivalWindowCommand(ctx,args,"arrival") });
export const cancelMyAppointmentInWindow = mutation({ args:windowCommand, returns:resultResponse, handler:async (ctx,args) => applyArrivalWindowCommand(ctx,args,"cancel") });

// An action gives each caller a fresh authoritative clock, unlike a cached query.
export const getMyAttentionClock = action({ args:{}, returns:v.number(), handler:async ctx => {
  if (!await ctx.auth.getUserIdentity()) throw new ConvexError({code:"UNAUTHENTICATED"});
  return Date.now();
}});
export const getMyAttentionCandidates = query({
  args:{anchor:v.number()}, returns:v.array(historyAppointment), handler:async (ctx,{anchor}) => {
    const business = await requireMyBusiness(ctx);
    if (!Number.isSafeInteger(anchor)) throw new ConvexError({code:"INVALID_TIME"});
    // Anchor only selects private UI data, never authorizes a transition.
    const rows = await ctx.db.query("appointments").withIndex("by_businessId_and_status_and_start", q =>
      q.eq("businessId",business._id).eq("status","confirmed").gte("start",anchor-300000).lte("start",anchor+900000)).take(1441);
    if (rows.length > 1440) throw new ConvexError({code:"DAY_CAPACITY_EXCEEDED"});
    return rows.sort((a,b)=>a.start-b.start || a._id.localeCompare(b._id)).map(publicAppointment);
  }
});
const noticeDTO = v.object({
  _id:v.id("appointmentNotices"),stage:v.number(),read:v.boolean(),kind:v.union(v.literal("reminder"),v.literal("absence")),
  publishedAt:v.number(),originalStart:v.number(),appointment:v.union(historyAppointment,v.null()),currentAppointment:v.union(historyAppointment,v.null()),
  contextCurrent:v.boolean(),undo:v.union(resultUndo,v.null()),
});
// Five persisted publication records, including read/inactive history. Reading,
// claiming and appointment changes never move a notice in this index.
export const listMyAppointmentNotices = query({
  args:{paginationOpts:paginationOptsValidator},returns:paginationResultValidator(noticeDTO),handler:async(ctx,{paginationOpts})=>{
    const business=await requireMyBusiness(ctx);
    if(!Number.isSafeInteger(paginationOpts.numItems)||paginationOpts.numItems<1)throw new ConvexError({code:"INVALID_PAGINATION"});
    const page=await ctx.db.query("appointmentNotices").withIndex("by_businessId_and_updatedAt",q=>q.eq("businessId",business._id))
      .order("desc").paginate({...paginationOpts,numItems:Math.min(5,paginationOpts.numItems),maximumRowsRead:20,maximumBytesRead:128000});
    const entries=await Promise.all(page.page.map(async notice=>{
      const saved=await ctx.db.get("appointments",notice.appointmentId);
      const row=saved?.businessId===business._id?saved:null;
      const sameRevision=!!row&&(row.version??0)===notice.version&&row.start===notice.start;
      const stored=notice.snapshot?._id===notice.appointmentId?notice.snapshot:null;
      // Old records without a snapshot may use a still-identical context only.
      // Otherwise retain the notice and timestamp without inventing old details.
      const snapshot=stored??(sameRevision&&row?publicAppointment(row):null);
      const contextCurrent=!!(notice.active&&sameRevision&&row
        &&(notice.kind==="reminder"?row.status==="confirmed":row.status==="no_show")
        &&(!stored||(row.end===stored.end&&row.date===stored.date&&row.serviceId===stored.serviceId&&row.serviceName===stored.serviceName&&row.clientName===stored.clientName)));
      return {_id:notice._id,stage:notice.stage,read:(notice.readStage??-1)>=notice.stage,kind:notice.kind,publishedAt:notice.updatedAt,originalStart:notice.start,
        appointment:snapshot,currentAppointment:row?publicAppointment(row):null,contextCurrent,undo:contextCurrent&&row?resultTicket(row):null};
    }));
    return {...page,page:entries};
  }
});
const noticeCommand={noticeId:v.id("appointmentNotices"),stage:v.number(),operationId:v.string()};
async function ownedNotice(ctx:MutationCtx,args:{noticeId:Id<"appointmentNotices">;stage:number;operationId:string}){
  const business=await requireMyBusiness(ctx);resultOperation(args.operationId);
  const notice=await ctx.db.get("appointmentNotices",args.noticeId);
  if(!notice||notice.businessId!==business._id)throw new ConvexError({code:"NOTICE_NOT_FOUND"});
  return notice.stage===args.stage?notice:null;
}
export const readMyAppointmentNotice=mutation({args:noticeCommand,returns:v.null(),handler:async(ctx,args)=>{
  const notice=await ownedNotice(ctx,args);
  // Reading historical information does not require a live appointment context.
  if(notice&&(notice.readStage??-1)<args.stage)await ctx.db.patch("appointmentNotices",notice._id,{readStage:args.stage});
  return null;
}});
export const claimMySystemReminder=mutation({args:noticeCommand,returns:v.boolean(),handler:async(ctx,args)=>{
  const notice=await ownedNotice(ctx,args);
  if(!notice||!notice.active||notice.kind!=="reminder"||(notice.systemStage??-1)>=args.stage)return false;
  const row=await ctx.db.get("appointments",notice.appointmentId);
  if(!row||row.businessId!==notice.businessId||(row.version??0)!==notice.version||row.start!==notice.start||row.status!=="confirmed"
    ||reminderStage(row.start,Date.now())!==args.stage)return false;
  // At-most-once external claim; history/reading never renews publication time.
  await ctx.db.patch("appointmentNotices",notice._id,{systemStage:args.stage,systemOperationId:args.operationId});
  return true;
}});
