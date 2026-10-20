import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { appointmentSchema } from "../lib/appointment-schema";

const modules = import.meta.glob("../convex/**/*.ts");
const date = "2030-01-07"; // Monday
const now = Date.parse("2030-01-01T00:00:00Z");
const identity = { subject: "synthetic_appointments", issuer: "https://clerk.test", email: "shared@example.test" };
const week = (start = "09:00", end = "12:00") => Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? start : null, end: i === 0 ? end : null,
}));
const at = (time: string) => Date.parse(`${date}T${time}:00-03:00`);

async function setup(durationMinutes = 30, timeZone = "America/Montevideo") {
  vi.spyOn(Date, "now").mockReturnValue(now);
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity);
  const businessId = await owner.mutation(api.businesses.createMyBusiness, { name: "Synthetic", timeZone });
  const serviceId = await owner.mutation(api.services.createMyService, { name: "Synthetic service", durationMinutes });
  await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week() });
  const args = { serviceId, date, start: at("09:30"), clientName: "Synthetic client" };
  const list = () => owner.query(api.appointments.listMyAppointments, { date });
  const documents = () => t.run((ctx) => ctx.db.query("appointments").take(1500));
  return { t, owner, businessId, serviceId, args, list, documents };
}
afterEach(() => vi.restoreAllMocks());

