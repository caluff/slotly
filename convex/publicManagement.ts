import { v } from "convex/values";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { action, internalQuery, mutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { managementDetails, managementView } from "./publicManagementValidators";
import { resolveManagementAccess, presentManagement } from "./lib/publicManagement";
import { isManagementSecret, managementSecretHash } from "../lib/public-management";
import { requireMyAppointment } from "./lib/appointmentData";
import { commitCancellation } from "./lib/appointmentCancellation";

const limiter = new RateLimiter(components.rateLimiter, { publicCancel: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 } });
const operation = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

// The public action hashes the capability before calling this deterministic
// source. No raw secret is passed to internal functions or scheduled jobs.
export const getSource = internalQuery({
  args: { secretHash: v.string() }, returns: v.union(v.null(), v.object({ expiresAt: v.number(), details: managementDetails })),
  handler: async (ctx, { secretHash }) => {
    const source = await resolveManagementAccess(ctx, secretHash);
    return source ? { expiresAt: source.access.expiresAt, details: await presentManagement(source.saved, source.business) } : null;
  },
});
export const get = action({
  args: { secret: v.string() }, returns: v.union(v.null(), managementView),
  handler: async (ctx, { secret }): Promise<import("convex/values").Infer<typeof managementView> | null> => {
    if (!isManagementSecret(secret)) return null;
    const source = await ctx.runQuery(internal.publicManagement.getSource, { secretHash: await managementSecretHash(secret) });
    const now = Date.now();
    if (!source || now >= source.expiresAt) return null;
    return { ...source.details, canCancel: source.details.state === "confirmed" && source.details.start > now };
  },
});

export const cancel = mutation({
  args: { secret: v.string(), operationId: v.string(), revision: v.string() },
  returns: v.union(v.object({ ok: v.literal(true), outcome: v.union(v.literal("cancelled"), v.literal("already_applied")), view: managementView }),
    v.object({ ok: v.literal(false), code: v.union(v.literal("INVALID_ACCESS"), v.literal("INVALID_COMMAND"), v.literal("CONTEXT_CHANGED"), v.literal("NOT_CANCELLABLE"), v.literal("RATE_LIMITED")), retryAfter: v.optional(v.number()) })),
  handler: async (ctx, args) => {
    if (!isManagementSecret(args.secret)) return { ok: false as const, code: "INVALID_ACCESS" as const };
    const source = await resolveManagementAccess(ctx, await managementSecretHash(args.secret)), now = Date.now();
    if (!source || now >= source.access.expiresAt) return { ok: false as const, code: "INVALID_ACCESS" as const };
    if (!operation(args.operationId) || !/^[a-f0-9]{64}$/.test(args.revision)) return { ok: false as const, code: "INVALID_COMMAND" as const };
    const limit = await limiter.limit(ctx, "publicCancel", { key: source.access._id });
    if (!limit.ok) return { ok: false as const, code: "RATE_LIMITED" as const, retryAfter: limit.retryAfter };
    const { access, saved, business } = source, details = await presentManagement(saved, business), prior = access.cancellation;
    if (prior) {
      if (prior.operationId === args.operationId && prior.requestedRevision === args.revision && details.revision === prior.cancelledRevision
        && saved.status === "cancelled" && (saved.version ?? 0) === prior.version && saved.cancelledAt === prior.cancelledAt) {
        return { ok: true as const, outcome: "already_applied" as const, view: { ...details, canCancel: false } };
      }
      return { ok: false as const, code: "CONTEXT_CHANGED" as const };
    }
    if (details.revision !== args.revision) return { ok: false as const, code: "CONTEXT_CHANGED" as const };
    const version = saved.version ?? 0;
    if (saved.status !== "confirmed" || saved.start <= now || !Number.isSafeInteger(version) || version < 0 || version >= Number.MAX_SAFE_INTEGER) return { ok: false as const, code: "NOT_CANCELLABLE" as const };
    await commitCancellation(ctx, saved, now, version + 1);
    const changed = { ...saved, status: "cancelled" as const, cancelledAt: now, version: version + 1, resultUndo: undefined };
    const view = { ...await presentManagement(changed, business), canCancel: false };
    await ctx.db.patch("publicBookingAccesses", access._id, { cancellation: { operationId: args.operationId, requestedRevision: args.revision, cancelledRevision: view.revision, version: version + 1, cancelledAt: now } });
    return { ok: true as const, outcome: "cancelled" as const, view };
  },
});

// Minimal owner-only revocation operation. No secret is returned or rotated and
// repeating it cannot renew revokedAt. There is no global access listing.
export const revokeMyAccess = mutation({
  args: { appointmentId: v.id("appointments") }, returns: v.object({ revoked: v.boolean() }),
  handler: async (ctx, { appointmentId }) => {
    await requireMyAppointment(ctx, appointmentId);
    const access = await ctx.db.query("publicBookingAccesses").withIndex("by_appointmentId", q => q.eq("appointmentId", appointmentId)).unique();
    if (!access) return { revoked: false };
    if (access.revokedAt === undefined) await ctx.db.patch("publicBookingAccesses", access._id, { revokedAt: Date.now() });
    return { revoked: true };
  },
});
