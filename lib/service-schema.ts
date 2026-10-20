import * as z from "zod";

const durationError = "Escribe una duración en minutos enteros positivos, hasta 9007199254740991.";

export const serviceSchema = z.object({
  name: z.string().trim()
    .min(1, "Escribe el nombre del servicio.")
    .max(100, "El nombre puede tener hasta 100 caracteres."),
  // Keep the editable value as text: empty input must not become zero, and a
  // fractional string must not round to an accepted integer during conversion.
  durationMinutes: z.string().trim()
    .regex(/^\d+$/, { error: durationError })
    .transform(Number)
    .refine((value) => Number.isSafeInteger(value) && value > 0, { error: durationError }),
});

export type ServiceFormValues = z.input<typeof serviceSchema>;
export type ServiceValues = z.output<typeof serviceSchema>;
