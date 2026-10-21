import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const date = "2030-01-07";
const now = Date.parse("2030-01-01T00:00:00Z");
const at = (time: string, day = date) => Date.parse(`${day}T${time}:00-03:00`);
const week = (start = "09:00", end = "12:00") => Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? start : null, end: i === 0 ? end : null }));
async function setup(durationMinutes = 30) {
  vi.spyOn(Date, "now").mockReturnValue(now);
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "synthetic_move", issuer: "https://synthetic.test" });
  const businessId = await owner.mutation(api.businesses.createMyBusiness, { name: "Synthetic", timeZone: "America/Montevideo" });
  const serviceId = await owner.mutation(api.services.createMyService, { name: "Synthetic service", durationMinutes });
  await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week() });
  const appointmentId = await owner.mutation(api.appointments.createMyAppointment, { serviceId, date, start: at("09:30"), clientName: "Synthetic client" });
  const args = { appointmentId, expectedVersion: 0, date, start: at("09:45") };
  const saved = () => t.run((ctx) => ctx.db.get("appointments", appointmentId));
  const move = (overrides: Partial<typeof args> = {}) => owner.mutation(api.appointments.rescheduleMyAppointment, { ...args, ...overrides });
  const preview = (day = date) => owner.action(api.availability.getMyRescheduleAvailability, { appointmentId, date: day });
  const cancel = (expectedVersion = 0) => owner.mutation(api.appointments.cancelMyAppointment, { appointmentId, expectedVersion });
  return { t, owner, businessId, serviceId, appointmentId, args, saved, move, preview, cancel };
}
afterEach(() => vi.restoreAllMocks());

