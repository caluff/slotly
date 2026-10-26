import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { emailConfiguration } from "./lib/emailConfirmation";

// Fixed provider destination. Only the isolated engine harness replaces this
// literal in its own temporary workspace; there is no runtime override.
const PROVIDER_URL = "https://api.resend.com/emails";
export const send = internalAction({
  args: { eventId: v.id("emailConfirmations"), generation: v.number() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const config = emailConfiguration();
    const claim = await ctx.runMutation(internal.emailConfirmations.authorize, args);
    if (!claim) return null;
    if (!config) {
      await ctx.runMutation(internal.emailConfirmations.finish, { ...args, outcome: "permanent", error: "configuration_unavailable" });
      return null;
    }
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000);
    // Only the external call is caught. A failed finalization must leave the
    // lease for its watchdog, not manufacture a contradictory provider result.
    let result: { outcome: "accepted"; providerMessageId: string } | { outcome: "transient" | "uncertain" | "permanent"; error: "provider_uncertain" | "provider_rejected" | "provider_transient" | "provider_quota"; retryAfterMs?: number };
    try {
      if (Date.now() >= claim.deadline) throw new Error("Idempotency window expired before dispatch");
      const response = await fetch(PROVIDER_URL, { method: "POST", signal: controller.signal,
        headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "User-Agent": "Slotly/1.0", "Idempotency-Key": claim.providerKey }, body: claim.payloadJson });
      const raw = await response.text();
      let body: { id?: unknown; name?: unknown } = {};
      if (raw.length < 16_000) { try { const parsed: unknown = JSON.parse(raw); if (parsed && typeof parsed === "object") body = parsed; } catch { /* uncertain success or provider error */ } }
      if (response.ok) result = typeof body.id === "string" && body.id.length > 0 && body.id.length <= 200
        ? { outcome: "accepted", providerMessageId: body.id } : { outcome: "uncertain", error: "provider_uncertain" };
      else if (response.status === 408) result = { outcome: "uncertain", error: "provider_uncertain" };
      else if (response.status === 429 && (body.name === "daily_quota_exceeded" || body.name === "monthly_quota_exceeded")) result = { outcome: "permanent", error: "provider_quota" };
      else if (response.status === 429 || response.status >= 500 || (response.status === 409 && body.name === "concurrent_idempotent_requests")) {
        const header = response.headers.get("retry-after"), seconds = header === null ? NaN : Number(header);
        const retryAfterMs = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : header ? Math.max(0, Date.parse(header) - Date.now()) : 0;
        result = { outcome: "transient", error: "provider_transient", ...(Number.isFinite(retryAfterMs) ? { retryAfterMs } : {}) };
      } else result = { outcome: "permanent", error: "provider_rejected" };
    } catch { result = { outcome: "uncertain", error: "provider_uncertain" }; }
    finally { clearTimeout(timeout); }
    await ctx.runMutation(internal.emailConfirmations.finish, { ...args, ...result });
    return null;
  },
});
