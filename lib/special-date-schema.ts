import * as z from "zod";
import { isLocalDate } from "./local-date";

export const localTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isIanaTimeZone(zone: string) {
  if (/^[+-]/.test(zone)) return false;
  try { new Intl.DateTimeFormat("es", { timeZone: zone }).format(0); return true; }
  catch { return false; }
}

export const specialDateSchema = z.strictObject({
  date: z.string().refine(isLocalDate, "Elige una fecha real."),
  isOpen: z.boolean(), start: z.string(), end: z.string(),
}).superRefine((value, ctx) => {
  if (!value.isOpen) return;
  for (const field of ["start", "end"] as const) {
    if (!localTimePattern.test(value[field])) ctx.addIssue({ code: "custom", path: [field], message: "Escribe una hora válida (HH:mm)." });
  }
  if (localTimePattern.test(value.start) && localTimePattern.test(value.end) && value.start >= value.end) {
    ctx.addIssue({ code: "custom", path: ["end"], message: "El cierre debe ser posterior a la apertura, dentro del mismo día." });
  }
}).transform((value) => ({ ...value, start: value.isOpen ? value.start : null, end: value.isOpen ? value.end : null }));
