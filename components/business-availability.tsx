"use client";

import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Plus } from "lucide-react";
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
import { AppointmentSearch } from "@/components/appointment-search";
import { appointmentSearchHref, appointmentQueryFilters, readAppointmentFilters } from "@/lib/appointment-search";
import { isLocalDate } from "@/lib/local-date";
import { formatLocalDate, todayInZone } from "@/lib/agenda-date";

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

export function BusinessAvailability({ businessName, timeZone, enabled = true, active = true }: { businessName: string; timeZone: string; enabled?: boolean; active?: boolean }) {
  const params = useSearchParams();
  const today = useToday(timeZone);
  const filters = readAppointmentFilters(params, today);
  const bounds = appointmentQueryFilters(filters, today);
  const singleDay = bounds.from === bounds.until && isLocalDate(bounds.from) ? bounds.from : "";
  const dayHref = (date: string) => appointmentSearchHref(params, { ...filters, period: "personalizado", from: date, until: date });
  const navigate = (href: string) => window.history.pushState(null, "", href);
  const { results, status, loadMore } = usePaginatedQuery(api.services.listMyServices, enabled ? {} : "skip", { initialNumItems: 20 });
  const schedule = useQuery(api.weeklySchedule.getMyWeeklySchedule, enabled ? {} : "skip");
  const consult = useAction(api.availability.getMyAvailability);
  const create = useMutation(api.appointments.createMyAppointment);
  const [occupancyDate, setOccupancyDate] = useState("");
  // Subscribe to the draft's day, even when the agenda filters show another
  // day. Cancellations in another tab invalidate the preview immediately.
  const appointments = useQuery(api.appointments.listMyConfirmedAppointments, enabled && isLocalDate(occupancyDate) ? { date: occupancyDate } : "skip");
  return <AvailabilityPanel businessName={businessName} services={results} loading={status === "LoadingFirstPage" || schedule === undefined}
    timeZone={timeZone} initialDate={singleDay} onSelectDate={(value) => navigate(dayHref(value))}
    agenda={<AppointmentSearch filters={filters} today={today} timeZone={timeZone} enabled={enabled && active}
      services={results} moreServices={status === "CanLoadMore" || status === "LoadingMore"} loadingServices={status === "LoadingMore"}
      onLoadServices={() => loadMore(20)} onSearch={(values) => navigate(appointmentSearchHref(params, values))}
      dayHref={dayHref} />}
    onConsult={consult} onCreate={create} scheduleMissing={schedule === null} onDraftDateChange={setOccupancyDate}
    revision={JSON.stringify([results, schedule, appointments, timeZone])}
    active={active && enabled} more={status === "CanLoadMore" || status === "LoadingMore"}
    loadingMore={status === "LoadingMore"} onLoadMore={() => loadMore(20)} />;
}

export function AvailabilityPanel({ businessName, services, loading, timeZone, initialDate, onConsult, onCreate, onSelectDate, onDraftDateChange, revision = "", more = false, loadingMore = false, onLoadMore, scheduleMissing = false, active = true, agenda }: {
  businessName: string; services: Service[]; loading: boolean; timeZone: string; initialDate: string; onConsult: Consult; revision?: string;
  onCreate: Create; onSelectDate: (date: string) => void; scheduleMissing?: boolean;
  more?: boolean; loadingMore?: boolean; onLoadMore?: () => void; active?: boolean;
  agenda: ReactNode;
  onDraftDateChange?: (date: string) => void;
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
  function start() { if (draftDate === null) { setDraftDate(initialDate); onDraftDateChange?.(initialDate); } setAttempt((value) => value + 1); setOpen(true); }

  return <>
    <h1 tabIndex={-1} className="sr-only">Agenda</h1>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium text-muted wrap-anywhere">{businessName}</p>
      <Button ref={trigger} onClick={start} aria-expanded={open} aria-controls="new-appointment"><Plus aria-hidden="true" />Nueva cita</Button>
    </div>
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
            <Input id="availability-date" type="date" min="0001-01-01" max="9999-12-31" value={draftDate} onChange={(event) => { setDraftDate(event.target.value); onDraftDateChange?.(event.target.value); setSelectionDirty(true); }} aria-invalid={draftDate !== "" && !isLocalDate(draftDate)} aria-describedby="appointment-zone" />
          </Field>
        </fieldset>
        <p id="appointment-zone" className="mt-2 text-xs text-muted wrap-anywhere">Hora local · {timeZone}</p>
        {isLocalDate(draftDate) && draftDate !== initialDate && <p className="mt-3 text-sm leading-6 text-muted">Este borrador es para el {formatLocalDate(draftDate)}. <button type="button" className="text-link text-accent" onClick={() => onSelectDate(draftDate)}>Ver ese día en la agenda</button></p>}
        <AvailabilityResults selection={selection} onConsult={onConsult} onCreate={async (values) => { const result = await onCreate(values); setSelectionDirty(false); return result; }} revision={`${revision}:${attempt}:${active}`} onSaving={setSaving} active={open && active} />
        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted">El borrador se conserva al cerrar el panel o cambiar de vista. Una cita ocupa ese horario para todos tus servicios.</p>
      </ContextPanel>}
      <div className="workspace-list">{agenda}</div>
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
