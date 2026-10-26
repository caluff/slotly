"use client";

import { ConvexError } from "convex/values";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDraftWarning } from "@/components/use-draft-warning";
import { clientEmailSchema } from "@/lib/client-email";
import { clientNameSchema, clientOperationPattern } from "@/lib/client-schema";
import type { Id } from "@/convex/_generated/dataModel";

export type ClientSummary = { _id: Id<"clients">; name: string; createdAt: number; email?: string };
export type ClientCommand = { name: string; operationId: string; email?: string };
export type ClientCreation = { outcome: "created" | "reused" | "already_applied"; client: ClientSummary };

export function ClientCreationForm({ storageKey, onCreate, onCheck, onSaving, onSaved, onCancel, disabled = false }: {
  storageKey: string; onCreate: (command: ClientCommand) => Promise<ClientCreation>;
  onCheck: (command: ClientCommand) => Promise<ClientSummary | null>;
  onSaving: (saving: boolean) => void; onSaved: (client: ClientSummary) => void; onCancel: () => void; disabled?: boolean;
}) {
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  const [pending, setPending] = useState<ClientCommand | null>(null);
  const [restored, setRestored] = useState(false), [saving, setSaving] = useState(false);
  const [checkedAbsent, setCheckedAbsent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [invalidField, setInvalidField] = useState<"name" | "email" | null>(null);
  const lock = useRef(false), errorNode = useRef<HTMLParagraphElement>(null);
  const key = `slotly:client-creation:${storageKey}`;
  useDraftWarning(!!name || !!email || !!pending || saving);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const command = JSON.parse(raw) as Partial<ClientCommand>;
        if (typeof command.name === "string" && typeof command.operationId === "string"
          && (command.email === undefined || clientEmailSchema.safeParse(command.email).success)
          && clientNameSchema.safeParse(command.name).success && clientOperationPattern.test(command.operationId)) {
          setName(command.name); setEmail(command.email ?? ""); setPending(command as ClientCommand);
          setMessage("Hay una creación pendiente. Comprueba el intento antes de continuar.");
        } else setError("No pudimos recuperar el intento guardado. Conserva esta pestaña y vuelve a abrir Clientes.");
      }
    } catch { setError("No pudimos acceder al intento guardado. Mantén esta pestaña abierta mientras confirmas."); }
    setRestored(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);
  useEffect(() => { if (error && !saving) {
    if (invalidField) document.getElementById(`client-${invalidField}`)?.focus();
    else errorNode.current?.focus();
  } }, [error, saving, invalidField]);
  function clearPending() {
    try { sessionStorage.removeItem(key); } catch { /* current tab still owns the command */ }
    setPending(null);
  }
  async function run(command: ClientCommand, check: boolean) {
    if (lock.current || disabled) return;
    lock.current = true; setSaving(true); setChecking(check); onSaving(true); setCheckedAbsent(false); setError(""); setInvalidField(null); setMessage("");
    try {
      if (check) {
        const found = await onCheck(command);
        if (found) { clearPending(); setName(""); setEmail(""); onSaved(found); }
        else { setCheckedAbsent(true); setMessage("El intento todavía no tiene una confirmación. Puedes reenviar el mismo intento."); }
      } else {
        const result = await onCreate(command);
        clearPending(); setName(""); setEmail("");
        if (result.outcome === "created") toast.success("Cliente creado");
        else if (result.outcome === "reused") toast.info("Cliente reutilizado");
        onSaved(result.client);
      }
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code === "INVALID_CLIENT_EMAIL") { clearPending(); setInvalidField("email"); setError("Escribe un correo válido."); }
      else if (code === "INVALID_CLIENT_NAME") { clearPending(); setInvalidField("name"); setError("Escribe un nombre válido de entre 1 y 100 caracteres."); }
      else setError(code === "CLIENT_OPERATION_CONFLICT" ? "Este intento pertenece a otro contenido. No se creó una segunda ficha."
        : code === "UNAUTHENTICATED" ? "Tu sesión dejó de estar disponible. Recupera el acceso y comprueba este intento."
          : "No pudimos confirmar la respuesta. Conservamos el intento; compruébalo antes de continuar.");
    } finally { lock.current = false; setSaving(false); setChecking(false); onSaving(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || pending || !restored || disabled) return;
    const parsed = clientNameSchema.safeParse(name);
    if (!parsed.success) { setInvalidField("name"); setError(parsed.error.issues[0].message); return; }
    const contact = clientEmailSchema.safeParse(email);
    if (!contact.success) { setInvalidField("email"); setError(contact.error.issues[0].message); return; }
    const command = { name: parsed.data, email: contact.data, operationId: crypto.randomUUID() };
    // Persist BEFORE sending. Recovery always checks this exact command, never a name search.
    try { sessionStorage.setItem(key, JSON.stringify(command)); }
    catch { setError("No podemos guardar el intento para recuperarlo tras recargar. Habilita el almacenamiento de esta pestaña y vuelve a guardar."); return; }
    setPending(command); void run(command, false);
  }
  return <form aria-label="Crear cliente" noValidate aria-busy={saving} onSubmit={submit} className="space-y-4">
    <Field className="gap-2"><FieldLabel htmlFor="client-name">Nombre</FieldLabel>
      <Input id="client-name" value={name} onChange={event => { setName(event.target.value); setError(""); setInvalidField(null); }} maxLength={100} required autoComplete="off"
        disabled={disabled || saving || !!pending || !restored} aria-invalid={!!error && invalidField === "name"} aria-describedby={error && invalidField === "name" ? "client-create-error" : undefined} />
    </Field>
    <Field className="gap-2"><FieldLabel htmlFor="client-email">Correo electrónico</FieldLabel>
      <Input id="client-email" type="email" inputMode="email" autoComplete="off" value={email} maxLength={254} required
        onChange={event => { setEmail(event.target.value); setError(""); setInvalidField(null); }} disabled={disabled || saving || !!pending || !restored}
        aria-invalid={!!error && invalidField === "email"} aria-describedby={error && invalidField === "email" ? "client-create-error" : undefined} />
    </Field>
    {error && <p id="client-create-error" ref={errorNode} tabIndex={-1} role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm leading-6">{message}</p>}
    {pending ? <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={saving || disabled} onClick={() => void run(pending, true)}>{saving ? checking ? "Comprobando…" : "Guardando…" : "Comprobar intento"}</Button>
      {checkedAbsent && <Button type="button" variant="outline" disabled={saving || disabled} onClick={() => void run(pending, false)}>Reenviar mismo intento</Button>}
    </div> : <Button type="submit" disabled={saving || disabled || !restored}>{saving ? "Guardando…" : "Guardar cliente"}</Button>}
    <Button type="button" variant="ghost" disabled={saving} className="ml-2" onClick={onCancel}>Cerrar</Button>
  </form>;
}
