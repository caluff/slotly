import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = {
  "../convex/businesses.ts": () => import("../convex/businesses"),
  "../convex/services.ts": () => import("../convex/services"),
  "../convex/weeklySchedule.ts": () => import("../convex/weeklySchedule"),
  "../convex/_generated/server.js": () => import("../convex/_generated/server.js"),
};
const alice = { subject: "schedule_alice", issuer: "https://clerk.test", email: "shared@example.test" };
const bob = { ...alice, subject: "schedule_bob" };
const profile = { name: "Negocio sintético", timeZone: "America/Montevideo" };
const closedWeek = () => ({ days: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, isOpen: false, start: null as string | null, end: null as string | null })) });
function mixedWeek() {
  const week = closedWeek();
  week.days[0] = { dayOfWeek: 1, isOpen: true, start: "09:00", end: "17:00" };
  week.days[4] = { dayOfWeek: 5, isOpen: true, start: "10:30", end: "18:45" };
  return week;
}
async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(alice);
  const businessId = await owner.mutation(api.businesses.createMyBusiness, profile);
  return { t, owner, businessId };
}

describe("horario semanal: autorización y persistencia atómica", () => {
  test("rechaza lectura y escritura sin sesión y no toca el horario guardado", async () => {
    const { t, owner } = await setup();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, mixedWeek());
    const before = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
    await expect(t.query(api.weeklySchedule.getMyWeeklySchedule, {})).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.mutation(api.weeklySchedule.saveMyWeeklySchedule, closedWeek())).rejects.toThrow("UNAUTHENTICATED");
    expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual(before);
  });

  test("rechaza ambas operaciones sin negocio, sin crearlo implícitamente", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(alice);
    await expect(owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).rejects.toThrow("BUSINESS_NOT_FOUND");
    await expect(owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, closedWeek())).rejects.toThrow("BUSINESS_NOT_FOUND");
    expect(await t.run((ctx) => ctx.db.query("weeklySchedules").take(1))).toEqual([]);
    expect(await owner.query(api.businesses.getMyBusiness, {})).toBeNull();
  });

  test("distingue ausencia de configuración de semana cerrada guardada", async () => {
    const { owner, businessId } = await setup();
    expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toBeNull();
    const id = await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, closedWeek());
    expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toMatchObject({ _id: id, businessId, ...closedWeek() });
  });

  test("crea semana mixta, la recupera con otra identidad de sesión y actualiza el mismo documento", async () => {
    const { t, owner, businessId } = await setup();
    const id = await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, mixedWeek());
    const initial = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
    expect(initial).toMatchObject({ _id: id, businessId, ...mixedWeek() });
    expect(await t.withIdentity(alice).query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual(initial);
    const edited = mixedWeek();
    edited.days[0].end = "16:00";
    edited.days[4] = { dayOfWeek: 5, isOpen: false, start: "incompleto", end: "24:00" };
    const expected = mixedWeek();
    expected.days[0].end = "16:00";
    expected.days[4] = closedWeek().days[4];
    for (let i = 0; i < 3; i++) {
      expect(await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, edited)).toBe(id);
    }
    const saved = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
    expect(saved).toEqual({ ...initial, ...expected });
    expect(await t.run((ctx) => ctx.db.query("weeklySchedules").take(2))).toHaveLength(1);
    expect(await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, closedWeek())).toBe(id);
    expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual({ ...initial, ...closedWeek() });
  });

  test("normaliza orden ISO sin cambiar horas locales, zona, perfil ni servicios", async () => {
    const { owner } = await setup();
    const serviceId = await owner.mutation(api.services.createMyService, { name: "Sintético", durationMinutes: 30 });
    const before = await owner.query(api.businesses.getMyBusiness, {});
    const week = mixedWeek();
    week.days[0].start = "00:00";
    week.days[0].end = "23:59";
    week.days.reverse();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, week);
    const saved = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
    expect(saved?.days.map((day) => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(saved?.days[0]).toEqual({ dayOfWeek: 1, isOpen: true, start: "00:00", end: "23:59" });
    expect(await owner.query(api.businesses.getMyBusiness, {})).toEqual(before);
    expect((await owner.query(api.services.listMyServices, { paginationOpts: { numItems: 20, cursor: null } })).page)
      .toMatchObject([{ _id: serviceId, name: "Sintético", durationMinutes: 30 }]);
  });

  test("dos propietarios con el mismo correo mantienen semanas independientes", async () => {
    const { t, owner } = await setup();
    const other = t.withIdentity(bob);
    const foreignBusiness = await other.mutation(api.businesses.createMyBusiness, profile);
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, mixedWeek());
    expect(await other.query(api.weeklySchedule.getMyWeeklySchedule, {})).toBeNull();
    await other.mutation(api.weeklySchedule.saveMyWeeklySchedule, closedWeek());
    const before = await other.query(api.weeklySchedule.getMyWeeklySchedule, {});
    for (const extra of [{ businessId: foreignBusiness }, { ownerId: bob.subject }]) {
      await expect(owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { ...closedWeek(), ...extra } as never)).rejects.toThrow();
      await expect(owner.query(api.weeklySchedule.getMyWeeklySchedule, extra as never)).rejects.toThrow();
    }
    expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toMatchObject(mixedWeek());
    expect(await other.query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual(before);
  });

  const invalidTimes = [null, "", " ", "9:00", "24:00", "12:60", "09:00:00", "2026-10-20T09:00:00Z", "09:00 "];
  test.each(invalidTimes)("apertura inválida %j rechazada sin modificar ningún día", async (start) => {
    const { owner } = await setup();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, mixedWeek());
    const before = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
    const edited = mixedWeek();
    edited.days[0].end = "16:00"; // An earlier valid edit must not leak on failure.
    edited.days[4].start = start;
    await expect(owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, edited)).rejects.toThrow("INVALID_TIME");
    expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual(before);
  });

  test.each([null, "", "24:00", "09:00", "08:59", "02:00"])
    ("cierre inválido %j rechazado; tampoco crea configuración en el primer intento", async (end) => {
      const { owner } = await setup();
      const edited = mixedWeek();
      edited.days[0].end = end;
      await expect(owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, edited)).rejects.toThrow();
      expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toBeNull();
      await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, mixedWeek());
      const before = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
      await expect(owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, edited)).rejects.toThrow();
      expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual(before);
    });

  test.each(["missing", "extra", "duplicate", "range", "fraction", "NaN", "boolean", "time-type", "missing-time", "extra-field"])
    ("estructura manipulada %s rechazada sin modificar la semana previa", async (kind) => {
      const { owner } = await setup();
      await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, mixedWeek());
      const before = await owner.query(api.weeklySchedule.getMyWeeklySchedule, {});
      const edited = mixedWeek();
      if (kind === "missing") edited.days.pop();
      if (kind === "extra") edited.days.push({ ...edited.days[0] });
      if (kind === "duplicate") edited.days[6].dayOfWeek = 1;
      if (kind === "range") edited.days[6].dayOfWeek = 0;
      if (kind === "fraction") edited.days[6].dayOfWeek = 6.5;
      if (kind === "NaN") edited.days[6].dayOfWeek = NaN;
      if (kind === "boolean") Object.assign(edited.days[0], { isOpen: "true" });
      if (kind === "time-type") Object.assign(edited.days[0], { start: 900 });
      if (kind === "missing-time") Reflect.deleteProperty(edited.days[0], "start");
      if (kind === "extra-field") Object.assign(edited.days[0], { businessId: "forged" });
      await expect(owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, edited)).rejects.toThrow();
      expect(await owner.query(api.weeklySchedule.getMyWeeklySchedule, {})).toEqual(before);
    });
});
