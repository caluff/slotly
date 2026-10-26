import { appointmentSchema } from "./appointment-schema";
import { z } from "zod";

export const clientNameSchema = z.string()
  .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value), "El nombre contiene caracteres no válidos.")
  .pipe(appointmentSchema.shape.clientName);
export const clientOperationPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Exclusive Unicode prefix bound. Increment a scalar, never split a surrogate.
export function clientPrefixEnd(prefix: string): string | null {
  const points = Array.from(prefix, character => character.codePointAt(0)!);
  while (points.length) {
    const last = points.pop()!;
    if (last < 0x10ffff) return String.fromCodePoint(...points, last === 0xd7ff ? 0xe000 : last + 1);
  }
  return null;
}
