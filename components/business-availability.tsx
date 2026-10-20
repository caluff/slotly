"use client";

import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ContextPanel } from "@/components/context-panel";
import { useDraftWarning } from "@/components/use-draft-warning";
import { WorkspaceLink } from "@/components/dashboard-workspace";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppointmentForm } from "@/components/appointment-form";
import { AppointmentList, type Appointments } from "@/components/appointment-list";
import { AppointmentSearch } from "@/components/appointment-search";
import { appointmentSearchHref, emptyAppointmentFilters, readAppointmentFilters } from "@/lib/appointment-search";
import { isLocalDate } from "@/lib/local-date";
import { formatLocalDate, shiftLocalDate, todayInZone } from "@/lib/agenda-date";

type Availability = FunctionReturnType<typeof api.availability.getMyAvailability>;
type Service = { _id: Id<"services">; name: string; durationMinutes: number };
type Selection = { serviceId: Id<"services">; date: string };
type Consult = (values: Selection) => Promise<Availability>;
type Create = (values: Selection & { start: number; clientName: string }) => Promise<unknown>;

function useToday(timeZone: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", update); window.removeEventListener("online", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return todayInZone(timeZone, now);
}

export function BusinessAvailability({ timeZone, enabled = true, active = true }: { timeZone: string; enabled?: boolean; active?: boolean }) {
  const params = useSearchParams();
  const today = useToday(timeZone);
  const requested = params.get("fecha");
  const date = requested && isLocalDate(requested) ? requested : today;
  const mode = params.get("modo") === "listado" ? "listado" : "dia";
  const filters = readAppointmentFilters(params);
  const navigate = (href: string) => window.history.pushState(null, "", href);
  const { results, status, loadMore } = usePaginatedQuery(api.services.listMyServices, enabled ? {} : "skip", { initialNumItems: 20 });
  const schedule = useQuery(api.weeklySchedule.getMyWeeklySchedule, enabled ? {} : "skip");
  const consult = useAction(api.availability.getMyAvailability);
  const create = useMutation(api.appointments.createMyAppointment);
  const appointments = useQuery(api.appointments.listMyAppointments, enabled ? { date } : "skip");
  return <AvailabilityPanel services={results} loading={status === "LoadingFirstPage" || schedule === undefined}
    timeZone={timeZone} today={today} date={date} invalidDate={!!requested && !isLocalDate(requested)}
    onSelectDate={(value) => navigate(appointmentSearchHref(params, undefined, "dia", value))}
    mode={mode} onChangeMode={(value) => navigate(appointmentSearchHref(params, undefined, value))}
    search={<AppointmentSearch filters={filters} today={today} timeZone={timeZone} enabled={enabled && active && mode === "listado"}
      services={results} moreServices={status === "CanLoadMore" || status === "LoadingMore"} loadingServices={status === "LoadingMore"}
      onLoadServices={() => loadMore(20)} onSearch={(values) => navigate(appointmentSearchHref(params, values))}
      onClear={() => navigate(appointmentSearchHref(params, emptyAppointmentFilters))} dayHref={(value) => appointmentSearchHref(params, undefined, "dia", value)} />}
    onConsult={consult} onCreate={create} appointments={appointments} scheduleMissing={schedule === null}
    revision={JSON.stringify([results, schedule, appointments, timeZone])}
    active={active && enabled} more={status === "CanLoadMore" || status === "LoadingMore"}
    loadingMore={status === "LoadingMore"} onLoadMore={() => loadMore(20)} />;
}

