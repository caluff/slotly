import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireMyAppointment, requireMyBusiness } from "./lib/appointmentData";
import { emailConfiguration } from "./lib/emailConfirmation";
import { emailError, emailState, EMAIL_LEASE_MS, EMAIL_MAX_ATTEMPTS, EMAIL_RETRY_MS, EMAIL_WINDOW_MS } from "./emailConfirmationValidators";

const settings = v.object({ enabled: v.boolean(), version: v.number(), configured: v.boolean() });
function presentSettings(business: Doc<"businesses">) {
  return { enabled: business.emailConfirmationsEnabled === true, version: business.emailConfirmationsVersion ?? 0, configured: !!emailConfiguration() };
}
export const getMySettings = query({ args: {}, returns: settings, handler: async ctx => presentSettings(await requireMyBusiness(ctx)) });
export const setMySettings = mutation({
  args: { enabled: v.boolean(), expectedVersion: v.number() }, returns: v.object({ changed: v.boolean(), settings }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), before = presentSettings(business);
    if (!Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 0 || args.expectedVersion !== before.version) throw new ConvexError({ code: "EMAIL_SETTINGS_CHANGED" });
    if (args.enabled && !before.configured) throw new ConvexError({ code: "EMAIL_NOT_CONFIGURED" });
    if (args.enabled === before.enabled) return { changed: false, settings: before };
    await ctx.db.patch("businesses", business._id, { emailConfirmationsEnabled: args.enabled, emailConfirmationsVersion: before.version + 1 });
    return { changed: true, settings: { ...before, enabled: args.enabled, version: before.version + 1 } };
  },
});
export const getMyAppointmentStatus = query({
  args: { appointmentId: v.id("appointments") },
  returns: v.object({ state: v.union(emailState, v.literal("not_requested")), attempts: v.number(), lastError: v.optional(emailError) }),
  handler: async (ctx, args) => {
    await requireMyAppointment(ctx, args.appointmentId);
    const event = await ctx.db.query("emailConfirmations").withIndex("by_appointmentId", q => q.eq("appointmentId", args.appointmentId)).unique();
    return event ? { state: event.state, attempts: event.attempts, ...(event.lastError ? { lastError: event.lastError } : {}) } : { state: "not_requested" as const, attempts: 0 };
  },
});

const acceptanceUncertain = (event: Doc<"emailConfirmations">) => event.uncertain === true || (event.state === "sending" && event.dispatchedAt !== undefined);
async function stopIfDisabled(ctx: MutationCtx, event: Doc<"emailConfirmations">, now: number) {
  const business = await ctx.db.get("businesses", event.businessId);
  if (business?.emailConfirmationsEnabled === true) return false;
  await ctx.db.patch("emailConfirmations", event._id, { state: acceptanceUncertain(event) ? "review" : "disabled", lastError: "preference_disabled",
    updatedAt: now, finishedAt: now, leaseUntil: undefined, nextAttemptAt: undefined });
  return true;
}
async function stopIfObsolete(ctx: MutationCtx, event: Doc<"emailConfirmations">, now: number) {
  const appointment = await ctx.db.get("appointments", event.appointmentId), original = event.snapshot;
  if (!appointment || appointment.businessId !== event.businessId || appointment.status !== "confirmed" || appointment.start <= now
    || appointment.start !== original.start || appointment.end !== original.end || appointment.date !== original.date
    || appointment.serviceName !== original.serviceName || (appointment.version ?? 0) !== original.version) {
    await ctx.db.patch("emailConfirmations", event._id, { state: acceptanceUncertain(event) ? "review" : "suppressed", lastError: "appointment_changed", updatedAt: now, finishedAt: now, leaseUntil: undefined, nextAttemptAt: undefined });
    return true;
  }
  return false;
}

