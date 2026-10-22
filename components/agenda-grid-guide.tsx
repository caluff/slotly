"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DayLaneInfo, MountInfo, SlotLaneInfo } from "@fullcalendar/react";
import { civilInstant, quarterAtPoint, stepCalendar, type CalendarView } from "@/lib/agenda-calendar";
import { formatLocalDate, todayInZone } from "@/lib/agenda-date";
import type { CreateContext } from "@/components/appointment-editor";
import type { CalendarAppointment } from "@/components/agenda-calendar";

type Cell = { date: string; minute: number };
type Rect = { left: number; top: number; width: number; height: number };
type Day = { date: string; configured: boolean; isOpen: boolean; start: string | null; end: string | null };
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

// Measure the public lane-hook elements at the point of use. No cached pixel-to-
// time ratio: scrolling, zoom, resize and slot-height changes remain civil-time safe.
function visibleRect(el: HTMLElement, root: HTMLElement) {
  const rect = el.getBoundingClientRect();
  let top = rect.top, bottom = rect.bottom, left = rect.left, right = rect.right;
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.top + parent.clientHeight); }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.left + parent.clientWidth); }
    if (parent === root) break;
  }
  return { top, bottom, left, right };
}

type GuideProps = {
  date: string; view: CalendarView; timeZone: string; appointments: CalendarAppointment[]; schedule: Day[]; blocked: boolean;
  onNew: (date: string, start?: number, context?: CreateContext) => void;
};

