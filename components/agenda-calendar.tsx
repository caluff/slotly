"use client";

import FullCalendar, { type CalendarRef, type EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/classic";
import es from "@fullcalendar/react/locales/es";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Dialog, DropdownMenu, Popover, Tabs, Tooltip } from "radix-ui";
import { CalendarClock, CalendarX2, ChevronDown, ChevronLeft, ChevronRight, LockKeyhole, Menu, Plus, X } from "@/components/ui/icons";
import { Component, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { AppointmentEmailConfirmation } from "@/components/business-email-confirmations";
import { AppointmentArchiveButton } from "@/components/appointment-archive";
import { AgendaMiniCalendar } from "@/components/agenda-mini-calendar";
import { AppointmentSearch, ConnectedAppointmentAction, type AppointmentActionProps } from "@/components/appointment-search";
import { AgendaFiltersForm } from "@/components/agenda-filters";
import type { CreateContext } from "@/components/appointment-editor";
import type { MoveResult } from "@/components/appointment-reschedule-dialog";
import { calendarCoincidences, calendarHref, calendarRange, calendarViews, civilInstant, dragDestination, stepCalendar, type CalendarView } from "@/lib/agenda-calendar";
import { AgendaGridGuide } from "@/components/agenda-grid-guide";
import { AgendaNameResults } from "@/components/agenda-name-results";
import { AppointmentStatusIcon } from "@/components/appointment-status";
import { useAppointmentResults } from "@/components/appointment-results";
import { AppointmentAttentionBell } from "@/components/appointment-attention";
import { upcomingAppointment, useAgendaClock, useUpcomingMotion } from "@/components/use-agenda-clock";
import { appointmentStatusLabels, appointmentStatusSummary } from "@/lib/appointment-status";
import { Brand } from "@/components/brand";
import { CalendarSkeleton } from "@/components/loading-screens";
import { usePanelMotion } from "@/components/use-panel-motion";
import { TimeBlockWorkspace, useTimeBlockActions, type BlockEditorProps, type CalendarTimeBlock } from "@/components/time-block-editor";
import { formatLocalDate, todayInZone } from "@/lib/agenda-date";
import type { AgendaFilters } from "@/lib/appointment-search";
import "@/components/agenda-calendar.css";

export type CalendarAppointment = FunctionReturnType<typeof api.appointments.searchMyAppointments>["page"][number];
type Schedule = FunctionReturnType<typeof api.calendar.getMyCalendarSchedule>;
type Service = { _id: Id<"services">; name: string };
type Action = { appointment: CalendarAppointment; mode: "detail" | "cancel" | "reschedule"; proposal?: { date: string; start: number } };
const plugins = [themePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin];
const CalendarCreationVisibility = createContext(false);
function subscribeMobile(notify: () => void) { const media = window.matchMedia("(max-width: 1023px)"); media.addEventListener("change", notify); return () => media.removeEventListener("change", notify); }
function readMobile() { return window.matchMedia("(max-width: 1023px)").matches; }
function revealCalendarDate(element: HTMLElement) {
  requestAnimationFrame(() => {
    if (!element.isConnected) return;
    const scroller = element.closest<HTMLElement>('.agenda-scroll'); if (!scroller) return;
    const target = element.getBoundingClientRect(), bounds = scroller.getBoundingClientRect();
    if (target.left < bounds.left + 8) scroller.scrollLeft += target.left - bounds.left - 8;
    else if (target.right > bounds.right - 8) scroller.scrollLeft += target.right - bounds.right + 8;
  });
}

export function AgendaCalendar({ blockEditorComponent, ...props }: Parameters<typeof AgendaCalendarContent>[0] & { blockEditorComponent?: React.ComponentType<BlockEditorProps> }) {
  return <TimeBlockWorkspace timeZone={props.timeZone} enabled={props.enabled} editorComponent={blockEditorComponent}><AgendaCalendarContent {...props} /></TimeBlockWorkspace>;
}

function AgendaCalendarContent({ date, view, today, timeZone, filters, enabled, services, moreServices, loadingServices, onLoadServices, onNavigate, onSearch, dayHref, onNew, calendarContent, searchContent, searchComponent: SearchComponent, archivedDetailComponent: ArchivedDetailComponent = ConnectedDetail }: {
  date: string; view: CalendarView; today: string; timeZone: string; filters: AgendaFilters; searching: boolean; enabled: boolean;
  services: Service[]; moreServices: boolean; loadingServices: boolean; onLoadServices: () => void;
  onNavigate: (date: string, view: CalendarView) => void; onSearch: (filters: AgendaFilters) => void; dayHref: (date: string) => string;
  onNew: (date: string, start?: number, context?: CreateContext) => void;
  calendarContent?: ReactNode; searchContent?: ReactNode; searchComponent?: React.ComponentType<{ onLocate: (appointment: CalendarAppointment) => void }>;
  archivedDetailComponent?: React.ComponentType<DetailProps>;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [leftVisible, setLeftVisible] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [archivedDetail, setArchivedDetail] = useState<CalendarAppointment | null>(null);
  const blocks = useTimeBlockActions();
  const blockTrigger = useRef<HTMLButtonElement>(null);
  const closeResults = useCallback((restoreFocus = true) => { setResultsOpen(false); if (restoreFocus) requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#search-client')?.focus()); }, []);
  const filterTrigger = useRef<HTMLButtonElement>(null), pendingCreation = useRef<(() => void) | null>(null);
  const mobile = useSyncExternalStore(subscribeMobile, readMobile, () => false);
  const panelOpen = mobile ? showFilters : leftVisible;
  const filterPanel = usePanelMotion({ open: panelOpen, modal: mobile, side: 'left', onShow: dialog => { if (mobile) dialog.querySelector<HTMLElement>('[aria-label="Cerrar filtros"]')?.focus(); }, onClosed: () => { filterTrigger.current?.focus(); const create = pendingCreation.current; pendingCreation.current = null; create?.(); } });
  useEffect(() => {
    if (!mobile && pendingCreation.current) { const create = pendingCreation.current; pendingCreation.current = null; create(); }
  }, [mobile]);
  const range = calendarRange(date, view);
  function closeFilters() { if (mobile) setShowFilters(false); else setLeftVisible(false); }
  const sidebar = <><div className="flex gap-1"><Button className="agenda-add-appointment min-w-0 flex-1" onClick={event => { if (mobile) { pendingCreation.current = () => onNew(date, undefined, { element: filterTrigger.current! }); setShowFilters(false); } else onNew(date, undefined, { element: event.currentTarget }); }}><Plus aria-hidden="true" />Añadir cita</Button><BlockCreateMenu trigger={blockTrigger} onCreate={() => { const create = () => blocks?.create(date, { element: mobile ? filterTrigger.current! : blockTrigger.current! }); if (mobile) { pendingCreation.current = create; setShowFilters(false); } else create(); }} /></div><AgendaMiniCalendar key={date} date={date} today={today} onSelect={value => { onNavigate(value, view); if (mobile) closeFilters(); }} />
    <AgendaFiltersForm filters={filters} services={services} moreServices={moreServices} loadingServices={loadingServices} onLoadServices={onLoadServices} onSearch={onSearch} onNameSearch={values => { onSearch(values); setResultsOpen(true); }} /><div className="flex items-center gap-2 text-xs text-muted"><LockKeyhole size={14} aria-hidden="true" />Los bloqueos siguen visibles al filtrar.</div></>;
  const locate = (row: CalendarAppointment) => {
    setResultsOpen(false); if (mobile) closeFilters();
    if (row.calendarArchivedAt !== undefined) {
      const show = () => setArchivedDetail(row);
      if (mobile && showFilters) pendingCreation.current = show;
      else requestAnimationFrame(show);
      return;
    }
    const destination = new URL(calendarHref(new URLSearchParams(window.location.search), row.date, view), window.location.origin);
    destination.pathname = window.location.pathname; destination.searchParams.set('cita', row._id);
    window.history.pushState(null, '', `${destination.pathname}${destination.search}`);
  };
  const activeFilters = !!(filters.client || filters.service || filters.status);
  return <CalendarCreationVisibility.Provider value={!panelOpen}><Tabs.Root className="agenda-root" value={view} activationMode="manual" onValueChange={value => onNavigate(date, value as CalendarView)}>
      <div className="agenda-toolbar">
        <div className="agenda-toolbar-navigation"><Button ref={filterTrigger} size="icon" variant="ghost" aria-label={panelOpen ? 'Ocultar filtros' : 'Mostrar filtros'} aria-expanded={panelOpen} aria-controls="agenda-filters-panel" onClick={() => mobile ? setShowFilters(value => !value) : setLeftVisible(value => !value)}><Menu aria-hidden="true" /></Button><Brand /><Button variant="outline" onClick={() => onNavigate(today, view)}>Hoy</Button><div className="flex">
          <Button size="icon" variant="ghost" aria-label="Intervalo anterior" onClick={() => onNavigate(stepCalendar(date, view, -1), view)}><ChevronLeft aria-hidden="true" /></Button>
          <Button size="icon" variant="ghost" aria-label="Intervalo siguiente" onClick={() => onNavigate(stepCalendar(date, view, 1), view)}><ChevronRight aria-hidden="true" /></Button></div>
          <h2 className="agenda-title" aria-live="polite">{view === "dia" ? new Intl.DateTimeFormat("es-UY", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00Z`)) : view === "mes" ? new Intl.DateTimeFormat("es-UY", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${date}T12:00Z`)) : `${range.from.slice(8)}/${range.from.slice(5,7)} – ${range.until.slice(8)}/${range.until.slice(5,7)}/${range.until.slice(0,4)}`}</h2></div>
        <div className="agenda-toolbar-actions"><AppointmentAttentionBell />{activeFilters && !panelOpen && <span className="agenda-active-filters" role="status">Filtros activos</span>}<Tabs.List aria-label="Vista del calendario" className="agenda-view-tabs">
          {([['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']] as const).map(([value, label]) => <Tabs.Trigger key={value} value={value} asChild><Button variant="ghost">{label}</Button></Tabs.Trigger>)}
        </Tabs.List></div>
      </div>
    <div className="agenda-layout" data-left-visible={!mobile && leftVisible}>
      <div className="agenda-sidebar-slot"><dialog ref={filterPanel} id="agenda-filters-panel" aria-label="Calendario y filtros" className="agenda-sidebar" onCancel={event => { event.preventDefault(); closeFilters(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeFilters(); } }} onClick={event => { if (mobile && event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX > r.right || event.clientX < r.left) closeFilters(); } }}>
        {mobile && <div className="agenda-filter-heading"><h2>Filtros</h2><Button size="icon" variant="ghost" aria-label="Cerrar filtros" onClick={closeFilters}><X aria-hidden="true" /></Button></div>}{sidebar}
      </dialog></div>
      <div className="agenda-canvas">
      {(['dia', 'semana', 'mes'] as const).map(value => <Tabs.Content key={value} value={value} className="agenda-tab-panel">
      {view === value && <>
      <p className="sr-only">{timeZone}{filters.client ? ` · Cliente: ${filters.client}` : ""}{filters.service ? ` · ${services.find(service => service._id === filters.service)?.name ?? "Servicio seleccionado"}` : ""}{` · ${appointmentStatusSummary(filters.status)}`}</p>
      {filters.status === "none" && <p role="status" className="mb-3 text-sm text-muted">Ningún estado seleccionado. Marca un estado para ver citas.</p>}
      <CalendarReadBoundary key={JSON.stringify([range, filters.client, filters.service, filters.status, enabled])}>{calendarContent ?? <ConnectedCalendar date={date} view={view} timeZone={timeZone} enabled={enabled} filters={filters} dayHref={dayHref} onNew={onNew} onSelectDate={value => onNavigate(value, view)} />}</CalendarReadBoundary>
      </>}
      </Tabs.Content>)}
      </div>
    </div>
    <AgendaNameResults open={resultsOpen} modal={mobile} name={filters.client} onClose={closeResults}>{SearchComponent ? <SearchComponent onLocate={locate} /> : searchContent ?? <AppointmentSearch hideFilters filters={filters} today={today} timeZone={timeZone} enabled={enabled && resultsOpen} services={services} moreServices={moreServices} loadingServices={loadingServices} onLoadServices={onLoadServices} onSearch={onSearch} dayHref={dayHref} onLocate={locate} />}</AgendaNameResults>
    {archivedDetail && <ArchivedDetailComponent appointment={archivedDetail} latest={archivedDetail} timeZone={timeZone} now={0} onClose={() => setArchivedDetail(null)} onReturnFocus={() => { const input = document.querySelector<HTMLElement>('#search-client'); (input?.getBoundingClientRect().width ? input : filterTrigger.current)?.focus(); }} onAction={() => undefined} />}
  </Tabs.Root></CalendarCreationVisibility.Provider>;
}

class CalendarReadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div role="alert" className="space-y-3 border border-line p-5"><p>No pudimos cargar el calendario. Los filtros y el borrador se conservan.</p><Button variant="outline" onClick={() => this.setState({ failed: false })}>Reintentar calendario</Button></div> : this.props.children; }
}

