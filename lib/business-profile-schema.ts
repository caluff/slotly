import * as z from "zod";

export function createBusinessProfileSchema(timeZones: readonly string[]) {
  const allowedTimeZones = new Set(timeZones);

  return z.object({
    name: z.string().trim()
      .min(1, "Escribe el nombre del negocio o profesional.")
      .max(100, "El nombre puede tener hasta 100 caracteres."),
    timeZone: z.string().refine((zone) => {
      if (!allowedTimeZones.has(zone) || /^[+-]/.test(zone)) return false;
      try {
        new Intl.DateTimeFormat("es", { timeZone: zone }).format(0);
        return true;
      } catch {
        return false;
      }
    }, { error: "Selecciona una zona horaria válida de la lista." }),
  });
}

export type BusinessProfileValues = z.infer<ReturnType<typeof createBusinessProfileSchema>>;
