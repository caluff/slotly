"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { Plus } from "@/components/ui/icons";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { ContextPanel } from "@/components/context-panel";
import { useDraftWarning } from "@/components/use-draft-warning";
import { isLocalDate } from "@/lib/local-date";
import { formatLocalDate } from "@/lib/agenda-date";
import { specialDateSchema } from "@/lib/special-date-schema";

type Configuration = Doc<"specialDates">;
type Source = FunctionReturnType<typeof api.specialDates.getMySpecialDate>;
type Command = FunctionArgs<typeof api.specialDates.changeMySpecialDate>;
type Change = (args: Command) => Promise<FunctionReturnType<typeof api.specialDates.changeMySpecialDate>>;

export function BusinessSpecialDates({ timeZone, enabled }: { timeZone: string; enabled: boolean }) {
  const list = usePaginatedQuery(api.specialDates.listMySpecialDates, enabled ? {} : "skip", { initialNumItems: 10 });
  const change = useMutation(api.specialDates.changeMySpecialDate);
  return <SpecialDatesPanel timeZone={timeZone} rows={list.results} loading={list.status === "LoadingFirstPage"}
    more={list.status === "CanLoadMore" || list.status === "LoadingMore"} loadingMore={list.status === "LoadingMore"}
    onLoadMore={() => list.loadMore(10)} editor={(initial, onBusy) => <ConnectedEditor initial={initial} timeZone={timeZone} enabled={enabled} onChange={change} onBusy={onBusy} />} />;
}

function ConnectedEditor({ initial, timeZone, enabled, onChange, onBusy }: { initial: Configuration | null; timeZone: string; enabled: boolean; onChange: Change; onBusy: (busy: boolean) => void }) {
  const [date, setDate] = useState(initial?.date ?? "");
  const source = useQuery(api.specialDates.getMySpecialDate, enabled && isLocalDate(date) ? { date } : "skip");
  return <SpecialDateEditor initial={initial} date={date} onDateChange={setDate} source={source} timeZone={timeZone} onChange={onChange} onBusy={onBusy} />;
}

export function SpecialDatesPanel({ rows, loading, more, loadingMore, onLoadMore, editor, timeZone }: {
  rows: Configuration[]; loading: boolean; more: boolean; loadingMore: boolean; onLoadMore: () => void; timeZone: string;
  editor: (initial: Configuration | null, onBusy: (busy: boolean) => void) => React.ReactNode;
}) {
  const [sessions, setSessions] = useState<{ initial: Configuration | null; key: string }[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const addTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (!trigger.current?.isConnected) trigger.current = addTrigger.current; }, [rows]);
  function select(initial: Configuration | null, button: HTMLButtonElement) {
    trigger.current = button;
    const key = initial?._id ?? "new";
    if (!sessions.some((session) => session.key === key)) setSessions((old) => [...old, { initial, key }]);
    setSelection(key);
    setOpen(true);
  }
  return <section aria-labelledby="special-dates-heading" className="mt-10 max-w-5xl border-t border-line pt-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id="special-dates-heading" className="text-lg font-semibold tracking-tight">Fechas especiales</h2>
      <Button ref={addTrigger} variant="outline" disabled={busy} aria-expanded={open && selection === "new"} aria-controls="special-date-panel-new" onClick={(event) => {
        select(null, event.currentTarget);
      }}><Plus aria-hidden="true" />Añadir fecha</Button>
    </div>
    <div className={open ? "workspace-grid" : ""}>
      {sessions.map((session) => <ContextPanel key={session.key} id={`special-date-panel-${session.key}`} title="Fecha especial" open={open && selection === session.key} onClose={() => setOpen(false)} busy={busy} trigger={trigger}>
        {editor(session.initial, setBusy)}
      </ContextPanel>)}
      <div className="workspace-list">
        {loading ? <p role="status" className="text-sm text-muted">Cargando fechas especiales…</p> : rows.length === 0 ? <p className="py-4 text-sm text-muted">Sin fechas especiales. Se aplica tu semana habitual.</p> :
          <ul className="divide-y divide-line border-y border-line">{rows.map((row) => <li key={row._id} className="flex items-center justify-between gap-3 py-4">
            <div className="min-w-0 text-sm"><p className="font-medium wrap-anywhere">{formatLocalDate(row.date)}</p>
              <p className="mt-1 text-muted tabular-nums">{row.isOpen ? `${row.start}–${row.end}` : "Cerrado"}</p></div>
            <Button variant="ghost" disabled={busy} onClick={(event) => {
              select(row, event.currentTarget);
            }} aria-label={`Editar ${formatLocalDate(row.date)}`}>Editar</Button>
          </li>)}</ul>}
        {more && <Button className="mt-4" variant="outline" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "Cargando…" : "Cargar más fechas"}</Button>}
      </div>
    </div>
    <p className="sr-only">Fechas y horas en {timeZone}. Eliminar una excepción restaura la semana habitual.</p>
  </section>;
}

