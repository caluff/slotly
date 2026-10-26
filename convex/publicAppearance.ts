import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { action, internalMutation, internalQuery, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { appearanceProfile, appearanceSaveResult, privateAppearanceView, publicAppearanceSettings, publicAppearanceView } from "./publicAppearanceValidators";
import { defaultPublicAppearance, MAX_PUBLIC_PHOTO_BYTES, publicAppearanceSchema, type PrivatePublicAppearance, type PublicAppearanceSaveResult, type PublicAppearanceSettings } from "../lib/public-appearance";
import { isBookingSlug } from "../lib/booking-slug";
import { serviceOption } from "./serviceValidators";

async function ownedBusiness(ctx: Pick<QueryCtx, "db">, ownerId: string) {
  const business = await ctx.db.query("businesses").withIndex("by_ownerId", q => q.eq("ownerId", ownerId)).unique();
  if (!business) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
  return business;
}
async function profileFor(ctx: Pick<QueryCtx, "db">, businessId: Id<"businesses">) {
  return ctx.db.query("publicBookingProfiles").withIndex("by_businessId", q => q.eq("businessId", businessId)).unique();
}
export const getMy = query({
  args: {}, returns: privateAppearanceView,
  handler: async (ctx): Promise<PrivatePublicAppearance> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const business = await ownedBusiness(ctx, identity.subject), profile = await profileFor(ctx, business._id);
    const photoUrl = profile?.photoStorageId ? await ctx.storage.getUrl(profile.photoStorageId) : null;
    return { settings: profile?.settings ?? defaultPublicAppearance, version: profile?.version ?? 0, photoUrl, hasPhoto: !!photoUrl };
  },
});
export const getPublic = query({
  args: { slug: v.string() }, returns: v.union(publicAppearanceView, v.null()),
  handler: async (ctx, { slug }) => {
    if (!isBookingSlug(slug)) return null;
    const business = await ctx.db.query("businesses").withIndex("by_publicBookingSlug", q => q.eq("publicBookingSlug", slug)).unique();
    if (!business?.publicBookingEnabled) return null;
    const profile = await profileFor(ctx, business._id);
    if (!profile) return null;
    const settings = { ...profile.settings, phone: profile.settings.showPhone ? profile.settings.phone : "" };
    return { settings, photoUrl: settings.showPhoto && profile.photoStorageId ? await ctx.storage.getUrl(profile.photoStorageId) : null };
  },
});
// Same index, order, page size and DTO as the public catalogue. Ownership allows
// previewing it before the booking link is activated, without changing the link.
export const listPreviewServices = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(serviceOption),
  handler: async (ctx, { paginationOpts }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const business = await ownedBusiness(ctx, identity.subject);
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
    const page = await ctx.db.query("services").withIndex("by_businessId_and_archived", q => q.eq("businessId", business._id).lt("archived", true))
      .paginate({ ...paginationOpts, numItems: Math.min(100, paginationOpts.numItems), maximumRowsRead: 100 });
    return { ...page, page: page.page.map(service => ({ id: service._id, name: service.name, durationMinutes: service.durationMinutes, version: service.version ?? 0 })) };
  },
});
export const loadContext = internalQuery({
  args: { ownerId: v.string() }, returns: v.object({ businessId: v.id("businesses"), profile: v.union(appearanceProfile, v.null()) }),
  handler: async (ctx, { ownerId }) => { const business = await ownedBusiness(ctx, ownerId); return { businessId: business._id, profile: await profileFor(ctx, business._id) }; },
});

export const commit = internalMutation({
  args: { ownerId: v.string(), businessId: v.id("businesses"), settings: publicAppearanceSettings, expectedVersion: v.number(), operationId: v.string(), requestHash: v.string(), photoStorageId: v.optional(v.id("_storage")), photoHash: v.optional(v.string()) },
  returns: v.object({ profile: appearanceProfile, changed: v.boolean(), replacedPhoto: v.union(v.id("_storage"), v.null()) }),
  handler: async (ctx, args) => {
    const business = await ctx.db.get("businesses", args.businessId);
    if (!business || business.ownerId !== args.ownerId) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
    const existing = await profileFor(ctx, business._id);
    if (existing?.lastOperationId === args.operationId) {
      if (existing.lastRequestHash !== args.requestHash) throw new ConvexError({ code: "COMMAND_CONFLICT" });
      return { profile: existing, changed: false, replacedPhoto: null };
    }
    if ((existing?.version ?? 0) !== args.expectedVersion) throw new ConvexError({ code: "PROFILE_CHANGED" });
    const values = { businessId: business._id, settings: args.settings, version: args.expectedVersion + 1, updatedAt: Date.now(),
      photoStorageId: args.photoStorageId, photoHash: args.photoHash, lastOperationId: args.operationId, lastRequestHash: args.requestHash };
    const id = existing ? existing._id : await ctx.db.insert("publicBookingProfiles", values);
    if (existing) await ctx.db.patch("publicBookingProfiles", existing._id, values);
    const profile = await ctx.db.get("publicBookingProfiles", id);
    if (!profile) throw new Error("Saved profile missing");
    return { profile, changed: true, replacedPhoto: existing?.photoStorageId && existing.photoStorageId !== args.photoStorageId ? existing.photoStorageId : null };
  },
});

