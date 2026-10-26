"use client";

import { createContext, Component, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { LockKeyhole, Pencil, Trash2 } from "@/components/ui/icons";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppointmentEditor, type CreateContext } from "@/components/appointment-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { useDraftWarning } from "@/components/use-draft-warning";
import { isLocalDate } from "@/lib/local-date";
import { formatLocalDate } from "@/lib/agenda-date";

export type CalendarTimeBlock = FunctionReturnType<typeof api.timeBlocks.listMyTimeBlocks>["page"][number];
type Detail = FunctionReturnType<typeof api.timeBlocks.getMyTimeBlock>;
type Command = FunctionArgs<typeof api.timeBlocks.changeMyTimeBlock>;
type Change = (args: Command) => Promise<FunctionReturnType<typeof api.timeBlocks.changeMyTimeBlock>>;
type Value = NonNullable<Command["value"]>;
type Session = { key: number; id?: Id<"timeBlocks">; value?: Value; context: CreateContext };
export type BlockEditorProps = { session: Session; open: boolean; enabled?: boolean; timeZone: string; onClose: () => void; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void };
const BlockActions = createContext<{ create: (date: string, context: CreateContext) => void; open: (block: CalendarTimeBlock, element: HTMLElement) => void } | null>(null);
export const useTimeBlockActions = () => useContext(BlockActions);

export function TimeBlockWorkspace({ children, timeZone, enabled = true, editorComponent: Editor = ConnectedBlockEditor }: { children: ReactNode; timeZone: string; enabled?: boolean; editorComponent?: React.ComponentType<BlockEditorProps> }) {
  const [session, setSession] = useState<Session | null>(null), [open, setOpen] = useState(false);
  const dirty = useRef(false), busy = useRef(false);
  function start(next: Omit<Session, "key">) {
    if (busy.current) return;
    // A second invocation resumes the existing draft; no silent replacement.
    if (!session || !dirty.current) setSession({ ...next, key: Date.now() });
    setOpen(true);
  }
  return <BlockActions.Provider value={{ create: (date, context) => start({ value: { date, startTime: "09:00", endTime: "09:30", reason: "" }, context }), open: (block, element) => {
    const rect = element.getBoundingClientRect();
    // A day event can span most of the viewport. A point on its visible edge
    // leaves collision handling room on either side of the contextual editor.
    start({ id: block._id, context: { element, x: Math.max(16, Math.min(rect.left + 18, window.innerWidth - 16)), y: Math.max(16, Math.min(rect.top, window.innerHeight - 16)) } });
  } }}>
    {children}
    {session && <BlockReadBoundary key={session.key} open={open && enabled} onClose={() => setOpen(false)}><Editor session={session} open={open && enabled} enabled={enabled} timeZone={timeZone} onClose={() => setOpen(false)} onDirty={value => { dirty.current = value; }} onBusy={value => { busy.current = value; }} /></BlockReadBoundary>}
  </BlockActions.Provider>;
}

class BlockReadBoundary extends Component<{ children: ReactNode; open: boolean; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.open ? <div role="alert" className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-background p-4 text-sm"><p>No pudimos leer el bloqueo. Comprueba la sesión y reintenta.</p><div className="mt-3 flex gap-2"><Button onClick={() => this.setState({ failed: false })}>Reintentar bloqueo</Button><Button variant="outline" onClick={this.props.onClose}>Cerrar</Button></div></div> : null : this.props.children; }
}

// Isolate subscription failures from the mounted form: retrying access must not
// unmount its draft, frozen revision, or uncertain command.
class BlockSourceBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function BlockSource({ id, enabled, onRead }: { id?: Id<"timeBlocks">; enabled: boolean; onRead: (row: Detail | undefined) => void }) {
  const row = useQuery(api.timeBlocks.getMyTimeBlock, id && enabled ? { id } : "skip");
  useEffect(() => { onRead(row); }, [row, onRead]);
  return null;
}
function ConnectedBlockEditor({ session, enabled = true, ...props }: BlockEditorProps) {
  const [source, setSource] = useState<{ row?: Detail; pending: boolean; error: boolean }>({ pending: !!session.id, error: false });
  const [retry, setRetry] = useState(0);
  const read = useCallback((row: Detail | undefined) => setSource(previous => ({ row: row ?? previous.row, pending: row === undefined, error: false })), []);
  const change = useMutation(api.timeBlocks.changeMyTimeBlock);
  return <><BlockSourceBoundary key={`${retry}:${enabled}`} onError={() => setSource(previous => ({ ...previous, error: true, pending: false }))}><BlockSource id={session.id} enabled={enabled} onRead={read} /></BlockSourceBoundary>
    <TimeBlockEditor {...props} context={session.context} initialValue={session.value} latest={source.row} existing={!!session.id} onChange={change}
      readPending={!!session.id && source.pending} readError={!!session.id && source.error} onRetryRead={() => { setSource(previous => ({ ...previous, pending: true, error: false })); setRetry(value => value + 1); }} /></>;
}

