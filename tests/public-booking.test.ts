import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { bookingSlugBase, isBookingSlug } from "../lib/booking-slug";

const modules = import.meta.glob("../convex/**/*.ts");
const date = "2030-01-07";
const now = Date.parse("2030-01-01T00:00:00Z");
const at = (time: string) => Date.parse(`${date}T${time}:00-03:00`);
const days = (opening = "09:00", closing = "12:00") => Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i + 1, isOpen: i === 0, start: i === 0 ? opening : null, end: i === 0 ? closing : null,
}));
async function setup(name = "Salón José", durationMinutes = 30, timeZone = "America/Montevideo") {
  vi.spyOn(Date, "now").mockReturnValue(now);
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const owner = t.withIdentity({ subject: "synthetic_public", issuer: "https://synthetic.test" });
  const businessId = await owner.mutation(api.businesses.createMyBusiness, { name, timeZone });
  const serviceId = await owner.mutation(api.services.createMyService, { name: "Servicio sintético", durationMinutes });
  await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days() });
  const { slug } = await owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: true });
  const args = { slug: slug!, attemptKey: crypto.randomUUID(), serviceId, date, start: at("09:30"), clientName: "  Jose\u0301   Sintético  " };
  const confirm = (extra = {}) => t.mutation(api.publicBooking.confirm, { ...args, attemptKey: crypto.randomUUID(), ...extra });
  const docs = () => t.run((ctx) => ctx.db.query("appointments").take(100));
  const receipts = () => t.run((ctx) => ctx.db.query("publicBookingReceipts").take(100));
  return { t, owner, businessId, serviceId, args, confirm, docs, receipts };
}
afterEach(() => vi.restoreAllMocks());

describe("enlaces de reserva", () => {
  test.each([["  Salón de José! ", "salon-de-jose"], ["東京", "negocio"], ["A__B", "a-b"], ["x".repeat(100), "x".repeat(48)]])("normaliza %s", (name, expected) => {
    expect(bookingSlugBase(name)).toBe(expected);
    expect(isBookingSlug(expected)).toBe(true);
  });
  test.each(["", "A", "a/b", "a--b", "-abc", "abc-", "x".repeat(53), "á"])("rechaza segmento no canónico %s", (slug) => expect(isBookingSlug(slug)).toBe(false));
  test("schema antiguo es privado; desactivar no asigna slug; solo activar lo asigna", async () => {
    const { t, owner, businessId } = await setup();
    await t.run((ctx) => ctx.db.patch("businesses", businessId, { publicBookingSlug: undefined, publicBookingEnabled: undefined }));
    expect(await owner.query(api.bookingLinks.getMyBookingLink, {})).toEqual({ enabled: false, slug: null });
    expect(await owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: false })).toEqual({ enabled: false, slug: null });
    expect(await t.query(api.publicBooking.getBusiness, { slug: "salon-jose" })).toBeNull();
    expect(await owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: true })).toEqual({ enabled: true, slug: "salon-jose" });
  });
  test("desactivar conserva slug reservado y reactivar devuelve el mismo", async () => {
    const { t, owner, args } = await setup();
    await owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: false });
    const other = t.withIdentity({ subject: "other", issuer: "https://synthetic.test" });
    await other.mutation(api.businesses.createMyBusiness, { name: "Salón José", timeZone: "UTC" });
    expect(await other.mutation(api.bookingLinks.setMyBookingLink, { enabled: true })).toEqual({ enabled: true, slug: "salon-jose-2" });
    expect(await owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: true })).toEqual({ enabled: true, slug: args.slug });
  });
  test("gestión requiere identidad y no acepta propietario/negocio/slug arbitrario", async () => {
    const { t, owner, businessId } = await setup();
    await expect(t.query(api.bookingLinks.getMyBookingLink, {})).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.mutation(api.bookingLinks.setMyBookingLink, { enabled: true })).rejects.toThrow("UNAUTHENTICATED");
    const other = t.withIdentity({ subject: "no_business", issuer: "https://synthetic.test" });
    await expect(other.mutation(api.bookingLinks.setMyBookingLink, { enabled: false })).rejects.toThrow("BUSINESS_NOT_FOUND");
    for (const extra of [{ businessId }, { ownerId: "other" }, { slug: "chosen" }]) {
      await expect(owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: false, ...extra } as never)).rejects.toThrow();
    }
    expect((await owner.query(api.bookingLinks.getMyBookingLink, {})).enabled).toBe(true);
  });
});