export function SpecialDateEditor({ initial, date, onDateChange, source, timeZone, onChange, onBusy }: {
  initial: Configuration | null; date: string; onDateChange: (date: string) => void; source: Source | undefined; timeZone: string; onChange: Change; onBusy: (busy: boolean) => void;
}) {
  const [fields, setFields] = useState({ isOpen: initial?.isOpen ?? false, start: initial?.start ?? "", end: initial?.end ?? "" });
  const [reviewed, setReviewed] = useState<{ date: string; configuration: Configuration | null } | null>(initial ? { date: initial.date, configuration: initial } : null);
  // Freeze the first read for a newly selected date. Subsequent subscriptions
  // only detect conflicts; they never silently replace the expected revision.
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState<Command | null>(null);
  const prefix = useId();
  if (source && (!reviewed || reviewed.date !== date)) {
    setReviewed({ date, configuration: source.configuration });
    if (source.configuration?.active) setConflict(true);
  }
  const lock = useRef(false);
  const alert = useRef<HTMLParagraphElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const current = reviewed?.date === date ? reviewed.configuration : undefined;
  const stale = !!source?.configuration && current !== undefined && (source.configuration._id !== current?._id || source.configuration.version > (current?.version ?? 0));
  const blocked = busy || !!pending;
  useDraftWarning(dirty || busy || !!pending);
  useEffect(() => {
    if (!error || busy) return;
    if (invalid) form.current?.querySelector<HTMLElement>(`[name="${invalid}"]`)?.focus();
    else alert.current?.focus();
  }, [error, invalid, busy]);
  function edit(field: keyof typeof fields, value: string | boolean) {
    setFields((old) => ({ ...old, [field]: value })); setDirty(true); setError(""); setNotice(""); setInvalid(null);
  }
  async function send(command: Command) {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusy(true); setError(""); setNotice("");
    try {
      const result = await onChange(command);
      setReviewed({ date: command.date, configuration: result.configuration }); setPending(null); setConflict(false); setDirty(false);
      if (command.value) setFields({ isOpen: command.value.isOpen, start: command.value.start ?? "", end: command.value.end ?? "" });
      const warning = result.confirmedAppointments ? ` Hay ${result.confirmedAppointments} ${result.confirmedAppointments === 1 ? "cita confirmada que se conserva" : "citas confirmadas que se conservan"}.` : "";
      setNotice((result.outcome === "unchanged" ? "La configuración ya coincide." : result.outcome === "already_applied" ? "El intento ya estaba aplicado." : command.value ? "Fecha especial guardada." : "Se aplica de nuevo la semana habitual.") + warning);
      if (result.outcome === "changed") toast.success(command.value ? "Fecha especial guardada" : "Semana habitual restaurada");
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code === "SPECIAL_DATE_CONFLICT") { setConflict(true); setPending(null); setError("La fecha cambió en otra pestaña. Revisa la configuración actual antes de continuar; conservamos tus campos."); }
      else if (code) { setPending(null); setError(code === "UNAUTHENTICATED" ? "Tu sesión no está disponible. Recupera el acceso y reintenta." : code === "INVALID_TIME_ZONE" ? "La zona horaria del negocio no es válida." : "No pudimos guardar la fecha. Revisa los datos e inténtalo de nuevo."); }
      else { setPending(command); setError("No recibimos la confirmación. Comprueba el mismo intento para saber si quedó guardado."); }
    } finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || pending || stale || conflict || current === undefined) return;
    const parsed = specialDateSchema.safeParse({ date, ...fields });
    if (!parsed.success) { setInvalid(String(parsed.error.issues[0].path[0])); setError(parsed.error.issues[0].message); return; }
    void send({ date, value: { isOpen: parsed.data.isOpen, start: parsed.data.start, end: parsed.data.end }, expected: current ? { id: current._id, version: current.version } : null, operationId: crypto.randomUUID() });
  }
  return <form ref={form} onSubmit={submit} noValidate aria-label="Fecha especial" aria-busy={busy}>
    <fieldset disabled={blocked} className="space-y-5">
      <legend className="sr-only">Configuración para una fecha en {timeZone}</legend>
      <Field className="gap-2"><FieldLabel htmlFor={`${prefix}-date`}>Fecha</FieldLabel><Input id={`${prefix}-date`} name="date" type="date" min="0001-01-01" max="9999-12-31" value={date} disabled={blocked || !!initial} aria-invalid={invalid === "date"} aria-describedby={invalid === "date" ? `${prefix}-error` : undefined} onChange={(event) => { onDateChange(event.target.value); setDirty(true); setConflict(false); setError(""); setNotice(""); }} /></Field>
      <Field className="gap-2"><FieldLabel htmlFor={`${prefix}-state`}>Atención</FieldLabel><NativeSelect id={`${prefix}-state`} name="isOpen" value={fields.isOpen ? "open" : "closed"} className="w-full" onChange={(event) => edit("isOpen", event.target.value === "open")}><option value="closed">Cerrado todo el día</option><option value="open">Abierto</option></NativeSelect></Field>
      {fields.isOpen && <div className="grid grid-cols-2 gap-3">{(["start", "end"] as const).map((field) => <Field key={field} className="min-w-0 gap-2"><FieldLabel htmlFor={`${prefix}-${field}`}>{field === "start" ? "Apertura" : "Cierre"}</FieldLabel><Input id={`${prefix}-${field}`} name={field} type="time" step={60} value={fields[field]} className="w-full" aria-invalid={invalid === field} aria-describedby={invalid === field ? `${prefix}-error` : undefined} onChange={(event) => edit(field, event.target.value)} /></Field>)}</div>}
    </fieldset>
    {isLocalDate(date) && !source && <p role="status" className="mt-4 text-sm text-muted">Consultando la fecha…</p>}
    {!!source?.confirmedAppointments && !notice && <p className="mt-4 text-sm leading-6 text-muted">Esta fecha tiene {source.confirmedAppointments} {source.confirmedAppointments === 1 ? "cita confirmada" : "citas confirmadas"}. Los cambios no las modifican.</p>}
    {(stale || conflict) && <div className="mt-4 space-y-3 text-sm leading-6"><p role="status">Configuración actual: {source?.configuration?.active ? source.configuration.isOpen ? `${source.configuration.start}–${source.configuration.end}` : "Cerrado todo el día" : "Semana habitual"}.</p><Button variant="outline" disabled={blocked || !source} onClick={() => { if (source) { setReviewed({ date, configuration: source.configuration }); setConflict(false); setError(""); } }}>Revisar configuración actual</Button></div>}
    {error && <p ref={alert} id={`${prefix}-error`} role="alert" tabIndex={-1} className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm leading-6">{notice}</p>}
    <div className="mt-6 flex flex-wrap gap-3">
      {pending ? <Button type="button" disabled={busy} onClick={() => void send(pending)}>{busy ? "Comprobando…" : "Comprobar intento anterior"}</Button> : <Button type="submit" disabled={busy || current === undefined || stale || conflict}>{busy ? "Guardando…" : "Guardar fecha"}</Button>}
      {current?.active && !pending && <Button type="button" variant="outline" disabled={busy || stale || conflict} onClick={() => void send({ date, value: null, expected: { id: current._id, version: current.version }, operationId: crypto.randomUUID() })}>Eliminar excepción</Button>}
    </div>
  </form>;
}
