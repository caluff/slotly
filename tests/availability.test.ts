import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { generateAvailability } from "../convex/lib/availability";
import { availabilitySchema } from "../lib/availability-schema";

const modules = {
  "../convex/businesses.ts": () => import("../convex/businesses"),
  "../convex/services.ts": () => import("../convex/services"),
  "../convex/weeklySchedule.ts": () => import("../convex/weeklySchedule"),
  "../convex/availability.ts": () => import("../convex/availability"),
  "../convex/_generated/server.js": () => import("../convex/_generated/server.js"),
};
const alice = { subject: "availability_alice", issuer: "https://clerk.test", email: "shared@example.test" };
const bob = { ...alice, subject: "availability_bob" };
const date = "2026-10-26"; // Monday
const now = Date.parse("2026-10-20T12:00:00Z");
const week = (start = "09:00", end = "10:00") => Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? start : null, end: i === 0 ? end : null,
}));
const generate = (overrides: Partial<Parameters<typeof generateAvailability>[0]> = {}) => generateAvailability({
  date, now, timeZone: "America/Montevideo", durationMinutes: 30, days: week(), ...overrides,
});
const labels = (result: ReturnType<typeof generate>) => result.slots.map((slot) => `${slot.startTime}–${slot.endTime}`);
afterEach(() => vi.restoreAllMocks());

describe("opciones derivadas y límites de tiempo", () => {
  test("paso de 15 desde apertura y final exacto al cierre", () => {
    expect(labels(generate())).toEqual(["09:00–09:30", "09:15–09:45", "09:30–10:00"]);
  });
  test("apertura no alineada a medianoche y duración 46 independiente del paso", () => {
    expect(labels(generate({ days: week("08:37", "10:00"), durationMinutes: 46 })))
      .toEqual(["08:37–09:23", "08:52–09:38", "09:07–09:53"]);
  });
  test.each([61, Number.MAX_SAFE_INTEGER])("duración %s excesiva sin aritmética insegura", (durationMinutes) => {
    expect(generate({ durationMinutes })).toMatchObject({ status: "empty", slots: [] });
  });
  test("final posterior excluido aunque el comienzo esté dentro", () => {
    expect(labels(generate({ durationMinutes: 46 }))).toEqual(["09:00–09:46"]);
  });
  test("generación acotada para día completo y duración mínima", () => {
    const result = generate({ days: week("00:00", "23:59"), durationMinutes: 1 });
    expect(result.slots).toHaveLength(96);
    expect(new Set(result.slots.map((slot) => slot.start)).size).toBe(96);
    expect(result.slots.every((slot) => slot.end - slot.start === 60_000)).toBe(true);
  });
  test("ausencia, semana cerrada y día cerrado son estados diferentes", () => {
    expect(generate({ days: null }).status).toBe("unconfigured");
    expect(generate({ days: week().map((day) => ({ ...day, isOpen: false, start: null, end: null })) }).status).toBe("week_closed");
    expect(generate({ date: "2026-10-27" }).status).toBe("day_closed");
  });
  test("pasado e inicio exacto hoy, con reloj controlado y sin redondear hacia atrás", () => {
    expect(generate({ now: Date.parse("2026-10-27T00:00:00-03:00") }).status).toBe("past_date");
    const exact = Date.parse(`${date}T09:15:00-03:00`);
    expect(labels(generate({ now: exact }))).toEqual(["09:15–09:45", "09:30–10:00"]);
    expect(labels(generate({ now: exact + 1 }))).toEqual(["09:30–10:00"]);
    expect(generate({ now: Date.parse(`${date}T10:00:00-03:00`) }).slots).toEqual([]);
  });
  test("hoy se interpreta en el negocio aunque UTC ya esté en mañana", () => {
    expect(generate({ now: Date.parse("2026-10-27T01:00:00Z") }).status).toBe("empty");
  });
  test("UTC y zona de 45 minutos convierten correctamente sin depender del host", () => {
    for (const [timeZone, iso] of [["UTC", "2026-10-26T09:00:00Z"], ["Asia/Kathmandu", "2026-10-26T03:15:00Z"]]) {
      expect(generate({ timeZone }).slots[0].start).toBe(Date.parse(iso));
    }
  });
  const allDays = (start: string, end: string) => week(start, end).map((day) => ({ ...day, isOpen: true, start, end }));
  test.each([
    ["2026-03-08", "01:00", "04:00", ["01:00–01:30", "01:15–01:45", "03:00–03:30", "03:15–03:45", "03:30–04:00"]],
    ["2026-11-01", "00:00", "03:00", ["00:00–00:30", "00:15–00:45", "02:00–02:30", "02:15–02:45", "02:30–03:00"]],
  ])("DST %s omite huecos, horas repetidas y cruces de offset", (date, start, end, expected) => {
    const result = generate({ date: date as string, now: Date.parse("2026-01-01T00:00:00Z"), timeZone: "America/New_York", days: allDays(start as string, end as string) });
    expect(labels(result)).toEqual(expected);
    expect(result.omittedForTimeChange).toBe(true);
    expect(result.slots.every((slot) => slot.end - slot.start === 30 * 60_000)).toBe(true);
  });
  test.each([["2026-03-08", "02:00", "04:00"], ["2026-11-01", "01:00", "03:00"], ["2026-11-01", "00:00", "01:30"]])
    ("apertura/cierre ambiguo o inexistente %s %s–%s no se inventa", (date, start, end) => {
      expect(generate({ date, now: Date.parse("2026-01-01T00:00:00Z"), timeZone: "America/New_York", days: allDays(start, end) }))
        .toMatchObject({ status: "time_change", slots: [], omittedForTimeChange: true });
    });
  test("salto estacional de media hora, sin suponer DST de una hora", () => {
    const result = generate({ date: "2026-10-04", timeZone: "Australia/Lord_Howe", days: allDays("01:30", "03:30") });
    // Use an earlier clock: the default October 20 is after this date.
    const future = generate({ date: "2026-10-04", now: Date.parse("2026-01-01T00:00:00Z"), timeZone: "Australia/Lord_Howe", days: allDays("01:30", "03:30") });
    expect(result.status).toBe("past_date");
    expect(labels(future)).toEqual(["02:30–03:00", "02:45–03:15", "03:00–03:30"]);
  });
  test("fecha local que no existió (salto de día en Samoa)", () => {
    expect(generate({ date: "2011-12-30", now: Date.parse("2011-12-01T00:00:00Z"), timeZone: "Pacific/Apia", days: allDays("09:00", "10:00") }).status).toBe("time_change");
  });
  test("límite superior del formato no desborda el bucle", () => {
    expect(generate({ date: "9999-12-31", days: allDays("23:44", "23:59"), durationMinutes: 15 }).slots).toHaveLength(1);
  });
});