describe("contrato público y privacidad anónima", () => {
  test("DTO permite solo negocio/zona, servicios mínimos y opciones; no ocupación privada", async () => {
    const { t, owner, args, businessId } = await setup();
    await owner.mutation(api.appointments.createMyAppointment, { serviceId: args.serviceId, date, start: at("09:30"), clientName: "Nombre PRIVADO" });
    expect(await t.query(api.publicBooking.getBusiness, { slug: args.slug })).toEqual({ name: "Salón José", timeZone: "America/Montevideo" });
    const page = await t.query(api.publicBooking.listServices, { slug: args.slug, paginationOpts: { cursor: null, numItems: 30 } });
    expect(page.page).toEqual([{ id: args.serviceId, name: "Servicio sintético", durationMinutes: 30 }]);
    const preview = await t.action(api.publicBooking.getAvailability, { slug: args.slug, serviceId: args.serviceId, date });
    expect(Object.keys(preview!)).toEqual(["slots"]);
    expect(preview!.slots.every((s) => Object.keys(s).sort().join() === "end,endTime,start,startTime")).toBe(true);
    expect(preview!.slots.some((s) => s.start === at("09:30"))).toBe(false);
    expect(JSON.stringify({ page, preview })).not.toMatch(/ownerId|clientName|businessId|_creationTime|Nombre PRIVADO|synthetic_public/);
    expect(JSON.stringify(preview)).not.toContain(businessId);
    await expect(t.query(api.businesses.getMyBusiness, {})).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.query(api.appointments.listMyConfirmedAppointments, { date })).rejects.toThrow("UNAUTHENTICATED");
  });
  test("servicios paginados sin omitir resultados ni consultar otro negocio", async () => {
    const { t, owner, args } = await setup();
    for (let i = 0; i < 33; i++) await owner.mutation(api.services.createMyService, { name: `Servicio ${i}`, durationMinutes: 1 });
    const first = await t.query(api.publicBooking.listServices, { slug: args.slug, paginationOpts: { cursor: null, numItems: 20 } });
    const second = await t.query(api.publicBooking.listServices, { slug: args.slug, paginationOpts: { cursor: first.continueCursor, numItems: 20 } });
    expect(first.isDone).toBe(false); expect(second.isDone).toBe(true);
    expect(new Set([...first.page, ...second.page].map((s) => s.id)).size).toBe(34);
  });
  test.each(["missing", "Salón José", "salon-jose/"])("inexistente/no canónico %s no revela información", async (slug) => {
    const { t, args, docs } = await setup();
    expect(await t.query(api.publicBooking.getBusiness, { slug })).toBeNull();
    expect((await t.query(api.publicBooking.listServices, { slug, paginationOpts: { cursor: null, numItems: 10 } })).page).toEqual([]);
    expect(await t.action(api.publicBooking.getAvailability, { slug, serviceId: args.serviceId, date })).toBeNull();
    expect(await t.mutation(api.publicBooking.confirm, { ...args, slug })).toEqual({ ok: false, code: "UNAVAILABLE" });
    expect(await docs()).toEqual([]);
  });
  test("desactivación tras consultar impide confirmar y oculta todos los DTO; ni replay la evita", async () => {
    const { t, owner, args, docs } = await setup();
    expect((await t.action(api.publicBooking.getAvailability, { slug: args.slug, serviceId: args.serviceId, date }))!.slots.length).toBeGreaterThan(0);
    expect((await t.mutation(api.publicBooking.confirm, args)).ok).toBe(true);
    const before = await docs();
    await owner.mutation(api.bookingLinks.setMyBookingLink, { enabled: false });
    expect(await t.query(api.publicBooking.getBusiness, { slug: args.slug })).toBeNull();
    expect((await t.query(api.publicBooking.listServices, { slug: args.slug, paginationOpts: { cursor: null, numItems: 10 } })).page).toEqual([]);
    expect(await t.action(api.publicBooking.getAvailability, { slug: args.slug, serviceId: args.serviceId, date })).toBeNull();
    expect(await t.mutation(api.publicBooking.confirm, args)).toEqual({ ok: false, code: "UNAVAILABLE" });
    expect(await docs()).toEqual(before);
  });
  test("servicio ajeno no consulta opciones ni crea citas, tampoco reutilizando nonce", async () => {
    const { t, args, confirm, docs } = await setup();
    const other = t.withIdentity({ subject: "other", issuer: "https://synthetic.test" });
    await other.mutation(api.businesses.createMyBusiness, { name: "Other", timeZone: "UTC" });
    const serviceId = await other.mutation(api.services.createMyService, { name: "Secreto", durationMinutes: 1 });
    expect(await t.action(api.publicBooking.getAvailability, { slug: args.slug, date, serviceId })).toBeNull();
    expect(await confirm({ serviceId })).toEqual({ ok: false, code: "SERVICE_NOT_FOUND" });
    expect(await docs()).toEqual([]);
  });
});