const valueOf = (row: Detail): Value => ({ date: row.date, startTime: row.startTime, endTime: row.endTime, reason: row.reason });
const errors: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión dejó de estar disponible. Vuelve a iniciar sesión y reintenta; conservamos el borrador.",
  TIME_BLOCK_CONFLICT: "El bloqueo cambió en otra sesión. Revisa la versión actual antes de guardar.",
  TIME_BLOCK_NOT_FOUND: "Este bloqueo ya no está disponible en tu negocio.",
  TIME_BLOCK_APPOINTMENT_CONFLICT: "Hay una cita confirmada en ese intervalo. Elige otro horario.",
  TIME_BLOCK_OVERLAP: "Ya hay otro bloqueo en ese intervalo. Elige otro horario.",
  TIME_BLOCK_STARTED: "Solo puedes cambiar bloqueos que todavía no hayan comenzado.",
  INVALID_DATE: "Elige una fecha real.", INVALID_TIME: "Revisa las horas de inicio y fin.",
  INVALID_INTERVAL: "El fin debe ser posterior al inicio, en el mismo día.",
  INVALID_REASON: "El motivo admite hasta 240 caracteres.", TIME_CHANGE: "Ese intervalo contiene horas ambiguas, inexistentes o un cambio de hora. Elige otro.",
};

