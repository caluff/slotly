"use client";

import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Search } from "lucide-react";
import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode, type FormEvent } from "react";
import { AppointmentCancelDialog, type CancelAppointment } from "@/components/appointment-cancel-dialog";
import { AppointmentRescheduleDialog, type MoveResult } from "@/components/appointment-reschedule-dialog";
import { AppointmentActionsMenu } from "@/components/appointment-actions-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { navigateWorkspace } from "@/components/dashboard-workspace";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatLocalDate } from "@/lib/agenda-date";
import { isLocalDate } from "@/lib/local-date";
import { agendaFilterError, agendaPeriods, appointmentPeriodDates, appointmentQueryFilters, type AgendaFilters, type AgendaPeriod, type AppointmentFilters } from "@/lib/appointment-search";

type SearchAppointment = FunctionReturnType<typeof api.appointments.searchMyAppointments>["page"][number];
type SearchStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
type Service = { _id: Id<"services">; name: string };

export type AppointmentActionProps = { appointment: SearchAppointment; latest: SearchAppointment; mode: "cancel" | "reschedule"; proposal?: { date: string; start: number };
  onClose: () => void; onReturnFocus: () => void; onMoved: (result: MoveResult) => void };

export function ConnectedAppointmentAction({ appointment, mode, proposal, onClose, onReturnFocus, onMoved, timeZone, dayHref }: AppointmentActionProps & { timeZone: string; dayHref: (date: string) => string }) {
  const latest = useQuery(api.appointments.getMyAppointment, { appointmentId: appointment._id });
  const [date, setDate] = useState(proposal?.date ?? appointment.date);
  const occupied = useQuery(api.appointments.listMyConfirmedAppointments, mode === "reschedule" && isLocalDate(date) ? { date } : "skip");
  const schedule = useQuery(api.weeklySchedule.getMyWeeklySchedule, mode === "reschedule" ? {} : "skip");
  const specialDate = useQuery(api.specialDates.getMySpecialDate, mode === "reschedule" && isLocalDate(date) ? { date } : "skip");
  const services = usePaginatedQuery(api.services.listMyServices, mode === "reschedule" ? {} : "skip", { initialNumItems: 100 });
  const cancel = useMutation(api.appointments.cancelMyAppointment);
  const move = useMutation(api.appointments.rescheduleMyAppointment);
  const consult = useAction(api.availability.getMyRescheduleAvailability);
  if (mode === "cancel") return <AppointmentCancelDialog appointment={appointment} latest={latest ?? appointment} timeZone={timeZone} onCancel={cancel} onClose={onClose} onReturnFocus={onReturnFocus} />;
  return <AppointmentRescheduleDialog appointment={appointment} latest={latest ?? appointment} proposal={proposal} timeZone={timeZone} onConsult={consult} onReschedule={move}
    revision={JSON.stringify([occupied, schedule, specialDate, services.results, latest, timeZone])} onDateChange={setDate} onClose={onClose} onReturnFocus={onReturnFocus} onMoved={onMoved} dayHref={dayHref} />;
}

export function AppointmentSearch({ filters, today, timeZone, enabled, services, moreServices, loadingServices, onLoadServices, onSearch, dayHref, hideFilters = false, onLocate }: {
  filters: AgendaFilters; today: string; timeZone: string; enabled: boolean; services: Service[];
  moreServices: boolean; loadingServices: boolean; onLoadServices: () => void;
  onSearch: (filters: AgendaFilters) => void; dayHref: (date: string) => string;
  hideFilters?: boolean;
  onLocate?: (appointment: SearchAppointment) => void;
}) {
  const error = agendaFilterError(filters);
  const queryFilters = appointmentQueryFilters(filters, today);
  const key = JSON.stringify([queryFilters, filters.period === "proximas" || filters.period === "pasadas" ? today : null, enabled]);
  return <>
    {!hideFilters && <AppointmentSearchFilters key={JSON.stringify(filters)} filters={filters} today={today} services={services} moreServices={moreServices}
      loadingServices={loadingServices} onLoadServices={onLoadServices} onSearch={onSearch} />}
    <p id="search-period-help" className="sr-only">Búsqueda en todas las fechas. Hora local: {timeZone}. Orden: fecha y hora, de más antiguas a más recientes.</p>
    {error ? <p role="alert" className="py-6 text-sm text-destructive">{error}</p>
      : <SearchReadBoundary key={key}><SearchRead filters={queryFilters} today={today} timeZone={timeZone} enabled={enabled} dayHref={dayHref} onLocate={onLocate} /></SearchReadBoundary>}
  </>;
}

