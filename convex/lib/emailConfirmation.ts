import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { clientEmailSchema } from "../../lib/client-email";
import { confirmationEmail } from "../../lib/confirmation-email";

// Deliberately separate from any other project's provider variables. The final
// readiness gate is set only after the Slotly sender and credential are verified.
export function emailConfiguration() {
  const from = process.env.SLOTLY_EMAIL_FROM?.trim() ?? "";
  const key = process.env.SLOTLY_EMAIL_RESEND_API_KEY?.trim() ?? "";
  const address = /^Slotly <([^<>]+)>$/.exec(from)?.[1];
  const domain = address?.split("@")[1]?.toLowerCase();
  const reserved = !domain || /(^|\.)(test|invalid|localhost|example)$/.test(domain) || /(^|\.)example\.(com|net|org)$/.test(domain) || domain === "resend.dev";
  return process.env.SLOTLY_EMAIL_READY === "true" && address && clientEmailSchema.safeParse(address).success
    && !reserved && key.startsWith("re_") && key.length >= 12 ? { from, key } : null;
}

export async function enqueueConfirmation(ctx: MutationCtx, business: Doc<"businesses">, appointment: Doc<"appointments">, email: string | undefined) {
  const existing = await ctx.db.query("emailConfirmations").withIndex("by_appointmentId", q => q.eq("appointmentId", appointment._id)).unique();
  if (existing) return existing._id;
  const parsed = clientEmailSchema.safeParse(email), config = emailConfiguration(), now = Date.now();
  const state = business.emailConfirmationsEnabled !== true ? "disabled" : !parsed.success ? "no_recipient" : !config ? "not_configured" : "queued";
  const snapshot = { businessName: business.name, serviceName: appointment.serviceName, clientName: appointment.clientName,
    date: appointment.date, start: appointment.start, end: appointment.end, timeZone: business.timeZone, version: appointment.version ?? 0 };
  const eventId = await ctx.db.insert("emailConfirmations", {
    businessId: business._id, appointmentId: appointment._id, snapshot, state, attempts: 0, generation: 0,
    createdAt: now, updatedAt: now, providerKey: `slotly/appointment-confirmation/${appointment._id}`,
    ...(parsed.success ? { recipient: parsed.data } : {}),
    ...(state === "queued" && config && parsed.success ? { payloadJson: JSON.stringify(confirmationEmail(snapshot, config.from, parsed.data)), nextAttemptAt: now } : {}),
  });
  if (state === "queued") await ctx.scheduler.runAfter(0, internal.emailConfirmations.start, { eventId });
  return eventId;
}
