import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeClientSearch } from "../../lib/appointment-search";
import { clientEmailSchema } from "../../lib/client-email";

export function requireClientEmail(value: string | undefined) {
  const parsed = clientEmailSchema.safeParse(value);
  if (!parsed.success) throw new ConvexError({ code: "INVALID_CLIENT_EMAIL" });
  return parsed.data;
}
export async function requireMyClient(ctx: QueryCtx, businessId: Id<"businesses">, clientId: Id<"clients">) {
  const saved = await ctx.db.get("clients", clientId);
  if (!saved || saved.businessId !== businessId) throw new ConvexError({ code: "CLIENT_NOT_FOUND" });
  return saved;
}

// Called only inside the caller's successful booking/manual-create transaction.
// The exact indexed range read makes racing inserts conflict and retry in OCC.
export async function clientForEmail(ctx: MutationCtx, businessId: Id<"businesses">, name: string, email: string) {
  const existing = await ctx.db.query("clients").withIndex("by_businessId_and_email",
    q => q.eq("businessId", businessId).eq("email", email)).unique();
  if (existing) return { client: existing, created: false };
  const id = await ctx.db.insert("clients", { businessId, name, email,
    normalizedName: normalizeClientSearch(name), createdAt: Date.now() });
  return { client: (await ctx.db.get("clients", id))!, created: true };
}

export async function creationHash(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
