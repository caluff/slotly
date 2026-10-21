import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const date = "2030-01-07";
const now = Date.parse("2030-01-01T00:00:00Z");
const start = Date.parse(`${date}T09:30:00-03:00`);
const identity = { subject: "synthetic_cancel", issuer: "https://clerk.test", email: "same@example.test" };
const days = Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? "09:00" : null, end: i === 0 ? "12:00" : null }));

async function setup() {
  vi.spyOn(Date, "now").mockReturnValue(now);
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity);
  const businessId = await owner.mutation(api.businesses.createMyBusiness, { name: "Synthetic", timeZone: "America/Montevideo" });
  const serviceId = await owner.mutation(api.services.createMyService, { name: "Synthetic 30", durationMinutes: 30 });
  await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days });
  const args = { serviceId, date, start, clientName: "Synthetic" };
  const appointmentId = await owner.mutation(api.appointments.createMyAppointment, args);
  const saved = () => t.run((ctx) => ctx.db.get("appointments", appointmentId));
  const cancel = () => owner.mutation(api.appointments.cancelMyAppointment, { appointmentId, expectedVersion: 0 });
  const active = () => owner.query(api.appointments.listMyConfirmedAppointments, { date });
  const availability = (id = serviceId) => owner.action(api.availability.getMyAvailability, { serviceId: id, date });
  const history = (cursor: string | null = null, numItems = 100) => owner.query(api.appointments.searchMyAppointments, {
    client: "", period: "todas", from: date, until: date, paginationOpts: { cursor, numItems },
  });
  return { t, owner, businessId, serviceId, args, appointmentId, saved, cancel, active, availability, history };
}
afterEach(() => vi.restoreAllMocks());