function ConnectedCalendar({ date, view, timeZone, enabled, filters, dayHref, onNew, onSelectDate }: {
  date: string; view: CalendarView; timeZone: string; enabled: boolean; filters: AgendaFilters; dayHref: (date: string) => string; onNew: (date: string, start?: number, context?: CreateContext) => void; onSelectDate: (date: string) => void;
}) {
  const range = calendarRange(date, view);
  const { results, status, loadMore } = usePaginatedQuery(api.appointments.searchMyAppointments, enabled ? {
    client: filters.client.trim(), serviceId: filters.service ? filters.service as Id<"services"> : undefined, status: filters.status || undefined, period: "todas", calendarOnly: true, ...range,
  } : "skip", { initialNumItems: 100 });
  const schedule = useQuery(api.calendar.getMyCalendarSchedule, enabled ? range : "skip");
  const { results: blocks, status: blockStatus, loadMore: loadBlocks } = usePaginatedQuery(api.timeBlocks.listMyTimeBlocks, enabled ? range : "skip", { initialNumItems: 100 });
  useEffect(() => { if (status === "CanLoadMore") loadMore(100); }, [status, loadMore]);
  useEffect(() => { if (blockStatus === "CanLoadMore") loadBlocks(100); }, [blockStatus, loadBlocks]);
  return <CalendarSurface date={date} view={view} timeZone={timeZone} appointments={results} blocks={blocks} schedule={schedule ?? []} ready={enabled && status === "Exhausted" && blockStatus === "Exhausted" && schedule !== undefined} dayHref={dayHref} onNew={onNew} onSelectDate={onSelectDate} actionComponent={ConnectedAppointmentAction} detailComponent={ConnectedDetail} />;
}