describe("citas privadas, validación y persistencia (memoria)", () => {
  test("normaliza NFC/espacios, calcula el fin real y lista cronológicamente sin campos privados", async () => {
    const { owner, args, list, documents, businessId } = await setup(46);
    const id = await owner.mutation(api.appointments.createMyAppointment, { ...args, start: at("10:30"), clientName: "  Jose\u0301   Sintético \n " });
    await owner.mutation(api.appointments.createMyAppointment, { ...args, start: at("09:00") });
    const rows = await list();
    expect(rows.map((r) => r.start)).toEqual([at("09:00"), at("10:30")]);
    expect(rows[1]).toEqual({ _id: id, serviceId: args.serviceId, serviceName: "Synthetic service", clientName: "José Sintético", start: at("10:30"), end: at("11:16"), status: "confirmed" });
    expect((await documents())[0]).toMatchObject({ businessId, date });
    expect(await owner.query(api.appointments.listMyAppointments, { date })).toEqual(rows);
    expect(await owner.query(api.appointments.listMyAppointments, { date: "2030-01-08" })).toEqual([]);
  });
  test("cambiar/cerrar la semana conserva citas e instantes y rechaza opciones anteriores", async () => {
    const { owner, args, list } = await setup();
    await owner.mutation(api.appointments.createMyAppointment, args);
    const before = await list();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week("10:00", "11:00") });
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, start: at("09:00") })).rejects.toThrow("SLOT_UNAVAILABLE");
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week().map((d) => ({ ...d, isOpen: false, start: null, end: null })) });
    expect(await list()).toEqual(before);
  });
  test.each(["", "   ", "x".repeat(101), "a\u0000b", "a\u200bb"])("nombre inválido %j sin escritura", async (clientName) => {
    const { owner, args, documents } = await setup();
    expect(appointmentSchema.safeParse({ clientName, start: "123" }).success).toBe(false);
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, clientName })).rejects.toThrow("INVALID_CLIENT_NAME");
    expect(await documents()).toEqual([]);
  });
  test.each(["", "2030-02-29", "2030-04-31", "2030-1-07", "2030-01-07T00:00:00Z", "0000-01-01"])("fecha inválida %j", async (invalid) => {
    const { owner, args, documents } = await setup();
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, date: invalid })).rejects.toThrow("INVALID_DATE");
    await expect(owner.query(api.appointments.listMyAppointments, { date: invalid })).rejects.toThrow("INVALID_DATE");
    expect(await documents()).toEqual([]);
  });
  test.each([{ ownerId: "attacker" }, { businessId: "attacker" }, { end: at("09:31") }, { durationMinutes: 1 }, { timeZone: "UTC" }, { status: "confirmed" }, { now: 0 }, { start: "123" }, { clientName: 7 }])
    ("argumento manipulado %j", async (extra) => {
      const { owner, args, documents } = await setup();
      await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, ...extra } as never)).rejects.toThrow();
      expect(await documents()).toEqual([]);
    });
  test.each([at("08:45"), at("09:01"), at("11:45"), at("12:00"), at("09:30") + 1, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    ("inicio inválido/fuera de paso/jornada %s", async (start) => {
      const { owner, args, documents } = await setup();
      await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, start })).rejects.toThrow("SLOT_UNAVAILABLE");
      expect(await documents()).toEqual([]);
    });
  test("sin sesión/sin negocio y no confiar en el email", async () => {
    const { t, owner, args, list, documents } = await setup();
    await owner.mutation(api.appointments.createMyAppointment, args);
    const other = t.withIdentity({ ...identity, subject: "other" });
    await expect(t.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.query(api.appointments.listMyAppointments, { date })).rejects.toThrow("UNAUTHENTICATED");
    await expect(other.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("BUSINESS_NOT_FOUND");
    await expect(other.query(api.appointments.listMyAppointments, { date })).rejects.toThrow("BUSINESS_NOT_FOUND");
    await other.mutation(api.businesses.createMyBusiness, { name: "Other", timeZone: "UTC" });
    const foreign = await other.mutation(api.services.createMyService, { name: "Foreign", durationMinutes: 1 });
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId: foreign })).rejects.toThrow("SERVICE_NOT_FOUND");
    await expect(other.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SERVICE_NOT_FOUND");
    expect(await other.query(api.appointments.listMyAppointments, { date })).toEqual([]);
    await t.run((ctx) => ctx.db.delete("services", foreign));
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId: foreign })).rejects.toThrow("SERVICE_NOT_FOUND");
    expect(await documents()).toHaveLength(1);
    expect(await list()).toHaveLength(1);
  });
  test("instante exactamente actual/pasado, fecha local discordante y día cerrado", async () => {
    const { owner, args, documents } = await setup();
    vi.mocked(Date.now).mockReturnValue(args.start);
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_UNAVAILABLE");
    vi.mocked(Date.now).mockReturnValue(args.start + 1);
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_UNAVAILABLE");
    vi.mocked(Date.now).mockReturnValue(now);
    for (const wrong of ["2029-12-31", "2030-01-08", "2030-01-14"]) {
      await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, date: wrong })).rejects.toThrow("SLOT_UNAVAILABLE");
    }
    expect(await documents()).toEqual([]);
  });
  test("apertura 08:37 y cierre exacto con duración 46", async () => {
    const { owner, args, list } = await setup(46);
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week("08:37", "10:08") });
    await owner.mutation(api.appointments.createMyAppointment, { ...args, start: at("09:22") });
    expect((await list())[0].end).toBe(at("10:08"));
  });
  test("sin semana y duración excesiva no escriben", async () => {
    const { t, owner, args, documents } = await setup(Number.MAX_SAFE_INTEGER);
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_UNAVAILABLE");
    await t.run(async (ctx) => { const s = await ctx.db.query("weeklySchedules").first(); await ctx.db.delete("weeklySchedules", s!._id); });
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_UNAVAILABLE");
    expect(await documents()).toEqual([]);
  });
  test("una duración modificada se revalida y las citas previas conservan su fin", async () => {
    const { t, owner, args, list } = await setup();
    await owner.mutation(api.appointments.createMyAppointment, args);
    await t.run((ctx) => ctx.db.patch("services", args.serviceId, { durationMinutes: 46 }));
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, start: at("11:30") })).rejects.toThrow("SLOT_UNAVAILABLE");
    await owner.mutation(api.appointments.createMyAppointment, { ...args, start: at("10:30") });
    expect((await list()).map((r) => r.end)).toEqual([at("10:00"), at("11:16")]);
  });
  test.each([{ businessId: "attacker" }, { ownerId: "attacker" }, { date: 123 }])("listado rechaza argumentos manipulados %j", async (extra) => {
    const { owner } = await setup();
    await expect(owner.query(api.appointments.listMyAppointments, { date, ...extra } as never)).rejects.toThrow();
  });
  test.each([
    ["2030-03-10", "America/New_York", "01:00", "04:00", "2030-03-10T01:45:00-05:00"],
    ["2030-11-03", "America/New_York", "00:00", "03:00", "2030-11-03T01:15:00-04:00"],
    ["2030-11-03", "America/New_York", "00:00", "03:00", "2030-11-03T01:15:00-05:00"],
    ["2030-03-10", "America/New_York", "02:00", "04:00", "2030-03-10T03:00:00-04:00"],
  ])("revalidación DST %s %s %s–%s", async (date, zone, start, end, iso) => {
    const { owner, args, documents } = await setup(30, zone);
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week().map((d) => ({ ...d, isOpen: true, start, end })) });
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, date, start: Date.parse(iso) })).rejects.toThrow("SLOT_UNAVAILABLE");
    expect(await documents()).toEqual([]);
  });
  test("UTC y Kathmandu usan el instante IANA del negocio", async () => {
    for (const [zone, instant] of [["UTC", "2030-01-07T09:30:00Z"], ["Asia/Kathmandu", "2030-01-07T03:45:00Z"]]) {
      const { owner, args, list } = await setup(30, zone);
      await owner.mutation(api.appointments.createMyAppointment, { ...args, start: Date.parse(instant) });
      expect((await list())[0].start).toBe(Date.parse(instant));
    }
  });
});