export function TimeBlockEditor({ open, context, timeZone, initialValue, latest, existing, onChange, onClose, onDirty, onBusy, readPending = false, readError = false, onRetryRead }: {
  open: boolean; context: CreateContext; timeZone: string; initialValue?: Value; latest?: Detail; existing: boolean; onChange: Change;
  onClose: () => void; onDirty: (value: boolean) => void; onBusy: (value: boolean) => void;
  readPending?: boolean; readError?: boolean; onRetryRead?: () => void;
}) {
  const [edit, setEdit] = useState(!existing), [value, setValue] = useState<Value>(initialValue ?? { date: "", startTime: "", endTime: "", reason: "" });
  const [expected, setExpected] = useState<Command["expected"]>(null);
  const [baseline, setBaseline] = useState(initialValue ? JSON.stringify(initialValue) : "");
  const [saved, setSaved] = useState<Detail | null>(null), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  const [uncertain, setUncertain] = useState<Command | null>(null), [confirmDelete, setConfirmDelete] = useState(false);
  const [done, setDone] = useState(false);
  const busy = useRef(false), trigger = useRef<HTMLButtonElement>(null), feedback = useRef<HTMLParagraphElement>(null);
  // A locally accepted response can precede its subscription. Never mask a
  // newer remote revision with that response.
  const current = latest && (!saved || latest.version >= saved.version) ? latest : saved;
  const dirty = !!uncertain || (edit && JSON.stringify(value) !== baseline);
  const conflict = !!(edit && expected && current && (current._id !== expected.id || current.version !== expected.version || !current.active));
  useDraftWarning(dirty || saving);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => { onBusy(saving); }, [saving, onBusy]);
  function report(text: string) { setMessage(text); requestAnimationFrame(() => feedback.current?.focus()); }
  function review() {
    if (!current) return;
    setExpected({ id: current._id, version: current.version }); setConfirmDelete(false); setMessage("");
  }
  function beginEdit() {
    if (!current?.active) return;
    const next = valueOf(current); setValue(next); setBaseline(JSON.stringify(next));
    setExpected({ id: current._id, version: current.version }); setEdit(true); setDone(false);
    requestAnimationFrame(() => document.getElementById("block-date")?.focus());
  }
  async function send(command: Command) {
    if (busy.current) return;
    busy.current = true; setSaving(true); setMessage("");
    try {
      const result = await onChange(command); setSaved(result.block); setUncertain(null); setConfirmDelete(false);
      setExpected({ id: result.block._id, version: result.block.version }); setEdit(false); setDone(true);
      setValue(valueOf(result.block)); setBaseline(JSON.stringify(valueOf(result.block)));
      if (result.outcome === "changed") toast.success(result.block.active ? "Bloqueo guardado." : "Bloqueo eliminado.");
      report(result.outcome === "already_applied" ? "El intento ya se había aplicado. Se muestra el estado actual." : result.outcome === "unchanged" ? "No había cambios que guardar." : result.block.active ? "Bloqueo guardado." : "El bloqueo ya no ocupa ese horario.");
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code) { setUncertain(null); report(errors[code] ?? "No se pudo guardar el bloqueo. Revisa los datos y reintenta."); }
      else { setUncertain(command); report("No pudimos confirmar el resultado. Comprueba el mismo intento antes de hacer más cambios."); }
    } finally { busy.current = false; setSaving(false); }
  }
  function submit(remove = false) {
    if (busy.current || conflict || uncertain || readPending || readError || (existing && !current) || (expected && !current?.active)) return;
    if (!remove && (!isLocalDate(value.date) || !value.startTime || !value.endTime || value.startTime >= value.endTime)) { report("Revisa la fecha y el intervalo: el fin debe ser posterior al inicio del mismo día."); return; }
    void send({ expected, value: remove ? null : value, operationId: crypto.randomUUID() });
  }
  const disabled = saving || !!uncertain || readPending || readError;
  return <AppointmentEditor open={open} context={context} trigger={trigger} busy={busy} saving={saving} dirty={dirty} created={done || !edit} onClose={onClose}
    title={edit ? expected ? "Editar bloqueo" : "Bloquear tiempo" : "Detalle del bloqueo"} description="Intervalo privado de ocupación de una sola fecha. El motivo solo es visible para ti." initialFocusId={edit ? "block-date" : "block-detail"}>
    {readError && <div role="alert" className="mb-4 space-y-3 text-sm"><p>No pudimos actualizar el bloqueo. Comprueba la sesión y reintenta; conservamos tus campos.</p><Button variant="outline" disabled={saving} onClick={onRetryRead}>Reintentar lectura</Button></div>}
    {readPending && current && <p role="status" className="mb-3 text-sm">Actualizando bloqueo…</p>}
    {!edit ? !current ? <p id="block-detail" tabIndex={-1} role="status">Cargando bloqueo…</p> : <div id="block-detail" tabIndex={-1}>
      <div className="flex items-center gap-2 font-semibold"><LockKeyhole size={16} aria-hidden="true" />{current.active ? "Tiempo bloqueado" : "Bloqueo eliminado"}</div>
      <p className="mt-3 text-sm">{formatLocalDate(current.date)}<br />{current.startTime}–{current.endTime}</p>
      {current.reason && <div className="mt-4 text-sm"><p className="text-muted">Motivo privado</p><p className="mt-1 whitespace-pre-wrap wrap-anywhere">{current.reason}</p></div>}
      {current.active && <Button className="mt-4" variant="outline" disabled={disabled} onClick={beginEdit}><Pencil aria-hidden="true" />Editar bloqueo</Button>}
    </div> : <form onSubmit={event => { event.preventDefault(); submit(); }} className="space-y-4">
      {existing && !current ? <p role="status">Cargando bloqueo…</p> : <>
        <fieldset disabled={disabled} className="min-w-0 space-y-4">
          <Field><FieldLabel htmlFor="block-date">Fecha</FieldLabel><Input id="block-date" type="date" min="0001-01-01" max="9999-12-31" value={value.date} onChange={event => setValue({ ...value, date: event.target.value })} /></Field>
          <div className="grid min-w-0 grid-cols-2 gap-3"><Field className="min-w-0"><FieldLabel htmlFor="block-start">Inicio</FieldLabel><Input id="block-start" type="time" value={value.startTime} onChange={event => setValue({ ...value, startTime: event.target.value })} /></Field><Field className="min-w-0"><FieldLabel htmlFor="block-end">Fin</FieldLabel><Input id="block-end" type="time" value={value.endTime} onChange={event => setValue({ ...value, endTime: event.target.value })} /></Field></div>
          <Field><FieldLabel htmlFor="block-reason">Motivo privado (opcional)</FieldLabel><Input id="block-reason" maxLength={240} value={value.reason} onChange={event => setValue({ ...value, reason: event.target.value })} /></Field>
        </fieldset>
        {conflict && <div role="alert" className="space-y-3 text-sm"><p>Este bloqueo cambió en otra sesión. Tus campos se conservan.</p>{current?.active ? <><p>Actual: {formatLocalDate(current.date)}, {current.startTime}–{current.endTime}{current.reason ? ` · ${current.reason}` : ""}</p><Button type="button" variant="outline" disabled={disabled} onClick={review}>Revisar bloqueo actualizado</Button></> : <p>Fue eliminado. Este borrador no puede reactivarlo.</p>}</div>}
        {!uncertain && <div className="flex flex-wrap gap-2"><Button type="submit" disabled={disabled || conflict}>{saving ? "Guardando…" : "Guardar bloqueo"}</Button>{expected && <Button type="button" variant="outline" className="text-destructive" disabled={disabled || conflict} onClick={() => setConfirmDelete(true)}><Trash2 aria-hidden="true" />Eliminar</Button>}</div>}
        {confirmDelete && <div className="space-y-3 text-sm"><p>¿Eliminar el bloqueo guardado de {current?.date}, {current?.startTime}–{current?.endTime}?</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled} onClick={() => setConfirmDelete(false)}>Volver</Button><Button type="button" disabled={disabled || conflict} onClick={() => submit(true)}>Eliminar bloqueo</Button></div></div>}
      </>}
    </form>}
    <p className="mt-3 text-xs text-muted wrap-anywhere">{current && !edit ? current.timeZone : timeZone}</p>
    {message && <p ref={feedback} tabIndex={-1} role="status" className="mt-3 text-sm leading-6">{message}</p>}
    {uncertain && <Button className="mt-3" disabled={saving} onClick={() => void send(uncertain)}>Comprobar intento anterior</Button>}
    {dirty && !saving && !uncertain && <Button variant="ghost" className="mt-3" onClick={() => { if (current) { setValue(valueOf(current)); setBaseline(JSON.stringify(valueOf(current))); setEdit(false); } else { setValue(initialValue!); setBaseline(JSON.stringify(initialValue)); } setMessage(""); onClose(); }}>Descartar borrador</Button>}
  </AppointmentEditor>;
}