export function CalendarSurface({ date, view, timeZone, appointments, blocks = [], schedule, ready, dayHref, onNew, onSelectDate, actionComponent: ActionComponent, detailComponent: DetailComponent = AppointmentDetail }: {
  date: string; view: CalendarView; timeZone: string; appointments: CalendarAppointment[]; schedule: Schedule; ready: boolean; dayHref: (date: string) => string; onNew: (date: string, start?: number, context?: CreateContext) => void; onSelectDate?: (date: string) => void;
  actionComponent: React.ComponentType<AppointmentActionProps & { timeZone: string; dayHref: (date: string) => string }>;
  detailComponent?: React.ComponentType<DetailProps>;
  blocks?: CalendarTimeBlock[];
}) {
  const blockActions = useTimeBlockActions();
  const calendar = useRef<CalendarRef>(null);
  const surface = useRef<HTMLDivElement>(null);
  const showCreation = useContext(CalendarCreationVisibility);
  const [creationHost, setCreationHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = surface.current; if (!root) return;
    // Public header classes identify the actual empty axis cell. Month has no
    // axis: append a measured header row, never overlay its first date cell.
    const find = () => setCreationHost(root.querySelector<HTMLElement>(view === 'mes' ? '.agenda-table-header' : '.agenda-table-header > [role="row"] > .agenda-axis-header > [role="cell"]'));
    const observer = new MutationObserver(find); observer.observe(root, { childList: true, subtree: true });
    const frame = requestAnimationFrame(find);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [view]);
  const locatedId = useSearchParams().get('cita');
  const trigger = useRef<HTMLElement | null>(null);
  const moreTrigger = useRef<HTMLElement | null>(null);
  const popoverCleanups = useRef(new WeakMap<HTMLElement, () => void>());
  const drag = useRef<CalendarAppointment | null>(null);
  const [selected, setSelected] = useState<Action | null>(null);
  const [moved, setMoved] = useState<MoveResult | null>(null);
  const [message, setMessage] = useState("");
  const { now, visible } = useAgendaClock(appointments, ready);
  const [dragging, setDragging] = useState(false);
  const upcomingId = ready ? upcomingAppointment(appointments, now) : undefined;
  useUpcomingMotion(surface, upcomingId, visible && !dragging && !selected);
  const clockReady = now > 0;
  const rangeKey = JSON.stringify(calendarRange(date, view));
  useEffect(() => {
    const root = surface.current; if (!root || !locatedId || !ready || !clockReady) return;
    let frame = 0, highlightedMore: HTMLElement | null = null;
    const observer = new MutationObserver(find);
    function find() {
      let target = [...root!.querySelectorAll<HTMLElement>('[data-agenda-event],[data-agenda-group]')].find(el => (el.dataset.agendaEvent === locatedId || el.dataset.agendaGroup?.split(' ').includes(locatedId!)) && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden');
      if (!target && view === 'mes') {
        target = root!.querySelector<HTMLElement>(`[data-agenda-day="${date}"] .agenda-more-link`) ?? undefined;
        if (target) { target.dataset.agendaLocated = 'true'; highlightedMore = target; }
      }
      if (!target) return;
      frame = requestAnimationFrame(() => { if (!target.isConnected) { find(); return; } observer.disconnect(); target.scrollIntoView({ block: 'center', inline: 'nearest' }); const hiddenMember = target.dataset.agendaGroup && target.dataset.agendaEvent !== locatedId; (target.querySelector<HTMLElement>(hiddenMember ? '.agenda-time-more' : 'button') ?? target).focus({ preventScroll: true }); });
    }
    observer.observe(root, { childList: true, subtree: true }); find();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); if (highlightedMore) delete highlightedMore.dataset.agendaLocated; };
  }, [locatedId, ready, rangeKey, date, view, clockReady]);
  const previous = useRef({ view, rangeKey });
  useEffect(() => {
    const api = calendar.current?.getApi();
    if (api && previous.current.view !== view) api.changeView(calendarViews[view], date);
    else if (api && previous.current.rangeKey !== rangeKey) api.gotoDate(date);
    previous.current = { view, rangeKey };
  }, [date, view, rangeKey]);
  const time = useMemo(() => new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }), [timeZone]);
  useEffect(() => {
    const byId = new Map(appointments.map(row => [String(row._id), row]));
    const groups = calendarCoincidences(ready && view !== "mes" ? appointments : [], upcomingId);
    const byPreview = new Map(groups.previews.map((row, index) => [String(row._id), groups.groups[index]]));
    const root = surface.current; if (!root) return;
    let more: HTMLElement | null | undefined, originalLabel: string | null = null;
    function update() {
    root!.querySelectorAll<HTMLElement>("[data-agenda-event]").forEach(element => {
      const row = byId.get(element.dataset.agendaEvent!);
      if (!row) return;
      const group = byPreview.get(String(row._id));
      if (group) {
        element.dataset.agendaGroup = group.map(row => row._id).join(" ");
        element.setAttribute("role", "group"); element.removeAttribute("tabindex");
        element.setAttribute("aria-label", `${group.length} citas con horarios coincidentes`);
      } else {
        delete element.dataset.agendaGroup; element.setAttribute("role", "button"); element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", `${row.clientName}, ${row.serviceName}, ${formatLocalDate(row.date)}, ${time.format(row.start)} a ${time.format(row.end)}, ${appointmentStatusLabels[row.status]}${row._id === upcomingId ? ". Próxima cita" : ""}. Ver detalle`);
      }
    });
    if (!upcomingId || view !== "mes") return;
    const row = byId.get(upcomingId);
    const next = row && root!.querySelector<HTMLElement>(`[data-agenda-day="${row.date}"] .agenda-more-link`);
    if (!next || next === more) return;
    more = next; originalLabel = more.getAttribute("aria-label");
    more.classList.add("agenda-upcoming-more");
    more.setAttribute("aria-label", `${originalLabel ?? more.textContent}. Próxima cita: ${row.clientName}, ${time.format(row.start)}`);
    }
    update();
    const observer = new MutationObserver(update); observer.observe(root, {childList:true,subtree:true});
    return () => { observer.disconnect(); if (more) { more.classList.remove("agenda-upcoming-more"); if (originalLabel) more.setAttribute("aria-label", originalLabel); else more.removeAttribute("aria-label"); } };
  }, [appointments, time, upcomingId, ready, view]);
  const coincidences = useMemo(() => calendarCoincidences(ready && view !== 'mes' ? appointments : [], upcomingId), [appointments, ready, view, upcomingId]);
  const events = useMemo<EventInput[]>(() => ready ? [...appointments.filter(row => !coincidences.groupedIds.has(row._id)), ...coincidences.previews].map<EventInput>(row => {
    const index = coincidences.previews.findIndex(preview => preview._id === row._id), rows = index < 0 ? undefined : coincidences.groups[index];
    return { id: row._id, title: row.clientName, start: row.start, end: row.end, allDay: false,
      startEditable: row.status === "confirmed" && row.start > now && !selected, durationEditable: false, interactive: !rows,
      className: `agenda-${row.status}${row._id === upcomingId ? ' agenda-upcoming' : ''}${rows ? ' agenda-preview-event' : ''}${row._id === locatedId || rows?.some(member => member._id === locatedId) ? ' agenda-located' : ''}`, extendedProps: { appointment: row, coincidences: rows } };
  }).concat(blocks.map(block => ({ id: block._id, title: "Tiempo bloqueado", start: block.start, end: block.end, allDay: false, startEditable: false, durationEditable: false, interactive: true, className: "agenda-time-block", extendedProps: { timeBlock: block } }))) : [], [appointments, blocks, ready, now, selected, coincidences, locatedId, upcomingId]);
  const closed = useMemo<EventInput[]>(() => ready ? schedule.flatMap(day => {
    if (!day.configured) return [];
    const start = civilInstant(day.date, "00:00", timeZone);
    const nextDate = stepCalendar(day.date, "dia", 1), end = civilInstant(nextDate, "00:00", timeZone);
    if (start === null || end === null) return [];
    const opening = day.isOpen && day.start ? civilInstant(day.date, day.start, timeZone) : null;
    const closing = day.isOpen && day.end ? civilInstant(day.date, day.end, timeZone) : null;
    const spans = opening !== null && closing !== null ? [[start, opening], [closing, end]] : [[start, end]];
    return spans.filter(([from, until]) => from < until).map(([from, until], i) => ({ id: `closed-${day.date}-${i}`, start: from, end: until, display: "background", className: "agenda-nonworking", interactive: false }));
  }) : [], [schedule, timeZone, ready]);
  function returnFocus() { requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus(); else if (moreTrigger.current?.isConnected) moreTrigger.current.focus(); else document.querySelector<HTMLElement>(".agenda-toolbar button")?.focus(); }); }
  const target = selected && (appointments.find(row => row._id === selected.appointment._id) ?? selected.appointment);
  return <div ref={surface} className="agenda-calendar" data-located-id={locatedId ?? undefined} aria-busy={!ready}>
    {!ready && <CalendarSkeleton />}
    {ready && message && <p role="status" className="mb-3 text-sm text-muted">{message}</p>}
    {moved && <p role="status" className="mb-3 text-sm">Cita guardada: {formatLocalDate(moved.date)}, {time.format(moved.start)}–{time.format(moved.end)}. <a className="text-link text-accent" href={dayHref(moved.date)} onClick={event => { event.preventDefault(); window.history.pushState(null, "", event.currentTarget.href); }}>Localizar fecha</a></p>}
    <AgendaGridGuide date={date} view={view} timeZone={timeZone} schedule={schedule} blocked={!ready || !!selected} ready={ready} onNew={onNew} renderCalendar={({ clear: clearGuide, pause: pauseGuide, dayLaneDidMount, dayLaneWillUnmount, slotLaneDidMount, slotLaneWillUnmount, startDrag, stopDrag }) =>
      <FullCalendar ref={calendar} className={`agenda-fullcalendar agenda-view-${view}${coincidences.groups.length ? ' agenda-with-preview' : ''}`} plugins={plugins} locale={es} timedText="Horario" timeZone={timeZone} initialDate={date} initialView={calendarViews[view]} firstDay={1}
        headerToolbar={false} tableHeaderClass="agenda-table-header" dayHeaderRowClass="agenda-axis-header" height="100%" fixedWeekCount allDaySlot={false} nowIndicator slotDuration="00:15:00" snapDuration="00:15:00" slotHeaderInterval="01:00:00" slotHeaderFormat={{ hour: "numeric", hour12: true }} slotHeaderClass="agenda-hour-label" slotHeaderInnerClass="agenda-hour-text" slotHeaderContent={info => info.text.replace(/(\d)([ap]\.)/, "$1 $2")} slotLaneClass={info => info.isMajor ? "agenda-hour-line" : "agenda-quarter-line"} scrollTime="08:00:00" scrollTimeReset={false}
        eventDurationEditable={false} eventStartEditable eventInteractive eventResizableFromStart={false} droppable={false} editable={false} eventDisplay="block" eventMinHeight={0} slotEventOverlap={false} dayMaxEvents events={[...events, ...closed]} displayEventTime displayEventEnd
        dayLaneDidMount={dayLaneDidMount} dayLaneWillUnmount={dayLaneWillUnmount} slotLaneDidMount={slotLaneDidMount} slotLaneWillUnmount={slotLaneWillUnmount}
        moreLinkText={num => `+${num} más`} moreLinkHint={num => `Mostrar ${num} citas más`} moreLinkClass="agenda-more-link"
        moreLinkClick={info => { pauseGuide(true); moreTrigger.current = (info.jsEvent.target as HTMLElement)?.closest<HTMLElement>('.agenda-more-link') ?? null; return 'popover'; }}
        popoverClass="agenda-more-popover" popoverCloseClass="agenda-more-close" popoverCloseContent={() => <X size={16} aria-hidden="true" />}
        dayHeaderClass={info => info.inPopover ? 'agenda-more-header' : ''}
        dayHeaderDidMount={info => {
          if (!info.inPopover) { info.el.querySelector('.agenda-date-header')?.closest('[aria-hidden="true"]')?.removeAttribute('aria-hidden'); return; }
          const fit = () => {
            const panel = info.el.closest<HTMLElement>('.agenda-more-popover');
            if (!panel?.isConnected) return;
            const rect = panel.getBoundingClientRect();
            const top = Math.max(16, Math.min(rect.top, window.innerHeight - rect.height - 16));
            panel.style.top = `${parseFloat(panel.style.top || '0') + top - rect.top}px`;
            panel.style.setProperty('--agenda-popover-top', `${top}px`);
          };
          const frame = requestAnimationFrame(() => { fit(); const panel = info.el.closest<HTMLElement>('.agenda-more-popover'); const chosen = [...(panel?.querySelectorAll<HTMLElement>('[data-agenda-event]') ?? [])].find(el => el.dataset.agendaEvent === locatedId); if (chosen) { chosen.scrollIntoView({ block: 'nearest' }); chosen.focus({ preventScroll: true }); } });
          window.addEventListener('resize', fit);
          popoverCleanups.current.set(info.el, () => { cancelAnimationFrame(frame); window.removeEventListener('resize', fit); });
        }}
        dayHeaderWillUnmount={info => { popoverCleanups.current.get(info.el)?.(); popoverCleanups.current.delete(info.el); if (info.inPopover) pauseGuide(false); }}
        dayCellInnerClass={info => info.inPopover ? 'agenda-more-list' : ''}
        dayCellDidMount={info => { if (!info.inPopover) info.el.dataset.agendaDay = todayInZone(timeZone, info.date.getTime()); info.el.querySelector('[data-calendar-date]')?.closest('[aria-hidden="true"]')?.removeAttribute('aria-hidden'); }}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventContent={info => { const block = info.event.extendedProps.timeBlock as CalendarTimeBlock | undefined; if (block) return <div className={`agenda-event-content ${view === "mes" ? "agenda-month-event" : ""}`}><time><LockKeyhole size={12} aria-hidden="true" />{time.format(block.start)}–{time.format(block.end)}</time><strong>Tiempo bloqueado</strong></div>; const rows = info.event.extendedProps.coincidences as CalendarAppointment[] | undefined; if (rows) return <CoincidencePreview preview={info.event.extendedProps.appointment as CalendarAppointment} key={JSON.stringify(rows.map(row => [row._id, row.start, row.end, row.status]))} date={rows[0].date} rows={rows} timeZone={timeZone} onOpenChange={pauseGuide} onSelect={(row, element) => { moreTrigger.current = element; trigger.current = element; setSelected({ appointment: { ...row }, mode: 'detail' }); }} />; const row = info.event.extendedProps.appointment as CalendarAppointment | undefined; return row ? <div className={`agenda-event-content ${view === 'mes' ? 'agenda-month-event' : ''}`}><time><AppointmentStatusIcon status={row.status} />{time.format(row.start)}<span className={view === 'dia' ? 'agenda-event-end' : 'agenda-event-end agenda-event-end-hidden'}>–{time.format(row.end)}</span></time><strong>{row.clientName}</strong>{(view === "mes" || row.end - row.start >= 45 * 60_000) && <span>{row.status === "confirmed" && view === "dia" ? row.serviceName : appointmentStatusLabels[row.status]}</span>}</div> : null; }}
        eventDidMount={info => { const block = info.event.extendedProps.timeBlock as CalendarTimeBlock | undefined; if (block) { info.el.dataset.agendaBlock = block._id; info.el.setAttribute("aria-label", `Tiempo bloqueado, ${formatLocalDate(block.date)}, ${time.format(block.start)} a ${time.format(block.end)}. Ver bloqueo`); } if (info.event.extendedProps.coincidences) { info.el.dataset.agendaGroup = (info.event.extendedProps.coincidences as CalendarAppointment[]).map(row => row._id).join(" "); info.el.removeAttribute("role"); info.el.removeAttribute("tabindex"); } const row = info.event.extendedProps.appointment as CalendarAppointment | undefined; if (row) { info.el.dataset.agendaEvent = row._id; info.el.setAttribute("aria-label", `${row.clientName}, ${row.serviceName}, ${formatLocalDate(row.date)}, ${time.format(row.start)} a ${time.format(row.end)}, ${appointmentStatusLabels[row.status]}. Ver detalle`); } if (info.el.closest('.agenda-more-popover')) { info.el.addEventListener('pointerdown', event => event.stopPropagation()); info.el.addEventListener('mousedown', event => event.stopPropagation()); } }}
        eventClick={info => { const block = info.event.extendedProps.timeBlock as CalendarTimeBlock | undefined; if (block && ready) { clearGuide(); blockActions?.open(block, info.el); return; } const row = info.event.extendedProps.appointment as CalendarAppointment | undefined; if (!row || !ready || info.event.extendedProps.coincidences) return; clearGuide(); trigger.current = info.el; setSelected({ appointment: { ...row }, mode: "detail" }); }}
        dateClick={info => { if (!ready || selected || (info.jsEvent.target as HTMLElement)?.closest("[data-calendar-date],.agenda-more-link,.agenda-more-popover,.agenda-preview-event,.agenda-coincidence-panel")) return; clearGuide(); onNew(info.dateStr.slice(0,10), info.allDay ? undefined : info.date.getTime(), { element: info.dayEl, x: info.jsEvent.clientX, y: info.jsEvent.clientY }); }}
        eventDragStart={info => { setDragging(true); startDrag(); const row = info.event.extendedProps.appointment as CalendarAppointment | undefined; drag.current = row ? { ...row } : null; trigger.current = info.el; }}
        eventDragStop={() => { setDragging(false); stopDrag(); }}
        eventDrop={info => {
          const frozen = drag.current; drag.current = null;
          const destination = frozen && info.event.start ? dragDestination(frozen.start, info.event.start.getTime(), view === "mes", timeZone) : null;
          info.revert();
          if (!frozen || !destination || selected) { setMessage("No se pudo proponer ese horario. Usa Reprogramar desde el detalle."); return; }
          if (destination.start === frozen.start && destination.date === frozen.date) return;
          setSelected({ appointment: frozen, mode: "reschedule", proposal: destination });
        }}
        dayCellBottomClass="agenda-day-note"
        dayCellTopInnerClass="agenda-month-date"
        dayHeaderContent={info => {
          const value = todayInZone(timeZone, info.date.getTime()), day = schedule.find(row => row.date === value), isSelected = value === date, isToday = now > 0 && value === todayInZone(timeZone, now);
          return info.inPopover ? <div>{formatLocalDate(value)}<span>Todas las citas del día</span></div> : view === "mes" ? <span>{info.text}</span> : <div className="agenda-date-header"><Button data-calendar-date={value} variant="ghost" aria-label={`${formatLocalDate(value)}${isSelected ? ", seleccionado" : ""}${isToday ? ", hoy" : ""}${day?.configured && !day.isOpen ? ", cerrado" : day?.special ? ", horario especial" : ""}`} aria-pressed={isSelected} aria-current={isToday ? "date" : undefined} className={isSelected ? "agenda-selected-date" : ""} onFocus={event => revealCalendarDate(event.currentTarget)} onClick={event => { event.stopPropagation(); onSelectDate?.(value); }}><span>{new Intl.DateTimeFormat("es-UY", { timeZone, weekday: "short" }).format(info.date)}</span><strong>{Number(value.slice(-2))}</strong></Button></div>;
        }}
        dayCellClass={info => { const day = schedule.find(row => row.date === todayInZone(timeZone, info.date.getTime())); return info.inPopover ? 'agenda-more-body' : day?.configured && !day.isOpen ? "agenda-closed-day" : ""; }}
        dayCellTopContent={info => { const value = todayInZone(timeZone, info.date.getTime()), day = schedule.find(row => row.date === value); return <span className="agenda-day-label"><Button data-calendar-date={value} size="icon" variant="ghost" aria-label={`Seleccionar ${formatLocalDate(value)}${day?.configured && !day.isOpen ? ', cerrado' : day?.special ? ', horario especial' : ''}`} aria-pressed={value === date} aria-current={now > 0 && value === todayInZone(timeZone, now) ? "date" : undefined} className={value === date ? "agenda-selected-date" : ""} onClick={event => { event.stopPropagation(); onSelectDate?.(value); }}>{info.dayNumberText}</Button>{day?.special && <small>Especial</small>}</span>; }} />
    } />
    {showCreation && creationHost && createPortal(view === 'mes' ? <div role="row" className="agenda-month-create-bar"><div role="cell" aria-colspan={7}><CalendarCreateButton date={date} onNew={onNew} /></div></div> : <CalendarCreateButton date={date} onNew={onNew} />, creationHost)}
    {ready && appointments.length === 0 && <p role="status" className="sr-only">Sin citas en este intervalo con los filtros aplicados. La lupa permite buscar en todas las fechas.</p>}
    <p className="sr-only">Fondo gris: fuera del horario de atención. Para reprogramar con teclado o móvil, abre la cita.</p>
    {selected && target && (selected.mode === "detail" ? <DetailComponent appointment={selected.appointment} latest={target} timeZone={timeZone} now={now} onClose={() => setSelected(null)} onReturnFocus={returnFocus} onAction={(mode, row) => setSelected({ appointment: { ...row }, mode })} /> : <ActionComponent appointment={selected.appointment} latest={target} mode={selected.mode} proposal={selected.proposal} timeZone={timeZone} onClose={() => setSelected(null)} onReturnFocus={returnFocus} onMoved={setMoved} dayHref={dayHref} />)}
  </div>;
}

