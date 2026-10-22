import { Temporal } from "@js-temporal/polyfill";
import { isLocalDate } from "./local-date";
import { readAppointmentFilters, type AgendaFilters } from "./appointment-search";

export const calendarViews = { dia: "timeGridDay", semana: "timeGridWeek", mes: "dayGridMonth" } as const;
export type CalendarView = keyof typeof calendarViews;
export type CalendarRange = { from: string; until: string };
function boundedDate(date: Temporal.PlainDate) {
  if (Temporal.PlainDate.compare(date, "0001-01-01") < 0) return "0001-01-01";
  if (Temporal.PlainDate.compare(date, "9999-12-31") > 0) return "9999-12-31";
  return date.toString();
}

export function calendarRange(date: string, view: CalendarView): CalendarRange {
  const day = Temporal.PlainDate.from(date);
  const first = view === "mes" ? day.with({ day: 1 }) : day;
  const start = view === "dia" ? first : first.subtract({ days: first.dayOfWeek - 1 });
  return { from: boundedDate(start), until: boundedDate(start.add({ days: view === "dia" ? 0 : view === "semana" ? 6 : 41 })) };
}

export function readCalendarState(params: Pick<URLSearchParams, "get">, today: string) {
  const requested = params.get("calendario");
  const view: CalendarView = requested === "semana" || requested === "mes" ? requested : "dia";
  const legacy = readAppointmentFilters(params, today);
  // Legacy temporal parameters supply a navigation anchor only. They never
  // remain hidden predicates after removing the range filter from the product.
  const focal = params.get("fecha") || legacy.from || legacy.until || today;
  const date = isLocalDate(focal) ? focal : isLocalDate(legacy.from) ? legacy.from : today;
  const filters: AgendaFilters = { ...legacy, period: "todas", from: "", until: "" };
  return { view, date, filters, searching: params.get("buscar") === "1" || !!(filters.client || filters.service || filters.status) };
}

export function calendarHref(source: { toString(): string }, date: string, view: CalendarView) {
  const next = new URLSearchParams(source.toString());
  for (const key of ["modo", "periodo", "desde", "hasta", "cita"]) next.delete(key);
  next.set("fecha", date); next.set("calendario", view);
  return `/dashboard?${next}`;
}

export function calendarSearchHref(source: { toString(): string }, filters: AgendaFilters, today: string) {
  const next = new URLSearchParams(source.toString());
  for (const key of ["modo", "periodo", "desde", "hasta", "cita"]) next.delete(key);
  for (const [key, value] of [["cliente", filters.client.trim()], ["servicio", filters.service], ["estado", filters.status ?? ""]]) {
    if (value) next.set(key, value); else next.delete(key);
  }
  next.set("buscar", "1");
  if (!next.get("fecha")) next.set("fecha", readCalendarState(new URLSearchParams(source.toString()), today).date);
  return `/dashboard?${next}`;
}

export function toggleCalendarStatus(status: string | undefined, target: "confirmed" | "cancelled") {
  const confirmed = !status || status === "confirmed", cancelled = !status || status === "cancelled";
  const nextConfirmed = target === "confirmed" ? !confirmed : confirmed;
  const nextCancelled = target === "cancelled" ? !cancelled : cancelled;
  return nextConfirmed && nextCancelled ? "" : nextConfirmed ? "confirmed" : nextCancelled ? "cancelled" : "none";
}

export function stepCalendar(date: string, view: CalendarView, direction: number) {
  const day = Temporal.PlainDate.from(date);
  return boundedDate(day.add(view === "mes" ? { months: direction } : { days: direction * (view === "semana" ? 7 : 1) }));
}

// Month dragging changes only the civil day. Reject ambiguous/nonexistent wall
// times; never let Date's browser zone or Temporal's default shift the proposal.
export function dragDestination(originalStart: number, proposedStart: number, month: boolean, timeZone: string) {
  const original = Temporal.Instant.fromEpochMilliseconds(originalStart).toZonedDateTimeISO(timeZone);
  const proposed = Temporal.Instant.fromEpochMilliseconds(proposedStart).toZonedDateTimeISO(timeZone);
  const local = month ? proposed.toPlainDate().toPlainDateTime(original.toPlainTime()) : proposed.toPlainDateTime();
  try {
    const instant = local.toZonedDateTime(timeZone, { disambiguation: "reject" });
    return { date: local.toPlainDate().toString(), start: instant.epochMilliseconds };
  } catch { return null; }
}

export function civilInstant(date: string, time: string, timeZone: string) {
  try { return Temporal.PlainDate.from(date).toPlainDateTime(time).toZonedDateTime(timeZone, { disambiguation: "reject" }).epochMilliseconds; }
  catch { return null; }
}

// Connected components of intersecting intervals, not a booking/occupancy rule.
// The visible preview retains its own interval; the list preserves every member.
export function calendarCoincidences<T extends { _id: string; date: string; start: number; end: number; status: string }>(rows: T[]) {
  const unique = [...new Map(rows.map(row => [row._id, row])).values()];
  const ordered = unique.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a._id.localeCompare(b._id));
  const groups: T[][] = [];
  let current: T[] = [], until = 0;
  for (const row of ordered) {
    if (current.length && (row.date !== current[0].date || row.start >= until)) { if (current.length > 1) groups.push(current); current = []; }
    current.push(row); until = current.length === 1 ? row.end : Math.max(until, row.end);
  }
  if (current.length > 1) groups.push(current);
  const groupedIds = new Set(groups.flatMap(group => group.map(row => row._id)));
  const previews = groups.map(group => group.find(row => row.status === 'confirmed') ?? group[0]);
  return { groups, groupedIds, previews };
}

export function quarterAtPoint(y: number, top: number, bottom: number, minute: number, span = 15) {
  if (bottom <= top || y < top || y >= bottom) return null;
  return Math.min(1425, Math.max(0, Math.floor((minute + (y - top) / (bottom - top) * span) / 15) * 15));
}