describe("reprogramación privada (memoria; OCC se prueba en motor aislado)", () => {
  test.each([30, 46])("excluye solo su ID, permite solape propio y calcula fin de %s minutos", async (duration) => {
    const { saved, move, preview, owner, serviceId } = await setup(duration);
    const before = (await saved())!;
    expect((await preview()).slots.some((s) => s.start === at("09:45"))).toBe(true);
    expect((await owner.action(api.availability.getMyAvailability, { serviceId, date })).slots.some((s) => s.start === at("09:45"))).toBe(false);
    expect(await move()).toMatchObject({ outcome: "rescheduled", version: 1, rescheduledAt: now });
    expect(await saved()).toEqual({ ...before, start: at("09:45"), end: at("09:45") + duration * 60_000, version: 1, rescheduledAt: now, rescheduledFromVersion: 0 });
  });
  test("mismo intervalo no escribe; revisión y timestamp estables en repeticiones incluso después del inicio", async () => {
    const { saved, move } = await setup();
    const before = await saved();
    expect(await move({ start: at("09:30") })).toMatchObject({ outcome: "unchanged", version: 0 });
    expect(await saved()).toEqual(before);
    await move();
    const applied = await saved();
    vi.mocked(Date.now).mockReturnValue(at("10:30"));
    expect(await move()).toMatchObject({ outcome: "already_rescheduled", version: 1, rescheduledAt: now });
    expect(await saved()).toEqual(applied);
  });
  test("versión obsoleta y reintento viejo tras otro movimiento no revierten ni cancelan", async () => {
    const { saved, move, cancel } = await setup();
    await move();
    const first = await saved();
    await expect(move({ start: at("10:30") })).rejects.toThrow("APPOINTMENT_CONFLICT");
    await expect(cancel()).rejects.toThrow("APPOINTMENT_CONFLICT");
    expect(await saved()).toEqual(first);
    vi.mocked(Date.now).mockReturnValue(now + 1000);
    await move({ expectedVersion: 1, start: at("10:30") });
    const second = await saved();
    await expect(move()).rejects.toThrow("APPOINTMENT_CONFLICT");
    expect(await saved()).toEqual(second);
    expect(second).toMatchObject({ version: 2, rescheduledAt: now + 1000 });
    await cancel(2);
    vi.mocked(Date.now).mockReturnValue(at("13:00"));
    expect(await cancel()).toEqual({ outcome: "already_cancelled", cancelledAt: now + 1000 });
    await expect(move()).rejects.toThrow("APPOINTMENT_CANCELLED");
  });
  test.each([-1, 0.5, Number.MAX_SAFE_INTEGER, -Infinity])("rechaza revisión manipulada %s sin escribir", async (expectedVersion) => {
    const { saved, move, cancel } = await setup();
    const before = await saved();
    await expect(move({ expectedVersion })).rejects.toThrow("INVALID_VERSION");
    await expect(cancel(expectedVersion)).rejects.toThrow("INVALID_VERSION");
    expect(await saved()).toEqual(before);
  });
  test.each([0, 1, 60 * 60_000])("original al inicio + %s: preview y mutación rechazan", async (offset) => {
    const { move, preview, saved } = await setup(); const before = await saved();
    vi.mocked(Date.now).mockReturnValue(at("09:30") + offset);
    await expect(preview()).rejects.toThrow("APPOINTMENT_STARTED");
    await expect(move({ start: at("11:00") })).rejects.toThrow("APPOINTMENT_STARTED");
    expect(await saved()).toEqual(before);
  });
  test("original cancelada no se reactiva", async () => {
    const { cancel, move, preview, saved } = await setup(); await cancel(); const before = await saved();
    await expect(move()).rejects.toThrow("APPOINTMENT_CANCELLED");
    await expect(preview()).rejects.toThrow("APPOINTMENT_CANCELLED");
    expect(await saved()).toEqual(before);
  });
  test("un milisegundo antes del inicio original permite mover; destino en ahora no", async () => {
    const { move, saved } = await setup();
    vi.mocked(Date.now).mockReturnValue(at("09:30") - 1);
    await move({ start: at("11:00") });
    expect(await saved()).toMatchObject({ start: at("11:00"), version: 1 });
  });
  test("preview excluye un destino cuyo inicio coincide exactamente con el reloj del servidor", async () => {
    const { preview, move, saved } = await setup(); const before = await saved();
    vi.mocked(Date.now).mockReturnValue(at("09:00"));
    expect((await preview()).slots.some((s) => s.start === at("09:00"))).toBe(false);
    await expect(move({ start: at("09:00") })).rejects.toThrow("SLOT_UNAVAILABLE");
    expect(await saved()).toEqual(before);
  });
  test("paso de 15 desde apertura 08:37 y cierre exacto con 46 minutos", async () => {
    const { owner, move, saved } = await setup(46);
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week("08:37", "10:08") });
    await move({ start: at("09:22") }); expect((await saved())!.end).toBe(at("10:08"));
  });
  test("semana sin configurar y semana cerrada rechazan sin liberar original", async () => {
    const { owner, t, move, saved, businessId } = await setup(); const before = await saved();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week().map((day) => ({ ...day, isOpen: false, start: null, end: null })) });
    await expect(move()).rejects.toThrow("SLOT_UNAVAILABLE"); expect(await saved()).toEqual(before);
    await t.run(async (ctx) => { const schedule = await ctx.db.query("weeklySchedules").withIndex("by_businessId", (q) => q.eq("businessId", businessId)).unique(); await ctx.db.delete("weeklySchedules", schedule!._id); });
    await expect(move()).rejects.toThrow("SLOT_UNAVAILABLE"); expect(await saved()).toEqual(before);
  });
  test("1600 canceladas no ocultan otra confirmada durante reprogramación", async () => {
    const { owner, t, businessId, serviceId, move, preview, saved } = await setup();
    await t.run(async (ctx) => { for (let i = 0; i < 1600; i++) await ctx.db.insert("appointments", { businessId, serviceId, serviceName: "Synthetic", clientName: "Synthetic", date, start: at("09:45"), end: at("10:15"), status: "cancelled", cancelledAt: now }); });
    expect((await preview()).slots.some((s) => s.start === at("09:45"))).toBe(true);
    await owner.mutation(api.appointments.createMyAppointment, { serviceId, date, start: at("10:00"), clientName: "Active" });
    const before = await saved();
    expect((await preview()).slots.some((s) => s.start === at("09:45"))).toBe(false);
    await expect(move()).rejects.toThrow("SLOT_TAKEN"); expect(await saved()).toEqual(before);
  });
  test("sesión, negocio, pertenencia e inexistencia antes del estado, sin filtrar otra cuenta", async () => {
    const { t, owner, businessId, args, saved, cancel, appointmentId } = await setup();
    const foreign = t.withIdentity({ subject: "foreign", issuer: "https://synthetic.test" });
    for (const [client, code] of [[t, "UNAUTHENTICATED"], [foreign, "BUSINESS_NOT_FOUND"]] as const) {
      await expect(client.mutation(api.appointments.rescheduleMyAppointment, args)).rejects.toThrow(code);
      await expect(client.action(api.availability.getMyRescheduleAvailability, { appointmentId, date })).rejects.toThrow(code);
    }
    await foreign.mutation(api.businesses.createMyBusiness, { name: "Foreign", timeZone: "UTC" });
    for (const state of ["confirmed", "cancelled"]) {
      if (state === "cancelled") await cancel();
      await expect(foreign.mutation(api.appointments.rescheduleMyAppointment, args)).rejects.toThrow("APPOINTMENT_NOT_FOUND");
      await expect(foreign.action(api.availability.getMyRescheduleAvailability, { appointmentId, date })).rejects.toThrow("APPOINTMENT_NOT_FOUND");
      await expect(foreign.query(api.appointments.getMyAppointment, { appointmentId })).rejects.toThrow("APPOINTMENT_NOT_FOUND");
    }
    const row = (await saved())!;
    const missing = await t.run((ctx) => ctx.db.insert("appointments", { businessId, serviceId: row.serviceId, serviceName: "x", clientName: "x", date, start: at("11:00"), end: at("11:30"), status: "confirmed" }));
    await t.run((ctx) => ctx.db.delete("appointments", missing));
    await expect(owner.mutation(api.appointments.rescheduleMyAppointment, { ...args, appointmentId: missing })).rejects.toThrow("APPOINTMENT_NOT_FOUND");
    await expect(owner.action(api.availability.getMyRescheduleAvailability, { appointmentId: missing, date })).rejects.toThrow("APPOINTMENT_NOT_FOUND");
  });
  test.each([{ clientName: "Changed" }, { serviceId: "invalid" }, { businessId: "invalid" }, { end: 1 }, { version: 99 }, { rescheduledAt: 1 }, { status: "confirmed" }])("no acepta campos extra %j", async (extra) => {
    const { owner, args, saved } = await setup(); const before = await saved();
    await expect(owner.mutation(api.appointments.rescheduleMyAppointment, { ...args, ...extra } as never)).rejects.toThrow();
    expect(await saved()).toEqual(before);
  });
  test.each(["malformed", "wrong-table"])("rechaza ID %s en preview y mutación sin cambiar cita", async (kind) => {
    const { owner, args, businessId, saved } = await setup(); const before = await saved();
    const appointmentId = kind === "malformed" ? "invalid" : businessId;
    await expect(owner.mutation(api.appointments.rescheduleMyAppointment, { ...args, appointmentId } as never)).rejects.toThrow();
    await expect(owner.action(api.availability.getMyRescheduleAvailability, { appointmentId, date } as never)).rejects.toThrow();
    expect(await saved()).toEqual(before);
  });
  test("servicio ajeno manipulado en el documento no concede acceso ni disponibilidad", async () => {
    const { t, appointmentId, move, preview, saved } = await setup();
    const foreign = t.withIdentity({ subject: "foreign-service", issuer: "https://synthetic.test" });
    await foreign.mutation(api.businesses.createMyBusiness, { name: "Foreign", timeZone: "UTC" });
    const other = await foreign.mutation(api.services.createMyService, { name: "Foreign", durationMinutes: 30 });
    await t.run((ctx) => ctx.db.patch("appointments", appointmentId, { serviceId: other }));
    const before = await saved();
    await expect(move()).rejects.toThrow("SERVICE_NOT_FOUND");
    await expect(preview()).rejects.toThrow("SERVICE_NOT_FOUND");
    expect(await saved()).toEqual(before);
  });
  test.each([
    { date: "2030-02-30" }, { date: "2030-01-08", start: at("09:45", "2030-01-08") },
    { date: "2029-12-31", start: at("09:30", "2029-12-31") }, { start: at("08:45") },
    { start: at("09:46") }, { start: at("11:45") }, { start: at("09:45") + 1 }, { start: now },
    { start: at("09:45", "2030-01-14") },
  ])("destino inválido/cerrado/pasado/fuera del paso o duración: %j", async (extra) => {
    const { saved, move } = await setup(); const before = await saved();
    await expect(move(extra)).rejects.toThrow(); expect(await saved()).toEqual(before);
  });
  test("no oculta otra confirmada, incluye todos los servicios y usa fin excluido", async () => {
    const { owner, serviceId, preview, move, saved } = await setup();
    const second = await owner.mutation(api.services.createMyService, { name: "Other", durationMinutes: 30 });
    await owner.mutation(api.appointments.createMyAppointment, { serviceId: second, date, start: at("10:00"), clientName: "Other" });
    const before = await saved();
    expect((await preview()).slots.some((s) => s.start === at("09:45"))).toBe(false);
    await expect(move()).rejects.toThrow("SLOT_TAKEN"); expect(await saved()).toEqual(before);
    await move({ start: at("10:30") });
    const slots = (await owner.action(api.availability.getMyAvailability, { serviceId, date })).slots;
    expect(slots.some((s) => s.start === at("09:30"))).toBe(true);
    expect(slots.some((s) => s.start === at("10:30"))).toBe(false);
    expect(slots.some((s) => s.start === at("11:00"))).toBe(true);
  });
  test("revalida duración, servicio y semana después del preview; fallo conserva original", async () => {
    const { t, owner, serviceId, move, preview, saved } = await setup(); await preview(); const before = await saved();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: week("10:00", "12:00") });
    await expect(move()).rejects.toThrow("SLOT_UNAVAILABLE"); expect(await saved()).toEqual(before);
    await t.run((ctx) => ctx.db.patch("services", serviceId, { durationMinutes: 46 }));
    await move({ start: at("11:00") }); expect((await saved())!.end).toBe(at("11:46"));
    const updated = await saved(); await t.run((ctx) => ctx.db.delete("services", serviceId));
    await expect(move({ expectedVersion: 1, start: at("10:00") })).rejects.toThrow("SERVICE_NOT_FOUND");
    expect(await saved()).toEqual(updated);
  });
  test.each([
    { timeZone: "America/New_York", targetDate: "2030-03-10", start: "2030-03-10T07:00:00Z", opening: "02:00" },
    { timeZone: "America/New_York", targetDate: "2030-11-03", start: "2030-11-03T05:15:00Z", opening: "00:00" },
    { timeZone: "invalid-zone", targetDate: "2030-03-10", start: "2030-03-10T07:00:00Z", opening: "02:00" },
  ])("zona/DST %j no acepta instantes inexistentes/ambiguos ni zona inválida", async ({ timeZone, targetDate, start, opening }) => {
    const { t, businessId, owner, move, saved } = await setup(); const before = await saved();
    await t.run((ctx) => ctx.db.patch("businesses", businessId, { timeZone }));
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: i === 6, start: i === 6 ? opening : null, end: i === 6 ? "04:00" : null })) });
    await expect(move({ date: targetDate, start: Date.parse(start) })).rejects.toThrow();
    expect(await saved()).toEqual(before);
  });
});