async function sha256(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
}
function photoType(bytes: ArrayBuffer) {
  const b = new Uint8Array(bytes);
  if (b.length > MAX_PUBLIC_PHOTO_BYTES || b.length < 12) throw new ConvexError({ code: "INVALID_PHOTO" });
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)) return "image/png";
  if (String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "image/webp";
  throw new ConvexError({ code: "INVALID_PHOTO" });
}
function savedResult(profile: Doc<"publicBookingProfiles">, photoUrl: string | null, changed: boolean): PublicAppearanceSaveResult {
  return { settings: profile.settings, version: profile.version, photoUrl, hasPhoto: !!photoUrl, changed };
}
export const save = action({
  args: { settings: publicAppearanceSettings, expectedVersion: v.number(), operationId: v.string(), removePhoto: v.boolean(), imageBytes: v.optional(v.bytes()) },
  returns: appearanceSaveResult,
  handler: async (ctx, args): Promise<PublicAppearanceSaveResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const parsed = publicAppearanceSchema.safeParse(args.settings);
    if (!parsed.success || !Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 0 || !/^[a-zA-Z0-9_-]{16,128}$/.test(args.operationId) || args.removePhoto && args.imageBytes) throw new ConvexError({ code: "INVALID_APPEARANCE" });
    const settings: PublicAppearanceSettings = parsed.data;
    const type = args.imageBytes ? photoType(args.imageBytes) : null;
    const imageHash = args.imageBytes ? await sha256(args.imageBytes) : undefined;
    const requestHash = await sha256(new TextEncoder().encode(JSON.stringify({ settings, expectedVersion: args.expectedVersion, photo: imageHash ?? (args.removePhoto ? "remove" : "keep") })).buffer);
    const context: { businessId: Id<"businesses">; profile: Doc<"publicBookingProfiles"> | null } = await ctx.runQuery(internal.publicAppearance.loadContext, { ownerId: identity.subject });
    const existing = context.profile;
    if (existing?.lastOperationId === args.operationId) {
      if (existing.lastRequestHash !== requestHash) throw new ConvexError({ code: "COMMAND_CONFLICT" });
      return savedResult(existing, existing.photoStorageId ? await ctx.storage.getUrl(existing.photoStorageId) : null, false);
    }
    if ((existing?.version ?? 0) !== args.expectedVersion) throw new ConvexError({ code: "PROFILE_CHANGED" });
    let photoStorageId = args.removePhoto ? undefined : existing?.photoStorageId;
    let photoHash = args.removePhoto ? undefined : existing?.photoHash;
    let uploaded: Id<"_storage"> | undefined;
    if (args.imageBytes && imageHash !== existing?.photoHash) {
      uploaded = await ctx.storage.store(new Blob([args.imageBytes], { type: type! }));
      photoStorageId = uploaded; photoHash = imageHash;
    }
    if (settings.showPhoto && !photoStorageId) throw new ConvexError({ code: "PHOTO_REQUIRED" });
    try {
      const result: { profile: Doc<"publicBookingProfiles">; changed: boolean; replacedPhoto: Id<"_storage"> | null } = await ctx.runMutation(internal.publicAppearance.commit, {
        ownerId: identity.subject, businessId: context.businessId, settings, expectedVersion: args.expectedVersion, operationId: args.operationId, requestHash, photoStorageId, photoHash,
      });
      if (uploaded && result.profile.photoStorageId !== uploaded) await ctx.storage.delete(uploaded).catch(() => undefined);
      if (result.replacedPhoto) await ctx.storage.delete(result.replacedPhoto).catch(() => undefined);
      return savedResult(result.profile, result.profile.photoStorageId ? await ctx.storage.getUrl(result.profile.photoStorageId) : null, result.changed);
    } catch (cause) {
      // A rejected transaction is definitive. A transport/runtime failure may
      // hide a successful commit, so it must retain the potentially used file.
      if (uploaded && cause instanceof ConvexError && ["PROFILE_CHANGED", "COMMAND_CONFLICT", "BUSINESS_NOT_FOUND"].includes(cause.data?.code)) await ctx.storage.delete(uploaded).catch(() => undefined);
      throw cause;
    }
  },
});