export function AvailabilityPanel({ services, loading, timeZone, today, date, invalidDate = false, onConsult, onCreate, onSelectDate, appointments, revision = "", more = false, loadingMore = false, onLoadMore, scheduleMissing = false, active = true, mode = "dia", onChangeMode, search }: {
  services: Service[]; loading: boolean; timeZone: string; today: string; date: string; invalidDate?: boolean; onConsult: Consult; revision?: string;
  onCreate: Create; onSelectDate: (date: string) => void; appointments?: Appointments; scheduleMissing?: boolean;
  more?: boolean; loadingMore?: boolean; onLoadMore?: () => void; active?: boolean;
  mode?: "dia" | "listado"; onChangeMode?: (mode: "dia" | "listado") => void; search?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectionDirty, setSelectionDirty] = useState(false);
  useDraftWarning(selectionDirty || saving);
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const selection = useMemo(() => serviceId && draftDate && isLocalDate(draftDate) ? { serviceId: serviceId as Id<"services">, date: draftDate } : null, [serviceId, draftDate]);
  const previous = shiftLocalDate(date, -1);
  const next = shiftLocalDate(date, 1);
  function start() { if (draftDate === null) setDraftDate(mode === "dia" ? date : ""); setAttempt((value) => value + 1); setOpen(true); }

  return <>
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><h1 tabIndex={-1} className="workspace-title">Agenda</h1><p className="workspace-description">Consulta tu día o encuentra una cita por su cliente.</p></div>
      <Button ref={trigger} onClick={start} aria-expanded={open} aria-controls="new-appointment"><Plus aria-hidden="true" />Nueva cita</Button>
    </div>
    {onChangeMode && <div role="group" aria-label="Forma de consultar Agenda" className="my-6 flex flex-wrap gap-2">
      <Button variant={mode === "dia" ? "default" : "outline"} aria-pressed={mode === "dia"} onClick={() => onChangeMode("dia")}>Día</Button>
      <Button variant={mode === "listado" ? "default" : "outline"} aria-pressed={mode === "listado"} onClick={() => onChangeMode("listado")}>Buscar citas</Button>
    </div>}
    <div hidden={mode !== "dia"} className="my-7 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
      <div><p className="font-semibold first-letter:uppercase">{formatLocalDate(date)}</p><p className="mt-1 text-xs text-muted wrap-anywhere">{date === today ? "Hoy · " : ""}{timeZone}</p></div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <Button variant="outline" size="icon" aria-label="Día anterior" disabled={!previous} onClick={() => previous && onSelectDate(previous)}><ChevronLeft aria-hidden="true" /></Button>
        <label className="sr-only" htmlFor="agenda-date">Fecha de la agenda</label>
        <Input id="agenda-date" type="date" min="0001-01-01" max="9999-12-31" value={date} onChange={(event) => { if (isLocalDate(event.target.value)) onSelectDate(event.target.value); }} className="min-w-0 w-40 flex-1 sm:flex-none" />
        <Button variant="outline" size="icon" aria-label="Día siguiente" disabled={!next} onClick={() => next && onSelectDate(next)}><ChevronRight aria-hidden="true" /></Button>
        <Button variant="ghost" onClick={() => onSelectDate(today)}>Hoy</Button>
      </div>
    </div>
    {invalidDate && mode === "dia" && <p role="alert" className="mb-5 text-sm text-destructive">La fecha del enlace no es válida. Mostramos hoy; puedes elegir otra fecha.</p>}
    {!loading && services.length === 0 && <p className="mb-6 rounded-md bg-surface p-4 text-sm leading-6">Para crear tu primera cita, <WorkspaceLink view="servicios">añade un servicio</WorkspaceLink> y <WorkspaceLink view="horario">define tu horario</WorkspaceLink>. Puedes consultar cualquier día de la agenda.</p>}
    {!loading && services.length > 0 && scheduleMissing && <p className="mb-6 rounded-md bg-surface p-4 text-sm leading-6"><WorkspaceLink view="horario">Configura el horario de atención</WorkspaceLink> para habilitar las opciones de tus servicios.</p>}
    <div className={open ? "workspace-grid" : ""}>
      {draftDate !== null && <ContextPanel id="new-appointment" title="Nueva cita" open={open} onClose={() => setOpen(false)} busy={saving} trigger={trigger}>
        <fieldset disabled={saving} className="space-y-5">
          <legend className="sr-only">Servicio y fecha de la nueva cita</legend>
          <Field className="gap-2"><FieldLabel htmlFor="availability-service">Servicio</FieldLabel>
            <NativeSelect id="availability-service" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSelectionDirty(true); }} className="w-full">
              <option value="">Elige un servicio</option>
              {services.map((service) => <option key={service._id} value={service._id}>{service.name} · {service.durationMinutes} min</option>)}
            </NativeSelect>
          </Field>
          {more && <Button type="button" variant="outline" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "Cargando…" : "Cargar más servicios"}</Button>}
          {!loading && services.length === 0 && <p className="text-sm leading-6 text-muted">Necesitas <WorkspaceLink view="servicios">crear un servicio</WorkspaceLink> antes de confirmar una cita.</p>}
          <Field className="gap-2"><FieldLabel htmlFor="availability-date">Fecha de la cita</FieldLabel>
            <Input id="availability-date" type="date" min="0001-01-01" max="9999-12-31" value={draftDate} onChange={(event) => { setDraftDate(event.target.value); setSelectionDirty(true); }} aria-invalid={draftDate !== "" && !isLocalDate(draftDate)} aria-describedby="appointment-zone" />
          </Field>
        </fieldset>
        <p id="appointment-zone" className="mt-2 text-xs text-muted wrap-anywhere">Hora local · {timeZone}</p>
        {isLocalDate(draftDate) && (mode === "listado" || draftDate !== date) && <p className="mt-3 text-sm leading-6 text-muted">Este borrador es para el {formatLocalDate(draftDate)}. <button type="button" className="text-link text-accent" onClick={() => onSelectDate(draftDate)}>Ver ese día en la agenda</button></p>}
        <AvailabilityResults selection={selection} onConsult={onConsult} onCreate={async (values) => { const result = await onCreate(values); setSelectionDirty(false); return result; }} revision={`${revision}:${attempt}:${active}`} onSaving={setSaving} active={open && active} />
        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">El borrador se conserva al cerrar el panel o cambiar de vista. Una cita ocupa ese horario para todos tus servicios.</p>
      </ContextPanel>}
      <div className="workspace-list"><div hidden={mode !== "dia"}><AppointmentList date={date} timeZone={timeZone} appointments={appointments} /></div>
        <div hidden={mode !== "listado"}>{search}</div></div>
    </div>
  </>;
}

