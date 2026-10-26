import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { creationHash } from "./clientIdentity";
import { MANAGEMENT_LIFETIME_MS } from "../../lib/public-management";

export async function resolveManagementAccess(ctx: QueryCtx, secretHash: string) {
  const access = await ctx.db.query("publicBookingAccesses").withIndex("by_secretHash", q => q.eq("secretHash", secretHash)).unique();
  if (!access || access.revokedAt !== undefined) return null;
  const saved = await ctx.db.get("appointments", access.appointmentId), business = await ctx.db.get("businesses", access.businessId);
  if (!saved || !business || saved.businessId !== business._id) return null;
  return { access, saved, business };
}
export async function presentManagement(saved: Doc<"appointments">, business: Doc<"businesses">) {
  const { serviceName, date, start, end, status: state } = saved;
  const revision = await creationHash(["public-management-v1", saved._id, saved.version ?? 0, state, date, start, end, serviceName, business.name, business.timeZone]);
  return { businessName: business.name, serviceName, date, start, end, timeZone: business.timeZone, state, revision };
}
export async function registerManagementAccess(ctx: MutationCtx, business: Doc<"businesses">, saved: Doc<"appointments">, secretHash: string) {
  const now = Date.now();
  // The creation transaction has read the unique hash range before any booking
  // writes. OCC retries competing reuse before a second appointment can commit.
  return await ctx.db.insert("publicBookingAccesses", { businessId: business._id, appointmentId: saved._id, secretHash, createdAt: now, expiresAt: now + MANAGEMENT_LIFETIME_MS });
}
