"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export function BusinessEmailConfirmations({ enabled }: { enabled: boolean }) {
  const settings = useQuery(api.emailConfirmations.getMySettings, enabled ? {} : "skip");
  const save = useMutation(api.emailConfirmations.setMySettings);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error && !busy) alert.current?.focus(); }, [error, busy]);
  async function toggle() {
    if (!settings || lock.current || !enabled || (!settings.configured && !settings.enabled)) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await save({ enabled: !settings.enabled, expectedVersion: settings.version });
      if (result.changed) toast.success(result.settings.enabled ? "Confirmaciones por correo activadas." : "Confirmaciones por correo desactivadas.");
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : null;
      setError(code === "EMAIL_NOT_CONFIGURED" ? "Falta configurar el correo de Slotly. La reserva sigue disponible."
        : code === "EMAIL_SETTINGS_CHANGED" ? "La configuración cambió en otra pestaña. Revisa su estado antes de volver a cambiarla."
          : "No pudimos confirmar el cambio. Comprueba el estado y la conexión antes de reintentar.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <section aria-labelledby="email-confirmations-heading" data-panel-mutation-busy={busy} className="mt-8 max-w-2xl pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="email-confirmations-heading" className="text-lg font-semibold tracking-tight">Confirmaciones por correo</h2>
        <p role="status" className="mt-1 text-sm text-muted">{!settings ? "Cargando…" : settings.enabled ? "Activadas" : settings.configured ? "Desactivadas" : "Sin configurar"}</p>
      </div>
      <Button variant={settings?.enabled ? "outline" : "default"} disabled={!enabled || !settings || busy || (!settings.configured && !settings.enabled)}
        aria-describedby={!settings?.configured ? "email-configuration-note" : undefined} onClick={toggle}>
        {busy ? "Guardando…" : settings?.enabled ? "Desactivar correo" : "Activar correo"}
      </Button>
    </div>
    {settings && <p id="email-configuration-note" className="mt-3 max-w-prose text-sm leading-6 text-muted">{settings.configured
      ? "Solo para citas nuevas con correo. Desactivar también detiene las confirmaciones pendientes."
      : "Falta configurar el remitente y la credencial de correo de Slotly. Puedes seguir reservando citas."}</p>}
    {error && <p ref={alert} role="alert" tabIndex={-1} className="mt-4 text-sm text-destructive">{error}</p>}
  </section>;
}

const labels = {
  disabled: ["Desactivada", "No se enviará una confirmación por correo."],
  no_recipient: ["Sin destinatario", "La ficha elegida no tiene un correo válido. La cita conserva su reserva."],
  not_configured: ["Sin configurar", "Esta confirmación no se enviará automáticamente al configurar el correo después."],
  queued: ["Pendiente", "Confirmación pendiente de procesar."], sending: ["Pendiente", "Confirmación en proceso."],
  sent: ["Enviado", "Aceptado por el proveedor; la entrega al buzón no está comprobada."],
  failed: ["Fallido", "No se completarán más intentos automáticos."], review: ["Requiere revisión", "Puede existir una aceptación previa; no se reenvía automáticamente."],
  suppressed: ["Omitida", "La cita fue cancelada, modificada o pasó antes del envío."],
  not_requested: ["No solicitada", "Esta cita no tiene un evento de confirmación por correo."],
} as const;
export function AppointmentEmailConfirmation({ appointmentId }: { appointmentId: Id<"appointments"> }) {
  const status = useQuery(api.emailConfirmations.getMyAppointmentStatus, { appointmentId });
  const [label, explanation] = status ? labels[status.state] : ["Cargando…", "Consultando la confirmación por correo."];
  return <div><dt className="text-muted">Confirmación por correo</dt><dd role="status" title={explanation} className="mt-1">{label}<span className="sr-only">. {explanation}</span></dd></div>;
}