const messages = {
  unconfigured: "Todavía no has guardado un horario semanal. Configúralo en Horario.",
  week_closed: "Tu semana está configurada con todos los días cerrados. Puedes cambiarla en Horario.",
  day_closed: "El negocio está cerrado en esta fecha. Elige otro día.",
  past_date: "Esta fecha ya pasó en la zona horaria del negocio. Elige otra fecha.",
  empty: "No hay horarios libres futuros para completar este servicio. Prueba otra fecha.",
  time_change: "La apertura o el cierre coincide con un cambio de hora. Elige otra fecha para consultar opciones.",
};
function readError(cause: unknown) {
  const code = cause instanceof ConvexError ? cause.data?.code : undefined;
  if (code === "UNAUTHENTICATED") return "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión.";
  if (code === "BUSINESS_NOT_FOUND") return "Tu cuenta no tiene un negocio asociado. Recarga y crea su perfil.";
  if (code === "SERVICE_NOT_FOUND") return "El servicio no está disponible en tu negocio. Elige otro servicio.";
  if (code === "INVALID_DATE") return "La fecha no es válida. Elige una fecha real.";
  return "No pudimos cargar los horarios. Comprueba tu conexión y reintenta; conservamos el borrador.";
}

function AvailabilityResults({ selection, onConsult, onCreate, revision, onSaving, active }: {
  selection: Selection | null; onConsult: Consult; onCreate: Create; revision: string; onSaving: (saving: boolean) => void; active: boolean;
}) {
  const [snapshot, setSnapshot] = useState<{ data: Availability; sent: number; revision: string; refresh: number; key: string } | null>(null);
  const [failure, setFailure] = useState<{ message: string; key: string; revision: string; refresh: number } | null>(null);
  const [clock, setClock] = useState(0);
  const [refreshVersion, setRefresh] = useState(0);
  const key = selection ? `${selection.serviceId}:${selection.date}` : "";
  useEffect(() => {
    if (!selection || !active) return;
    let live = true;
    let request = 0;
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      const current = ++request;
      const sent = performance.now();
      try {
        const data = await onConsult(selection!);
        if (live && current === request) {
          setClock(data.generatedAt + performance.now() - sent);
          setSnapshot({ data, sent, revision, refresh: refreshVersion, key });
          setFailure(null);
        }
      } catch (cause) {
        if (live && current === request) { setSnapshot(null); setFailure({ message: readError(cause), key, revision, refresh: refreshVersion }); }
      }
    }
    function resume() { if (document.visibilityState !== "hidden") { setSnapshot(null); void refresh(); } }
    function offline() { request++; setSnapshot(null); setFailure({ message: readError(null), key, revision, refresh: refreshVersion }); }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", resume); window.addEventListener("online", resume); window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", resume);
    return () => {
      live = false; window.clearInterval(interval);
      window.removeEventListener("focus", resume); window.removeEventListener("online", resume); window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [selection, onConsult, revision, refreshVersion, active, key]);
  const error = failure?.key === key && failure.revision === revision && failure.refresh === refreshVersion ? failure.message : null;
  const ready = active && !!selection && snapshot !== null && snapshot.key === key && snapshot.revision === revision && snapshot.refresh === refreshVersion;
  const slots = ready ? snapshot.data.slots.filter((slot) => slot.start > clock) : [];
  const nextStart = slots[0]?.start;
  useEffect(() => {
    if (!snapshot || nextStart === undefined) return;
    const delay = nextStart - (snapshot.data.generatedAt + performance.now() - snapshot.sent) + 1;
    const timer = window.setTimeout(() => setClock(snapshot.data.generatedAt + performance.now() - snapshot.sent), Math.min(Math.max(delay, 1), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [snapshot, nextStart, clock]);
  return <div className="mt-5">
    {!selection ? <p role="status" className="text-sm leading-6 text-muted">Elige un servicio y una fecha válida para ver los horarios disponibles.</p>
      : error ? <div><p role="alert" className="text-sm leading-6 text-destructive">{error}</p><Button type="button" variant="outline" className="mt-3" onClick={() => setRefresh((value) => value + 1)}>Reintentar horarios</Button></div>
        : !ready ? <p role="status" className="text-sm text-muted">Cargando horarios disponibles…</p>
          : <><p role="status" className="text-sm leading-6 text-muted">{slots.length ? `${slots.length} ${slots.length === 1 ? "horario disponible" : "horarios disponibles"}` : snapshot.data.status === "available" ? messages.empty : messages[snapshot.data.status]}</p>
            {snapshot.data.omittedForTimeChange && <p className="mt-2 text-xs leading-5 text-muted">Se omiten las horas ambiguas o inexistentes por cambios de hora.</p>}</>}
    <AppointmentForm slots={slots} ready={ready && !error}
      isFuture={(start) => snapshot !== null && start > snapshot.data.generatedAt + performance.now() - snapshot.sent}
      onCreate={(values) => selection ? onCreate({ ...selection, ...values }) : Promise.reject(new Error("Missing selection"))}
      onRefresh={() => setRefresh((value) => value + 1)} onSaving={onSaving} />
  </div>;
}
