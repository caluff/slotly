import { ConvexError, v, type Infer } from "convex/values";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { action, internalQuery, mutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { managementDetails } from "./publicManagementValidators";
import { moveOptions, moveResult } from "./publicReschedulingValidators";
import { isManagementSecret, managementSecretHash } from "../lib/public-management";
import { resolveManagementAccess, presentManagement } from "./lib/publicManagement";
import { isLocalDate } from "../lib/local-date";
import { bookableSlot, occupyingAppointmentsForDate, overlaps } from "./lib/appointmentData";
import { commitRescheduling } from "./lib/appointmentRescheduling";
import { scheduleForDate } from "./lib/scheduleForDate";
import { activeBlocksForDate } from "./lib/timeBlocks";
import { generateAvailability } from "./lib/availability";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";
import { specialDay } from "./specialDateValidators";

const limiter = new RateLimiter(components.rateLimiter, { publicMove: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 } });
const operation = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

// Hash-only deterministic source. The public action applies fresh server time;
// no private source data, identifiers or arbitrary service selector leave it.
export const getOptionsSource = internalQuery({
  args: { secretHash: v.string(), date: v.string() },
  returns: v.union(v.null(), v.object({ expiresAt: v.number(), details: managementDetails,
    availability: v.union(v.null(), v.object({ durationMinutes: v.number(), days: v.union(v.null(), v.array(weeklyScheduleDay)),
      specialDay: v.union(v.null(), specialDay), occupied: v.array(v.object({ start: v.number(), end: v.number() })) })) })),
  handler: async (ctx, { secretHash, date }) => {
    const source = await resolveManagementAccess(ctx, secretHash);
    if (!source) return null;
    const { saved, business, access } = source, details = await presentManagement(saved, business);
    const result = { expiresAt: access.expiresAt, details };
    if (!isLocalDate(date) || saved.status !== "confirmed") return { ...result, availability: null };
    const service = await ctx.db.get("services", saved.serviceId), durationMinutes = (saved.end - saved.start) / 60_000;
    if (!service || service.businessId !== business._id || !Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) return { ...result, availability: null };
    const schedule = await scheduleForDate(ctx, business._id, date);
    const occupied = (await occupyingAppointmentsForDate(ctx, business._id, date)).filter(row => row._id !== saved._id).map(({ start, end }) => ({ start, end }));
    occupied.push(...(await activeBlocksForDate(ctx, business._id, date)).map(({ start, end }) => ({ start, end })));
    return { ...result, availability: { ...schedule, durationMinutes, occupied } };
  },
});
export const getOptions = action({
  args: { secret: v.string(), revision: v.string(), date: v.string() }, returns: moveOptions,
  handler: async (ctx, args): Promise<Infer<typeof moveOptions>> => {
    if (!isManagementSecret(args.secret)) return { ok: false, code: "INVALID_ACCESS" };
    const source = await ctx.runQuery(internal.publicRescheduling.getOptionsSource, { secretHash: await managementSecretHash(args.secret), date: args.date }), now = Date.now();
    if (!source || now >= source.expiresAt) return { ok: false, code: "INVALID_ACCESS" };
    if (source.details.revision !== args.revision) return { ok: false, code: "CONTEXT_CHANGED" };
    if (source.details.state !== "confirmed" || source.details.start <= now) return { ok: false, code: "NOT_RESCHEDULABLE" };
    if (!isLocalDate(args.date)) return { ok: false, code: "INVALID_DATE" };
    if (!source.availability) return { ok: false, code: "NOT_RESCHEDULABLE" };
    const result = generateAvailability({ date: args.date, timeZone: source.details.timeZone, ...source.availability, now });
    const slots = result.slots.filter(slot => slot.start > now && !source.availability!.occupied.some(row => overlaps(slot, row)));
    return { ...result, slots, status: result.status === "available" && !slots.length ? "empty" : result.status, ok: true, date: args.date, revision: source.details.revision };
  },
});

export const reschedule = mutation({
  args: { secret: v.string(), operationId: v.string(), revision: v.string(), date: v.string(), start: v.number() }, returns: moveResult,
  handler: async (ctx, args): Promise<Infer<typeof moveResult>> => {
    if (!isManagementSecret(args.secret)) return { ok: false, code: "INVALID_ACCESS" };
    const source = await resolveManagementAccess(ctx, await managementSecretHash(args.secret)), now = Date.now();
    if (!source || now >= source.access.expiresAt) return { ok: false, code: "INVALID_ACCESS" };
    if (!operation(args.operationId) || !/^[a-f0-9]{64}$/.test(args.revision)) return { ok: false, code: "INVALID_COMMAND" };
    const limit = await limiter.limit(ctx, "publicMove", { key: source.access._id });
    if (!limit.ok) return { ok: false, code: "RATE_LIMITED", retryAfter: limit.retryAfter };
    const { saved, business, access } = source, details = await presentManagement(saved, business), version = saved.version ?? 0;
    const previous = await ctx.db.query("publicRescheduleReceipts").withIndex("by_accessId_and_operationId", q => q.eq("accessId", access._id).eq("operationId", args.operationId)).unique();
    if (previous) {
      if (previous.requestedRevision !== args.revision || previous.requestedDate !== args.date || previous.requestedStart !== args.start
        || previous.resultRevision !== details.revision || previous.version !== version || previous.rescheduledAt !== saved.rescheduledAt
        || saved.status !== "confirmed" || saved.start <= now) return { ok: false, code: "CONTEXT_CHANGED" };
      return { ok: true, outcome: "already_applied", view: { ...details, canCancel: true } };
    }
    if (details.revision !== args.revision) return { ok: false, code: "CONTEXT_CHANGED" };
    if (saved.status !== "confirmed" || saved.start <= now || !Number.isSafeInteger(version) || version < 0 || version >= Number.MAX_SAFE_INTEGER) return { ok: false, code: "NOT_RESCHEDULABLE" };
    if (!isLocalDate(args.date)) return { ok: false, code: "INVALID_DATE" };
    let slot;
    try { ({ slot } = await bookableSlot(ctx, business, saved.serviceId, args.date, args.start, now, saved._id, undefined, (saved.end - saved.start) / 60_000)); }
    catch (error) {
      const code = error instanceof ConvexError ? error.data?.code : undefined;
      if (code === "SLOT_TAKEN") return { ok: false, code };
      if (["SLOT_UNAVAILABLE", "SERVICE_NOT_FOUND", "INVALID_APPOINTMENT_STATE", "DAY_CAPACITY_EXCEEDED"].includes(code)) return { ok: false, code: "SLOT_UNAVAILABLE" };
      throw error;
    }
    const unchanged = saved.date === args.date && saved.start === slot.start && saved.end === slot.end;
    if (!unchanged) await commitRescheduling(ctx, saved, args.date, slot, now, version);
    const changed = unchanged ? saved : { ...saved, date: args.date, ...slot, version: version + 1, rescheduledAt: now };
    const view = { ...await presentManagement(changed, business), canCancel: true };
    // One technical acknowledgement per accepted UUID, including no-op. It
    // never creates appointments/clients/jobs or renews an earlier command.
    await ctx.db.insert("publicRescheduleReceipts", { accessId: access._id, operationId: args.operationId, requestedRevision: args.revision,
      requestedDate: args.date, requestedStart: args.start, resultRevision: view.revision, version: changed.version ?? 0,
      outcome: unchanged ? "unchanged" : "rescheduled", ...(changed.rescheduledAt === undefined ? {} : { rescheduledAt: changed.rescheduledAt }) });
    return { ok: true, outcome: unchanged ? "unchanged" : "rescheduled", view };
  },
});
