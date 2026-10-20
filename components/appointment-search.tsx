"use client";

import { usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { Search } from "lucide-react";
import { Component, useState, type ReactNode, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { navigateWorkspace } from "@/components/dashboard-workspace";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatLocalDate } from "@/lib/agenda-date";
import { agendaFilterError, agendaPeriods, appointmentPeriodDates, appointmentQueryFilters, type AgendaFilters, type AgendaPeriod, type AppointmentFilters } from "@/lib/appointment-search";

type SearchAppointment = FunctionReturnType<typeof api.appointments.searchMyAppointments>["page"][number];
type SearchStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
type Service = { _id: Id<"services">; name: string };

export function AppointmentSearch({ filters, today, timeZone, enabled, services, moreServices, loadingServices, onLoadServices, onSearch, dayHref }: {
  filters: AgendaFilters; today: string; timeZone: string; enabled: boolean; services: Service[];
  moreServices: boolean; loadingServices: boolean; onLoadServices: () => void;
  onSearch: (filters: AgendaFilters) => void; dayHref: (date: string) => string;
}) {
  const error = agendaFilterError(filters);
  const queryFilters = appointmentQueryFilters(filters, today);
  const key = JSON.stringify([queryFilters, filters.period === "proximas" || filters.period === "pasadas" ? today : null, enabled]);
  return <>
    <AppointmentSearchFilters key={JSON.stringify(filters)} filters={filters} today={today} services={services} moreServices={moreServices}
      loadingServices={loadingServices} onLoadServices={onLoadServices} onSearch={onSearch} />
    <p id="search-period-help" className="sr-only">Hoy: {formatLocalDate(today)}. Próximas incluye todo hoy y los días siguientes; Pasadas, los días anteriores. Todas no limita las fechas. Editar Desde o Hasta selecciona Personalizado. Hora local: {timeZone}. Orden: fecha y hora, de más antiguas a más recientes.</p>
    {error ? <p role="alert" className="py-6 text-sm text-destructive">{error}</p>
      : <SearchReadBoundary key={key}><SearchRead filters={queryFilters} today={today} timeZone={timeZone} enabled={enabled} dayHref={dayHref} /></SearchReadBoundary>}
  </>;
}

export function AppointmentSearchFilters({ filters, today, services, moreServices = false, loadingServices = false, onLoadServices, onSearch }: {
  filters: AgendaFilters; today: string; services: Service[]; moreServices?: boolean; loadingServices?: boolean;
  onLoadServices?: () => void; onSearch: (filters: AgendaFilters) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [temporal, setTemporal] = useState({ period: filters.period, from: filters.from, until: filters.until });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = { client: String(data.get("client") ?? ""), service: String(data.get("service") ?? ""),
      period: String(data.get("period") ?? "hoy") as AgendaPeriod, from: String(data.get("from") ?? ""), until: String(data.get("until") ?? "") };
    const invalid = agendaFilterError(values);
    setError(invalid);
    if (!invalid) onSearch(values);
  }
  return <form onSubmit={submit} aria-label="Filtrar citas" className="@container border-y border-line py-4">
    <div className="grid grid-cols-1 items-end gap-3 @min-[20rem]:grid-cols-2 @min-[40rem]:grid-cols-3 @min-[70rem]:grid-cols-[minmax(13rem,1.5fr)_minmax(11rem,1.2fr)_minmax(8.5rem,0.8fr)_minmax(9.5rem,1fr)_minmax(9.5rem,1fr)_auto]">
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
      <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-period">Período</FieldLabel>
        <NativeSelect id="search-period" name="period" className="w-full" value={temporal.period} aria-describedby="search-period-help"
          onChange={(event) => { const period = event.target.value as AgendaPeriod; setTemporal((current) => ({ period, ...appointmentPeriodDates(period, today, current) })); }}>
          {!agendaPeriods.includes(temporal.period) && <option value={temporal.period}>Período del enlace</option>}
          <option value="hoy">Hoy</option><option value="todas">Todas</option><option value="proximas">Próximas</option><option value="pasadas">Pasadas</option><option value="personalizado">Personalizado</option>
        </NativeSelect>
      </Field>
      <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-from">Desde</FieldLabel><Input id="search-from" name="from" type="date" min="0001-01-01" max="9999-12-31" value={temporal.from} aria-describedby="search-range-help"
        onChange={(event) => { const from = event.target.value; setTemporal((current) => ({ ...current, period: "personalizado", from })); }} /></Field>
      <Field className="min-w-0 gap-2"><FieldLabel htmlFor="search-until">Hasta</FieldLabel><Input id="search-until" name="until" type="date" min="0001-01-01" max="9999-12-31" value={temporal.until} aria-describedby="search-range-help"
        onChange={(event) => { const until = event.target.value; setTemporal((current) => ({ ...current, period: "personalizado", until })); }} /></Field>
      <div className="flex gap-2 @min-[20rem]:col-span-2 @min-[40rem]:col-span-1"><Button type="submit"><Search aria-hidden="true" />Buscar</Button>
      </div>
    </div>
    <p id="search-name-help" className="sr-only">Puedes buscar un fragmento, con o sin tildes.</p>
    <p id="search-range-help" className="sr-only">Ambos días incluidos. Editar una fecha selecciona el período Personalizado; puedes dejar un extremo vacío.</p>
    {moreServices && <Button type="button" variant="outline" className="mt-3" disabled={loadingServices} onClick={onLoadServices}>{loadingServices ? "Cargando servicios…" : "Más servicios"}</Button>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </form>;
}

class SearchReadBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
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

function SearchRead({ filters, today, timeZone, enabled, dayHref }: { filters: AppointmentFilters; today: string; timeZone: string; enabled: boolean; dayHref: (date: string) => string }) {
  const { results, status, loadMore } = usePaginatedQuery(api.appointments.searchMyAppointments, enabled ? {
    client: filters.client.trim(), serviceId: filters.service ? filters.service as Id<"services"> : undefined,
    period: filters.period, from: filters.from, until: filters.until, referenceDate: filters.period === "todas" ? undefined : today,
  } : "skip", { initialNumItems: 50 });
  return <AppointmentSearchResults appointments={results} status={status} timeZone={timeZone} dayHref={dayHref} onLoadMore={() => loadMore(50)} />;
}

export function AppointmentSearchResults({ appointments, status, timeZone, dayHref, onLoadMore }: {
  appointments: SearchAppointment[]; status: SearchStatus; timeZone: string; dayHref: (date: string) => string; onLoadMore: () => void;
}) {
  const loading = status === "LoadingFirstPage" || status === "LoadingMore";
  const remaining = status === "CanLoadMore" || status === "LoadingMore";
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return <div aria-busy={loading}>
    <div className="sr-only">
      <h2 className="font-semibold">Resultados</h2>
      <p role="status" className="text-sm text-muted">{status === "LoadingFirstPage" ? "Buscando citas…"
        : remaining ? `${appointments.length} ${appointments.length === 1 ? "cita cargada" : "citas cargadas"} · Quedan páginas por consultar`
        : `${appointments.length} ${appointments.length === 1 ? "cita encontrada" : "citas encontradas"}`}</p>
    </div>
    {status === "LoadingFirstPage" ? <p role="status" className="py-10 text-sm text-muted">Consultando todas las fechas que cumplen los filtros…</p>
      : appointments.length === 0 ? <div className="py-10"><h3 className="text-lg font-semibold">{remaining ? "La búsqueda continúa" : "Sin coincidencias"}</h3>
        <p className="mt-2 max-w-prose text-sm leading-6 text-muted">{remaining ? "Todavía no encontramos coincidencias en las páginas consultadas. Sigue buscando en las siguientes citas." : "No hay citas con estos filtros. Prueba otro nombre, servicio o período, o ajusta las fechas."}</p></div>
      : <ol aria-label="Citas encontradas" className="divide-y divide-line border-b border-line">
        {appointments.map((item) => <li key={item._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 py-5 sm:grid-cols-[minmax(12rem,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-x-6">
          <div className="col-span-2 min-w-0 sm:col-span-1"><time dateTime={item.date} className="text-sm font-semibold first-letter:uppercase">{formatLocalDate(item.date)}</time>
            <p className="mt-1 tabular-nums"><time dateTime={new Date(item.start).toISOString()}>{time.format(item.start)}</time><span aria-hidden="true">–</span><span className="sr-only"> a </span><time dateTime={new Date(item.end).toISOString()}>{time.format(item.end)}</time></p></div>
          <div className="min-w-0"><p className="wrap-anywhere font-semibold">{item.clientName}</p><p className="mt-1 wrap-anywhere text-sm text-muted">{item.serviceName} · Confirmada</p></div>
          <Button asChild variant="outline"><a href={dayHref(item.date)} onClick={navigateWorkspace} aria-label={`Ver día ${item.date}, cita de ${item.clientName}`}>Ver día</a></Button>
        </li>)}
      </ol>}
    {remaining && <div className="mt-5 space-y-2"><Button type="button" variant="outline" disabled={loading} onClick={onLoadMore}>{loading ? "Buscando más citas…" : appointments.length ? "Cargar más citas" : "Seguir buscando"}</Button>
      <p className="text-xs leading-5 text-muted">Quedan páginas por consultar. Se revisan las siguientes citas que cumplen los filtros.</p></div>}
  </div>;
}
