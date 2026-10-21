"use client";

import { Dialog } from "radix-ui";
import { ConvexError } from "convex/values";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import type { CancelTarget } from "@/components/appointment-cancel-dialog";
import { api } from "@/convex/_generated/api";
import { formatLocalDate } from "@/lib/agenda-date";
import { isLocalDate } from "@/lib/local-date";
import { navigateWorkspace } from "@/components/dashboard-workspace";

type MoveArgs = FunctionArgs<typeof api.appointments.rescheduleMyAppointment>;
export type MoveResult = FunctionReturnType<typeof api.appointments.rescheduleMyAppointment>;
type Availability = FunctionReturnType<typeof api.availability.getMyRescheduleAvailability>;
export type ConsultReschedule = (args: { appointmentId: CancelTarget["_id"]; date: string }) => Promise<Availability>;
export type RescheduleAppointment = (args: MoveArgs) => Promise<MoveResult>;

function moveError(cause: unknown) {
  const code = cause instanceof ConvexError ? cause.data?.code : undefined;
  if (code === "UNAUTHENTICATED") return "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión antes de reintentar.";
  if (code === "APPOINTMENT_CONFLICT") return "La cita cambió. Revisa el horario actualizado antes de confirmar otro movimiento.";
  if (code === "APPOINTMENT_CANCELLED") return "La cita está cancelada y no se puede reprogramar.";
  if (code === "APPOINTMENT_STARTED") return "La cita ya comenzó. Solo puedes reprogramar antes de su inicio.";
  if (code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE") return "El horario ya no está disponible. Elige otra opción; tu cita conserva su horario actual.";
  if (code === "INVALID_DATE") return "Elige una fecha válida.";
  if (code === "APPOINTMENT_NOT_FOUND" || code === "BUSINESS_NOT_FOUND" || code === "SERVICE_NOT_FOUND") return "No tienes acceso a esta cita o su servicio. Recarga la agenda para comprobar tu cuenta.";
  return "No pudimos comprobar el resultado. Conservamos tu selección; puedes comprobar el intento anterior antes de volver a enviarlo.";
}
const emptyMessages = {
  unconfigured: "Configura el horario semanal antes de elegir un destino.", week_closed: "La semana está cerrada.",
  day_closed: "El negocio está cerrado en esta fecha.", past_date: "Esta fecha ya pasó en la zona del negocio.",
  empty: "No hay horarios libres futuros para este servicio.", time_change: "El horario coincide con un cambio de hora. Elige otra fecha.",
};

export function AppointmentRescheduleDialog({ appointment: initial, latest = initial, timeZone, onConsult, onReschedule, revision = "", onDateChange, onClose, onReturnFocus, onMoved, dayHref }: {
  appointment: CancelTarget; latest?: CancelTarget; timeZone: string; onConsult: ConsultReschedule; onReschedule: RescheduleAppointment;
  revision?: string; onDateChange?: (date: string) => void; onClose: () => void; onReturnFocus: () => void;
  onMoved: (result: MoveResult) => void; dayHref: (date: string) => string;
}) {
  const [appointment, setAppointment] = useState(initial);
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(String(initial.start));
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<{ data: Availability; key: string; sent: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState<MoveArgs | null>(null);
  const [result, setResult] = useState<MoveResult | null>(null);
  const [clock, setClock] = useState(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const dateRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const changed = latest.version !== appointment.version;
  const cancelled = latest.status === "cancelled";
  const key = JSON.stringify([date, appointment.version, revision, attempt]);
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const interval = (row: { date: string; start: number; end: number }) => `${formatLocalDate(row.date)}, ${time.format(row.start)}–${time.format(row.end)}`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function close() {
    if (inFlight.current) return;
    if (result && latest.version > result.version && !cancelled) onMoved({ ...result, version: latest.version, date: latest.date, start: latest.start, end: latest.end });
    onClose();
  }
  useEffect(() => { onDateChange?.(date); }, [date, onDateChange]);
  useEffect(() => {
    if (!isLocalDate(date) || cancelled || result) return;
    let live = true, request = 0;
    async function refresh() {
      const current = ++request, sent = performance.now();
      try {
        const data = await onConsult({ appointmentId: initial._id, date });
        if (live && current === request) { setSnapshot({ data, key, sent }); setFailure(null); }
      } catch (cause) {
        if (live && current === request) { setSnapshot(null); setFailure({ key, message: moveError(cause) }); }
      }
    }
    function resume() { setSnapshot(null); void refresh(); }
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", resume); window.addEventListener("online", resume);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener("focus", resume); window.removeEventListener("online", resume); };
  }, [date, key, initial._id, onConsult, cancelled, result]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const data = snapshot?.key === key ? snapshot.data : null;
  const serverNow = data && snapshot ? data.generatedAt + Math.max(0, clock - snapshot.sent) : Infinity;
  const slot = data?.slots.find((item) => String(item.start) === start && item.start > serverNow);
  const stalePreview = data && data.version !== appointment.version;
  const blocked = pending || changed || cancelled || !!result;
  const optionsMessage = cancelled ? "Consulta detenida: esta cita está cancelada." : failure?.key === key ? failure.message : !isLocalDate(date) ? "Elige una fecha válida." : !data ? "Consultando horarios…" : data.status !== "available" ? emptyMessages[data.status] : null;
  async function send(args: MoveArgs) {
    if (inFlight.current || result) return;
    inFlight.current = true; setPending(true); setError(null);
    try {
      const saved = await onReschedule(args);
      if (!mounted.current) return;
      setResult(saved); setRetry(null);
      if (saved.outcome === "rescheduled") toast.success("Cita reprogramada.");
      if (saved.outcome !== "unchanged") onMoved(saved);
    } catch (cause) {
      if (!mounted.current) return;
      setError(moveError(cause));
      setRetry(cause instanceof ConvexError ? null : args);
      setAttempt((value) => value + 1);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { inFlight.current = false; if (mounted.current) setPending(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (blocked || !slot || stalePreview) return;
    void send({ appointmentId: appointment._id, expectedVersion: appointment.version, date, start: slot.start });
  }
  return <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-5 sm:p-6"
      onOpenAutoFocus={(event) => { event.preventDefault(); dateRef.current?.focus(); }}
      onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}
      onEscapeKeyDown={(event) => { if (inFlight.current) event.preventDefault(); }} onInteractOutside={(event) => event.preventDefault()}>
      <Dialog.Title className="text-lg font-semibold tracking-tight">Reprogramar cita</Dialog.Title>
      <Dialog.Description className="sr-only">Cambia la fecha y el horario de la cita de {appointment.clientName}, {appointment.serviceName}.</Dialog.Description>
      <dl className="my-5 space-y-3 border-y border-line py-4 text-sm">
        <div><dt className="text-muted">Horario original revisado</dt><dd className="mt-1">{interval(appointment)}<br /><span className="text-muted wrap-anywhere">{timeZone}</span></dd></div>
      </dl>
      {result ? <div role="status" className="mb-5 space-y-3 text-sm leading-6">
        <p>{result.outcome === "unchanged" ? "Elegiste el mismo intervalo. La cita no cambió." : result.outcome === "already_rescheduled" ? "Este movimiento ya estaba aplicado. No se volvió a modificar la cita." : "El nuevo horario quedó guardado."}</p>
        <p>{latest.version > result.version ? `La cita volvió a cambiar después de este intento. ${cancelled ? "Ahora está cancelada." : `Horario actual: ${interval(latest)} (${timeZone}).`}` : `Horario de la cita: ${interval(result)} (${timeZone}).`}</p>
        {!cancelled && <Button asChild variant="outline"><a href={dayHref(latest.version > result.version ? latest.date : result.date)} onClick={(event) => { close(); navigateWorkspace(event); }}>Ver día</a></Button>}
      </div> : <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
        {!pending && (changed || stalePreview || cancelled) && <div role="status" className="space-y-3 text-sm leading-6">
          <p>{cancelled ? "La cita fue cancelada y no se puede reprogramar." : `La cita cambió en otra pestaña. Horario actual: ${interval(latest)} (${timeZone}). Revisa el contexto actualizado antes de confirmar.`}</p>
          {!cancelled && <Button variant="outline" type="button" disabled={pending || (!changed && !!stalePreview)} onClick={() => { setAppointment(latest); setError(null); setRetry(null); setAttempt((value) => value + 1); dateRef.current?.focus(); }}>Revisar horario actualizado</Button>}
        </div>}
        <Field className="gap-2"><FieldLabel htmlFor="reschedule-date">Nueva fecha</FieldLabel><Input ref={dateRef} id="reschedule-date" type="date" min="0001-01-01" max="9999-12-31" value={date} disabled={blocked} onChange={(event) => { setDate(event.target.value); setError(null); }} /></Field>
        <Field className="gap-2"><FieldLabel htmlFor="reschedule-start">Nuevo horario</FieldLabel><NativeSelect id="reschedule-start" className="w-full" value={start} disabled={blocked || !data || !!stalePreview} aria-describedby={optionsMessage ? "reschedule-options" : undefined} onChange={(event) => { setStart(event.target.value); setError(null); }}>
          <option value="">Elige un horario</option>
          {start && !slot && <option value={start} disabled>Horario seleccionado no disponible</option>}
          {data?.slots.filter((item) => item.start > serverNow).map((item) => <option key={item.start} value={String(item.start)}>{item.startTime}–{item.endTime}</option>)}
        </NativeSelect></Field>
        <p id="reschedule-options" role="status" className={optionsMessage ? "text-sm leading-6 text-muted" : "sr-only"}>{optionsMessage}</p>
        {failure?.key === key && <Button type="button" variant="outline" disabled={pending} onClick={() => setAttempt((value) => value + 1)}>Reintentar consulta</Button>}
        {error && <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm leading-6 text-destructive">{error}</p>}
        {retry && <Button type="button" variant="outline" disabled={pending || cancelled} onClick={() => void send(retry)}>Comprobar intento anterior</Button>}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="outline" disabled={pending} onClick={close}>Volver</Button><Button type="submit" disabled={blocked || !slot || !!stalePreview}>{pending ? "Reprogramando…" : "Confirmar reprogramación"}</Button></div>
      </form>}
      {result && <div className="flex justify-end"><Button variant="outline" onClick={close}>Cerrar</Button></div>}
      <p role="status" className="sr-only">{pending ? "Confirmando la reprogramación…" : ""}</p>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
