import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import type { FunctionArgs } from "convex/server";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { agendaFilterError, appointmentDateBounds, appointmentFilterError, appointmentPeriodDates, appointmentQueryFilters, appointmentSearchHref, emptyAppointmentFilters, normalizeClientSearch, readAppointmentFilters } from "../lib/appointment-search";
import { todayInZone } from "../lib/agenda-date";

const modules = import.meta.glob("../convex/**/*.ts");
const identity = { subject: "synthetic_search", issuer: "https://clerk.test", email: "same@example.test" };
const defaults: FunctionArgs<typeof api.appointments.searchMyAppointments> = { client: "", period: "todas", from: "", until: "", paginationOpts: { numItems: 7, cursor: null } };

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(identity);
  const businessId = await owner.mutation(api.businesses.createMyBusiness, { name: "Synthetic search", timeZone: "America/Montevideo" });
  const serviceId = await owner.mutation(api.services.createMyService, { name: "Synthetic A", durationMinutes: 30 });
  const secondService = await owner.mutation(api.services.createMyService, { name: "Synthetic B", durationMinutes: 46 });
  const seed = async (date: string, clientName = "José Sintético", service = serviceId, hour = "09:30") => {
    const start = Date.parse(`${date}T${hour}:00-03:00`);
    return t.run((ctx) => ctx.db.insert("appointments", { businessId, serviceId: service, serviceName: service === serviceId ? "Synthetic A" : "Synthetic B", date, clientName, start, end: start + 30 * 60_000, status: "confirmed" }));
  };
  const search = (args: Partial<typeof defaults> = {}) => owner.query(api.appointments.searchMyAppointments, { ...defaults, ...args });
  return { t, owner, businessId, serviceId, secondService, seed, search };
}