function CalendarCreateButton({ date, onNew }: { date: string; onNew: (date: string, start?: number, context?: CreateContext) => void }) {
  const blocks = useTimeBlockActions(), trigger = useRef<HTMLButtonElement>(null);
  return <div className="agenda-create-options"><Tooltip.Provider delayDuration={150}><Tooltip.Root><Tooltip.Trigger asChild><Button className="agenda-calendar-create" size="icon" variant="ghost" aria-label="Añadir cita" aria-haspopup="dialog" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onNew(date, undefined, { element: event.currentTarget }); }}><Plus aria-hidden="true" /></Button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="right" sideOffset={6} className="workspace-rail-tooltip">Añadir cita</Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider><BlockCreateMenu trigger={trigger} onCreate={() => blocks?.create(date, { element: trigger.current! })} /></div>;
}

function BlockCreateMenu({ trigger, onCreate }: { trigger: React.RefObject<HTMLButtonElement | null>; onCreate: () => void }) {
  const [next, setNext] = useState(false), [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  return <DropdownMenu.Root open={open} onOpenChange={value => { if (value) setContainer(trigger.current?.closest<HTMLDialogElement>("dialog[open]") ?? undefined); setOpen(value); }}><DropdownMenu.Trigger asChild><Button ref={trigger} size="icon" variant="ghost" aria-label="Más opciones de Agenda" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}><ChevronDown aria-hidden="true" /></Button></DropdownMenu.Trigger><DropdownMenu.Portal container={container}><DropdownMenu.Content className="z-50 min-w-44 rounded-md border border-line bg-background p-1 text-sm text-foreground shadow-md" sideOffset={4} collisionPadding={16} onCloseAutoFocus={event => { if (next) { event.preventDefault(); setNext(false); onCreate(); } }}><DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 outline-none focus:bg-surface" onSelect={() => setNext(true)}><LockKeyhole size={16} aria-hidden="true" />Bloquear tiempo</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}

function CoincidencePreview({ date, preview, rows, timeZone, onOpenChange, onSelect }: {
  date: string; preview: CalendarAppointment; rows: CalendarAppointment[]; timeZone: string; onOpenChange: (open: boolean) => void; onSelect: (row: CalendarAppointment, element: HTMLElement) => void;
}) {
  const [open, setOpen] = useState(false), button = useRef<HTMLButtonElement>(null), next = useRef<CalendarAppointment | null>(null);
  useEffect(() => { const frame = requestAnimationFrame(() => { const group = button.current?.closest<HTMLElement>('[data-agenda-group]'); if (group) { group.setAttribute('role', 'group'); group.setAttribute('aria-label', `${rows.length} citas con horarios coincidentes`); group.removeAttribute('tabindex'); } }); return () => cancelAnimationFrame(frame); });
  useEffect(() => () => { if (open) onOpenChange(false); }, [open, onOpenChange]);
  const time = new Intl.DateTimeFormat('es-UY', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const change = (value: boolean) => { setOpen(value); onOpenChange(value); };
  return <div className="agenda-preview-wrap"><button type="button" className={`agenda-event-content agenda-preview-content${preview.end - preview.start < 45 * 60_000 ? " agenda-preview-compact" : ""}`} aria-label={`${time.format(preview.start)} a ${time.format(preview.end)}, ${preview.clientName}, ${preview.serviceName}, ${appointmentStatusLabels[preview.status]}. Ver detalle`} onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onSelect(preview, event.currentTarget); }}><time>{<AppointmentStatusIcon status={preview.status} />}{time.format(preview.start)}</time><strong>{preview.clientName}</strong>{preview.end - preview.start >= 45 * 60_000 && <span>{appointmentStatusLabels[preview.status]}</span>}</button><Popover.Root modal open={open} onOpenChange={change}>
    <Popover.Trigger asChild><Button ref={button} variant="ghost" className="agenda-time-more" aria-label={`${rows.length - 1} ${rows.length === 2 ? 'cita más' : 'citas más'}, ${rows.length} en el grupo, ${formatLocalDate(date)}. Ver lista completa`} onKeyDown={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>+{rows.length - 1} más</Button></Popover.Trigger>
    <Popover.Portal><Popover.Content className="agenda-coincidence-panel" side="bottom" align="start" sideOffset={6} collisionPadding={16} aria-label={`Citas con horarios coincidentes, ${formatLocalDate(date)}`}
      onCloseAutoFocus={event => { if (next.current && button.current) { event.preventDefault(); const row = next.current; next.current = null; onSelect(row, button.current); } }}>
      <div className="agenda-coincidence-heading"><div><h3>{rows.length} citas en este grupo</h3><p>{formatLocalDate(date)}</p></div></div>
      <ul className="agenda-coincidence-list" onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}>{rows.map(row => <li key={row._id} className="agenda-coincidence-row" data-archivable={row.status === 'cancelled'}><button type="button" className={`agenda-coincidence-item agenda-coincidence-${row.status}`} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }} onClick={() => { next.current = row; change(false); }}><time>{time.format(row.start)}–{time.format(row.end)}</time><strong>{row.clientName}</strong><span>{row.serviceName} · {appointmentStatusLabels[row.status]}{row._id === preview._id ? ' · Visible en el calendario' : ''}</span></button><AppointmentArchiveButton appointment={row} className="agenda-archive-button" onChanged={() => { change(false); requestAnimationFrame(() => document.querySelector<HTMLElement>(`.agenda-canvas [data-calendar-date="${date}"]`)?.focus()); }} /></li>)}</ul>
    </Popover.Content></Popover.Portal>
  </Popover.Root></div>;
}

