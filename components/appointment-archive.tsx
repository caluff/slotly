"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionArgs } from "convex/server";
import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ArchiveRestore, Trash2 } from "@/components/ui/icons";

type Command = FunctionArgs<typeof api.appointmentArchive.setMyCalendarArchive>;
type Row = { _id: Id<"appointments">; clientName: string; status: string; version: number; calendarArchivedAt?: number; calendarArchiveVersion?: number };
type Ticket = { appointmentId: Id<"appointments">; expectedVersion: number; archiveVersion: number; archived: boolean };
const ArchiveContext = createContext<{ blocked: boolean; change: (row: Row, archived: boolean) => Promise<boolean> } | null>(null);
export function AppointmentArchiveProvider({ change, children }: { change: (row: Row, archived: boolean) => Promise<boolean>; children: ReactNode }) { return <ArchiveContext.Provider value={{ blocked: false, change }}>{children}</ArchiveContext.Provider>; }

// Only IDs, revisions and the frozen operation are kept in tab storage. A
// reload offers recovery; it never submits a mutation automatically.
export function AppointmentArchiveWorkspace({ storageKey, children }: { storageKey: string; children: ReactNode }) {
  const mutate = useMutation(api.appointmentArchive.setMyCalendarArchive), lock = useRef(false), attempt = useRef<Command | null>(null);
  const [blocked, setBlocked] = useState(false), journal = `slotly:appointment-archive:${storageKey}`, toastId = `appointment-archive:${storageKey}`;
  function persist(value: { command: Command } | { undo: Ticket } | null) {
    try { if (value) sessionStorage.setItem(journal, JSON.stringify(value)); else sessionStorage.removeItem(journal); } catch { /* The current tab still holds the exact command. */ }
  }
  function success(ticket: Ticket) {
    toast.success(ticket.archived ? "Cita archivada" : "Cita restaurada en el calendario", { id: toastId, duration: 10000,
      action: createElement(Button, { type: "button", onClick: () => { void send({ appointmentId: ticket.appointmentId, expectedVersion: ticket.expectedVersion, expectedArchiveVersion: ticket.archiveVersion, operationId: crypto.randomUUID(), archived: !ticket.archived }); } }, "Deshacer") });
  }
  function uncertain() {
    toast.error("No recibimos la respuesta del archivo. Comprueba el mismo intento.", { id: toastId, duration: Infinity, dismissible: false,
      action: createElement(Button, { type: "button", onClick: () => { if (attempt.current) void send(attempt.current); } }, "Comprobar") });
  }
  async function send(command: Command) {
    if (lock.current) return false;
    lock.current = true; attempt.current = command; setBlocked(true); persist({ command });
    try {
      const result = await mutate(command);
      attempt.current = null; setBlocked(false);
      if (result.outcome !== "unchanged") {
        const ticket = { appointmentId: command.appointmentId, expectedVersion: command.expectedVersion, archiveVersion: result.archiveVersion, archived: result.archived };
        persist({ undo: ticket }); success(ticket);
      } else { persist(null); toast.info(result.archived ? "La cita ya estaba archivada" : "La cita ya estaba visible", { id: toastId }); }
      return true;
    } catch (cause) {
      if (cause instanceof ConvexError) {
        attempt.current = null; setBlocked(false); persist(null);
        toast.error(cause.data?.code === "APPOINTMENT_NOT_CANCELLED" ? "Solo puedes archivar citas canceladas." : "La cita cambió o ya no está disponible. Revisa su estado antes de reintentar.", { id: toastId });
      } else uncertain();
      return false;
    } finally { lock.current = false; }
  }
  useEffect(() => {
    let stored; try { stored = JSON.parse(sessionStorage.getItem(journal) ?? "null"); } catch { return; }
    if (!stored) return;
    const frame = requestAnimationFrame(() => {
      const command = stored.command, ticket = stored.undo;
      if (command && typeof command.appointmentId === "string" && Number.isSafeInteger(command.expectedVersion) && Number.isSafeInteger(command.expectedArchiveVersion) && typeof command.operationId === "string" && typeof command.archived === "boolean") { attempt.current = command; setBlocked(true); uncertain(); }
      else if (ticket && typeof ticket.appointmentId === "string" && Number.isSafeInteger(ticket.expectedVersion) && Number.isSafeInteger(ticket.archiveVersion) && typeof ticket.archived === "boolean") success(ticket);
    });
    return () => cancelAnimationFrame(frame);
    // The journal is owned by the keyed business workspace; callbacks read the
    // same mutation/ref and must not reopen a toast after every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal]);
  return <ArchiveContext.Provider value={{ blocked, change: (row, archived) => {
    if (blocked) return Promise.resolve(false);
    return send({ appointmentId: row._id, expectedVersion: row.version, expectedArchiveVersion: row.calendarArchiveVersion ?? 0, operationId: crypto.randomUUID(), archived });
  } }}>{children}</ArchiveContext.Provider>;
}

export function AppointmentArchiveButton({ appointment, className, onChanged }: { appointment: Row; className?: string; onChanged?: () => void }) {
  const archive = useContext(ArchiveContext);
  if (appointment.status !== "cancelled" || !archive) return null;
  const archived = appointment.calendarArchivedAt !== undefined, label = archived ? "Restaurar cita en el calendario" : "Archivar cita cancelada";
  const Icon = archived ? ArchiveRestore : Trash2;
  return <Button type="button" size="icon" variant="ghost" className={className} disabled={archive.blocked} aria-label={`${label} de ${appointment.clientName}`} title={label}
    onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}
    onClick={event => { event.stopPropagation(); void archive.change(appointment, !archived).then(changed => { if (changed) onChanged?.(); }); }}><Icon aria-hidden="true" /></Button>;
}