describe("ocupación compartida y atomicidad (harness, no demuestra OCC real)", () => {
  test.each([
    [30, "09:30"], [30, "09:15"], [30, "09:45"], [60, "09:15"], [15, "09:30"], [15, "09:45"],
  ])("rechaza coincidencia/solapes/contención: duración %s, inicio %s", async (duration, time) => {
    const { owner, args, list } = await setup();
    await owner.mutation(api.appointments.createMyAppointment, args);
    const serviceId = await owner.mutation(api.services.createMyService, { name: "Other service", durationMinutes: duration });
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId, start: at(time) })).rejects.toThrow("SLOT_TAKEN");
    expect(await list()).toHaveLength(1);
    const result = await owner.action(api.availability.getMyAvailability, { serviceId, date });
    expect(result.slots.some((slot) => slot.start === at(time))).toBe(false);
  });
  test("citas consecutivas, disponibilidad obsoleta y ocupación de otro servicio", async () => {
    const { owner, args, list } = await setup();
    const serviceId = await owner.mutation(api.services.createMyService, { name: "Other", durationMinutes: 30 });
    const previous = await owner.action(api.availability.getMyAvailability, { serviceId, date });
    expect(previous.slots.some((s) => s.start === args.start)).toBe(true);
    await owner.mutation(api.appointments.createMyAppointment, args);
    await expect(owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId })).rejects.toThrow("SLOT_TAKEN");
    await owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId, start: at("09:00") });
    await owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId, start: at("10:00") });
    expect(await list()).toHaveLength(3);
    const next = await owner.action(api.availability.getMyAvailability, { serviceId, date });
    expect(next.slots[0].start).toBe(at("10:30"));
  });
  test.each(["same", "partial", "different-services", "adjacent", "non-overlapping", "different-businesses"])("solicitudes simultáneas: %s", async (scenario) => {
    const { t, owner, args, list, documents } = await setup();
    let competitor = owner;
    const second = { ...args };
    if (scenario === "partial") second.start += 15 * 60_000;
    if (scenario === "adjacent") second.start += 30 * 60_000;
    if (scenario === "non-overlapping") second.start += 90 * 60_000;
    if (scenario === "different-services") second.serviceId = await owner.mutation(api.services.createMyService, { name: "Competing", durationMinutes: 46 });
    if (scenario === "different-businesses") {
      competitor = t.withIdentity({ ...identity, subject: "independent" });
      await competitor.mutation(api.businesses.createMyBusiness, { name: "Independent", timeZone: "America/Montevideo" });
      second.serviceId = await competitor.mutation(api.services.createMyService, { name: "Independent", durationMinutes: 30 });
      await competitor.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week() });
    }
    const results = await Promise.allSettled([owner.mutation(api.appointments.createMyAppointment, args), competitor.mutation(api.appointments.createMyAppointment, second)]);
    const compatible = scenario === "adjacent" || scenario === "non-overlapping" || scenario === "different-businesses";
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(compatible ? 2 : 1);
    for (const r of results) if (r.status === "rejected") expect(String(r.reason)).toContain("SLOT_TAKEN");
    expect(await documents()).toHaveLength(compatible ? 2 : 1);
    expect(await list()).toHaveLength(scenario === "different-businesses" ? 1 : compatible ? 2 : 1);
  });
  test("el límite nunca trunca conflictos: falla cerrado ante un día corrupto/saturado", async () => {
    const { t, owner, args, businessId, documents } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < 1441; i++) await ctx.db.insert("appointments", {
        businessId, serviceId: args.serviceId, serviceName: "Synthetic", clientName: "Synthetic", date,
        start: at("11:00"), end: at("11:30"), status: "confirmed",
      });
    });
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("DAY_CAPACITY_EXCEEDED");
    await expect(owner.query(api.appointments.listMyAppointments, { date })).rejects.toThrow("DAY_CAPACITY_EXCEEDED");
    await expect(owner.action(api.availability.getMyAvailability, { date, serviceId: args.serviceId })).rejects.toThrow("DAY_CAPACITY_EXCEEDED");
    expect(await documents()).toHaveLength(1441);
  });
});
