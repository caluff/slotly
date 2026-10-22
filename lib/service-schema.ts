import * as z from "zod";
import { durationError, validServiceDuration } from "./service-duration";


export const serviceSchema = z.object({
  name: z.string().trim()
    .min(1, "Escribe el nombre del servicio.")
    .max(100, "El nombre puede tener hasta 100 caracteres."),
  // Keep the editable value as text: empty input must not become zero, and a
  // fractional string must not round to an accepted integer during conversion.
  durationMinutes: z.string().trim()
    .regex(/^\d+$/, { error: durationError })
    .transform(Number)
    .refine(validServiceDuration, { error: durationError }),
});

export type ServiceFormValues = z.input<typeof serviceSchema>;
export type ServiceValues = z.output<typeof serviceSchema>;
