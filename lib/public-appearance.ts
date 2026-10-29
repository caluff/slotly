import { z } from "zod";

export const publicThemes = {
  green: { label: "Verde", accent: "#176348", hover: "#104b36", surface: "#eaf3e9", selection: "#c7e6ca" },
  blue: { label: "Azul", accent: "#245b89", hover: "#19466e", surface: "#edf3f8", selection: "#c9deef" },
  clay: { label: "Terracota", accent: "#924331", hover: "#743325", surface: "#faf0eb", selection: "#edd0c3" },
  plum: { label: "Ciruela", accent: "#65458a", hover: "#50336f", surface: "#f3eef7", selection: "#dfd1ed" },
} as const;

const singleLine = (max: number) => z.string().max(max).transform(value => value.normalize("NFC").trim().replace(/\s+/g, " "))
  .refine(value => !/[\u0000-\u001f\u007f]/.test(value), "El texto contiene caracteres no válidos.");
export const publicAppearanceSchema = z.object({
  publicName: singleLine(100), professionalName: singleLine(100), address: singleLine(200),
  welcome: z.string().max(500).transform(value => value.normalize("NFC").trim()).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "El texto contiene caracteres no válidos."),
  phone: singleLine(40).refine(value => !value || /^\+?[\d ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 6 && value.replace(/\D/g, "").length <= 20, "Escribe un teléfono válido."),
  showPhone: z.boolean(), showPhoto: z.boolean(),
  theme: z.enum(["green", "blue", "clay", "plum"]), datePicker: z.enum(["native", "calendar"]),
}).refine(value => !value.showPhone || !!value.phone, { path: ["phone"], message: "Añade el teléfono que quieres mostrar." });

export type PublicAppearanceSettings = z.infer<typeof publicAppearanceSchema>;
export const defaultPublicAppearance: PublicAppearanceSettings = {
  publicName: "", professionalName: "", welcome: "", address: "", phone: "", showPhone: false, showPhoto: false, theme: "green", datePicker: "calendar",
};
export type PublicAppearanceView = { settings: PublicAppearanceSettings; photoUrl: string | null };
export type PrivatePublicAppearance = PublicAppearanceView & { version: number; hasPhoto: boolean };
export type PublicAppearanceSaveResult = PrivatePublicAppearance & { changed: boolean };
export const MAX_PUBLIC_PHOTO_BYTES = 2 * 1024 * 1024;
export function publicPhoneHref(phone: string) { return `tel:${phone.replace(/[^\d+]/g, "")}`; }
export function publicThemeStyle(theme: PublicAppearanceSettings["theme"]) {
  const colors = publicThemes[theme];
  const dark = {
    green: { accent: "#82d7ae", hover: "#a1e5c4", surface: "#203a2c", selection: "#355c44" },
    blue: { accent: "#9cc8f5", hover: "#bddcf9", surface: "#203448", selection: "#294865" },
    clay: { accent: "#ecad91", hover: "#f4c6b0", surface: "#3d2b24", selection: "#60402f" },
    plum: { accent: "#ceb0f0", hover: "#e0cafa", surface: "#352944", selection: "#524066" },
  }[theme];
  return { "--accent": `light-dark(${colors.accent}, ${dark.accent})`, "--accent-hover": `light-dark(${colors.hover}, ${dark.hover})`, "--surface": `light-dark(${colors.surface}, ${dark.surface})`, "--selection": `light-dark(${colors.selection}, ${dark.selection})` };
}
