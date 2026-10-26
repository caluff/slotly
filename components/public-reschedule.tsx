"use client";

import { useAction, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { X } from "@/components/ui/icons";
import { isLocalDate } from "@/lib/local-date";
import { moveJournalKey, type MoveIntent, type MoveOrigin } from "@/lib/public-rescheduling";

type View = NonNullable<FunctionReturnType<typeof api.publicManagement.get>>;
type Options = Extract<FunctionReturnType<typeof api.publicRescheduling.getOptions>, { ok: true }>;
type Slot = Options["slots"][number];
function Interval({ start, end, zone }: { start: number; end: number; zone: string }) {
  const time = new Intl.DateTimeFormat("es-UY", { timeZone: zone, timeStyle: "short" });
  return <>{new Intl.DateTimeFormat("es-UY", { timeZone: zone, dateStyle: "full" }).format(start)}<br />{time.format(start)}–{time.format(end)}</>;
}
function Comparison({ origin, start }: { origin: MoveOrigin; start: number }) {
  return <div className="my-5 text-sm">
    <p className="font-medium wrap-anywhere">{origin.serviceName}</p>
    <dl className="mt-4 space-y-4"><div><dt className="text-muted">Horario de origen revisado</dt><dd className="mt-1"><Interval start={origin.start} end={origin.end} zone={origin.timeZone} /></dd></div>
      <div><dt className="text-muted">Nuevo horario elegido</dt><dd className="mt-1"><Interval start={start} end={start + origin.end - origin.start} zone={origin.timeZone} /></dd></div></dl>
    <p className="mt-3 text-muted wrap-anywhere">{origin.timeZone}</p>
  </div>;
}

export function PublicReschedule({ secret, view, journal, pending, blocked, open, onOpen, onPending, onFlight, onView, onContextError, onReturnFocus }: {
  secret: string; view: View; journal: string; pending: MoveIntent | null; blocked: boolean; open: boolean;
  onOpen: (open: boolean) => void; onPending: (intent: MoveIntent | null) => void; onFlight: (busy: boolean) => void;
  onView: (view: View) => void; onContextError: (code: string, message: string) => void; onReturnFocus: () => void;
}) {
  const getOptions = useAction(api.publicRescheduling.getOptions), reschedule = useMutation(api.publicRescheduling.reschedule);
  const [origin, setOrigin] = useState<MoveOrigin | null>(null), [date, setDate] = useState(""), [selected, setSelected] = useState("");
  const [options, setOptions] = useState<Options | null>(null), [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reviewed, setReviewed] = useState<Slot | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const lock = useRef(false), alive = useRef(true), sequence = useRef(0), trigger = useRef<HTMLButtonElement>(null), alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (error && !busy) alert.current?.focus(); }, [error, busy, open]);
  const stale = !!origin && (origin.revision !== view.revision || !view.canCancel);
  useEffect(() => {
    if (!open || !origin || stale || !isLocalDate(date)) return;
    let active = true;
    async function load() {
      if (lock.current) return;
      const request = ++sequence.current;
      try {
        const result = await getOptions({ secret, revision: origin!.revision, date });
        if (!active || request !== sequence.current) return;
        if (result.ok) { setOptions(result); setStatus("ready"); }
        else { setOptions(null); setStatus("error"); setError(result.code === "CONTEXT_CHANGED" ? "La cita cambió. Cierra y revisa sus datos actuales." : result.code === "INVALID_ACCESS" ? "El enlace ya no está disponible. Cierra y vuelve a consultarlo." : "No pudimos obtener horarios para esa fecha. Revisa la cita y reintenta."); }
      } catch { if (active && request === sequence.current) { setStatus("error"); setError("No pudimos cargar los horarios. Comprueba la conexión y reintenta."); } }
    }
    void load(); const interval = window.setInterval(load, 30_000); window.addEventListener("focus", load);
    return () => { active = false; clearInterval(interval); window.removeEventListener("focus", load); };
  }, [getOptions, secret, open, origin, date, refresh, stale]);
  const ready = status === "ready" && options?.date === date && options.revision === origin?.revision;
  const slots = ready ? options.slots : [];
  const reviewedUnavailable = !!reviewed && (!ready || !slots.some(s => s.start === reviewed.start && s.end === reviewed.end));
  function begin() {
    if (blocked || lock.current || pending || !view.canCancel) return;
    setOrigin(view); setDate(view.date); setSelected(""); setOptions(null); setStatus("loading"); setReviewed(null); setError(""); onOpen(true);
  }
  async function perform(intent: MoveIntent, replay: boolean) {
    if (lock.current || blocked) return;
    try { sessionStorage.setItem(moveJournalKey(journal), JSON.stringify(intent)); }
    catch { setError("No podemos guardar el intento para recuperarlo al recargar. Habilita el almacenamiento antes de confirmar."); return; }
    lock.current = true; sequence.current++; setBusy(true); onFlight(true); onPending(intent); setError("");
    let close = true;
    try {
      const { operationId, revision, date, start } = intent;
      const result = await reschedule({ secret, operationId, revision, date, start });
      if (!alive.current) return;
      if (result.ok) {
        onView(result.view); onPending(null);
        try { sessionStorage.removeItem(moveJournalKey(journal)); } catch { /* An exact retained command remains safely replayable. */ }
        if (!replay && result.outcome === "rescheduled") toast.success("Cita reprogramada.");
        if (result.outcome === "unchanged") setError("La cita conserva el mismo horario.");
      } else if (result.code === "RATE_LIMITED") setError(`Demasiados intentos. Reintenta en ${Math.max(1, Math.ceil((result.retryAfter ?? 3000) / 1000))} segundos.`);
      else {
        onPending(null); try { sessionStorage.removeItem(moveJournalKey(journal)); } catch { /* Definitive rejection was received; any retained command is checked again. */ }
        if (["INVALID_ACCESS", "CONTEXT_CHANGED", "NOT_RESCHEDULABLE"].includes(result.code)) onContextError(result.code, result.code === "CONTEXT_CHANGED" ? "La cita cambió. Revisa los datos actuales antes de decidir de nuevo." : "Esta cita ya no se puede reprogramar desde el enlace.");
        else { close = replay; setReviewed(null); setSelected(""); setStatus("loading"); setRefresh(v => v + 1); setError(result.code === "SLOT_TAKEN" || result.code === "SLOT_UNAVAILABLE" ? "Ese horario ya no está disponible. Elige otro antes de revisar el cambio." : "No pudimos confirmar el cambio. Revisa la fecha y el horario."); }
      }
    } catch { if (alive.current) setError("No recibimos la respuesta. Reintenta la misma reprogramación para comprobarla sin volver a mover la cita."); }
    finally { lock.current = false; onFlight(false); if (alive.current) { setBusy(false); if (close) onOpen(false); } }
  }
  return <>
    {pending ? <div className="space-y-4"><p className="text-sm text-muted">Hay una reprogramación sin respuesta.</p><Comparison origin={pending.origin} start={pending.start} />
      <Button disabled={busy || blocked} onClick={() => void perform(pending, true)}>{busy ? "Comprobando…" : "Reintentar reprogramación"}</Button></div>
      : view.canCancel && <Button ref={trigger} variant="outline" disabled={busy || blocked} onClick={begin}>Reprogramar cita</Button>}
    {error && !open && <p ref={alert} tabIndex={-1} role="alert" className="mt-4 text-sm leading-6 text-destructive">{error}</p>}
    <Dialog.Root open={open} onOpenChange={next => { if (!lock.current) onOpen(next); }}><Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
      <Dialog.Content className="appointment-editor fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-5 text-foreground sm:p-6"
        onEscapeKeyDown={event => { if (lock.current) event.preventDefault(); }} onInteractOutside={event => { if (lock.current) event.preventDefault(); }}
        onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => { if (error && alert.current) alert.current.focus(); else if (trigger.current) trigger.current.focus(); else onReturnFocus(); }); }}>
        <div className="flex items-start justify-between gap-3"><Dialog.Title className="text-lg font-semibold">{reviewed ? "Confirmar reprogramación" : "Reprogramar cita"}</Dialog.Title>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Cerrar reprogramación" disabled={busy}><X aria-hidden="true" /></Button></Dialog.Close></div>
        <Dialog.Description className="sr-only">Elige y revisa un nuevo horario para la misma cita antes de confirmar.</Dialog.Description>
        {origin && (reviewed ? <Comparison origin={origin} start={reviewed.start} /> : <div className="my-5 text-sm"><p className="font-medium wrap-anywhere">{origin.serviceName}</p><p className="mt-2"><Interval start={origin.start} end={origin.end} zone={origin.timeZone} /></p><p className="mt-1 text-muted wrap-anywhere">{origin.timeZone}</p></div>)}
        {!reviewed && <div className="space-y-5"><div className="grid gap-2"><Label htmlFor="public-move-date">Nueva fecha</Label><Input id="public-move-date" type="date" value={date} disabled={busy || stale}
          onChange={event => { setDate(event.target.value); setSelected(""); setOptions(null); setStatus("loading"); setError(""); }} /></div>
          <div className="grid gap-2 [&>[data-slot=native-select-wrapper]]:w-full"><Label htmlFor="public-move-slot">Nuevo horario</Label><NativeSelect id="public-move-slot" className="w-full" value={selected} disabled={busy || stale || !ready}
            onChange={event => { setSelected(event.target.value); setError(""); }}><option value="">{!ready && isLocalDate(date) && status !== "error" ? "Cargando horarios…" : "Elige un horario"}</option>
            {slots.map(slot => <option key={slot.start} value={slot.start}>{slot.startTime} – {slot.endTime}</option>)}</NativeSelect></div>
          {ready && !slots.length && <p role="status" className="text-sm text-muted">No hay horarios disponibles para esta fecha.</p>}
          {ready && options?.omittedForTimeChange && <p className="text-sm text-muted">Algunos horarios se omiten por el cambio de hora.</p>}
          {status === "error" && !stale && <Button variant="outline" onClick={() => { setStatus("loading"); setError(""); setRefresh(v => v + 1); }}>Reintentar horarios</Button>}
        </div>}
        {stale && <p role="alert" className="mt-4 text-sm text-destructive">La cita cambió. Cierra y revisa sus datos actuales.</p>}
        {reviewedUnavailable && !stale && <p role="alert" className="mt-4 text-sm text-destructive">El horario cambió. Vuelve a elegir antes de confirmar.</p>}
        {error && <p ref={alert} role="alert" tabIndex={-1} className="mt-4 text-sm leading-6 text-destructive">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} className="w-full sm:w-auto" onClick={() => reviewed ? setReviewed(null) : onOpen(false)}>Volver</Button>
          {reviewed ? <Button disabled={busy || stale || reviewedUnavailable} className="w-full sm:w-auto" onClick={() => { if (origin) void perform({ operationId: crypto.randomUUID(), revision: origin.revision, date, start: reviewed.start, origin }, false); }}>{busy ? "Reprogramando…" : "Confirmar cambio"}</Button>
            : <Button disabled={busy || stale || !slots.some(s => String(s.start) === selected)} className="w-full sm:w-auto" onClick={() => { setError(""); setReviewed(slots.find(s => String(s.start) === selected) ?? null); }}>Revisar cambio</Button>}
        </div>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </>;
}
