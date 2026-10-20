import { describe, expect, it } from "vitest";
import { formatLocalDate, shiftLocalDate, todayInZone } from "../lib/agenda-date";
import { dashboardHref, readDashboardView } from "../lib/dashboard-navigation";

describe("Agenda: calendario local y enlaces", () => {
  it("resuelve hoy en la zona del negocio cerca de medianoche", () => {
    const now = Date.parse("2026-10-21T01:30:00Z");
    expect(todayInZone("America/Montevideo", now)).toBe("2026-10-20");
    expect(todayInZone("Asia/Tokyo", now)).toBe("2026-10-21");
  });
  it("avanza fechas civiles sin sumar horas del huso del navegador", () => {
    expect(shiftLocalDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftLocalDate("2024-02-29", 1)).toBe("2024-03-01");
    expect(shiftLocalDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftLocalDate("2026-03-08", 1)).toBe("2026-03-09");
  });
  it("limita la navegación al rango soportado y rechaza fechas inválidas", () => {
    expect(shiftLocalDate("0001-01-01", -1)).toBeNull();
    expect(shiftLocalDate("9999-12-31", 1)).toBeNull();
    expect(shiftLocalDate("2026-02-30", 1)).toBeNull();
    expect(shiftLocalDate("0001-01-01", 1)).toBe("0001-01-02");
  });
  it("mantiene día de semana y fecha sin reinterpretarlos en otra zona", () => {
    expect(formatLocalDate("2026-10-26")).toBe("lunes, 26 de octubre de 2026");
  });
  it("resuelve destinos desconocidos a Agenda y conserva fecha en enlaces", () => {
    expect(readDashboardView("no-existe")).toBe("agenda");
    expect(readDashboardView("horario")).toBe("horario");
    expect(dashboardHref("agenda")).toBe("/dashboard");
    expect(dashboardHref("servicios", "2026-10-26")).toBe("/dashboard?vista=servicios&fecha=2026-10-26");
  });
  it("conserva modo y filtros de búsqueda entre las cuatro vistas", () => {
    const source = new URLSearchParams("fecha=2010-01-01&modo=listado&cliente=Ana&servicio=sintetico&periodo=pasadas&desde=1999-01-01&hasta=2020-12-31");
    for (const view of ["agenda", "servicios", "horario", "negocio"] as const) {
      const href = new URL(dashboardHref(view, source.get("fecha"), source), "https://synthetic.test");
      expect(href.searchParams.get("modo")).toBe("listado");
      for (const [key, value] of source) expect(href.searchParams.get(key)).toBe(value);
      expect(href.searchParams.get("vista")).toBe(view === "agenda" ? null : view);
    }
  });
});
