"use client";

import { useEffect, useRef, useState } from "react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { durationError, validServiceDuration } from "@/lib/service-duration";
import { useDraftWarning } from "@/components/use-draft-warning";

export type ServiceDetail = FunctionReturnType<typeof api.services.getMyService>;
export type ServiceCommand = FunctionArgs<typeof api.services.changeMyService>;
export type ServiceChange = (command: ServiceCommand) => Promise<FunctionReturnType<typeof api.services.changeMyService>>;

export function ServiceEditor({ initial, latest, kind, onChange, onBusy, onDirty, onDiscard, onSaved, blocked = false }: {
  initial: ServiceDetail; latest?: ServiceDetail; kind: ServiceCommand["change"]["kind"]; onChange: ServiceChange;
  onBusy: (value: boolean) => void; onDirty: (value: boolean) => void; onDiscard: () => void;
  blocked?: boolean;
  onSaved: (result: FunctionReturnType<typeof api.services.changeMyService>) => void;
}) {
  const [expected, setExpected] = useState(initial), [saved, setSaved] = useState<ServiceDetail | null>(null);
  const [name, setName] = useState(initial.name), [duration, setDuration] = useState(String(initial.durationMinutes));
  const [durationEdited, setDurationEdited] = useState(false), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ServiceCommand | null>(null), [message, setMessage] = useState("");
  const lock = useRef(false), feedback = useRef<HTMLParagraphElement>(null);
  const current = latest && (!saved || latest.version >= saved.version) ? latest : saved ?? initial;
  const conflict = current.version !== expected.version;
  const dirty = !!pending || name !== expected.name || durationEdited || kind !== "edit";
  useDraftWarning(dirty || busy);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  function report(text: string) { setMessage(text); requestAnimationFrame(() => feedback.current?.focus()); }
  async function send(command: ServiceCommand) {
    if (lock.current || blocked) return;
    lock.current = true; setBusy(true); onBusy(true); setMessage("");
    try {
      const result = await onChange(command);
      setSaved(result.service); setExpected(result.service); setPending(null);
      setName(result.service.name); setDuration(String(result.service.durationMinutes)); setDurationEdited(false);
      onSaved(result);
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (!code) { setPending(command); report("No recibimos la respuesta. Comprueba el mismo intento antes de hacer más cambios."); }
      else { setPending(null); report(code === "SERVICE_CONFLICT" ? "El servicio cambió. Revisa la versión actual; tus campos se conservan." : code === "INVALID_DURATION" ? durationError : code === "INVALID_NAME" ? "Escribe un nombre de entre 1 y 100 caracteres." : "No pudimos guardar. Comprueba tu sesión y reintenta; conservamos el borrador."); }
    } finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  function submit() {
    if (lock.current || conflict || pending || blocked) return;
    if (kind === "edit" && (!name.trim() || name.trim().length > 100)) return report("Escribe un nombre de entre 1 y 100 caracteres.");
    if (kind === "edit" && durationEdited && (!/^\d+$/.test(duration) || !validServiceDuration(Number(duration)))) return report(durationError);
    void send({ id: expected._id, expectedVersion: expected.version, operationId: crypto.randomUUID(), change: kind === "edit"
      ? { kind, name, ...(durationEdited ? { durationMinutes: Number(duration) } : {}) } : { kind } });
  }
  return <form aria-label={kind === "edit" ? "Editar servicio" : kind === "archive" ? "Archivar servicio" : "Restaurar servicio"} aria-busy={busy} noValidate onSubmit={event => { event.preventDefault(); submit(); }} className="space-y-4">
    {kind === "edit" ? <fieldset disabled={busy || !!pending || current.archived || blocked} className="min-w-0 space-y-4">
      <Field><FieldLabel htmlFor="edit-service-name">Nombre</FieldLabel><Input id="edit-service-name" value={name} maxLength={100} onChange={event => setName(event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="edit-service-duration">Duración (minutos)</FieldLabel><Input id="edit-service-duration" type="number" inputMode="numeric" min={15} step={5} value={duration} onChange={event => { setDuration(event.target.value); setDurationEdited(true); }} /></Field>
    </fieldset> : <p className="text-sm leading-6 wrap-anywhere">{kind === "archive" ? `¿Archivar ${expected.name}? Dejará de ofrecerse para nuevas citas.` : `¿Restaurar ${expected.name}? Volverá a ofrecerse para nuevas citas.`}</p>}
    {conflict && <div role="alert" className="space-y-3 text-sm"><p>El servicio cambió. Tus campos se conservan.</p><p className="wrap-anywhere">Actual: {current.name} · {current.durationMinutes} min{current.archived ? " · Archivado" : ""}</p><Button type="button" variant="outline" disabled={busy || !!pending} onClick={() => { setExpected(current); report("Versión revisada. Confirma los cambios cuando estés listo."); }}>Revisar servicio actualizado</Button></div>}
    {message && <p ref={feedback} tabIndex={-1} role="status" className="text-sm leading-6">{message}</p>}
    {pending ? <Button type="button" disabled={busy || blocked} onClick={() => void send(pending)}>Comprobar intento anterior</Button> : <div className="flex items-center gap-2"><Button type="submit" className="px-2" disabled={busy || conflict || blocked || (kind === "edit" && current.archived)}>{busy ? "Guardando…" : kind === "edit" ? "Guardar cambios" : kind === "archive" ? "Archivar servicio" : "Restaurar servicio"}</Button><Button type="button" variant="ghost" className="px-2" disabled={busy || blocked} onClick={() => { if (lock.current || pending || blocked) return; onDiscard(); }}>Cancelar</Button></div>}
  </form>;
}
