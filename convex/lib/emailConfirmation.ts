import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { clientEmailSchema } from "../../lib/client-email";
import { confirmationEmail } from "../../lib/confirmation-email";

const developmentDeploymentUrl = "https://determined-poodle-377.convex.cloud";
const testSender = "Slotly <onboarding@resend.dev>";

export function emailTestModeRequested() {
  return process.env.SLOTLY_EMAIL_MODE === "test";
}

export function emailPreferenceEnabled(business: Doc<"businesses">) {
  return (emailTestModeRequested() ? business.emailConfirmationsTestEnabled : business.emailConfirmationsEnabled) === true;
}

export function emailConfiguration() {
  const key = process.env.SLOTLY_EMAIL_RESEND_API_KEY?.trim() ?? "";
  if (process.env.SLOTLY_EMAIL_READY !== "true" || !key.startsWith("re_") || key.length < 12) return null;

  if (emailTestModeRequested()) {
    if (process.env.CONVEX_CLOUD_URL !== developmentDeploymentUrl) return null;
    const recipient = clientEmailSchema.safeParse(process.env.SLOTLY_EMAIL_TEST_RECIPIENT);
    return recipient.success ? { from: testSender, key, testRecipient: recipient.data } : null;
  }
  if (process.env.SLOTLY_EMAIL_MODE) return null;

  const from = process.env.SLOTLY_EMAIL_FROM?.trim() ?? "";
  const address = /^Slotly <([^<>]+)>$/.exec(from)?.[1];
  const domain = address?.split("@")[1]?.toLowerCase();
  const reserved = !domain || /(^|\.)(test|invalid|localhost|example)$/.test(domain) || /(^|\.)example\.(com|net|org)$/.test(domain) || domain === "resend.dev";
  return address && clientEmailSchema.safeParse(address).success && !reserved ? { from, key, testRecipient: null } : null;
}

export function confirmationDispatchError(config: ReturnType<typeof emailConfiguration>, payloadJson: string | undefined) {
  if (!config || !payloadJson) return "configuration_unavailable";
  try {
    const payload: unknown = JSON.parse(payloadJson);
    if (!payload || typeof payload !== "object" || !("from" in payload)) return "configuration_unavailable";
    if ((payload.from === testSender) !== (config.testRecipient !== null)) return "configuration_unavailable";
    if (config.testRecipient !== null && (!("to" in payload) || !Array.isArray(payload.to)
      || payload.to.length !== 1 || payload.to[0] !== config.testRecipient || "cc" in payload || "bcc" in payload)) {
      return "test_recipient_mismatch";
    }
    return null;
  } catch {
    return "configuration_unavailable";
  }
}

export async function enqueueConfirmation(ctx: MutationCtx, business: Doc<"businesses">, appointment: Doc<"appointments">, email: string | undefined) {
  const existing = await ctx.db.query("emailConfirmations").withIndex("by_appointmentId", q => q.eq("appointmentId", appointment._id)).unique();
  if (existing) return existing._id;
  const parsed = clientEmailSchema.safeParse(email), config = emailConfiguration(), now = Date.now();
  const state = !emailPreferenceEnabled(business) ? "disabled" : !parsed.success ? "no_recipient" : !config ? "not_configured"
    : config.testRecipient !== null && parsed.data !== config.testRecipient ? "suppressed" : "queued";
  const snapshot = { businessName: business.name, serviceName: appointment.serviceName, clientName: appointment.clientName,
    date: appointment.date, start: appointment.start, end: appointment.end, timeZone: business.timeZone, version: appointment.version ?? 0 };
  const eventId = await ctx.db.insert("emailConfirmations", {
    businessId: business._id, appointmentId: appointment._id, snapshot, state, attempts: 0, generation: 0,
    createdAt: now, updatedAt: now, providerKey: `slotly/appointment-confirmation/${appointment._id}`,
    ...(parsed.success ? { recipient: parsed.data } : {}),
    ...(state === "suppressed" ? { lastError: "test_recipient_mismatch" as const } : {}),
    ...(state === "queued" && config && parsed.success ? { payloadJson: JSON.stringify(confirmationEmail(snapshot, config.from, parsed.data)), nextAttemptAt: now } : {}),
  });
  if (state === "queued") await ctx.scheduler.runAfter(0, internal.emailConfirmations.start, { eventId });
  return eventId;
}
