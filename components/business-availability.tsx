"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { availabilitySchema, type AvailabilityValues } from "@/lib/availability-schema";
import { AppointmentForm } from "@/components/appointment-form";
import { AppointmentList, type Appointments } from "@/components/appointment-list";

type Availability = FunctionReturnType<typeof api.availability.getMyAvailability>;
type Service = { _id: Id<"services">; name: string; durationMinutes: number };
type Selection = { serviceId: Id<"services">; date: string };
type Consult = (values: Selection) => Promise<Availability>;
type Create = (values: Selection & { start: number; clientName: string }) => Promise<unknown>;

export function BusinessAvailability({ timeZone }: { timeZone: string }) {
  const [date, setDate] = useState<string | null>(null);
  const { results, status, loadMore } = usePaginatedQuery(api.services.listMyServices, {}, { initialNumItems: 20 });
  const schedule = useQuery(api.weeklySchedule.getMyWeeklySchedule, {});
  const consult = useAction(api.availability.getMyAvailability);
  const create = useMutation(api.appointments.createMyAppointment);
  const appointments = useQuery(api.appointments.listMyAppointments, date ? { date } : "skip");
  return <AvailabilityPanel services={results} loading={status === "LoadingFirstPage" || schedule === undefined}
    timeZone={timeZone} onConsult={consult} onCreate={create} onSelectDate={setDate} appointments={appointments}
    revision={JSON.stringify([results, schedule, appointments])}
    more={status === "CanLoadMore" || status === "LoadingMore"}
    loadingMore={status === "LoadingMore"} onLoadMore={() => loadMore(20)} />;
}

// Separating the read callback also permits UI checks without cloud writes.
export function AvailabilityPanel({ services, loading, timeZone, onConsult, onCreate, onSelectDate, appointments, revision = "", more = false, loadingMore = false, onLoadMore }: {
  services: Service[]; loading: boolean; timeZone: string; onConsult: Consult; revision?: string;
  onCreate: Create; onSelectDate?: (date: string | null) => void; appointments?: Appointments;
  more?: boolean; loadingMore?: boolean; onLoadMore?: () => void;
}) {
  const form = useForm<AvailabilityValues>({ resolver: zodResolver(availabilitySchema), defaultValues: { serviceId: "", date: "" } });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const { errors } = form.formState;

  function submit(values: AvailabilityValues) {
    setSelection({ serviceId: values.serviceId as Id<"services">, date: values.date });
    setAttempt((value) => value + 1);
    onSelectDate?.(values.date);
  }

  return (
    <section aria-labelledby="availability-heading" className="mt-10 max-w-2xl border-t border-line pt-8">
      <h2 id="availability-heading" className="text-2xl font-semibold tracking-tight">Citas</h2>
      <p className="mt-2 text-sm text-muted">Hora local: <span className="wrap-anywhere">{timeZone}</span></p>
      <p className="mt-2 text-sm leading-6 text-muted">Elige un servicio y una fecha. La agenda es compartida: una cita ocupa ese horario para todos tus servicios.</p>
      <div className="mt-6">
        {loading ? <p role="status" className="text-sm text-muted">Cargando servicios y configuración…</p>
          : services.length === 0 ? <p role="status" className="rounded-md bg-surface p-5 text-sm text-muted">Todavía no tienes servicios. Crea uno para consultar sus opciones.</p>
            : <>
              <form aria-label="Consultar opciones de horario" noValidate onSubmit={form.handleSubmit(submit)} onChange={() => { setSelection(null); onSelectDate?.(null); }}>
                <fieldset disabled={saving}>
                <legend className="sr-only">Servicio y fecha</legend>
                <FieldGroup className="gap-5">
                  <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <Controller name="serviceId" control={form.control} render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="min-w-0 gap-2 [&>[data-slot=native-select-wrapper]]:w-full">
                        <FieldLabel htmlFor="availability-service" className="font-semibold">Servicio</FieldLabel>
                        <NativeSelect {...field} id="availability-service" required className="w-full"
                          aria-invalid={fieldState.invalid} aria-describedby={fieldState.invalid ? "availability-service-error" : undefined}>
                          <option value="">Elige un servicio</option>
                          {services.map((service) => <option key={service._id} value={service._id}>{service.name} · {service.durationMinutes} min</option>)}
                        </NativeSelect>
                        {fieldState.invalid && <FieldError id="availability-service-error" errors={[errors.serviceId]} />}
                      </Field>
                    )} />
                    <Controller name="date" control={form.control} render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="min-w-0 gap-2">
                        <FieldLabel htmlFor="availability-date" className="font-semibold">Fecha</FieldLabel>
                        <Input {...field} id="availability-date" type="date" min="0001-01-01" max="9999-12-31" required
                          className="min-w-0" aria-invalid={fieldState.invalid}
                          aria-describedby={fieldState.invalid ? "availability-date-error" : undefined} />
                        {fieldState.invalid && <FieldError id="availability-date-error" errors={[errors.date]} />}
                      </Field>
                    )} />
                  </div>
                  {more && <Button type="button" variant="outline" disabled={loadingMore} onClick={onLoadMore} className="w-full sm:w-auto sm:self-start">
                    {loadingMore ? "Cargando servicios…" : "Cargar más servicios"}
                  </Button>}
                  <Button type="submit" className="w-full sm:w-auto sm:self-start">Consultar opciones</Button>
                </FieldGroup>
                </fieldset>
              </form>
              {selection && <>
                <AvailabilityResults key={attempt} selection={selection} onConsult={onConsult} onCreate={onCreate} revision={revision} onSaving={setSaving} />
                <AppointmentList date={selection.date} timeZone={timeZone} appointments={appointments} />
              </>}
            </>}
      </div>
    </section>
  );
}

