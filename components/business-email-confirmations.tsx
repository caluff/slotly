"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function BusinessEmailConfirmations({ enabled }: { enabled: boolean }) {
  const settings = useQuery(api.emailConfirmations.getMySettings, enabled ? {} : "skip");
  const save = useMutation(api.emailConfirmations.setMySettings);
  return <EmailConfirmationsPanel enabled={enabled} settings={settings} save={save} />;
}

type EmailConfirmationsPanelProps = {
  enabled: boolean;
  settings: FunctionReturnType<typeof api.emailConfirmations.getMySettings> | undefined;
  save: (args: FunctionArgs<typeof api.emailConfirmations.setMySettings>) => Promise<FunctionReturnType<typeof api.emailConfirmations.setMySettings>>;
};

export function EmailConfirmationsPanel({ enabled, settings, save }: EmailConfirmationsPanelProps) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error && !busy) alert.current?.focus(); }, [error, busy]);
  async function toggle(checked: boolean) {
    if (!settings || lock.current || !enabled || (checked && !settings.configured) || checked === settings.enabled) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await save({ enabled: checked, expectedVersion: settings.version,
        ...(settings.testMode ? { expectedTestMode: settings.testMode } : {}) });
      if (result.changed) toast.success(result.settings.enabled ? "Confirmaciones por correo activadas." : "Confirmaciones por correo desactivadas.");
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : null;
      setError(code === "EMAIL_NOT_CONFIGURED" ? "Falta configurar el correo de Slotly. La reserva sigue disponible."
        : code === "EMAIL_SETTINGS_CHANGED" ? "La configuración cambió. Revisa su estado antes de volver a cambiarla."
          : "No pudimos confirmar el cambio. Comprueba el estado y la conexión antes de reintentar.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <section aria-labelledby="email-confirmations-heading" data-panel-mutation-busy={busy} className="border-t border-line pt-5">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 id="email-confirmations-heading" className="font-semibold">Confirmaciones por correo</h3>
        <p role="status" className={settings?.enabled && settings.configured ? "text-sm text-accent" : "text-sm text-muted"}>
          {!settings ? "Cargando…" : !settings.configured ? "Sin configurar" : busy ? "Guardando…" : settings.enabled ? "Activadas" : "Desactivadas"}
        </p>
      </div>
      {settings?.configured ? (
        <Switch
          aria-labelledby="email-confirmations-heading"
          aria-describedby="email-configuration-note"
          checked={settings.enabled}
          onCheckedChange={toggle}
          disabled={!enabled}
          readOnly={busy}
          aria-disabled={busy || undefined}
        />
      ) : settings?.enabled ? (
        <Button type="button" variant="outline" disabled={!enabled}
          aria-label={busy ? "Guardando las confirmaciones por correo" : "Desactivar confirmaciones por correo"}
          aria-describedby="email-configuration-note" onClick={() => toggle(false)}>
          {busy ? "Guardando…" : "Desactivar"}
        </Button>
      ) : null}
    </div>
    {settings && <p id="email-configuration-note" className="mt-2 text-sm text-muted">{!settings.configured
      ? "Falta configurar el envío de correo. Las reservas siguen disponibles."
      : settings.testMode
        ? "Modo de prueba. Solo envía confirmaciones de citas nuevas al correo configurado de tu cuenta de Resend."
        : "Solo para citas nuevas con correo. Desactivar también detiene las confirmaciones pendientes."}</p>}
    {error && <p ref={alert} role="alert" tabIndex={-1} className="mt-3 text-sm text-destructive">{error}</p>}
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
  const [label, explanation] = !status ? ["Cargando…", "Consultando la confirmación por correo."]
    : status.state === "suppressed" && status.lastError === "test_recipient_mismatch"
      ? ["Omitida", "El destinatario no coincide con el correo de prueba configurado."]
      : labels[status.state];
  return <div><dt className="text-muted">Confirmación por correo</dt><dd role="status" title={explanation} className="mt-1">{label}<span className="sr-only">. {explanation}</span></dd></div>;
}
