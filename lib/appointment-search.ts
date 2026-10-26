import { isLocalDate } from "./local-date";
import { shiftLocalDate } from "./agenda-date";
import { selectedAppointmentStatuses } from "./appointment-status";

export const appointmentPeriods = ["todas", "proximas", "pasadas"] as const;
export type AppointmentPeriod = typeof appointmentPeriods[number];
export type AppointmentFilters = { client: string; service: string; period: AppointmentPeriod; from: string; until: string; status?: string };
export const emptyAppointmentFilters: AppointmentFilters = { client: "", service: "", period: "todas", from: "", until: "" };
export const agendaPeriods = ["hoy", "todas", "proximas", "pasadas", "personalizado"] as const;
export type AgendaPeriod = typeof agendaPeriods[number];
export type AgendaFilters = Omit<AppointmentFilters, "period"> & { period: AgendaPeriod };

export function normalizeClientSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim().replace(/\s+/g, " ");
}

export function appointmentFilterError(filters: AppointmentFilters): string | null {
  if (!selectedAppointmentStatuses(filters.status)) return "El estado del enlace no es válido. Elige otro estado.";
  if (!appointmentPeriods.includes(filters.period)) return "El período del enlace no es válido. Elige otro y vuelve a buscar.";
  if (filters.client.length > 100 || /[\p{Cc}\p{Cf}]/u.test(filters.client)) return "El nombre de búsqueda admite hasta 100 caracteres, sin caracteres de control.";
  if ((filters.from && !isLocalDate(filters.from)) || (filters.until && !isLocalDate(filters.until))) return "Desde y Hasta deben ser fechas reales entre los años 0001 y 9999.";
  if (filters.from && filters.until && filters.from > filters.until) return "Desde debe ser anterior o igual a Hasta.";
  return null;
}

// Presets own their visible bounds. Editing either date turns them into a
// custom range, so an invisible period never narrows an explicit range.
export function appointmentPeriodDates(period: AgendaPeriod, today: string, current = { from: "", until: "" }) {
  if (period === "hoy") return { from: today, until: today };
  if (period === "proximas") return { from: today, until: "" };
  if (period === "pasadas") return { from: "", until: shiftLocalDate(today, -1) ?? "" };
  if (period === "personalizado") return { from: current.from, until: current.until };
  return { from: "", until: "" };
}

export function readAppointmentFilters(params: Pick<URLSearchParams, "get">, today: string): AgendaFilters {
  const requested = params.get("periodo");
  let period = (requested ?? "hoy") as AgendaPeriod;
  let dates = { from: params.get("desde") ?? "", until: params.get("hasta") ?? "" };
  if (requested && !agendaPeriods.includes(period)) {
    // Keep invalid links visible to validation rather than silently widening.
  } else if (dates.from || dates.until) period = "personalizado";
  else if (!requested && params.get("modo") === "listado") period = "todas";
  else if (!requested && params.get("fecha")) {
    period = "personalizado";
    dates = { from: params.get("fecha")!, until: params.get("fecha")! };
  }
  return { client: params.get("cliente") ?? "", service: params.get("servicio") ?? "", ...(params.get("estado") ? { status: params.get("estado")! } : {}), period,
    ...appointmentPeriodDates(period, today, dates) };
}

export function appointmentQueryFilters(filters: AgendaFilters, today: string): AppointmentFilters {
  return { ...filters, period: filters.period === "hoy" || filters.period === "personalizado" ? "todas" : filters.period,
    ...appointmentPeriodDates(filters.period, today, filters) };
}

export function agendaFilterError(filters: AgendaFilters): string | null {
  if (!agendaPeriods.includes(filters.period)) return "El período del enlace no es válido. Elige otro y vuelve a buscar.";
  if (filters.period === "personalizado" && !filters.from && !filters.until) return "Elige al menos una fecha para el período Personalizado.";
  return appointmentFilterError({ ...filters, period: "todas" });
}

export function appointmentSearchHref(params: { toString(): string }, filters: AgendaFilters) {
  const next = new URLSearchParams(params.toString());
  next.delete("vista");
  next.delete("modo");
  next.delete("fecha");
  for (const [key, value] of [["cliente", filters.client.trim()], ["servicio", filters.service], ["periodo", filters.period === "hoy" ? "" : filters.period],
    ["desde", filters.period === "personalizado" ? filters.from : ""], ["hasta", filters.period === "personalizado" ? filters.until : ""]]) {
    if (value) next.set(key, value); else next.delete(key);
  }
  return `/dashboard${next.size ? `?${next}` : ""}`;
}

// Civil dates are canonical YYYY-MM-DD: lexical and calendar order agree.
// An explicit reference date makes period membership part of the query key.
// No Date.now() in a cached query, and no mandatory horizon for "todas".
export function appointmentDateBounds(filters: AppointmentFilters, referenceDate?: string) {
  let from = filters.from;
  const until = filters.until;
  let before = "";
  if (filters.period === "proximas" && referenceDate && (!from || from < referenceDate)) from = referenceDate;
  if (filters.period === "pasadas" && referenceDate) before = referenceDate;
  const empty = !!((from && until && from > until) || (from && before && from >= before));
  return { from, until, before, empty };
}
