import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components, internal } from "./_generated/api";
import { action, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { bookableSlot, occupyingAppointmentsForDate, overlaps } from "./lib/appointmentData";
import { generateAvailability } from "./lib/availability";
import { isBookingSlug } from "../lib/booking-slug";
import { isLocalDate } from "../lib/local-date";
import { clientNameSchema } from "../lib/client-schema";
import { clientEmailSchema } from "../lib/client-email";
import { clientForEmail, creationHash } from "./lib/clientIdentity";
import { appointmentSchema } from "../lib/appointment-schema";
import { weeklyScheduleDay } from "./weeklyScheduleValidators";
import { specialDay } from "./specialDateValidators";
import { scheduleForDate } from "./lib/scheduleForDate";
import { scheduleAttention } from "./lib/appointmentAttention";
import { activeBlocksForDate } from "./lib/timeBlocks";
import { serviceContext, serviceOption } from "./serviceValidators";
import { enqueueConfirmation } from "./lib/emailConfirmation";
import { isManagementSecret, managementSecretHash } from "../lib/public-management";
import { registerManagementAccess } from "./lib/publicManagement";

const limiter = new RateLimiter(components.rateLimiter, {
  publicConfirm: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
});

async function activeBusiness(ctx: QueryCtx, slug: string) {
  if (!isBookingSlug(slug)) return null;
  const business = await ctx.db.query("businesses")
    .withIndex("by_publicBookingSlug", (q) => q.eq("publicBookingSlug", slug)).unique();
  return business?.publicBookingEnabled === true ? business : null;
}

// Public DTOs are explicit allowlists. No owner, business ID, schedule,
// appointment ID, client name or internal timestamps leave these reads.
export const getBusiness = query({
  args: { slug: v.string() }, returns: v.union(v.null(), v.object({ name: v.string(), timeZone: v.string() })),
  handler: async (ctx, { slug }) => {
    const business = await activeBusiness(ctx, slug);
    return business ? { name: business.name, timeZone: business.timeZone } : null;
  },
});

const serviceDTO = serviceOption;
export const listServices = query({
  args: { slug: v.string(), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(serviceDTO),
  handler: async (ctx, { slug, paginationOpts }) => {
    const business = await activeBusiness(ctx, slug);
    if (!business) return { page: [], isDone: true, continueCursor: "" };
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
    const page = await ctx.db.query("services").withIndex("by_businessId_and_archived", (q) => q.eq("businessId", business._id).lt("archived", true))
      .paginate({ ...paginationOpts, numItems: Math.min(100, paginationOpts.numItems), maximumRowsRead: 100 });
    return { ...page, page: page.page.map((s) => ({ id: s._id, name: s.name, durationMinutes: s.durationMinutes, version: s.version ?? 0 })) };
  },
});

const slotDTO = v.object({ start: v.number(), end: v.number(), startTime: v.string(), endTime: v.string() });
async function availabilitySource(ctx: QueryCtx, { slug, serviceId, date }: { slug: string; serviceId: import("./_generated/dataModel").Id<"services">; date: string }) {
  const business = await activeBusiness(ctx, slug);
  if (!business || !isLocalDate(date)) return null;
  const service = await ctx.db.get("services", serviceId);
  if (!service || service.businessId !== business._id || service.archived === true) return null;
  const schedule = await scheduleForDate(ctx, business._id, date);
  const occupied = [...await occupyingAppointmentsForDate(ctx, business._id, date), ...await activeBlocksForDate(ctx, business._id, date)];
  return { timeZone: business.timeZone, service: { id: service._id, name: service.name, durationMinutes: service.durationMinutes, version: service.version ?? 0 }, durationMinutes: service.durationMinutes, ...schedule,
    occupied: occupied.map(({ start, end }) => ({ start, end })) };
}

// Opaque invalidation only, never a source of bookable instants or private IDs.
// The uncached action still supplies server time; confirmation rechecks in OCC.
export const getAvailabilityRevision = query({
  args: { slug: v.string(), serviceId: v.id("services"), date: v.string() }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const source = await availabilitySource(ctx, args);
    if (!source) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(source)));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  },
});
export const getSource = internalQuery({
  args: { slug: v.string(), serviceId: v.id("services"), date: v.string() },
  returns: v.union(v.null(), v.object({ timeZone: v.string(), service: serviceOption, durationMinutes: v.number(),
    days: v.union(v.array(weeklyScheduleDay), v.null()), specialDay: v.union(specialDay, v.null()), occupied: v.array(v.object({ start: v.number(), end: v.number() })) })),
  handler: availabilitySource,
});

