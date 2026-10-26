"use client";

import { useAction, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { X } from "@/components/ui/icons";
import { PublicManagementLink } from "@/components/public-management-link";
import { PublicReschedule } from "@/components/public-reschedule";
import { isManagementSecret, managementSecretHash, MANAGEMENT_PATH, MANAGEMENT_SESSION_KEY } from "@/lib/public-management";
import { moveJournalKey, savedMoveIntent, type MoveIntent } from "@/lib/public-rescheduling";

type View = NonNullable<FunctionReturnType<typeof api.publicManagement.get>>;
type Command = { operationId: string; revision: string };
const labels = { confirmed: "Confirmada", cancelled: "Cancelada", completed: "Completada", no_show: "No asistió" };
function savedCommand(value: unknown): Command | null {
  if (!value || typeof value !== "object" || !("operationId" in value) || !("revision" in value)
    || typeof value.operationId !== "string" || typeof value.revision !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.operationId) || !/^[a-f0-9]{64}$/.test(value.revision)) return null;
  return { operationId: value.operationId, revision: value.revision };
}
function Context({ view }: { view: View }) {
  const time = new Intl.DateTimeFormat("es-UY", { timeZone: view.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return <dl className="my-6 space-y-4 text-sm">
    <div><dt className="text-muted">Negocio</dt><dd className="mt-1 font-semibold wrap-anywhere">{view.businessName}</dd></div>
    <div><dt className="text-muted">Servicio</dt><dd className="mt-1 wrap-anywhere">{view.serviceName}</dd></div>
    <div><dt className="text-muted">Fecha y horario</dt><dd className="mt-1">{new Intl.DateTimeFormat("es-UY", { dateStyle: "full", timeZone: view.timeZone }).format(view.start)}<br />{time.format(view.start)}–{time.format(view.end)}<br /><span className="text-muted wrap-anywhere">{view.timeZone}</span></dd></div>
    <div><dt className="text-muted">Estado</dt><dd role="status" className="mt-1 font-semibold">{labels[view.state]}</dd></div>
  </dl>;
}

export function PublicManagement() {
  const read = useAction(api.publicManagement.get), cancel = useMutation(api.publicManagement.cancel);
  const [secret, setSecret] = useState<string | null>(null), [journal, setJournal] = useState("");
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [view, setView] = useState<View | null>(null), [pending, setPending] = useState<Command | null>(null);
  const [movePending, setMovePending] = useState<MoveIntent | null>(null), [moveOpen, setMoveOpen] = useState(false);
  const [reviewed, setReviewed] = useState<View | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  const lock = useRef(false), sequence = useRef(0), activeJournal = useRef("");
  const heading = useRef<HTMLHeadingElement>(null), alert = useRef<HTMLParagraphElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (error && !busy && !reviewed) alert.current?.focus(); }, [error, busy, reviewed, phase]);
  function clearCommand(key: string) { try { sessionStorage.removeItem(key); } catch { /* A retained exact command can be replayed safely after reload. */ } }
  useEffect(() => {
    let alive = true, transportSequence = 0;
    async function restore() {
      const current = ++transportSequence; sequence.current++; activeJournal.current = "";
      setPhase("loading"); setView(null); setReviewed(null); setSecret(null); setError(""); setPending(null); setMovePending(null); setMoveOpen(false);
      try {
        const fragment = window.location.hash.slice(1);
        // Keep the capability out of subsequent URL observations/referrers. A
        // route-scoped per-tab value, not a cookie/login token, restores reloads.
        if (fragment || window.location.search) window.history.replaceState(null, "", MANAGEMENT_PATH);
        const value = fragment || sessionStorage.getItem(MANAGEMENT_SESSION_KEY);
        if (!isManagementSecret(value)) { if (fragment) sessionStorage.removeItem(MANAGEMENT_SESSION_KEY); if (alive && current === transportSequence) setPhase("unavailable"); return; }
        sessionStorage.setItem(MANAGEMENT_SESSION_KEY, value);
        const key = `slotly:public-cancel:${await managementSecretHash(value)}`;
        const stored = sessionStorage.getItem(key);
        const command = stored && stored.length <= 1000 ? savedCommand(JSON.parse(stored)) : null;
        const storedMove = sessionStorage.getItem(moveJournalKey(key));
        const moveIntent = storedMove && storedMove.length <= 10_000 ? savedMoveIntent(JSON.parse(storedMove)) : null;
        // Preserve unknown/corrupted journals instead of offering a new intent.
        if ((stored && !command) || (storedMove && !moveIntent)) throw new Error("Cannot safely restore pending command");
        if (!alive || current !== transportSequence) return;
        activeJournal.current = key; setJournal(key); setPending(command); setMovePending(moveIntent); setSecret(value);
        if (command && !moveIntent) setError("Hay una cancelación sin respuesta. Reintenta el mismo intento para comprobarla.");
      } catch {
        if (alive && current === transportSequence) { setPhase("error"); setError("No podemos recuperar este enlace de forma segura. Habilita el almacenamiento de la pestaña y vuelve a abrir el enlace privado."); }
      }
    }
    const frame = requestAnimationFrame(() => { void restore(); });
    const changed = () => { void restore(); };
    window.addEventListener("hashchange", changed);
    return () => { alive = false; transportSequence++; cancelAnimationFrame(frame); window.removeEventListener("hashchange", changed); };
  }, []);
  useEffect(() => {
    if (!secret) return;
    let alive = true;
    async function load() {
      if (lock.current) return;
      const ticket = ++sequence.current;
      try {
        const next = await read({ secret: secret! });
        if (!alive || ticket !== sequence.current) return;
        setView(next); setPhase(next ? "ready" : "unavailable");
      } catch { if (alive && ticket === sequence.current) { setPhase("error"); setError("No pudimos consultar la cita. Comprueba la conexión y reintenta."); } }
    }
    void load(); const interval = window.setInterval(load, 30_000); window.addEventListener("focus", load);
    return () => { alive = false; clearInterval(interval); window.removeEventListener("focus", load); };
  }, [read, secret, refresh]);
  async function perform(command: Command, replay: boolean) {
    if (lock.current || movePending || moveOpen || !secret || !journal) return;
    try { sessionStorage.setItem(journal, JSON.stringify(command)); }
    catch { setError("No podemos guardar la cancelación para recuperarla al recargar. Habilita el almacenamiento antes de confirmar."); setReviewed(null); return; }
    lock.current = true; sequence.current++; setBusy(true); setPending(command); setError("");
    const scope = journal;
    try {
      const result = await cancel({ secret, ...command });
      if (activeJournal.current !== scope) return;
      if (result.ok) {
        setView(result.view); setPhase("ready"); setPending(null); clearCommand(scope);
        if (!replay && result.outcome === "cancelled") toast.success("Cita cancelada.");
      } else if (result.code === "RATE_LIMITED") setError(`Demasiados intentos. Reintenta en ${Math.max(1, Math.ceil((result.retryAfter ?? 3000) / 1000))} segundos.`);
      else {
        setPending(null); clearCommand(scope);
        if (result.code === "INVALID_ACCESS") { setView(null); setPhase("unavailable"); }
        else { setView(null); setPhase("loading"); setError(result.code === "CONTEXT_CHANGED" ? "La cita cambió. Revisa los datos actuales antes de decidir de nuevo." : "Esta cita ya no se puede cancelar desde el enlace."); setRefresh(value => value + 1); }
      }
    } catch { if (activeJournal.current === scope) setError("No recibimos la respuesta. Reintenta la misma cancelación para comprobarla sin duplicarla."); }
    finally { lock.current = false; setBusy(false); if (activeJournal.current === scope) setReviewed(null); }
  }
  const stale = !!reviewed && view?.revision !== reviewed.revision;
  if (phase === "loading") return <p role="status" className="text-muted">Cargando tu cita…</p>;
  if (phase === "unavailable") return <section><h1 ref={heading} tabIndex={-1} className="workspace-title">Enlace no disponible</h1><p role="status" className="mt-4 text-muted">Comprueba el enlace privado o contacta con el negocio.</p></section>;
  return <section>
    <h1 ref={heading} tabIndex={-1} className="workspace-title">Tu cita</h1>
    {view && <Context view={view} />}
    {error && <p ref={alert} role="alert" tabIndex={-1} className="my-5 text-sm leading-6 text-destructive">{error}</p>}
    {phase === "error" && secret && <Button variant="outline" onClick={() => { setPhase("loading"); setError(""); setRefresh(value => value + 1); }}>Reintentar consulta</Button>}
    {phase === "ready" && view && <>
      <div className="flex flex-wrap gap-3">
        {secret && (!pending || !!movePending) && <PublicReschedule key={journal} secret={secret} view={view} journal={journal} pending={movePending} open={moveOpen}
          blocked={busy || !!reviewed} onOpen={setMoveOpen} onPending={setMovePending}
          onFlight={active => { lock.current = active; if (active) { sequence.current++; setError(""); } setBusy(active); }}
          onView={next => { if (activeJournal.current === journal) { setView(next); setPhase("ready"); } }}
          onContextError={(code, message) => { if (activeJournal.current !== journal) return; setView(null); setMoveOpen(false);
            if (code === "INVALID_ACCESS") setPhase("unavailable"); else { setPhase("loading"); setError(message); setRefresh(v => v + 1); } }}
          onReturnFocus={() => (alert.current ?? heading.current)?.focus()} />}
        {!movePending && (pending ? <Button disabled={busy} onClick={() => void perform(pending, true)}>{busy ? "Comprobando…" : "Reintentar cancelación"}</Button>
          : view.canCancel ? <Button ref={trigger} variant="outline" className="text-destructive" disabled={busy || moveOpen} onClick={() => { setError(""); setReviewed(view); }}>Cancelar cita</Button> : <p className="text-sm text-muted">Esta cita ya no admite cambios desde el enlace.</p>)}
      </div>
      <PublicManagementLink secret={secret ?? undefined} showOpen={false} />
    </>}
    <Dialog.Root open={!!reviewed} onOpenChange={open => { if (!open && !lock.current) setReviewed(null); }}><Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
      <Dialog.Content className="appointment-editor fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-5 text-foreground sm:p-6"
        onEscapeKeyDown={event => { if (lock.current) event.preventDefault(); }} onInteractOutside={event => { if (lock.current) event.preventDefault(); }}
        onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => (error ? alert.current : trigger.current ?? heading.current)?.focus()); }}>
        <div className="flex items-start justify-between gap-3"><Dialog.Title className="text-lg font-semibold">Cancelar cita</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Cerrar confirmación" disabled={busy}><X aria-hidden="true" /></Button></Dialog.Close></div>
        <Dialog.Description className="mt-3 text-sm leading-6 text-muted">La cita se cancelará y su horario quedará libre.</Dialog.Description>
        {reviewed && <Context view={reviewed} />}
        {stale && <p role="alert" className="text-sm text-destructive">La cita cambió. Cierra esta confirmación y revisa los datos actuales.</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><Dialog.Close asChild><Button variant="outline" disabled={busy} className="w-full sm:w-auto">Volver</Button></Dialog.Close>
          <Button variant="destructive" disabled={busy || stale} className="w-full sm:w-auto" onClick={() => { if (reviewed) void perform({ operationId: crypto.randomUUID(), revision: reviewed.revision }, false); }}>{busy ? "Cancelando…" : "Confirmar cancelación"}</Button></div>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </section>;
}