describe("consulta amplia de citas (solo memoria)", () => {
  test("sin fecha obligatoria incluye años pasados/lejanos y ordena fecha/inicio; no expone negocio o identidad", async () => {
    const { seed, search } = await setup();
    for (const date of ["2099-12-31", "1999-01-01", "2030-01-07"]) await seed(date);
    await seed("2030-01-07", "Otro", undefined, "08:30");
    const result = await search();
    expect(result.page.map((r) => `${r.date}:${r.start}`)).toEqual([...result.page].sort((a, b) => a.start - b.start).map((r) => `${r.date}:${r.start}`));
    expect(result.page.map((r) => r.date)).toEqual(["1999-01-01", "2030-01-07", "2030-01-07", "2099-12-31"]);
    expect(Object.keys(result.page[0]).sort()).toEqual(["_id", "clientName", "date", "end", "serviceId", "serviceName", "start", "status", "version"].sort());
    expect(result.isDone).toBe(true);
  });
  test("combina fragmento de nombre, servicio y rango inclusivo", async () => {
    const { seed, search, secondService } = await setup();
    await seed("2030-01-01", "  JOSE\u0301   Muñoz ", secondService);
    await seed("2030-01-31", "José Muñoz", secondService);
    await seed("2030-02-01", "José Muñoz", secondService);
    await seed("2030-01-15", "José Muñoz");
    await seed("2030-01-15", "Ana", secondService);
    const found = await search({ client: "SE MUN", serviceId: secondService, from: "2030-01-01", until: "2030-01-31" });
    expect(found.page.map((r) => r.date)).toEqual(["2030-01-01", "2030-01-31"]);
    expect((await search({ client: "Muñoz José" })).page).toEqual([]); // literal fragment, not unordered words
    expect((await search()).page).toHaveLength(5);
  });
  test("períodos por día IANA explícito incluyen todo hoy en próximas y excluyen hoy en pasadas", async () => {
    const { seed, search } = await setup();
    for (const date of ["2026-10-19", "2026-10-20", "2026-10-21"]) await seed(date);
    const instant = Date.parse("2026-10-21T01:30:00Z");
    const today = todayInZone("America/Montevideo", instant);
    expect(today).toBe("2026-10-20");
    expect((await search({ period: "proximas", referenceDate: today })).page.map((r) => r.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect((await search({ period: "pasadas", referenceDate: today })).page.map((r) => r.date)).toEqual(["2026-10-19"]);
    expect((await search({ period: "pasadas", referenceDate: "2026-10-21" })).page.map((r) => r.date)).toEqual(["2026-10-19", "2026-10-20"]);
    expect((await search({ period: "pasadas", referenceDate: today, until: "2026-10-18" })).page).toEqual([]);
    expect((await search({ period: "proximas", referenceDate: today, until: "2026-10-19" })).isDone).toBe(true);
  });
  test("Hoy usa la consulta existente, cambia al cruzar medianoche y respeta la zona (fixtures en memoria)", async () => {
    const { seed, search } = await setup();
    for (const date of ["2026-10-19", "2026-10-20", "2026-10-21"]) await seed(date);
    for (const [zone, instant, expected] of [
      ["America/Montevideo", "2026-10-21T02:59:59Z", "2026-10-20"],
      ["America/Montevideo", "2026-10-21T03:00:00Z", "2026-10-21"],
      ["Asia/Tokyo", "2026-10-21T02:59:59Z", "2026-10-21"],
    ]) {
      const today = todayInZone(zone, Date.parse(instant));
      const filters = readAppointmentFilters(new URLSearchParams(), today);
      const query = appointmentQueryFilters(filters, today);
      expect(filters).toMatchObject({ period: "hoy", from: expected, until: expected });
      expect(query.period).toBe("todas");
      expect((await search({ period: query.period, from: query.from, until: query.until })).page.map((r) => r.date)).toEqual([expected]);
    }
  });
  test("recorre más de una página, incluso páginas sin coincidencias, sin duplicados ni omisiones", async () => {
    const { seed, search } = await setup();
    for (let i = 1; i <= 28; i++) await seed(`2030-01-${String(i).padStart(2, "0")}`, i > 20 ? "Encontrar lejos" : "Otro");
    const first = await search({ client: "lejos" });
    expect(first.page).toEqual([]);
    expect(first.isDone).toBe(false);
    const rows = [...first.page];
    let cursor = first.continueCursor;
    let done = first.isDone;
    let pages = 1;
    while (!done && pages < 10) {
      const page = await search({ client: "lejos", paginationOpts: { numItems: 7, cursor } });
      rows.push(...page.page); cursor = page.continueCursor; done = page.isDone; pages++;
    }
    expect(done).toBe(true); expect(pages).toBeGreaterThan(1);
    expect(rows).toHaveLength(8); expect(new Set(rows.map((r) => r._id)).size).toBe(8);
    expect(rows[0].date).toBe("2030-01-21"); expect(rows.at(-1)?.date).toBe("2030-01-28");
  });
  test("paginación con servicio y período sigue el índice correcto", async () => {
    const { seed, search, secondService } = await setup();
    for (let i = 1; i <= 18; i++) { await seed(`2030-01-${String(i).padStart(2, "0")}`, "Propio", secondService); await seed("2020-01-01", "No corresponde"); }
    const rows = []; let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const page = await search({ serviceId: secondService, period: "proximas", referenceDate: "2030-01-10", paginationOpts: { numItems: 3, cursor } });
      rows.push(...page.page); if (page.isDone) break; cursor = page.continueCursor;
    }
    expect(rows).toHaveLength(9); expect(rows.every((r) => r.serviceId === secondService && r.date >= "2030-01-10")).toBe(true);
  });
  test.each([{ from: "2030-02-29" }, { until: "0000-01-01" }, { until: "2030-04-31" }, { from: "2030-02-02", until: "2030-01-01" }, { client: "x".repeat(101) }, { client: "a\u0000b" }, { period: "proximas" as const }, { period: "pasadas" as const, referenceDate: "2030-02-30" }])("rechaza filtros inválidos %j", async (filters) => {
    const { search } = await setup(); await expect(search(filters)).rejects.toThrow();
  });
  test.each([0, -1, 1.5, NaN, Infinity])("rechaza tamaño de página %s", async (numItems) => {
    const { search } = await setup(); await expect(search({ paginationOpts: { numItems, cursor: null } })).rejects.toThrow("INVALID_PAGINATION");
  });
  test("acota numItems aunque el cliente solicite miles", async () => {
    const { seed, search } = await setup();
    for (let i = 0; i < 105; i++) await seed("2030-01-07", `Synthetic ${i}`);
    const page = await search({ paginationOpts: { numItems: 5000, cursor: null, maximumRowsRead: 1_000_000, maximumBytesRead: 1_000_000_000 } });
    expect(page.page.length).toBeLessThanOrEqual(100); expect(page.isDone).toBe(false);
  });
  test("sin sesión/sin negocio, mismo email, servicio ajeno y argumentos de propietario", async () => {
    const { t, owner, seed, search } = await setup(); await seed("2030-01-07");
    await expect(t.query(api.appointments.searchMyAppointments, defaults)).rejects.toThrow("UNAUTHENTICATED");
    const other = t.withIdentity({ ...identity, subject: "synthetic_other", email: "same@example.test" });
    await expect(other.query(api.appointments.searchMyAppointments, defaults)).rejects.toThrow("BUSINESS_NOT_FOUND");
    const foreignBusiness = await other.mutation(api.businesses.createMyBusiness, { name: "Other", timeZone: "UTC" });
    const foreign = await other.mutation(api.services.createMyService, { name: "Other service", durationMinutes: 30 });
    expect((await other.query(api.appointments.searchMyAppointments, defaults)).page).toEqual([]);
    await t.run((ctx) => ctx.db.insert("appointments", { businessId: foreignBusiness, serviceId: foreign, serviceName: "Other service", clientName: "José Sintético", date: "2030-01-07", start: Date.parse("2030-01-07T09:30:00Z"), end: Date.parse("2030-01-07T10:00:00Z"), status: "confirmed" }));
    const ownRows = await search({ client: "jose" });
    const foreignRows = await other.query(api.appointments.searchMyAppointments, { ...defaults, client: "jose" });
    expect(ownRows.page).toHaveLength(1); expect(foreignRows.page).toHaveLength(1);
    expect(ownRows.page[0]._id).not.toBe(foreignRows.page[0]._id);
    expect(foreignRows.page[0].serviceId).toBe(foreign);
    await expect(search({ serviceId: foreign })).rejects.toThrow("SERVICE_NOT_FOUND");
    await expect(owner.query(api.appointments.searchMyAppointments, { ...defaults, businessId: "forged" } as never)).rejects.toThrow();
    expect((await search()).page).toHaveLength(1);
  });
});

describe("filtros, enlaces y límites civiles", () => {
  const today = "2026-10-20";
  test("Hoy es el valor predeterminado dinámico; Todas queda explícito y sin límites", () => {
    const current = readAppointmentFilters(new URLSearchParams(), today);
    expect(current).toEqual({ ...emptyAppointmentFilters, period: "hoy", from: today, until: today });
    expect(appointmentSearchHref(new URLSearchParams(), current)).toBe("/dashboard");
    const all = { ...emptyAppointmentFilters };
    const href = new URL(appointmentSearchHref(new URLSearchParams(), all), "https://synthetic.test");
    expect(href.searchParams.get("periodo")).toBe("todas");
    expect(readAppointmentFilters(href.searchParams, today)).toEqual(all);
  });
  test("filtros y Ver día representan un solo listado y retiran fecha/modo anteriores", () => {
    const params = new URLSearchParams("fecha=1999-01-01&modo=listado&vista=servicios");
    const filters = { ...emptyAppointmentFilters, client: "José", service: "synthetic", from: "2030-01-01", period: "personalizado" as const };
    const url = new URL(appointmentSearchHref(params, filters), "https://synthetic.test");
    expect(url.searchParams.get("fecha")).toBeNull(); expect(url.searchParams.get("modo")).toBeNull(); expect(url.searchParams.get("vista")).toBeNull();
    expect(readAppointmentFilters(url.searchParams, today)).toEqual(filters);
    const daily = new URL(appointmentSearchHref(url.searchParams, { ...filters, from: "2030-01-07", until: "2030-01-07" }), url);
    const selected = readAppointmentFilters(daily.searchParams, today);
    expect(selected).toEqual({ ...filters, from: "2030-01-07", until: "2030-01-07" });
    expect(appointmentQueryFilters(selected, today)).toEqual({ ...selected, period: "todas" });
  });
  test.each([
    ["hoy", { from: today, until: today }],
    ["todas", { from: "", until: "" }],
    ["proximas", { from: today, until: "" }],
    ["pasadas", { from: "", until: "2026-10-19" }],
  ] as const)("el período %s sincroniza sus límites y la URL no congela fechas derivadas", (period, dates) => {
    expect(appointmentPeriodDates(period, today, { from: "1999-01-01", until: "2099-01-01" })).toEqual(dates);
    const href = new URL(appointmentSearchHref(new URLSearchParams("desde=1999-01-01&hasta=2099-01-01"), { ...emptyAppointmentFilters, period, ...dates }), "https://synthetic.test");
    expect(href.searchParams.has("desde")).toBe(false); expect(href.searchParams.has("hasta")).toBe(false);
    expect(readAppointmentFilters(href.searchParams, today)).toEqual({ ...emptyAppointmentFilters, period, ...dates });
  });
  test("un rango explícito tiene prioridad y no hereda intersecciones ocultas de Hoy/Próximas", () => {
    for (const period of ["hoy", "proximas", "pasadas", "todas"]) {
      const custom = readAppointmentFilters(new URLSearchParams(`periodo=${period}&desde=1999-01-01&hasta=1999-01-01`), today);
      expect(custom.period).toBe("personalizado");
      expect(agendaFilterError(custom)).toBeNull();
      expect(appointmentQueryFilters(custom, today)).toEqual({ ...emptyAppointmentFilters, from: "1999-01-01", until: "1999-01-01" });
    }
  });
  test("los enlaces anteriores se traducen a filtros sin reconstruir modos", () => {
    expect(readAppointmentFilters(new URLSearchParams("fecha=1999-01-01"), today)).toEqual({ ...emptyAppointmentFilters, period: "personalizado", from: "1999-01-01", until: "1999-01-01" });
    expect(readAppointmentFilters(new URLSearchParams("modo=listado&fecha=1999-01-01"), today)).toEqual(emptyAppointmentFilters);
    expect(readAppointmentFilters(new URLSearchParams("modo=listado&periodo=proximas&fecha=1999-01-01"), today)).toEqual({ ...emptyAppointmentFilters, period: "proximas", from: today, until: "" });
    expect(agendaFilterError(readAppointmentFilters(new URLSearchParams("fecha=2026-02-30"), today))).toBeTruthy();
  });
  test("rango personalizado valida límites inclusivos, extremos abiertos, vacío e inversión", () => {
    const custom = { ...emptyAppointmentFilters, period: "personalizado" as const, from: "2026-10-26", until: "2026-10-26" };
    expect(agendaFilterError(custom)).toBeNull();
    expect(agendaFilterError({ ...custom, until: "" })).toBeNull();
    expect(agendaFilterError({ ...custom, from: "" })).toBeNull();
    expect(agendaFilterError({ ...custom, from: "", until: "" })).toContain("al menos una fecha");
    expect(agendaFilterError({ ...custom, until: "2026-10-25" })).toContain("anterior o igual");
  });
  test("fechas extremas, límites inclusivo/exclusivo y enlaces inválidos", () => {
    expect(appointmentDateBounds({ ...emptyAppointmentFilters, period: "pasadas" }, "0001-01-01")).toEqual({ from: "", until: "", before: "0001-01-01", empty: false });
    expect(appointmentDateBounds({ ...emptyAppointmentFilters, period: "proximas", until: "2000-01-01" }, "2030-01-01").empty).toBe(true);
    expect(appointmentFilterError({ ...emptyAppointmentFilters, from: "9999-12-31", until: "9999-12-31" })).toBeNull();
    expect(agendaFilterError(readAppointmentFilters(new URLSearchParams("periodo=inventado"), today))).toBeTruthy();
    expect(normalizeClientSearch("  JOSE\u0301   Muñoz ")).toBe("jose munoz");
  });
});
