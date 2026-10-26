"use client";

import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { todayInZone } from "@/lib/agenda-date";
import { isLocalDate } from "@/lib/local-date";
import "@/components/public-booking-presentation.css";

export type BookingDaysLoader = (month: string) => Promise<string[] | null>;
type Props = { id: string; value: string; onChange: (value: string) => void; mode: "native" | "calendar"; timeZone: string; invalid?: boolean; errorId?: string; availabilityKey: string; loadDays?: BookingDaysLoader };
export function PublicBookingDate(props: Props) {
  return props.mode === "native" ? <Input id={props.id} name="date" type="date" value={props.value} onChange={event => props.onChange(event.target.value)} required aria-invalid={props.invalid} aria-describedby={props.invalid ? props.errorId : undefined} /> : <InlineDate {...props} />;
}
function InlineDate({ id, value, onChange, timeZone, invalid, errorId, availabilityKey, loadDays }: Props) {
  const [today] = useState(() => todayInZone(timeZone, Date.now()));
  const [focal, setFocal] = useState(isLocalDate(value) ? value : today);
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) { setSeenValue(value); if (isLocalDate(value)) setFocal(value); }
  const grid = useRef<HTMLDivElement>(null);
  const date = Temporal.PlainDate.from(focal), first = date.with({ day: 1 }), start = first.subtract({ days: first.dayOfWeek - 1 });
  const days = Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
  const month = first.toString().slice(0, 7), key = `${availabilityKey}:${month}`;
  const [options, setOptions] = useState<{ key: string; dates: string[]; error: string }>({ key: "", dates: [], error: "" });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!loadDays || !availabilityKey) return;
    let alive = true, sequence = 0;
    async function read() {
      const request = ++sequence;
      try {
        const dates = await loadDays!(month);
        if (alive && request === sequence) setOptions({ key, dates: dates ?? [], error: dates === null ? "El servicio ya no está disponible." : "" });
      } catch { if (alive && request === sequence) setOptions({ key, dates: [], error: "No pudimos cargar los días disponibles." }); }
    }
    void read();
    const interval = window.setInterval(read, 60_000);
    window.addEventListener("focus", read);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("focus", read); };
  }, [availabilityKey, key, loadDays, month, refresh]);
  const ready = !!loadDays && options.key === key, available = new Set(ready ? options.dates : []);
  const label = new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T12:00:00Z`));
  function move(next: Temporal.PlainDate) {
    if (next.year < 1 || next.year > 9999) return;
    setFocal(next.toString());
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, day: Temporal.PlainDate) {
    let next: Temporal.PlainDate | undefined;
    if (event.key === "ArrowLeft") next = day.subtract({ days: 1 });
    if (event.key === "ArrowRight") next = day.add({ days: 1 });
    if (event.key === "ArrowUp") next = day.subtract({ days: 7 });
    if (event.key === "ArrowDown") next = day.add({ days: 7 });
    if (event.key === "Home") next = day.subtract({ days: day.dayOfWeek - 1 });
    if (event.key === "End") next = day.add({ days: 7 - day.dayOfWeek });
    if (event.key === "PageUp") next = day.subtract({ months: 1 });
    if (event.key === "PageDown") next = day.add({ months: 1 });
    if (next) { event.preventDefault(); move(next); }
  }
  return <div className="public-date" aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined} aria-busy={!!loadDays && !ready}>
    <div className="public-date-heading"><Button type="button" variant="ghost" size="icon" aria-label="Mes anterior" disabled={first.year === 1 && first.month === 1} onClick={() => setFocal(date.subtract({ months: 1 }).toString())}><ChevronLeft aria-hidden="true" /></Button>
      <span id={`${id}-month`} aria-live="polite">{label}</span><Button type="button" variant="ghost" size="icon" aria-label="Mes siguiente" disabled={first.year === 9999 && first.month === 12} onClick={() => setFocal(date.add({ months: 1 }).toString())}><ChevronRight aria-hidden="true" /></Button></div>
    <div ref={grid} role="group" aria-labelledby={`${id}-month`} className="public-date-grid">
      {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => <span key={index} aria-hidden="true" className="public-weekday">{day}</span>)}
      {days.map(day => { const key = day.toString(), canSelect = day.month === first.month && available.has(key); return <Button key={key} id={key === focal ? id : undefined} name={key === focal ? "date" : undefined} data-day={key} type="button" className="w-full px-0" variant="ghost" disabled={day.year < 1 || day.year > 9999} tabIndex={key === focal ? 0 : -1}
        aria-label={`${new Intl.DateTimeFormat("es-UY", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`))}${canSelect ? ", disponible" : ", no disponible"}`}
        aria-disabled={!canSelect} aria-pressed={key === value} aria-current={key === today ? "date" : undefined} data-available={canSelect} data-outside={day.month !== first.month} onFocus={() => setFocal(key)} onKeyDown={event => keyboard(event, day)} onClick={() => { if (canSelect) { setFocal(key); onChange(key); } }}>{day.day}</Button>; })}
    </div>
    <div className="public-date-status" role="status">{!loadDays ? "Elige un servicio para ver los días disponibles." : !ready ? "Consultando disponibilidad…" : options.error ? <>{options.error} <Button type="button" variant="ghost" onClick={() => setRefresh(old => old + 1)}>Reintentar</Button></> : options.dates.length ? <><span className="public-date-dot" aria-hidden="true" />Días disponibles</> : "No hay días disponibles este mes."}</div>
    <span className="sr-only" role="status">{value ? `Fecha elegida: ${value}` : "Elige una fecha"}</span>
  </div>;
}
