import { isLocalDate } from "./local-date";

export const appointmentPeriods = ["todas", "proximas", "pasadas"] as const;
export type AppointmentPeriod = typeof appointmentPeriods[number];
export type AppointmentFilters = { client: string; service: string; period: AppointmentPeriod; from: string; until: string };
export const emptyAppointmentFilters: AppointmentFilters = { client: "", service: "", period: "todas", from: "", until: "" };

export function normalizeClientSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es").trim().replace(/\s+/g, " ");
}

export function appointmentFilterError(filters: AppointmentFilters): string | null {
  if (!appointmentPeriods.includes(filters.period)) return "El período del enlace no es válido. Elige otro o limpia los filtros.";
  if (filters.client.length > 100 || /[\p{Cc}\p{Cf}]/u.test(filters.client)) return "El nombre de búsqueda admite hasta 100 caracteres, sin caracteres de control.";
  if ((filters.from && !isLocalDate(filters.from)) || (filters.until && !isLocalDate(filters.until))) return "Desde y Hasta deben ser fechas reales entre los años 0001 y 9999.";
  if (filters.from && filters.until && filters.from > filters.until) return "Desde debe ser anterior o igual a Hasta.";
  return null;
}

export function readAppointmentFilters(params: Pick<URLSearchParams, "get">): AppointmentFilters {
  return { client: params.get("cliente") ?? "", service: params.get("servicio") ?? "",
    period: (params.get("periodo") ?? "todas") as AppointmentPeriod,
    from: params.get("desde") ?? "", until: params.get("hasta") ?? "" };
}

export function appointmentSearchHref(params: { toString(): string }, filters?: AppointmentFilters, mode: "dia" | "listado" = "listado", date?: string) {
  const next = new URLSearchParams(params.toString());
  next.delete("vista");
  if (mode === "listado") next.set("modo", "listado"); else next.delete("modo");
  if (date) next.set("fecha", date);
  if (filters) {
    for (const [key, value] of [["cliente", filters.client.trim()], ["servicio", filters.service], ["periodo", filters.period === "todas" ? "" : filters.period], ["desde", filters.from], ["hasta", filters.until]]) {
      if (value) next.set(key, value); else next.delete(key);
    }
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