export const getAvailability = action({
  args: { slug: v.string(), serviceId: v.id("services"), date: v.string() },
  returns: v.union(v.null(), v.object({ slots: v.array(slotDTO), service: serviceOption })),
  handler: async (ctx, args): Promise<{ slots: { start: number; end: number; startTime: string; endTime: string }[]; service: import("convex/values").Infer<typeof serviceOption> } | null> => {
    const source = await ctx.runQuery(internal.publicBooking.getSource, args);
    if (!source) return null;
    const now = Date.now();
    const result = generateAvailability({ ...source, date: args.date, now });
    return { service: source.service, slots: result.slots.filter((slot) => slot.start > now && !source.occupied.some((saved) => overlaps(slot, saved))) };
  },
});

const receiptDTO = v.object({ serviceName: v.string(), date: v.string(), start: v.number(), end: v.number(), timeZone: v.string() });
const failureCode = v.union(v.literal("UNAVAILABLE"), v.literal("INVALID_ATTEMPT"), v.literal("INVALID_CLIENT_NAME"), v.literal("INVALID_CLIENT_EMAIL"),
  v.literal("INVALID_DATE"), v.literal("SLOT_UNAVAILABLE"), v.literal("SLOT_TAKEN"), v.literal("SERVICE_NOT_FOUND"),
  v.literal("DAY_CAPACITY_EXCEEDED"), v.literal("ATTEMPT_CONFLICT"), v.literal("RATE_LIMITED"), v.literal("SERVICE_CHANGED"), v.literal("SERVICE_ARCHIVED"));