describe("confirmación transaccional pública (memoria, no prueba OCC)", () => {
  test("crea confirmada, normaliza nombre, calcula duración y aparece en Agenda privada", async () => {
    const { owner, confirm, docs, receipts, businessId, serviceId } = await setup("Salón José", 46);
    expect(await confirm()).toEqual({ ok: true, receipt: { serviceName: "Servicio sintético", date, start: at("09:30"), end: at("10:16"), timeZone: "America/Montevideo" } });
    const rows = await docs();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ businessId, serviceId, status: "confirmed", clientName: "José Sintético", end: at("10:16") });
    expect((await receipts())[0].appointmentId).toBe(rows[0]._id);
    expect((await owner.query(api.appointments.searchMyAppointments, { client: "Jose", period: "todas", from: "", until: "", paginationOpts: { cursor: null, numItems: 20 } })).page[0]._id).toBe(rows[0]._id);
  });
  test.each(["", " ", "x".repeat(101), "a\u0000b", "a\u200bb"])("nombre inválido %j no crea cita parcial", async (clientName) => {
    const { confirm, docs, receipts } = await setup();
    expect(await confirm({ clientName })).toEqual({ ok: false, code: "INVALID_CLIENT_NAME" });
    expect(await docs()).toEqual([]); expect(await receipts()).toEqual([]);
  });
  test.each(["", "2030-02-29", "2030-1-07", "2030-04-31"])("fecha inválida %j", async (date) => {
    const { confirm, docs } = await setup();
    expect(await confirm({ date })).toEqual({ ok: false, code: "INVALID_DATE" }); expect(await docs()).toEqual([]);
  });
  test.each([at("08:45"), at("09:01"), at("11:45"), at("12:00"), at("09:30") + 1, NaN, Infinity, Number.MAX_SAFE_INTEGER])("inicio inválido %s", async (start) => {
    const { confirm, docs } = await setup();
    expect(await confirm({ start })).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" }); expect(await docs()).toEqual([]);
  });
  test("horario/duración vigentes y futuro prevalecen sobre opciones antiguas", async () => {
    const { t, owner, businessId, serviceId, confirm, docs } = await setup();
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days("10:00") });
    expect(await confirm()).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days() });
    await t.run((ctx) => ctx.db.patch("services", serviceId, { durationMinutes: 200 }));
    expect(await confirm()).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
    await t.run((ctx) => ctx.db.patch("services", serviceId, { durationMinutes: 30 }));
    vi.mocked(Date.now).mockReturnValue(at("09:30"));
    expect(await confirm()).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
    expect(await docs()).toEqual([]);
    expect((await t.run((ctx) => ctx.db.get("businesses", businessId)))?.publicBookingEnabled).toBe(true);
  });
  test("DST omite instantes ambiguos y saltos igual que la regla compartida", async () => {
    const { owner, confirm, docs } = await setup("DST", 30, "America/New_York");
    await owner.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days().map((d) => ({ ...d, isOpen: true, start: "00:00", end: "05:00" })) });
    for (const start of [Date.parse("2030-11-03T01:30:00-04:00"), Date.parse("2030-11-03T01:30:00-05:00"), Date.parse("2030-03-10T01:45:00-05:00")]) {
      expect(await confirm({ date: start > Date.parse("2030-10-01") ? "2030-11-03" : "2030-03-10", start })).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
    }
    expect(await docs()).toEqual([]);
  });
  test("comparte ocupación con privado/otros servicios, fin excluido; cancelación libera", async () => {
    const { owner, confirm, docs, args } = await setup();
    const second = await owner.mutation(api.services.createMyService, { name: "Otro", durationMinutes: 46 });
    const id = await owner.mutation(api.appointments.createMyAppointment, { serviceId: second, date, start: at("09:30"), clientName: "Privado" });
    const original = await docs();
    expect(await confirm({ start: at("10:00") })).toEqual({ ok: false, code: "SLOT_TAKEN" });
    expect(await docs()).toEqual(original);
    expect((await confirm({ start: at("10:30") })).ok).toBe(true);
    await owner.mutation(api.appointments.cancelMyAppointment, { appointmentId: id, expectedVersion: 0 });
    expect((await confirm({ ...args, attemptKey: crypto.randomUUID() })).ok).toBe(true);
    const rows = await docs(); expect(rows).toHaveLength(3);
    expect(rows.find((r) => r._id === id)).toMatchObject({ status: "cancelled", version: 1, cancelledAt: now });
  });
  test("replay no duplica ni revela reprogramación/cancelación privada y no cambia timestamps", async () => {
    const { t, owner, args, docs, receipts } = await setup();
    const response = await t.mutation(api.publicBooking.confirm, args);
    const before = await docs(); const beforeReceipts = await receipts();
    expect(await t.mutation(api.publicBooking.confirm, args)).toEqual(response);
    expect(await docs()).toEqual(before); expect(await receipts()).toEqual(beforeReceipts);
    await owner.mutation(api.appointments.rescheduleMyAppointment, { appointmentId: before[0]._id, expectedVersion: 0, date, start: at("10:30") });
    const moved = await docs();
    expect(await t.mutation(api.publicBooking.confirm, args)).toEqual(response);
    expect(await docs()).toEqual(moved);
    await owner.mutation(api.appointments.cancelMyAppointment, { appointmentId: before[0]._id, expectedVersion: 1 });
    const cancelled = await docs();
    expect(await t.mutation(api.publicBooking.confirm, args)).toEqual(response);
    expect(await docs()).toEqual(cancelled);
    expect(await receipts()).toEqual(beforeReceipts);
    expect(JSON.stringify(response)).not.toMatch(/appointmentId|clientName|cancelled|rescheduled|version|_id/);
  });
  test("nonce con otro payload rechaza; normalización equivalente admite replay", async () => {
    const { t, args, docs } = await setup();
    const result = await t.mutation(api.publicBooking.confirm, args);
    expect(await t.mutation(api.publicBooking.confirm, { ...args, clientName: "José Sintético" })).toEqual(result);
    for (const extra of [{ clientName: "Otra persona" }, { start: at("10:00") }, { date: "2030-01-14" }]) {
      expect(await t.mutation(api.publicBooking.confirm, { ...args, ...extra })).toEqual({ ok: false, code: "ATTEMPT_CONFLICT" });
    }
    expect(await docs()).toHaveLength(1);
  });
  test.each(["", "nonce", "00000000-0000-0000-0000-000000000000"])("clave inválida %s rechaza sin cita", async (attemptKey) => {
    const { confirm, docs } = await setup();
    expect(await confirm({ attemptKey })).toEqual({ ok: false, code: "INVALID_ATTEMPT" }); expect(await docs()).toEqual([]);
  });
});

