import { v } from "convex/values";

export const publicAppearanceSettings = v.object({
  publicName: v.string(), professionalName: v.string(), welcome: v.string(), address: v.string(), phone: v.string(),
  showPhone: v.boolean(), showPhoto: v.boolean(),
  theme: v.union(v.literal("green"), v.literal("blue"), v.literal("clay"), v.literal("plum"), v.literal("marine"), v.literal("ochre")),
  datePicker: v.union(v.literal("native"), v.literal("calendar")),
  tagline: v.optional(v.string()),
  profileLayout: v.optional(v.union(v.literal("inline"), v.literal("centered"))),
  headerStyle: v.optional(v.union(v.literal("plain"), v.literal("tinted"))),
  website: v.optional(v.string()),
  bookingNote: v.optional(v.string()),
  bookingAction: v.optional(v.union(v.literal("confirm"), v.literal("book"), v.literal("schedule"))),
});
export const publicAppearanceView = v.object({ settings: publicAppearanceSettings, photoUrl: v.union(v.string(), v.null()) });
export const privateAppearanceView = v.object({ settings: publicAppearanceSettings, photoUrl: v.union(v.string(), v.null()), version: v.number(), hasPhoto: v.boolean() });
export const appearanceSaveResult = v.object({ settings: publicAppearanceSettings, photoUrl: v.union(v.string(), v.null()), version: v.number(), hasPhoto: v.boolean(), changed: v.boolean() });
export const appearanceProfileFields = {
  businessId: v.id("businesses"), settings: publicAppearanceSettings, version: v.number(), updatedAt: v.number(),
  photoStorageId: v.optional(v.id("_storage")), photoHash: v.optional(v.string()), lastOperationId: v.string(), lastRequestHash: v.string(),
};
export const appearanceProfile = v.object({ _id: v.id("publicBookingProfiles"), _creationTime: v.number(), ...appearanceProfileFields });
