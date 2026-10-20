import { describe, expect, test } from "vitest";
import { createBusinessProfileSchema } from "../lib/business-profile-schema";

const schema = createBusinessProfileSchema(["America/Montevideo", "Europe/Madrid", "UTC"]);
const valid = { name: "Slotly de prueba", timeZone: "America/Montevideo" };

describe("validación del formulario del negocio", () => {
  test("normaliza el nombre antes de enviarlo y admite el límite de 100 caracteres", () => {
    expect(schema.parse({ ...valid, name: "  Estudio de prueba  " }).name).toBe("Estudio de prueba");
    expect(schema.parse({ ...valid, name: `  ${"a".repeat(100)}  ` }).name).toHaveLength(100);
  });

  test.each(["", "   ", "\n\t", "a".repeat(101)])("asocia el nombre inválido a su campo: %j", (name) => {
    const result = schema.safeParse({ ...valid, name });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["name"]);
  });

  test.each(["", "America/Inventada", "+03:00", "Europe/Paris"])("rechaza una zona fuera de las opciones: %j", (timeZone) => {
    const result = schema.safeParse({ ...valid, timeZone });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["timeZone"]);
  });

  test.each(["Europe/Madrid", "UTC"])("acepta la opción válida %s", (timeZone) => {
    expect(schema.parse({ ...valid, timeZone }).timeZone).toBe(timeZone);
  });

  test("una lista defectuosa tampoco permite offsets ni zonas inexistentes", () => {
    const brokenOptions = createBusinessProfileSchema(["America/Inventada", "+03:00"]);
    expect(brokenOptions.safeParse({ ...valid, timeZone: "America/Inventada" }).success).toBe(false);
    expect(brokenOptions.safeParse({ ...valid, timeZone: "+03:00" }).success).toBe(false);
  });
});