describe("cuota pública persistente", () => {
  test("10 rechazos consumen tokens aun sin citas; nonce/identidad no evaden; repone 1/6s y no frena privado", async () => {
    const { owner, args, confirm, docs } = await setup();
    for (let i = 0; i < 10; i++) expect(await confirm({ clientName: "" })).toEqual({ ok: false, code: "INVALID_CLIENT_NAME" });
    expect(await confirm()).toEqual({ ok: false, code: "RATE_LIMITED", retryAfter: 6000 });
    expect(await owner.mutation(api.publicBooking.confirm, { ...args, attemptKey: crypto.randomUUID() })).toEqual({ ok: false, code: "RATE_LIMITED", retryAfter: 6000 });
    expect(await docs()).toEqual([]);
    await owner.mutation(api.appointments.createMyAppointment, { serviceId: args.serviceId, date, start: at("10:30"), clientName: "Privado legítimo" });
    vi.mocked(Date.now).mockReturnValue(now + 6000);
    expect((await confirm()).ok).toBe(true);
    expect(await confirm()).toEqual({ ok: false, code: "RATE_LIMITED", retryAfter: 6000 });
  });
  test("rechazos por slot, fecha y clave también persisten; cuota por negocio independiente", async () => {
    const { t, owner, args, confirm } = await setup();
    await owner.mutation(api.appointments.createMyAppointment, { serviceId: args.serviceId, date, start: args.start, clientName: "Privado" });
    for (let i = 0; i < 4; i++) expect(await confirm()).toEqual({ ok: false, code: "SLOT_TAKEN" });
    for (let i = 0; i < 3; i++) expect(await confirm({ date: "bad" })).toEqual({ ok: false, code: "INVALID_DATE" });
    for (let i = 0; i < 3; i++) expect(await confirm({ attemptKey: "bad" })).toEqual({ ok: false, code: "INVALID_ATTEMPT" });
    expect((await confirm()).ok).toBe(false);
    const other = t.withIdentity({ subject: "other", issuer: "https://synthetic.test" });
    await other.mutation(api.businesses.createMyBusiness, { name: "Other", timeZone: "America/Montevideo" });
    const serviceId = await other.mutation(api.services.createMyService, { name: "Otro", durationMinutes: 30 });
    await other.mutation(api.weeklySchedule.saveMyWeeklySchedule, { days: days() });
    const link = await other.mutation(api.bookingLinks.setMyBookingLink, { enabled: true });
    expect((await t.mutation(api.publicBooking.confirm, { ...args, slug: link.slug!, serviceId })).ok).toBe(true);
  });
  test("replays cuentan, conservan capacidad hasta renovar y nunca crean duplicados", async () => {
    const { t, args, docs, receipts } = await setup();
    const first = await t.mutation(api.publicBooking.confirm, args);
    for (let i = 0; i < 9; i++) expect(await t.mutation(api.publicBooking.confirm, args)).toEqual(first);
    expect(await t.mutation(api.publicBooking.confirm, args)).toEqual({ ok: false, code: "RATE_LIMITED", retryAfter: 6000 });
    vi.mocked(Date.now).mockReturnValue(now + 6000);
    expect(await t.mutation(api.publicBooking.confirm, args)).toEqual(first);
    expect(await docs()).toHaveLength(1); expect(await receipts()).toHaveLength(1);
  });
});
