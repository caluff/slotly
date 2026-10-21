"use client";

import { AlertDialog } from "radix-ui";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatLocalDate } from "@/lib/agenda-date";

export type CancelAppointment = (args: { appointmentId: Id<"appointments">; expectedVersion: number }) => Promise<FunctionReturnType<typeof api.appointments.cancelMyAppointment>>;
export type CancelTarget = FunctionReturnType<typeof api.appointments.searchMyAppointments>["page"][number];

function cancellationError(cause: unknown) {
  const code = cause instanceof ConvexError ? cause.data?.code : undefined;
  if (code === "UNAUTHENTICATED") return "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión antes de reintentar.";
  if (code === "BUSINESS_NOT_FOUND" || code === "APPOINTMENT_NOT_FOUND") return "No tienes acceso a esta cita. Recarga la agenda para comprobar tu cuenta.";
  if (code === "APPOINTMENT_STARTED") return "La cita ya comenzó. Solo puedes cancelar antes de su hora de inicio.";
  if (code === "APPOINTMENT_CONFLICT") return "La cita cambió desde que abriste la confirmación. Revisa el horario actualizado antes de cancelar.";
  return "No pudimos confirmar la cancelación. Comprueba tu conexión y reintenta; conservamos los datos de la cita.";
}

export function AppointmentCancelDialog({ appointment: initial, latest = initial, timeZone, onCancel, onClose, onReturnFocus }: {
  appointment: CancelTarget; latest?: CancelTarget; timeZone: string; onCancel: CancelAppointment; onClose: () => void; onReturnFocus: () => void;
}) {
  // Capture what the person reviewed, never silently substitute reactive props.
  const [appointment, setAppointment] = useState(initial);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeatedAt, setRepeatedAt] = useState<number | null>(null);
  const cancelled = latest.status === "cancelled" || repeatedAt !== null;
  const changed = latest.version !== appointment.version;
  const cancelledAt = repeatedAt ?? latest.cancelledAt;
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const timestamp = new Intl.DateTimeFormat("es-UY", { timeZone, dateStyle: "medium", timeStyle: "short" });
  async function confirm() {
    if (inFlight.current || cancelled || changed) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await onCancel({ appointmentId: appointment._id, expectedVersion: appointment.version });
      if (!mounted.current) return;
      if (result.outcome === "cancelled") {
        toast.success("Cita cancelada.");
        onClose();
      } else {
        setRepeatedAt(result.cancelledAt);
      }
    } catch (cause) {
      if (!mounted.current) return;
      setError(cancellationError(cause));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return <AlertDialog.Root open onOpenChange={(open) => { if (!open && !inFlight.current) onClose(); }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
      <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-5 sm:p-6"
        onEscapeKeyDown={(event) => { if (inFlight.current) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}>
        <AlertDialog.Title className="text-lg font-semibold tracking-tight">{cancelled ? "Cita ya cancelada" : "Cancelar cita"}</AlertDialog.Title>
        <AlertDialog.Description className="sr-only">
          {cancelled ? "Esta cita ya estaba cancelada." : `Cancela la cita de ${appointment.clientName}, ${appointment.serviceName}.`}
        </AlertDialog.Description>
        <dl className="my-5 space-y-3 border-y border-line py-4 text-sm">
          <div><dt className="text-muted">Fecha y horario</dt><dd className="mt-1">{formatLocalDate(appointment.date)}<br /><span className="tabular-nums">{time.format(appointment.start)}–{time.format(appointment.end)}</span><br /><span className="text-muted wrap-anywhere">{timeZone}</span></dd></div>
        </dl>
        {cancelled && <p role="status" className="mb-5 text-sm leading-6">Cancelada{cancelledAt !== undefined ? ` el ${timestamp.format(cancelledAt)} (${timeZone})` : ""}.</p>}
        {changed && !cancelled && !pending && <div role="status" className="mb-5 space-y-3 text-sm leading-6"><p>La cita cambió en otra pestaña. Ahora está confirmada para el {formatLocalDate(latest.date)}, {time.format(latest.start)}–{time.format(latest.end)} ({timeZone}). Revisa este horario antes de cancelar.</p><Button variant="outline" disabled={pending} onClick={() => { setAppointment(latest); setError(null); }}>Revisar horario actualizado</Button></div>}
        {error && !cancelled && <p ref={errorRef} role="alert" tabIndex={-1} className="mb-5 text-sm leading-6 text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3" aria-busy={pending}>
          <AlertDialog.Cancel asChild><Button variant="outline" disabled={pending}>{cancelled ? "Cerrar" : "Volver"}</Button></AlertDialog.Cancel>
          {!cancelled && <AlertDialog.Action asChild><Button variant="destructive" disabled={pending || changed} onClick={(event) => { event.preventDefault(); void confirm(); }}>{pending ? "Cancelando…" : "Cancelar cita"}</Button></AlertDialog.Action>}
        </div>
        <p role="status" className="sr-only">{pending ? "Confirmando la cancelación…" : ""}</p>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