describe("cancelación privada transaccional (memoria, no acredita OCC real)", () => {
  test("confirmed legado sin timestamp → cancelled, conserva documento e instantes y expone estado real en historia", async () => {
    const { saved, cancel, active, history } = await setup();
    const before = await saved();
    expect(before).not.toHaveProperty("cancelledAt");
    expect(await cancel()).toEqual({ outcome: "cancelled", cancelledAt: now });
    expect(await saved()).toEqual({ ...before, status: "cancelled", cancelledAt: now, version: 1 });
    expect(await active()).toEqual([]);
    expect((await history()).page[0]).toMatchObject({ _id: before!._id, status: "cancelled", cancelledAt: now, start, end: start + 30 * 60_000 });
  });
  test.each([now + 1000, start, start + 1, start + 60 * 60_000, start + 86_400_000])("repetición en %s conserva resultado, timestamp y documento completo", async (retryAt) => {
    const { saved, cancel } = await setup();
    await cancel();
    const first = await saved();
    vi.mocked(Date.now).mockReturnValue(retryAt);
    expect(await cancel()).toEqual({ outcome: "already_cancelled", cancelledAt: now });
    expect(await saved()).toEqual(first);
  });
  test.each([-1, 0, 1, 15 * 60_000, 31 * 60_000])("reloj servidor en inicio + %s ms", async (offset) => {
    const { saved, cancel } = await setup();
    vi.mocked(Date.now).mockReturnValue(start + offset);
    if (offset < 0) expect(await cancel()).toEqual({ outcome: "cancelled", cancelledAt: start - 1 });
    else {
      await expect(cancel()).rejects.toThrow("APPOINTMENT_STARTED");
      expect(await saved()).toMatchObject({ status: "confirmed" });
      expect(await saved()).not.toHaveProperty("cancelledAt");
    }
  });
  test("sesión y negocio se verifican antes de leer existencia o estado", async () => {
    const { t, owner, appointmentId, cancel } = await setup();
    await expect(t.mutation(api.appointments.cancelMyAppointment, { appointmentId, expectedVersion: 0 })).rejects.toThrow("UNAUTHENTICATED");
    const stranger = t.withIdentity({ ...identity, subject: "other-same-email" });
    await expect(stranger.mutation(api.appointments.cancelMyAppointment, { appointmentId, expectedVersion: 0 })).rejects.toThrow("BUSINESS_NOT_FOUND");
    await stranger.mutation(api.businesses.createMyBusiness, { name: "Other", timeZone: "UTC" });
    for (const state of ["confirmed", "cancelled"]) {
      if (state === "cancelled") await cancel();
      await expect(stranger.mutation(api.appointments.cancelMyAppointment, { appointmentId, expectedVersion: 0 })).rejects.toThrow("APPOINTMENT_NOT_FOUND");
    }
    const missing = await t.run(async (ctx) => {
      const { businessId, serviceId, serviceName, clientName, date, start, end } = (await ctx.db.get("appointments", appointmentId))!;
      const id = await ctx.db.insert("appointments", { businessId, serviceId, serviceName, clientName, date, start, end, status: "confirmed" });
      await ctx.db.delete("appointments", id);
      return id;
    });
    await expect(owner.mutation(api.appointments.cancelMyAppointment, { appointmentId: missing, expectedVersion: 0 })).rejects.toThrow("APPOINTMENT_NOT_FOUND");
  });
  test.each([{ ownerId: "other" }, { businessId: "other" }, { status: "confirmed" }, { start: start + 1 }, { cancelledAt: 123 }, { now: 0 }])("rechaza campos controlados por cliente: %j", async (extra) => {
    const { owner, appointmentId, saved } = await setup();
    await expect(owner.mutation(api.appointments.cancelMyAppointment, { appointmentId, expectedVersion: 0, ...extra } as never)).rejects.toThrow();
    expect((await saved())!.status).toBe("confirmed");
  });
  test("ID malformado o de otra tabla no cambia documentos", async () => {
    const { owner, businessId, saved } = await setup();
    for (const id of ["invalid", businessId]) await expect(owner.mutation(api.appointments.cancelMyAppointment, { appointmentId: id, expectedVersion: 0 } as never)).rejects.toThrow();
    expect((await saved())!.status).toBe("confirmed");
  });
  test("cancelar sigue permitido si cambian duración, semana o zona; no recalcula historia", async () => {
    const { t, owner, serviceId, businessId, saved, cancel } = await setup();
    const before = await saved();
    await t.run(async (ctx) => { await ctx.db.patch("services", serviceId, { durationMinutes: 46 }); await ctx.db.patch("businesses", businessId, { timeZone: "UTC" }); });
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days.map((d) => ({ ...d, isOpen: false, start: null, end: null })) });
    await cancel();
    expect(await saved()).toEqual({ ...before, status: "cancelled", cancelledAt: now, version: 1 });
  });
  test("libera todos los servicios y admite citas consecutivas; otra confirmada sigue bloqueando", async () => {
    const { owner, args, cancel, active, availability, history } = await setup();
    const other = await owner.mutation(api.services.createMyService, { name: "Synthetic 46", durationMinutes: 46 });
    expect((await availability(other)).slots.some((s) => s.start === start)).toBe(false);
    await cancel();
    expect((await availability(other)).slots.some((s) => s.start === start)).toBe(true);
    await owner.mutation(api.appointments.createMyAppointment, { ...args, serviceId: other });
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_TAKEN");
    await owner.mutation(api.appointments.createMyAppointment, { ...args, start: start - 30 * 60_000 });
    expect(await active()).toHaveLength(2);
    expect((await history()).page).toHaveLength(3);
    expect((await availability()).slots.some((s) => s.start === start + 15 * 60_000)).toBe(false);
  });
  test.each(["closed", "grid", "duration", "past", "zone", "dst"])("liberar no elude reglas vigentes: %s", async (rule) => {
    const { t, owner, businessId, serviceId, args, cancel, active } = await setup();
    await cancel();
    if (rule === "closed") await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days.map((d) => ({ ...d, isOpen: false, start: null, end: null })) });
    if (rule === "grid") await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days.map((d) => d.isOpen ? { ...d, start: "09:07" } : d) });
    if (rule === "duration") await t.run((ctx) => ctx.db.patch("services", serviceId, { durationMinutes: 999 }));
    if (rule === "past") vi.mocked(Date.now).mockReturnValue(start);
    if (rule === "zone" || rule === "dst") await t.run((ctx) => ctx.db.patch("businesses", businessId, { timeZone: "America/New_York" }));
    if (rule === "dst") {
      await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days.map((d) => ({ ...d, isOpen: true, start: "00:00", end: "04:00" })) });
      args.date = "2030-11-03"; args.start = Date.parse("2030-11-03T01:15:00-04:00");
    }
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_UNAVAILABLE");
    expect(await active()).toEqual([]);
  });
  test("1600 canceladas no ocultan una confirmada, no producen falso bloqueo y todo el historial se pagina", async () => {
    const { t, owner, businessId, serviceId, args, cancel, active, availability, history } = await setup();
    await cancel();
    await t.run(async (ctx) => {
      for (let i = 0; i < 1600; i++) await ctx.db.insert("appointments", { businessId, serviceId, serviceName: "Synthetic", clientName: "Synthetic history", date, start, end: start + 30 * 60_000, status: "cancelled", cancelledAt: now - i });
    });
    expect(await active()).toEqual([]);
    expect((await availability()).slots.some((s) => s.start === start)).toBe(true);
    await owner.mutation(api.appointments.createMyAppointment, args);
    await expect(owner.mutation(api.appointments.createMyAppointment, args)).rejects.toThrow("SLOT_TAKEN");
    expect(await active()).toHaveLength(1);
    expect((await availability()).slots.some((s) => s.start === start)).toBe(false);
    const seen = new Set<string>();
    let cursor: string | null = null, done = false, pages = 0, confirmed = 0;
    while (!done) {
      const page = await history(cursor, 73);
      pages++;
      for (const row of page.page) { expect(seen.has(row._id)).toBe(false); seen.add(row._id); if (row.status === "confirmed") confirmed++; else expect(row.cancelledAt).toBeTypeOf("number"); }
      cursor = page.continueCursor; done = page.isDone;
      expect(pages).toBeLessThan(30);
    }
    expect(seen.size).toBe(1602); expect(confirmed).toBe(1); expect(pages).toBeGreaterThan(20);
  });
});