async function setup() {
  vi.spyOn(Date, "now").mockReturnValue(now);
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(alice);
  const businessId = await owner.mutation(api.businesses.createMyBusiness, { name: "Sintético", timeZone: "America/Montevideo" });
  const serviceId = await owner.mutation(api.services.createMyService, { name: "Servicio sintético", durationMinutes: 30 });
  return { t, owner, businessId, serviceId, args: { serviceId, date } };
}

describe("consulta privada de opciones", () => {
  test("acción rechaza sin sesión y sin negocio; query interna también", async () => {
    const { t, serviceId, args } = await setup();
    await expect(t.action(api.availability.getMyAvailability, args)).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.query(internal.availability.getSource, { serviceId })).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.withIdentity(bob).action(api.availability.getMyAvailability, args)).rejects.toThrow("BUSINESS_NOT_FOUND");
    await expect(t.withIdentity(bob).query(internal.availability.getSource, { serviceId })).rejects.toThrow("BUSINESS_NOT_FOUND");
  });
  test("estados sin configurar, cerrado y abierto; lectura no modifica los documentos", async () => {
    const { t, owner, args } = await setup();
    expect((await owner.action(api.availability.getMyAvailability, args)).status).toBe("unconfigured");
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week().map((day) => ({ ...day, isOpen: false, start: null, end: null })) });
    expect((await owner.action(api.availability.getMyAvailability, args)).status).toBe("week_closed");
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week() });
    const before = await t.run(async (ctx) => ({ businesses: await ctx.db.query("businesses").take(10), services: await ctx.db.query("services").take(10), weeklySchedules: await ctx.db.query("weeklySchedules").take(10) }));
    const result = await owner.action(api.availability.getMyAvailability, args);
    expect(result).toMatchObject({ status: "available", generatedAt: now, date, timeZone: "America/Montevideo", service: { id: args.serviceId, durationMinutes: 30 } });
    expect(labels(result)).toEqual(["09:00–09:30", "09:15–09:45", "09:30–10:00"]);
    const after = await t.run(async (ctx) => ({ businesses: await ctx.db.query("businesses").take(10), services: await ctx.db.query("services").take(10), weeklySchedules: await ctx.db.query("weeklySchedules").take(10) }));
    expect(after).toEqual(before);
  });
  test("dos cuentas con igual correo no leen servicios ajenos ni inexistentes", async () => {
    const { t, owner, args } = await setup();
    const other = t.withIdentity(bob);
    await other.mutation(api.businesses.createMyBusiness, { name: "Otro sintético", timeZone: "UTC" });
    const foreignId = await other.mutation(api.services.createMyService, { name: "Ajeno", durationMinutes: 46 });
    await expect(owner.action(api.availability.getMyAvailability, { ...args, serviceId: foreignId })).rejects.toThrow("SERVICE_NOT_FOUND");
    await expect(other.action(api.availability.getMyAvailability, args)).rejects.toThrow("SERVICE_NOT_FOUND");
    await expect(owner.query(internal.availability.getSource, { serviceId: foreignId })).rejects.toThrow("SERVICE_NOT_FOUND");
    await t.run((ctx) => ctx.db.delete("services", foreignId));
    await expect(other.action(api.availability.getMyAvailability, { ...args, serviceId: foreignId })).rejects.toThrow("SERVICE_NOT_FOUND");
  });
  test.each(["", "2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "0000-01-01", "2026-10-00", "26-10-20", "2026-1-01", "2026-10-26T00:00:00Z", "2026-10-26 ", "+010000-01-01"])
    ("fecha manipulada %j rechazada en backend y formulario", async (date) => {
      const { owner, args } = await setup();
      await expect(owner.action(api.availability.getMyAvailability, { ...args, date })).rejects.toThrow("INVALID_DATE");
      expect(availabilitySchema.safeParse({ serviceId: "synthetic", date }).success).toBe(false);
    });
  test.each(["2024-02-29", "2000-02-29", "0001-01-01", "9999-12-31"])("fecha gregoriana real %s aceptada", (date) => {
    expect(availabilitySchema.safeParse({ serviceId: "synthetic", date }).success).toBe(true);
  });
  test.each([{ ownerId: "attacker" }, { businessId: "attacker" }, { durationMinutes: 1 }, { timeZone: "UTC" }, { now: 0 }, { serviceId: 123 }, { date: 123 }])
    ("argumentos extra/tipos manipulados %j rechazados", async (extra) => {
      const { owner, args } = await setup();
      await expect(owner.action(api.availability.getMyAvailability, { ...args, ...extra } as never)).rejects.toThrow();
    });
  test("no reutiliza reloj cacheado ni elige duración/zona desde el cliente", async () => {
    const { owner, args } = await setup();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week("08:37", "10:00") });
    const serviceId = await owner.mutation(api.services.createMyService, { name: "46", durationMinutes: 46 });
    vi.mocked(Date.now).mockReturnValue(Date.parse(`${date}T08:52:00-03:00`));
    expect(labels(await owner.action(api.availability.getMyAvailability, { ...args, serviceId }))).toEqual(["08:52–09:38", "09:07–09:53"]);
    vi.mocked(Date.now).mockReturnValue(Date.parse(`${date}T08:52:00.001-03:00`));
    expect(labels(await owner.action(api.availability.getMyAvailability, { ...args, serviceId }))).toEqual(["09:07–09:53"]);
  });
  test("acción soporta duración máxima ya admitida", async () => {
    const { owner, args } = await setup();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week() });
    const serviceId = await owner.mutation(api.services.createMyService, { name: "Máxima", durationMinutes: Number.MAX_SAFE_INTEGER });
    expect((await owner.action(api.availability.getMyAvailability, { ...args, serviceId })).slots).toEqual([]);
  });
});