const messages = {
  unconfigured: "Todavía no has guardado un horario semanal. Configúralo para consultar opciones.",
  week_closed: "La semana está configurada con todos los días cerrados.",
  day_closed: "El negocio está cerrado en esta fecha.",
  past_date: "Esta fecha ya pasó en la zona horaria del negocio.",
  empty: "No hay horarios libres futuros que permitan completar el servicio dentro de la jornada.",
  time_change: "La apertura o el cierre coincide con una hora inexistente o repetida por un cambio de hora. No se generan opciones para esta fecha.",
};

function readError(cause: unknown) {
  const code = cause instanceof ConvexError ? cause.data?.code : undefined;
  if (code === "UNAUTHENTICATED") return "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión.";
  if (code === "BUSINESS_NOT_FOUND") return "Tu cuenta no tiene un negocio asociado. Recarga y crea su perfil.";
  if (code === "SERVICE_NOT_FOUND") return "El servicio no está disponible en tu negocio. Elige otro servicio.";
  if (code === "INVALID_DATE") return "La fecha no es válida. Elige una fecha real con formato AAAA-MM-DD.";
  return "No pudimos consultar las opciones. Comprueba tu conexión y vuelve a consultar; se conservan los campos.";
}

function AvailabilityResults({ selection, onConsult, onCreate, revision, onSaving }: {
  selection: Selection; onConsult: Consult; onCreate: Create; revision: string; onSaving: (saving: boolean) => void;
}) {
  const [snapshot, setSnapshot] = useState<{ data: Availability; sent: number; revision: string; refresh: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const [refreshVersion, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      const current = ++request;
      const sent = performance.now();
      try {
        const data = await onConsult(selection);
        if (active && current === request) {
          setClock(data.generatedAt + performance.now() - sent);
          setSnapshot({ data, sent, revision, refresh: refreshVersion });
          setError(null);
        }
      } catch (cause) {
        if (active && current === request) { setSnapshot(null); setError(readError(cause)); }
      }
    }
    function resume() { if (document.visibilityState !== "hidden") { setSnapshot(null); void refresh(); } }
    function offline() { request++; setSnapshot(null); setError(readError(null)); }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [selection, onConsult, revision, refreshVersion]);

  // The server clock plus monotonic elapsed time ignores a wrong browser clock.
  // Including the entire round trip is conservative: it can hide a boundary
  // option slightly early, but network latency cannot keep a past option visible.
  const ready = snapshot !== null && snapshot.revision === revision && snapshot.refresh === refreshVersion;
  const slots = ready ? snapshot.data.slots.filter((slot) => slot.start > clock) : [];
  const nextStart = slots[0]?.start;
  useEffect(() => {
    if (!snapshot || nextStart === undefined) return;
    const delay = nextStart - (snapshot.data.generatedAt + performance.now() - snapshot.sent) + 1;
    const timer = window.setTimeout(() => setClock(snapshot.data.generatedAt + performance.now() - snapshot.sent), Math.min(Math.max(delay, 1), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [snapshot, nextStart, clock]);

  return (
    <div className="mt-6" aria-busy={!ready && !error}>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p>
        : !ready ? <p role="status" className="text-sm text-muted">Consultando opciones…</p>
          : <>
            <h3 className="wrap-anywhere font-semibold">{snapshot.data.service.name} · {snapshot.data.date}</h3>
            <p role="status" className="mt-2 text-sm text-muted">{slots.length ? `${slots.length} ${slots.length === 1 ? "opción" : "opciones"}. Se actualizan cada 30 segundos.`
              : snapshot.data.status === "available" ? messages.empty : messages[snapshot.data.status]}</p>
            {snapshot.data.omittedForTimeChange && <p className="mt-3 text-sm leading-6 text-muted">Se omiten opciones que cruzan un cambio de hora o usan horas inexistentes o repetidas.</p>}
          </>}
      <AppointmentForm slots={slots} ready={ready && !error}
        isFuture={(start) => snapshot !== null && start > snapshot.data.generatedAt + performance.now() - snapshot.sent}
        onCreate={(values) => onCreate({ ...selection, ...values })}
        onRefresh={() => setRefresh((value) => value + 1)} onSaving={onSaving} />
    </div>
  );
}