export function AppointmentSearchFilters({ filters, today, services, moreServices = false, loadingServices = false, onLoadServices, onSearch, sidebar = false }: {
  filters: AgendaFilters; today: string; services: Service[]; moreServices?: boolean; loadingServices?: boolean;
  onLoadServices?: () => void; onSearch: (filters: AgendaFilters) => void;
  sidebar?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [temporal, setTemporal] = useState({ period: filters.period, from: filters.from, until: filters.until });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = { client: String(data.get("client") ?? ""), service: String(data.get("service") ?? ""),
      period: String(data.get("period") ?? "hoy") as AgendaPeriod, from: String(data.get("from") ?? ""), until: String(data.get("until") ?? "") };
    const applied = sidebar ? { ...values, status: String(data.get("status") ?? ""), period: (values.from || values.until ? "personalizado" : "todas") as AgendaPeriod } : values;
    const invalid = agendaFilterError(applied);
    setError(invalid);
    if (!invalid) onSearch(applied);
  }
  return <form onSubmit={submit} aria-label="Filtrar citas" className="@container border-y border-line py-4">
    <div className={sidebar ? "grid grid-cols-1 items-end gap-3" : "grid grid-cols-1 items-end gap-3 @min-[20rem]:grid-cols-2 @min-[40rem]:grid-cols-3 @min-[70rem]:grid-cols-[minmax(13rem,1.5fr)_minmax(11rem,1.2fr)_minmax(8.5rem,0.8fr)_minmax(9.5rem,1fr)_minmax(9.5rem,1fr)_auto]"}>
      <Field className="min-w-0 gap-2 @min-[20rem]:col-span-2 @min-[40rem]:col-span-1"><FieldLabel htmlFor="search-client">Nombre del cliente</FieldLabel>
        <Input id="search-client" name="client" type="search" defaultValue={filters.client} maxLength={100} placeholder="Nombre o parte del nombre" aria-describedby="search-name-help" />
      </Field>
      <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-service">Servicio</FieldLabel>
        <NativeSelect id="search-service" name="service" className="w-full" defaultValue={filters.service}>
          <option value="">Todos los servicios</option>
          {filters.service && !services.some((service) => service._id === filters.service) && <option value={filters.service}>Servicio del enlace</option>}
          {services.map((service) => <option key={service._id} value={service._id}>{service.name}</option>)}
        </NativeSelect>
      </Field>
      {sidebar && <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-status">Estado</FieldLabel><NativeSelect id="search-status" name="status" className="w-full" defaultValue={filters.status ?? ""}><option value="">Todas</option><option value="confirmed">Confirmadas</option><option value="cancelled">Canceladas</option></NativeSelect></Field>}
      {!sidebar && <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-period">Período</FieldLabel>
        <NativeSelect id="search-period" name="period" className="w-full" value={temporal.period} aria-describedby="search-period-help"
          onChange={(event) => { const period = event.target.value as AgendaPeriod; setTemporal((current) => ({ period, ...appointmentPeriodDates(period, today, current) })); }}>
          {!agendaPeriods.includes(temporal.period) && <option value={temporal.period}>Período del enlace</option>}
          <option value="hoy">Hoy</option><option value="todas">Todas</option><option value="proximas">Próximas</option><option value="pasadas">Pasadas</option><option value="personalizado">Personalizado</option>
        </NativeSelect>
      </Field>}
      <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-from">Desde</FieldLabel><Input id="search-from" name="from" type="date" min="0001-01-01" max="9999-12-31" value={temporal.from} aria-describedby="search-range-help"
        onChange={(event) => { const from = event.target.value; setTemporal((current) => ({ ...current, period: "personalizado", from })); }} /></Field>
      <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-until">Hasta</FieldLabel><Input id="search-until" name="until" type="date" min="0001-01-01" max="9999-12-31" value={temporal.until} aria-describedby="search-range-help"
        onChange={(event) => { const until = event.target.value; setTemporal((current) => ({ ...current, period: "personalizado", until })); }} /></Field>
      <div className="flex flex-wrap gap-2 @min-[20rem]:col-span-2 @min-[40rem]:col-span-1"><Button type="submit"><Search aria-hidden="true" />Buscar</Button>
        {sidebar && <Button type="button" variant="outline" onClick={event => { const form = event.currentTarget.form!; const values = new FormData(form); onSearch({ client: String(values.get("client") ?? ""), service: String(values.get("service") ?? ""), status: String(values.get("status") ?? ""), period: "todas", from: "", until: "" }); }}>Buscar sin fecha</Button>}
      </div>
    </div>
    <p id="search-name-help" className="sr-only">Puedes buscar un fragmento, con o sin tildes.</p>
    <p id="search-range-help" className="sr-only">{sidebar ? "Fechas opcionales, ambos días incluidos. Buscar sin fecha recorre toda la agenda." : "Ambos días incluidos. Editar una fecha selecciona el período Personalizado; puedes dejar un extremo vacío."}</p>
    {moreServices && <Button type="button" variant="outline" className="mt-3" disabled={loadingServices} onClick={onLoadServices}>{loadingServices ? "Cargando servicios…" : "Más servicios"}</Button>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </form>;
}

export class SearchReadBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  render() {
    if (this.state.error) {
      const code = this.state.error instanceof ConvexError ? this.state.error.data?.code : undefined;
      return <div role="alert" className="space-y-4 py-8">
        <p className="text-sm leading-6 text-destructive">{code === "SERVICE_NOT_FOUND" ? "El servicio del filtro no pertenece a tu negocio o ya no existe. Elige otro servicio y vuelve a buscar."
          : "No pudimos cargar las citas. Comprueba la conexión y reintenta; los filtros y el borrador se conservan."}</p>
        <Button type="button" variant="outline" onClick={() => this.setState({ error: null })}>Reintentar búsqueda</Button>
      </div>;
    }
    return this.props.children;
  }
}

function SearchRead({ filters, today, timeZone, enabled, dayHref, onLocate }: { filters: AppointmentFilters; today: string; timeZone: string; enabled: boolean; dayHref: (date: string) => string; onLocate?: (appointment: SearchAppointment) => void }) {
  const cancel = useMutation(api.appointments.cancelMyAppointment);
  const { results, status, loadMore } = usePaginatedQuery(api.appointments.searchMyAppointments, enabled ? {
    client: filters.client.trim(), serviceId: filters.service ? filters.service as Id<"services"> : undefined, status: filters.status ? filters.status as "confirmed" | "cancelled" | "none" : undefined,
    period: filters.period, from: filters.from, until: filters.until, referenceDate: filters.period === "todas" ? undefined : today,
  } : "skip", { initialNumItems: 50 });
  if (onLocate) return <AppointmentLocateResults appointments={results} status={status} timeZone={timeZone} onLocate={onLocate} onLoadMore={() => loadMore(50)} />;
  return <AppointmentSearchResults appointments={results} status={status} timeZone={timeZone} dayHref={dayHref} onLoadMore={() => loadMore(50)} onCancel={cancel}
    actionComponent={ConnectedAppointmentAction} />;
}

export function AppointmentLocateResults({ appointments, status, timeZone, onLoadMore, onLocate }: { appointments: SearchAppointment[]; status: SearchStatus; timeZone: string; onLoadMore: () => void; onLocate: (appointment: SearchAppointment) => void }) {
  const loading = status === 'LoadingFirstPage' || status === 'LoadingMore', remaining = status === 'CanLoadMore' || status === 'LoadingMore';
  const time = new Intl.DateTimeFormat('es-UY', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return <div aria-busy={loading}>
    <p role="status" className="agenda-find-status">{status === 'LoadingFirstPage' ? 'Buscando en todas las fechas…' : remaining ? `${appointments.length} citas cargadas · Quedan páginas` : appointments.length ? `${appointments.length} ${appointments.length === 1 ? 'cita encontrada' : 'citas encontradas'}` : 'Sin coincidencias con estos filtros.'}</p>
    {status !== 'LoadingFirstPage' && <ul className="agenda-find-list">{appointments.map(row => <li key={row._id}><button type="button" className={row.status === 'cancelled' ? 'agenda-find-cancelled' : ''} onClick={() => onLocate(row)} aria-label={`Localizar ${row.clientName}, ${formatLocalDate(row.date)}, ${time.format(row.start)} a ${time.format(row.end)}`}><strong>{row.clientName}</strong><time>{formatLocalDate(row.date)} · {time.format(row.start)}–{time.format(row.end)}</time><span>{row.serviceName} · {row.status === 'cancelled' ? 'Cancelada' : 'Confirmada'}</span></button></li>)}</ul>}
    {remaining && <Button type="button" className="mt-3" variant="outline" disabled={loading} onClick={onLoadMore}>{loading ? 'Buscando…' : appointments.length ? 'Cargar más citas' : 'Seguir buscando'}</Button>}
  </div>;
}

export function AppointmentSearchResults({ appointments, status, timeZone, dayHref, onLoadMore, onCancel, actionComponent: Action }: {
  appointments: SearchAppointment[]; status: SearchStatus; timeZone: string; dayHref: (date: string) => string; onLoadMore: () => void;
  onCancel?: CancelAppointment;
  actionComponent?: ComponentType<AppointmentActionProps & { timeZone: string; dayHref: (date: string) => string }>;
}) {
  const [selected, setSelected] = useState<{ appointment: SearchAppointment; mode: "cancel" | "reschedule" } | null>(null);
  const [moved, setMoved] = useState<MoveResult | null>(null);
  const noticeLink = useRef<HTMLAnchorElement>(null);
  const [now, setNow] = useState(0);
  const trigger = useRef<HTMLButtonElement | null>(null);
  // UI affordance only. The mutation always decides using server time.
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const target = selected && (appointments.find((item) => item._id === selected.appointment._id) ?? selected.appointment);
  function returnFocus() {
    if (trigger.current?.isConnected) trigger.current.focus();
    else (noticeLink.current ?? document.querySelector<HTMLElement>("#search-client"))?.focus();
  }
  const loading = status === "LoadingFirstPage" || status === "LoadingMore";
  const remaining = status === "CanLoadMore" || status === "LoadingMore";
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return <div aria-busy={loading}>
    {moved && <p className="my-4 text-sm leading-6">La cita se guardó para el {formatLocalDate(moved.date)}, {time.format(moved.start)}–{time.format(moved.end)} ({timeZone}). <a ref={noticeLink} className="text-link text-accent" href={dayHref(moved.date)} onClick={navigateWorkspace}>Localizar fecha</a></p>}
    <div className="sr-only">
      <h2 className="font-semibold">Resultados</h2>
      <p role="status" className="text-sm text-muted">{status === "LoadingFirstPage" ? "Buscando citas…"
        : remaining ? `${appointments.length} ${appointments.length === 1 ? "cita cargada" : "citas cargadas"} · Quedan páginas por consultar`
        : `${appointments.length} ${appointments.length === 1 ? "cita encontrada" : "citas encontradas"}`}</p>
    </div>
    {status === "LoadingFirstPage" ? <p role="status" className="py-10 text-sm text-muted">Consultando todas las fechas que cumplen los filtros…</p>
      : appointments.length === 0 ? <div className="py-10"><h3 className="text-lg font-semibold">{remaining ? "La búsqueda continúa" : "Sin coincidencias"}</h3>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted">{remaining ? "Todavía no encontramos coincidencias en las páginas consultadas. Sigue buscando en las siguientes citas." : "No hay citas con estos filtros. Prueba otro nombre, servicio o selección de estados."}</p></div>
      : <ol aria-label="Citas encontradas" className="divide-y divide-line border-b border-line">
        {appointments.map((item) => <li key={item._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 py-5 sm:grid-cols-[minmax(12rem,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-x-6">
          <div className="col-span-2 min-w-0 sm:col-span-1"><time dateTime={item.date} className="text-sm font-semibold first-letter:uppercase">{formatLocalDate(item.date)}</time>
            <p className="mt-1 tabular-nums"><time dateTime={new Date(item.start).toISOString()}>{time.format(item.start)}</time><span aria-hidden="true">–</span><span className="sr-only"> a </span><time dateTime={new Date(item.end).toISOString()}>{time.format(item.end)}</time></p></div>
          <div className="min-w-0"><p className="wrap-anywhere font-semibold">{item.clientName}</p><p className="mt-1 wrap-anywhere text-sm text-muted">{item.serviceName} · <span className={item.status === "cancelled" ? "font-semibold text-destructive" : ""}>{item.status === "cancelled" ? "Cancelada" : "Confirmada"}</span></p>
            {item.cancelledAt !== undefined && <p className="mt-1 text-xs leading-5 text-muted">Cancelada el {new Intl.DateTimeFormat("es-UY", { timeZone, dateStyle: "short", timeStyle: "short" }).format(item.cancelledAt)} · {timeZone}</p>}
            {item.rescheduledAt !== undefined && <p className="mt-1 text-xs leading-5 text-muted">Última reprogramación: {new Intl.DateTimeFormat("es-UY", { timeZone, dateStyle: "short", timeStyle: "short" }).format(item.rescheduledAt)} · {timeZone}</p>}</div>
          <div className="flex justify-end">
            <AppointmentActionsMenu label={`Acciones de la cita de ${item.clientName}, ${item.date} a las ${time.format(item.start)}`}
              date={item.date} dayHref={dayHref(item.date)}
              canReschedule={!!Action && now > 0 && item.status === "confirmed" && item.start > now}
              canCancel={!!onCancel && now > 0 && item.status === "confirmed" && item.start > now}
              onAction={(mode, button) => { trigger.current = button; setSelected({ appointment: item, mode }); }} />
          </div>
        </li>)}
      </ol>}
    {remaining && <div className="mt-5 space-y-2"><Button type="button" variant="outline" disabled={loading} onClick={onLoadMore}>{loading ? "Buscando más citas…" : appointments.length ? "Cargar más citas" : "Seguir buscando"}</Button>
      <p className="text-xs leading-5 text-muted">Quedan páginas por consultar. Se revisan las siguientes citas que cumplen los filtros.</p></div>}
    {selected && target && (Action ? <Action appointment={selected.appointment} latest={target} mode={selected.mode} onClose={() => setSelected(null)} onMoved={setMoved} onReturnFocus={returnFocus} timeZone={timeZone} dayHref={dayHref} />
      : onCancel && <AppointmentCancelDialog key={selected.appointment._id} appointment={selected.appointment} latest={target} timeZone={timeZone} onCancel={onCancel} onClose={() => setSelected(null)} onReturnFocus={returnFocus} />)}
  </div>;
}