function useAgendaGridGuide({ date, view, timeZone, appointments, schedule, blocked, onNew }: GuideProps) {
  const root = useRef<HTMLDivElement>(null), lanes = useRef(new Map<HTMLElement, string>()), slots = useRef(new Map<HTMLElement, number>());
  const keyboard = useRef<Cell | null>(null), dragging = useRef(false), paused = useRef(false), hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cell, setCell] = useState<(Cell & Rect & { closed: boolean }) | null>(null);
  const [hint, setHint] = useState<{ row: CalendarAppointment; element: HTMLElement; left: number; top: number } | null>(null);
  const hintId = useId(), helpId = useId();
  const attachRoot = useCallback((element: HTMLDivElement | null) => { root.current = element; }, []);
  const cancelTimer = useCallback(() => { if (hintTimer.current) clearTimeout(hintTimer.current); hintTimer.current = null; }, []);
  const clear = useCallback(() => { cancelTimer(); keyboard.current = null; setCell(null); setHint(null); }, [cancelTimer]);
  useEffect(() => {
    const reset = () => { keyboard.current = null; setCell(null); setHint(null); };
    const scrollReset = () => { setCell(null); setHint(null); };
    window.addEventListener("resize", reset); document.addEventListener("visibilitychange", reset);
    window.addEventListener("scroll", scrollReset, true);
    window.visualViewport?.addEventListener("resize", reset);
    window.visualViewport?.addEventListener("scroll", reset);
    return () => { window.removeEventListener("resize", reset); document.removeEventListener("visibilitychange", reset); window.removeEventListener("scroll", scrollReset, true); window.visualViewport?.removeEventListener("resize", reset); window.visualViewport?.removeEventListener("scroll", reset); if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, []);
  useEffect(() => {
    if (!hint) return;
    const previous = hint.element.getAttribute("aria-describedby");
    hint.element.setAttribute("aria-describedby", [previous, hintId].filter(Boolean).join(" "));
    return () => { if (previous) hint.element.setAttribute("aria-describedby", previous); else hint.element.removeAttribute("aria-describedby"); };
  }, [hint, hintId]);
  function outsideHours(value: Cell) {
    const day = schedule.find(day => day.date === value.date), time = clock(value.minute);
    return !!day?.configured && (!day.isOpen || !day.start || !day.end || time < day.start || time >= day.end);
  }
  function project(value: Cell) {
    if (!root.current) return;
    const lane = [...lanes.current].find(([, key]) => key === value.date)?.[0];
    const slot = [...slots.current].find(([, minute]) => minute === value.minute)?.[0];
    if (!lane || !slot) return;
    const horizontal = visibleRect(lane, root.current), vertical = visibleRect(slot, root.current);
    const full = slot.getBoundingClientRect();
    if (horizontal.right <= horizontal.left || vertical.bottom <= vertical.top) { setCell(null); return; }
    const next = { ...value, left: horizontal.left, width: horizontal.right - horizontal.left, top: Math.max(full.top, vertical.top), height: Math.min(full.bottom, vertical.bottom) - Math.max(full.top, vertical.top), closed: outsideHours(value) };
    setCell(previous => previous && Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
  }
  function showHint(element: HTMLElement) {
    cancelTimer(); setCell(null); keyboard.current = null;
    if (hint?.element === element) return;
    const row = appointments.find(row => row._id === element.dataset.agendaEvent);
    if (!row) return;
    const rect = element.getBoundingClientRect();
    setHint({ row, element, left: Math.max(16, Math.min(rect.left, window.innerWidth - Math.min(320, window.innerWidth - 32) - 16)), top: Math.max(16, Math.min(rect.bottom + 6, window.innerHeight - 156)) });
  }
  function leaveHint() { cancelTimer(); hintTimer.current = setTimeout(() => setHint(null), 120); }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || blocked || paused.current || dragging.current || !root.current) return;
    const target = event.target as HTMLElement, eventEl = target.closest<HTMLElement>("[data-agenda-event]");
    if (eventEl) { showHint(eventEl); return; }
    if (view === "mes") return;
    if (hint?.element.contains(document.activeElement)) return;
    leaveHint();
    if (target.closest("button,a,[role=dialog],[data-agenda-block],.agenda-more-link,.agenda-more-popover")) { setCell(null); return; }
    const lane = [...lanes.current].find(([el]) => { const r = visibleRect(el, root.current!); return event.clientX >= r.left && event.clientX < r.right && event.clientY >= r.top && event.clientY < r.bottom; });
    const slot = [...slots.current].find(([el]) => { const r = el.getBoundingClientRect(); return event.clientY >= r.top && event.clientY < r.bottom; });
    if (!lane || !slot) { setCell(null); return; }
    const r = slot[0].getBoundingClientRect(), minute = quarterAtPoint(event.clientY, r.top, r.bottom, slot[1]);
    if (minute !== null) { keyboard.current = null; project({ date: lane[1], minute }); }
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { clear(); return; }
    if (event.target !== event.currentTarget || blocked || paused.current || view === "mes") return;
    const value = keyboard.current ?? { date, minute: 8 * 60 };
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault(); const start = civilInstant(value.date, clock(value.minute), timeZone);
      const lane = [...lanes.current].find(([, day]) => day === value.date)?.[0];
      if (start !== null) { clear(); onNew(value.date, start, { element: lane ?? root.current! }); }
      return;
    }
    const minutes: Record<string, number> = { ArrowUp: -15, ArrowDown: 15, PageUp: -60, PageDown: 60 };
    const next = { ...value };
    if (event.key in minutes) next.minute = Math.max(0, Math.min(1425, value.minute + minutes[event.key]));
    else if (event.key === "Home" || event.key === "End") next.minute = event.key === "Home" ? 0 : 1425;
    else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const day = stepCalendar(value.date, "dia", event.key === "ArrowLeft" ? -1 : 1);
      if ([...lanes.current.values()].includes(day)) next.date = day;
    } else return;
    event.preventDefault(); keyboard.current = next;
    [...slots.current].find(([, minute]) => minute === next.minute)?.[0].scrollIntoView({ block: "nearest", inline: "nearest" });
    const lane = [...lanes.current].find(([, day]) => day === next.date)?.[0];
    if (lane && root.current) { const r = lane.getBoundingClientRect(), bounds = root.current.getBoundingClientRect(); if (r.left < bounds.left || r.right > bounds.right) root.current.scrollLeft += r.left - bounds.left; }
    requestAnimationFrame(() => { if (root.current?.contains(document.activeElement)) project(next); });
  }
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const api = useMemo(() => ({
    clear, pause: (value: boolean) => { paused.current = value; clear(); },
    dayLaneDidMount: (info: MountInfo<DayLaneInfo>) => { lanes.current.set(info.el, todayInZone(timeZone, info.date.getTime())); },
    dayLaneWillUnmount: (info: MountInfo<DayLaneInfo>) => { lanes.current.delete(info.el); },
    slotLaneDidMount: (info: MountInfo<SlotLaneInfo>) => { const parts = info.el.dataset.time?.split(":").map(Number); if (parts?.length) slots.current.set(info.el, parts[0] * 60 + parts[1]); },
    slotLaneWillUnmount: (info: MountInfo<SlotLaneInfo>) => { slots.current.delete(info.el); },
    startDrag: () => { dragging.current = true; clear(); }, stopDrag: () => { dragging.current = false; clear(); },
  }), [clear, timeZone]);
  return {
    attachRoot, helpId, clear, api,
    onPointerMove,
    onPointerLeave: () => { setCell(null); leaveHint(); },
    onScrollCapture: () => { setCell(null); setHint(null); },
    onFocusCapture: (event: FocusEvent<HTMLDivElement>) => { if (blocked || paused.current) return; const el = (event.target as HTMLElement).closest<HTMLElement>("[data-agenda-event]"); if (el) requestAnimationFrame(() => { if (!paused.current && el.isConnected && el === document.activeElement && root.current?.contains(el)) showHint(el); }); },
    onBlurCapture: (event: FocusEvent<HTMLDivElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) clear(); else setHint(null); },
    onKeyDown,
    overlays: <>
      <p id={helpId} className="sr-only">En la grilla horaria, flechas para fecha y hora en pasos de quince minutos, Inicio y Fin para extremos, RePág y AvPág para una hora. Enter abre Nueva cita; el formulario verifica el horario disponible.</p>
      {!blocked && cell && createPortal(<div className={`agenda-slot-guide ${cell.closed ? "agenda-slot-guide-closed" : ""}`} style={{ left: cell.left, top: cell.top, width: cell.width, height: cell.height }} aria-hidden="true"><span style={{ left: Math.max(16, Math.min(cell.left, window.innerWidth - 260)), top: Math.max(8, cell.top - 27) }}>{cell.date.slice(8)}/{cell.date.slice(5, 7)} · {clock(cell.minute)}{cell.closed ? " · Fuera de atención" : ""}</span></div>, document.body)}
      <span role="status" className="sr-only">{!blocked && cell && `${formatLocalDate(cell.date)}, ${clock(cell.minute)}${cell.closed ? ", fuera del horario de atención" : ""}`}</span>
      {!blocked && hint && createPortal(<div id={hintId} role="tooltip" className="agenda-event-hint" style={{ left: hint.left, top: hint.top, maxHeight: Math.max(80, window.innerHeight - hint.top - 16) }} onPointerEnter={cancelTimer} onPointerLeave={leaveHint}><time>{time.format(hint.row.start)}–{time.format(hint.row.end)}</time><strong>{hint.row.clientName}</strong><span>{hint.row.serviceName} · {hint.row.status === "cancelled" ? "Cancelada" : "Confirmada"}</span><span>{formatLocalDate(hint.row.date)} · {timeZone}</span></div>, document.body)}
    </>,
  };
}

// Keep pointer/focus state local. Re-rendering FullCalendar for each hover would
// invalidate its measured interaction geometry while an interaction is in flight.
export function AgendaGridGuide({ ready, renderCalendar, ...props }: GuideProps & { ready: boolean; renderCalendar: (api: ReturnType<typeof useAgendaGridGuide>["api"]) => ReactNode }) {
  const { attachRoot, helpId, api, onPointerMove, onPointerLeave, onScrollCapture, onFocusCapture, onBlurCapture, onKeyDown, overlays } = useAgendaGridGuide(props);
  const calendar = useMemo(() => renderCalendar(api), [renderCalendar, api]);
  return <>
    <div ref={attachRoot} className="agenda-scroll" role="region" aria-describedby={helpId} aria-label={`Calendario ${props.view === 'dia' ? 'diario' : props.view === 'semana' ? 'semanal, con desplazamiento horizontal' : 'mensual, con desplazamiento horizontal'}`} tabIndex={0} inert={!ready} style={!ready ? { visibility: 'hidden' } : undefined}
      onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} onScrollCapture={onScrollCapture} onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture} onKeyDown={onKeyDown}>
      {calendar}
    </div>{overlays}
  </>;
}
