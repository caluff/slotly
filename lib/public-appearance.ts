import { z } from "zod";

export const publicThemes = {
  green: { label: "Verde", accent: "#176348", hover: "#104b36", surface: "#eaf3e9", selection: "#c7e6ca" },
  blue: { label: "Azul", accent: "#245b89", hover: "#19466e", surface: "#edf3f8", selection: "#c9deef" },
  clay: { label: "Terracota", accent: "#924331", hover: "#743325", surface: "#faf0eb", selection: "#edd0c3" },
  plum: { label: "Ciruela", accent: "#65458a", hover: "#50336f", surface: "#f3eef7", selection: "#dfd1ed" },
  marine: { label: "Petróleo", accent: "#146467", hover: "#0c494b", surface: "#e7f3f1", selection: "#bde2dd" },
  ochre: { label: "Ocre", accent: "#7b4d14", hover: "#603a0c", surface: "#f8f1e3", selection: "#edd9b4" },
} as const;

export const publicBookingActions = {
  confirm: "Confirmar cita",
  book: "Reservar cita",
  schedule: "Agendar cita",
} as const;

const singleLine = (max: number) => z.string().max(max).transform(value => value.normalize("NFC").trim().replace(/\s+/g, " "))
  .refine(value => !/[\u0000-\u001f\u007f]/.test(value), "El texto contiene caracteres no válidos.");
const multiline = (max: number) => z.string().max(max).transform(value => value.normalize("NFC").trim())
  .refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "El texto contiene caracteres no válidos.");
const publicPhone = singleLine(40).refine(value => {
  const digits = value.replace(/\D/g, "").length;
  return !value || /^\+?[\d ()-]+$/.test(value) && digits >= 6 && digits <= 20;
}, "Escribe un teléfono válido.");

export function publicWebsiteHref(value: string | undefined) {
  const text = value?.trim();
  if (!text || !/^https:\/\//i.test(text) || /[\s\\]/.test(text)) return undefined;
  try {
    const url = new URL(text);
    return url.hostname && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export const publicAppearanceSchema = z.object({
  publicName: singleLine(100), professionalName: singleLine(100), address: singleLine(200),
  welcome: multiline(500),
  phone: publicPhone,
  showPhone: z.boolean(), showPhoto: z.boolean(),
  theme: z.enum(["green", "blue", "clay", "plum", "marine", "ochre"]), datePicker: z.enum(["native", "calendar"]),
  tagline: singleLine(100).optional(),
  profileLayout: z.enum(["inline", "centered"]).optional(),
  headerStyle: z.enum(["plain", "tinted"]).optional(),
  website: singleLine(500).refine(value => !value || !!publicWebsiteHref(value), "Escribe una dirección completa que empiece con https://.").optional(),
  bookingNote: multiline(300).optional(),
  bookingAction: z.enum(["confirm", "book", "schedule"]).optional(),
}).refine(value => !value.showPhone || !!value.phone, { path: ["phone"], message: "Añade el teléfono que quieres mostrar." });

export type PublicAppearanceSettings = z.infer<typeof publicAppearanceSchema>;
export const defaultPublicAppearance: PublicAppearanceSettings = {
  publicName: "", professionalName: "", welcome: "", address: "", phone: "", showPhone: false, showPhoto: false, theme: "green", datePicker: "calendar",
  tagline: "", profileLayout: "inline", headerStyle: "plain", website: "", bookingNote: "", bookingAction: "confirm",
};
export type PublicAppearanceView = { settings: PublicAppearanceSettings; photoUrl: string | null };
export type PrivatePublicAppearance = PublicAppearanceView & { version: number; hasPhoto: boolean };
export type PublicAppearanceSaveResult = PrivatePublicAppearance & { changed: boolean };
export const MAX_PUBLIC_PHOTO_BYTES = 2 * 1024 * 1024;
export function publicAppearanceDraft(saved: PublicAppearanceSettings): PublicAppearanceSettings {
  return { ...defaultPublicAppearance, ...saved, phone: saved.showPhone ? saved.phone : "" };
}
export function publicAppearanceForSave(draft: PublicAppearanceSettings, saved: PublicAppearanceSettings): PublicAppearanceSettings {
  const showPhone = !!draft.phone.trim();
  const previouslyHiddenPhone = saved.showPhone ? "" : saved.phone;
  return { ...draft, datePicker: "calendar", phone: showPhone ? draft.phone : previouslyHiddenPhone, showPhone };
}
export function publicPhoneHref(phone: string) {
  const number = publicPhone.safeParse(phone);
  return number.success && number.data ? `tel:${number.data.replace(/[^\d+]/g, "")}` : undefined;
}
export function publicThemeStyle(theme: PublicAppearanceSettings["theme"]) {
  const colors = publicThemes[theme];
  const dark = {
    green: { accent: "#82d7ae", hover: "#a1e5c4", surface: "#203a2c", selection: "#355c44" },
    blue: { accent: "#9cc8f5", hover: "#bddcf9", surface: "#203448", selection: "#294865" },
    clay: { accent: "#ecad91", hover: "#f4c6b0", surface: "#3d2b24", selection: "#60402f" },
    plum: { accent: "#ceb0f0", hover: "#e0cafa", surface: "#352944", selection: "#524066" },
    marine: { accent: "#8bd5d1", hover: "#ace4df", surface: "#203b3a", selection: "#315654" },
    ochre: { accent: "#efc07b", hover: "#f6d39e", surface: "#3b3021", selection: "#5e4727" },
  }[theme];
  return { "--accent": `light-dark(${colors.accent}, ${dark.accent})`, "--accent-hover": `light-dark(${colors.hover}, ${dark.hover})`, "--surface": `light-dark(${colors.surface}, ${dark.surface})`, "--selection": `light-dark(${colors.selection}, ${dark.selection})` };
}
