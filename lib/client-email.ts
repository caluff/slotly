import { z } from "zod";

// Contact identity only: no provider-specific alias rewriting or verification.
export const clientEmailSchema = z.string()
  .max(320, "Usa como máximo 254 caracteres en el correo.")
  .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "Escribe un correo válido.")
  .trim().toLowerCase()
  .pipe(z.email("Escribe un correo válido.").max(254, "Usa como máximo 254 caracteres en el correo."));