export const confirm = mutation({
  args: { slug: v.string(), attemptKey: v.string(), serviceId: v.id("services"), date: v.string(), start: v.number(), clientName: v.string(), email: v.optional(v.string()), expectedService: v.optional(serviceContext), managementSecret: v.optional(v.string()) },
  returns: v.union(v.object({ ok: v.literal(true), receipt: receiptDTO, managementIssued: v.optional(v.literal(true)) }),
    v.object({ ok: v.literal(false), code: failureCode, retryAfter: v.optional(v.number()) })),
  handler: async (ctx, args) => {
    const business = await activeBusiness(ctx, args.slug);
    if (!business) return { ok: false as const, code: "UNAVAILABLE" as const };
    // One server-derived key for ALL callers of this business. Rotating an
    // attempt nonce/browser cannot bypass it; private operations never use it.
    const limit = await limiter.limit(ctx, "publicConfirm", { key: business._id });
    if (!limit.ok) return { ok: false as const, code: "RATE_LIMITED" as const, retryAfter: limit.retryAfter };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(args.attemptKey)) {
      return { ok: false as const, code: "INVALID_ATTEMPT" as const };
    }
    const parsed = appointmentSchema.safeParse({ clientName: args.clientName, start: String(args.start) });
    if (!parsed.success) return { ok: false as const, code: "INVALID_CLIENT_NAME" as const };
    const prior = await ctx.db.query("publicBookingReceipts")
      .withIndex("by_businessId_and_attemptKey", (q) => q.eq("businessId", business._id).eq("attemptKey", args.attemptKey)).unique();
    if (args.managementSecret !== undefined && !isManagementSecret(args.managementSecret)) return { ok: false as const, code: "INVALID_ATTEMPT" as const };
    const managementHash = args.managementSecret === undefined ? undefined : await managementSecretHash(args.managementSecret);
    const email = clientEmailSchema.safeParse(args.email);
    const requestHash = email.success ? await creationHash([args.serviceId, args.date, args.start, parsed.data.clientName, email.data,
      args.expectedService ? [args.expectedService.name, args.expectedService.durationMinutes, args.expectedService.version] : null, ...(managementHash ? [managementHash] : [])]) : null;
    if (prior) {
      if ((prior.requestHash === undefined ? args.email !== undefined || managementHash !== undefined : prior.requestHash !== requestHash) || prior.serviceId !== args.serviceId || prior.date !== args.date || prior.start !== args.start || prior.clientName !== parsed.data.clientName) {
        return { ok: false as const, code: "ATTEMPT_CONFLICT" as const };
      }
      // Immutable original acknowledgement, even if the owner later moves or
      // cancels it. Never a public appointment lookup or current private state.
      const { serviceName, date, start, end, timeZone } = prior;
      return { ok: true as const, receipt: { serviceName, date, start, end, timeZone }, ...(managementHash ? { managementIssued: true as const } : {}) };
    }
    if (!email.success) return { ok: false as const, code: "INVALID_CLIENT_EMAIL" as const };
    if (!clientNameSchema.safeParse(args.clientName).success) return { ok: false as const, code: "INVALID_CLIENT_NAME" as const };
    if (managementHash && await ctx.db.query("publicBookingAccesses").withIndex("by_secretHash", q => q.eq("secretHash", managementHash)).unique()) return { ok: false as const, code: "INVALID_ATTEMPT" as const };
    const currentService = await ctx.db.get("services", args.serviceId);
    if (!currentService || currentService.businessId !== business._id) return { ok: false as const, code: "SERVICE_NOT_FOUND" as const };
    // Expected rejections are VALUES: throwing would roll the limiter back.
    // No appointment writes precede these checks; unexpected failures still
    // roll the entire transaction back and are not counted as admitted attempts.
    let checked;
    try {
      // Optional only for Reto09 receipts stored by older clients. A fresh
      // booking with no viewed context fails closed inside bookableSlot.
      checked = await bookableSlot(ctx, business, args.serviceId, args.date, args.start, Date.now(), undefined, args.expectedService);
    } catch (cause) {
      if (cause instanceof ConvexError) {
        const code = cause.data.code;
        if (code === "INVALID_DATE" || code === "SLOT_UNAVAILABLE" || code === "SLOT_TAKEN"
          || code === "SERVICE_NOT_FOUND" || code === "DAY_CAPACITY_EXCEEDED" || code === "SERVICE_CHANGED" || code === "SERVICE_ARCHIVED") return { ok: false as const, code };
      }
      throw cause;
    }
    const { slot, service } = checked;
    const linked = await clientForEmail(ctx, business._id, parsed.data.clientName, email.data);
    const appointmentId = await ctx.db.insert("appointments", { businessId: business._id, serviceId: service._id,
      serviceName: service.name, clientName: parsed.data.clientName, clientId: linked.client._id, date: args.date, start: slot.start, end: slot.end, status: "confirmed", automationEnabled: true });
    const created = (await ctx.db.get("appointments", appointmentId))!;
    await scheduleAttention(ctx, created);
    await enqueueConfirmation(ctx, business, created, email.data);
    if (managementHash) await registerManagementAccess(ctx, business, created, managementHash);
    const receipt = { serviceName: service.name, date: args.date, start: slot.start, end: slot.end, timeZone: business.timeZone };
    await ctx.db.insert("publicBookingReceipts", { ...receipt, businessId: business._id, serviceId: service._id, appointmentId,
      attemptKey: args.attemptKey, clientName: parsed.data.clientName, requestHash: requestHash! });
    return { ok: true as const, receipt, ...(managementHash ? { managementIssued: true as const } : {}) };
  },
});