// A scheduled mutation retries atomically. Each claim schedules both its action
// and a durable watchdog; a crashed/at-most-once action cannot strand the event.
export const start = internalMutation({
  args: { eventId: v.id("emailConfirmations") }, returns: v.union(v.null(), v.object({ generation: v.number(), leaseUntil: v.number() })),
  handler: async (ctx, { eventId }): Promise<{ generation: number; leaseUntil: number } | null> => {
    const event = await ctx.db.get("emailConfirmations", eventId), now = Date.now();
    if (!event || (event.state !== "queued" && event.state !== "sending")) return null;
    if ((event.state === "sending" && event.leaseUntil! > now) || (event.state === "queued" && event.nextAttemptAt! > now)) return null;
    const expired = event.firstAttemptAt !== undefined && now >= event.firstAttemptAt + EMAIL_WINDOW_MS;
    if (expired || event.attempts >= EMAIL_MAX_ATTEMPTS) {
      await ctx.db.patch("emailConfirmations", eventId, { state: "review", lastError: expired ? "idempotency_window_elapsed" : "attempts_exhausted", finishedAt: now, updatedAt: now, leaseUntil: undefined, nextAttemptAt: undefined });
      return null;
    }
    if (await stopIfDisabled(ctx, event, now) || await stopIfObsolete(ctx, event, now)) return null;
    if (!emailConfiguration() || !event.payloadJson) {
      await ctx.db.patch("emailConfirmations", eventId, { state: acceptanceUncertain(event) ? "review" : "not_configured", lastError: "configuration_unavailable", finishedAt: now, updatedAt: now, leaseUntil: undefined, nextAttemptAt: undefined });
      return null;
    }
    const generation = event.generation + 1, leaseUntil = now + EMAIL_LEASE_MS;
    await ctx.db.patch("emailConfirmations", eventId, { state: "sending", attempts: event.attempts + 1, generation,
      firstAttemptAt: event.firstAttemptAt ?? now, updatedAt: now, leaseUntil, nextAttemptAt: undefined, dispatchedAt: undefined,
      ...(event.state === "sending" ? { uncertain: true } : {}) });
    await ctx.scheduler.runAfter(0, internal.emailDispatch.send, { eventId, generation });
    await ctx.scheduler.runAt(leaseUntil, internal.emailConfirmations.start, { eventId });
    return { generation, leaseUntil };
  },
});
export const authorize = internalMutation({
  args: { eventId: v.id("emailConfirmations"), generation: v.number() },
  returns: v.union(v.null(), v.object({ payloadJson: v.string(), providerKey: v.string(), deadline: v.number() })),
  handler: async (ctx, args) => {
    const event = await ctx.db.get("emailConfirmations", args.eventId), now = Date.now();
    if (!event || event.state !== "sending" || event.generation !== args.generation || event.dispatchedAt !== undefined || event.leaseUntil! <= now) return null;
    const deadline = event.firstAttemptAt! + EMAIL_WINDOW_MS;
    if (now >= deadline) {
      await ctx.db.patch("emailConfirmations", event._id, { state: "review", lastError: "idempotency_window_elapsed", updatedAt: now, finishedAt: now, leaseUntil: undefined });
      return null;
    }
    if (await stopIfDisabled(ctx, event, now) || await stopIfObsolete(ctx, event, now)) return null;
    if (!emailConfiguration() || !event.payloadJson) {
      await ctx.db.patch("emailConfirmations", event._id, { state: acceptanceUncertain(event) ? "review" : "not_configured", lastError: "configuration_unavailable", updatedAt: now, finishedAt: now, leaseUntil: undefined });
      return null;
    }
    await ctx.db.patch("emailConfirmations", event._id, { dispatchedAt: now, updatedAt: now });
    return { payloadJson: event.payloadJson, providerKey: event.providerKey, deadline };
  },
});
export const finish = internalMutation({
  args: { eventId: v.id("emailConfirmations"), generation: v.number(), outcome: v.union(v.literal("accepted"), v.literal("transient"), v.literal("uncertain"), v.literal("permanent")),
    providerMessageId: v.optional(v.string()), retryAfterMs: v.optional(v.number()), error: v.optional(emailError) },
  returns: v.union(v.literal("applied"), v.literal("stale")),
  handler: async (ctx, args): Promise<"applied" | "stale"> => {
    const event = await ctx.db.get("emailConfirmations", args.eventId), now = Date.now();
    if (!event || event.state !== "sending" || event.generation !== args.generation || event.dispatchedAt === undefined) return "stale" as const;
    const base = { updatedAt: now, leaseUntil: undefined, nextAttemptAt: undefined };
    if (args.outcome === "accepted") {
      if (!args.providerMessageId || args.providerMessageId.length > 200) throw new Error("Invalid provider acknowledgement");
      await ctx.db.patch("emailConfirmations", event._id, { ...base, state: "sent", providerMessageId: args.providerMessageId, acceptedAt: now, finishedAt: now, lastError: undefined });
    } else {
      const uncertain = event.uncertain === true || args.outcome === "uncertain";
      const retryAfter = args.retryAfterMs !== undefined && Number.isFinite(args.retryAfterMs) ? Math.max(0, args.retryAfterMs) : 0;
      const nextAttemptAt = now + Math.max(EMAIL_RETRY_MS * 2 ** (event.attempts - 1), retryAfter);
      const outsideWindow = nextAttemptAt >= event.firstAttemptAt! + EMAIL_WINDOW_MS;
      const permanent = args.outcome === "permanent", exhausted = event.attempts >= EMAIL_MAX_ATTEMPTS;
      if (permanent || exhausted || outsideWindow) {
        await ctx.db.patch("emailConfirmations", event._id, { ...base, state: uncertain || outsideWindow ? "review" : "failed", uncertain,
          lastError: outsideWindow ? "idempotency_window_elapsed" : exhausted ? "attempts_exhausted" : args.error ?? "provider_rejected", finishedAt: now });
      } else {
        await ctx.db.patch("emailConfirmations", event._id, { ...base, state: "queued", uncertain, nextAttemptAt, lastError: args.error ?? "provider_transient" });
        await ctx.scheduler.runAt(nextAttemptAt, internal.emailConfirmations.start, { eventId: event._id });
      }
    }
    return "applied" as const;
  },
});
