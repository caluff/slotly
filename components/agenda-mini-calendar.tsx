"use client";

import { Temporal } from "@js-temporal/polyfill";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { calendarRange, stepCalendar } from "@/lib/agenda-calendar";
import { formatLocalDate } from "@/lib/agenda-date";
import { isLocalDate } from "@/lib/local-date";

export function AgendaMiniCalendar({ date, today, onSelect }: { date: string; today: string; onSelect: (date: string) => void }) {
  const [browsing, setBrowsing] = useState({ source: date, month: date });
  const month = browsing.source === date ? browsing.month : date;
  const [focus, setFocus] = useState(date);
  const grid = useRef<HTMLDivElement>(null);
  const first = Temporal.PlainDate.from(calendarRange(month, "mes").from);
  const days = Array.from({ length: 42 }, (_, i) => first.add({ days: i }).toString());
  const title = new Intl.DateTimeFormat("es-UY", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${month}T12:00Z`));
  function moveFocus(value: string) {
    if (!isLocalDate(value)) return;
    setFocus(value); setBrowsing({ source: date, month: value });
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${value}"]`)?.focus());
  }
  return <section aria-label="Elegir día" className="min-w-0">
    <div className="mb-2 flex items-center justify-between gap-1">
      <p className="text-sm font-semibold capitalize" aria-live="polite">{title}</p>
      <div className="flex"><Button size="icon" variant="ghost" aria-label="Mes anterior" onClick={() => setBrowsing({ source: date, month: stepCalendar(month, "mes", -1) })}><ChevronLeft aria-hidden="true" /></Button>
        <Button size="icon" variant="ghost" aria-label="Mes siguiente" onClick={() => setBrowsing({ source: date, month: stepCalendar(month, "mes", 1) })}><ChevronRight aria-hidden="true" /></Button></div>
    </div>
    <div role="grid" aria-label={title} ref={grid} className="mini-calendar">
      <div role="row" className="grid grid-cols-7">{["L", "M", "X", "J", "V", "S", "D"].map((label, i) => <span role="columnheader" key={i} aria-label={["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i]} className="py-2 text-center text-xs text-muted">{label}</span>)}</div>
      {Array.from({ length: 6 }, (_, week) => <div role="row" className="grid grid-cols-7" key={week}>{days.slice(week * 7, week * 7 + 7).map(value => <div role="gridcell" key={value} aria-selected={value === date}>
        <Button data-date={value} disabled={!isLocalDate(value)} size="icon" variant="ghost" tabIndex={value === (days.includes(focus) ? focus : days.includes(date) ? date : days[0]) ? 0 : -1}
          aria-label={formatLocalDate(value)} aria-current={value === today ? "date" : undefined} aria-pressed={value === date}
          className={`mini-calendar-day w-full ${value.slice(0, 7) !== month.slice(0, 7) ? "opacity-60" : ""}`}
          onClick={() => { setFocus(value); onSelect(value); }} onKeyDown={event => {
            const day = Temporal.PlainDate.from(value);
            const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
            const next = delta ? day.add({ days: delta }) : event.key === "Home" ? day.subtract({ days: day.dayOfWeek - 1 }) : event.key === "End" ? day.add({ days: 7 - day.dayOfWeek }) : event.key === "PageUp" ? day.subtract({ months: 1 }) : event.key === "PageDown" ? day.add({ months: 1 }) : null;
            if (next) { event.preventDefault(); moveFocus(next.toString()); }
          }}><span className="mini-calendar-number">{Number(value.slice(-2))}</span></Button>
      </div>)}</div>)}
    </div>
  </section>;
}