type DetailProps = { appointment: CalendarAppointment; latest: CalendarAppointment; timeZone: string; now: number; onClose: () => void; onReturnFocus: () => void; onAction: (mode: "cancel" | "reschedule", row: CalendarAppointment) => void; emailStatus?: ReactNode };
function ConnectedDetail(props: DetailProps) { const latest = useQuery(api.appointments.getMyAppointment, { appointmentId: props.appointment._id }); return <AppointmentDetail {...props} latest={latest ?? props.latest} emailStatus={<AppointmentEmailConfirmation appointmentId={props.appointment._id} />} />; }
export function AppointmentDetail({ latest: row, timeZone, now, onClose, onReturnFocus, onAction, emailStatus }: DetailProps) {
  const [next, setNext] = useState<{ mode: "cancel" | "reschedule"; appointment: CalendarAppointment } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const future = now > 0 && row.status === "confirmed" && row.start > now;
  const outcomes = useAppointmentResults();
  const ended = now > 0 && row.status === "confirmed" && row.end <= now;
  return <Dialog.Root open={!next} onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
    <Dialog.Content onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus(); }} onEscapeKeyDown={event => event.stopPropagation()} className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-5 sm:p-6"
      onCloseAutoFocus={event => { event.preventDefault(); if (next) onAction(next.mode, next.appointment); else onReturnFocus(); }}>
      <div className="flex items-start justify-between gap-3"><Dialog.Title ref={heading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">Detalle de la cita</Dialog.Title><AppointmentArchiveButton appointment={row} onChanged={onClose} /></div>
      <Dialog.Description className="sr-only">Consulta los datos y las acciones disponibles de esta cita.</Dialog.Description>
      <dl className="my-5 space-y-4 text-sm"><div><dt className="text-muted">Cliente</dt><dd className="mt-1 font-semibold wrap-anywhere">{row.clientName}</dd></div><div><dt className="text-muted">Servicio</dt><dd className="mt-1 wrap-anywhere">{row.serviceName}</dd></div><div><dt className="text-muted">Fecha y horario</dt><dd className="mt-1">{formatLocalDate(row.date)}<br />{time.format(row.start)}–{time.format(row.end)}<br /><span className="text-muted wrap-anywhere">{timeZone}</span></dd></div><div><dt className="text-muted">Estado</dt><dd className={`mt-1 font-semibold appointment-status-${row.status}`}>{appointmentStatusLabels[row.status]}</dd></div>
        {emailStatus}
        {row.cancelledAt !== undefined && <div><dt className="text-muted">Cancelada el</dt><dd>{new Intl.DateTimeFormat("es-UY", { timeZone, dateStyle: "short", timeStyle: "short" }).format(row.cancelledAt)}</dd></div>}
        {row.calendarArchivedAt !== undefined && <div><dt className="text-muted">Calendario</dt><dd>Archivada</dd></div>}
        {row.resultAt !== undefined && <div><dt className="text-muted">Resultado registrado el</dt><dd>{new Intl.DateTimeFormat("es-UY", { timeZone, dateStyle: "short", timeStyle: "short" }).format(row.resultAt)}</dd></div>}
        {row.rescheduledAt !== undefined && <div><dt className="text-muted">Última reprogramación</dt><dd>{new Intl.DateTimeFormat("es-UY", { timeZone, dateStyle: "short", timeStyle: "short" }).format(row.rescheduledAt)}</dd></div>}
      </dl>
      {ended && outcomes && <div className="flex flex-wrap gap-3 border-t border-line pt-4"><Button variant="outline" className="appointment-status-completed" disabled={outcomes.blocked} onClick={() => { void outcomes.mark(row, "completed"); onClose(); }}>Completada</Button><Button variant="outline" className="appointment-status-no_show" disabled={outcomes.blocked} onClick={() => { void outcomes.mark(row, "no_show"); onClose(); }}>No asistió</Button></div>}
      {future && <div className="flex flex-wrap gap-3 border-t border-line pt-4"><Button variant="outline" onClick={() => setNext({ mode: "reschedule", appointment: { ...row } })}><CalendarClock aria-hidden="true" />Reprogramar</Button><Button variant="outline" className="text-destructive" onClick={() => setNext({ mode: "cancel", appointment: { ...row } })}><CalendarX2 aria-hidden="true" />Cancelar cita</Button></div>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
