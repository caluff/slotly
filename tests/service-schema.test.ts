import { describe, expect, test } from "vitest";
import { serviceSchema } from "../lib/service-schema";

const valid = { name: "Consulta de prueba", durationMinutes: "30" };

describe("validación del formulario de servicios", () => {
  test("normaliza el nombre y convierte minutos a número solo después de validar", () => {
    expect(serviceSchema.parse({ name: "  Consulta  ", durationMinutes: " 045 " }))
      .toEqual({ name: "Consulta", durationMinutes: 45 });
    expect(serviceSchema.parse({ ...valid, name: ` ${"a".repeat(100)} ` }).name).toHaveLength(100);
  });

  test.each(["", "   ", "\n\t", "a".repeat(101)])("rechaza el nombre inválido %j en su campo", (name) => {
    const result = serviceSchema.safeParse({ ...valid, name });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["name"]);
  });

  test.each(["", " ", "0", "-1", "1.5", "1.0000000000000001", "NaN", "Infinity", "1e3", "abc", "9007199254740992"])
    ("rechaza la duración inválida %j en su campo", (durationMinutes) => {
      const result = serviceSchema.safeParse({ ...valid, durationMinutes });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual(["durationMinutes"]);
    });

  test.each([1, 60, Number.MAX_SAFE_INTEGER])("acepta el entero positivo seguro %s", (durationMinutes) => {
    expect(serviceSchema.parse({ ...valid, durationMinutes: String(durationMinutes) }).durationMinutes).toBe(durationMinutes);
  });
});
