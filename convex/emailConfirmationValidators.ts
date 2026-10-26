import { v } from "convex/values";

export const emailState = v.union(v.literal("disabled"), v.literal("no_recipient"), v.literal("not_configured"),
  v.literal("queued"), v.literal("sending"), v.literal("sent"), v.literal("failed"), v.literal("review"), v.literal("suppressed"));
export const emailError = v.union(v.literal("configuration_unavailable"), v.literal("preference_disabled"), v.literal("appointment_changed"),
  v.literal("idempotency_window_elapsed"), v.literal("attempts_exhausted"), v.literal("provider_rejected"),
  v.literal("provider_quota"), v.literal("provider_transient"), v.literal("provider_uncertain"));
export const emailSnapshot = v.object({ businessName: v.string(), serviceName: v.string(), clientName: v.string(),
  date: v.string(), start: v.number(), end: v.number(), timeZone: v.string(), version: v.number() });
export const emailEventFields = {
  businessId: v.id("businesses"), appointmentId: v.id("appointments"), snapshot: emailSnapshot,
  recipient: v.optional(v.string()), payloadJson: v.optional(v.string()), providerKey: v.string(),
  state: emailState, attempts: v.number(), generation: v.number(), createdAt: v.number(), updatedAt: v.number(),
  firstAttemptAt: v.optional(v.number()), nextAttemptAt: v.optional(v.number()), leaseUntil: v.optional(v.number()),
  dispatchedAt: v.optional(v.number()), uncertain: v.optional(v.boolean()), lastError: v.optional(emailError),
  providerMessageId: v.optional(v.string()), acceptedAt: v.optional(v.number()), finishedAt: v.optional(v.number()),
};

export const EMAIL_MAX_ATTEMPTS = 3;
export const EMAIL_LEASE_MS = 90_000;
export const EMAIL_RETRY_MS = 30_000;
// Stay conservatively inside the provider's 24-hour idempotency retention.
export const EMAIL_WINDOW_MS = 24 * 60 * 60_000 - 60_000;
