import { z } from "zod";

export function normalizeClientName(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export const appointmentSchema = z.object({
  clientName: z.string().transform(normalizeClientName)
    .pipe(z.string().min(1, "Escribe el nombre del cliente.").max(100, "Usa como máximo 100 caracteres.")
      .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), "El nombre contiene caracteres no válidos.")),
  start: z.string().min(1, "Elige una opción de horario disponible."),
});

export type AppointmentFormValues = z.input<typeof appointmentSchema>;
export type AppointmentValues = z.output<typeof appointmentSchema>;
