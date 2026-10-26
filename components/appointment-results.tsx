"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConvexError } from "convex/values";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  appointmentStatusLabels,
  type AppointmentResult,
} from "@/lib/appointment-status";

type MarkCommand = FunctionArgs<
  typeof api.appointments.markMyAppointmentResult
>;
type UndoCommand = FunctionArgs<
  typeof api.appointments.undoMyAppointmentResult
>;
type WindowCommand = FunctionArgs<typeof api.appointments.arriveMyAppointment>;
type MarkResponse = FunctionReturnType<
  typeof api.appointments.markMyAppointmentResult
>;
export type ResultAppointment = MarkResponse["appointment"];
export type ResultTicket = NonNullable<MarkResponse["undo"]>;
type Command =
  | { kind: "mark"; args: MarkCommand }
  | { kind: "undo"; args: UndoCommand }
  | { kind: "arrival" | "cancel"; args: WindowCommand };
const ResultsContext = createContext<{
  blocked: boolean;
  mark: (
    appointment: ResultAppointment,
    result: AppointmentResult,
  ) => Promise<boolean>;
  arrive: (appointment: ResultAppointment) => Promise<boolean>;
  cancelWindow: (appointment: ResultAppointment) => Promise<boolean>;
  undo: (ticket: ResultTicket) => Promise<void>;
} | null>(null);
export const useAppointmentResults = () => useContext(ResultsContext);

// Commands and undo tickets contain IDs/revisions only; no clients, tokens or
// private snapshots. A reload never silently submits an uncertain command.
export function AppointmentResultsWorkspace({
  onMark,
  onUndo,
  onArrive,
  onCancelWindow,
  storageKey,
  children,
}: {
  onMark: (command: MarkCommand) => Promise<MarkResponse>;
  onUndo: (
    command: UndoCommand,
  ) => Promise<
    FunctionReturnType<typeof api.appointments.undoMyAppointmentResult>
  >;
  onArrive?: (command: WindowCommand) => Promise<MarkResponse>;
  onCancelWindow?: (command: WindowCommand) => Promise<MarkResponse>;
  storageKey?: string;
  children: ReactNode;
}) {
  const toastId = useId(),
    lock = useRef(false),
    attempt = useRef<Command | null>(null);
  const [blocked, setBlocked] = useState(false);
  const journal = storageKey ? "slotly:result:" + storageKey : null;
  function persist(
    value: { command: Command } | { ticket: ResultTicket } | null,
  ) {
    if (!journal) return;
    try {
      if (value) sessionStorage.setItem(journal, JSON.stringify(value));
      else sessionStorage.removeItem(journal);
    } catch {
      /* Private/disabled storage: current tab still retains the exact attempt. */
    }
  }
  function undoToast(ticket: ResultTicket, message: string) {
    toast.success(message, {
      id: toastId,
      duration: 10000,
      dismissible: true,
      action: createElement(
        Button,
        {
          type: "button",
          onClick: () => {
            void undo(ticket);
          },
        },
        "Deshacer",
      ),
    });
  }
  function uncertainToast() {
    toast.error("No recibimos la respuesta. Comprueba el mismo intento.", {
      id: toastId,
      duration: Infinity,
      dismissible: false,
      action: createElement(
        Button,
        {
          type: "button",
          onClick: () => {
            if (attempt.current) void send(attempt.current);
          },
        },
        "Comprobar",
      ),
    });
  }
  useEffect(() => {
    if (!journal) return;
    let value;
    try {
      value = JSON.parse(sessionStorage.getItem(journal) ?? "null");
    } catch {
      return;
    }
    if (!value) return;
    queueMicrotask(() => {
      const command = value.command;
      if (
        command &&
        ["mark", "undo", "arrival", "cancel"].includes(command.kind) &&
        command.args &&
        typeof command.args.appointmentId === "string" &&
        Number.isSafeInteger(command.args.expectedVersion) &&
        typeof command.args.operationId === "string"
      ) {
        attempt.current = command;
        setBlocked(true);
        uncertainToast();
      } else if (
        value.ticket &&
        typeof value.ticket.appointmentId === "string" &&
        Number.isSafeInteger(value.ticket.version) &&
        typeof value.ticket.operationId === "string"
      ) {
        undoToast(value.ticket, "Último resultado guardado.");
      }
    });
    // The workspace is keyed by business; restore once per owner, outside readers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal]);
  function focusFallback() {
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body)
        document
          .querySelector<HTMLElement>(".agenda-toolbar button,#search-client")
          ?.focus();
    });
  }
  async function send(command: Command): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    attempt.current = command;
    persist({ command });
    setBlocked(true);
    toast.loading(
      command.kind === "undo" ? "Deshaciendo resultado…" : "Guardando cita…",
      {
        id: toastId,
        duration: Infinity,
        dismissible: false,
        action: undefined,
      },
    );
    try {
      if (command.kind === "undo") {
        await onUndo(command.args);
        persist(null);
        toast.success("Resultado deshecho. Cita confirmada.", {
          id: toastId,
          duration: 5000,
          dismissible: true,
          action: undefined,
        });
      } else {
        const result =
          command.kind === "mark"
            ? await onMark(command.args)
            : command.kind === "arrival" && onArrive
              ? await onArrive(command.args)
              : command.kind === "cancel" && onCancelWindow
                ? await onCancelWindow(command.args)
                : null;
        if (!result) throw new ConvexError({ code: "UNAVAILABLE" });
        const message =
          result.outcome === "unchanged"
            ? "La cita ya tiene ese resultado."
            : "Cita: " +
              appointmentStatusLabels[result.appointment.status] +
              ".";
        if (result.undo) {
          persist({ ticket: result.undo });
          undoToast(result.undo, message);
        } else {
          persist(null);
          toast.success(message, {
            id: toastId,
            duration: 5000,
            dismissible: true,
            action: undefined,
          });
        }
      }
      attempt.current = null;
      return true;
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code) {
        attempt.current = null;
        persist(null);
        const message =
          code === "APPOINTMENT_CONFLICT"
            ? "La cita cambió después. No se sobrescribió el cambio."
            : code === "APPOINTMENT_NOT_ENDED"
              ? "Espera a que termine la cita para marcar su resultado."
              : code === "ARRIVAL_WINDOW_CLOSED"
                ? "Terminó la ventana para registrar la llegada."
                : code === "APPOINTMENT_NOT_CONFIRMED"
                  ? "Esta cita ya no está confirmada. Revisa su estado."
                  : "No pudimos guardar el resultado. Comprueba tu acceso a la cita.";
        toast.error(message, {
          id: toastId,
          duration: 10000,
          dismissible: true,
          action: undefined,
        });
      } else uncertainToast();
      return false;
    } finally {
      lock.current = false;
      setBlocked(!!attempt.current);
      focusFallback();
    }
  }
  async function undo(ticket: ResultTicket) {
    if (lock.current || attempt.current) return;
    await send({
      kind: "undo",
      args: {
        appointmentId: ticket.appointmentId,
        expectedVersion: ticket.version,
        targetOperationId: ticket.operationId,
        operationId: crypto.randomUUID(),
      },
    });
  }
  async function mark(
    appointment: ResultAppointment,
    result: AppointmentResult,
  ) {
    if (lock.current || attempt.current) return false;
    return await send({
      kind: "mark",
      args: {
        appointmentId: appointment._id,
        expectedVersion: appointment.version,
        result,
        operationId: crypto.randomUUID(),
      },
    });
  }
  async function windowCommand(
    kind: "arrival" | "cancel",
    appointment: ResultAppointment,
  ) {
    if (lock.current || attempt.current) return false;
    return await send({
      kind,
      args: {
        appointmentId: appointment._id,
        expectedVersion: appointment.version,
        operationId: crypto.randomUUID(),
      },
    });
  }
  return (
    <ResultsContext.Provider
      value={{
        blocked,
        mark,
        undo,
        arrive: (appointment) => windowCommand("arrival", appointment),
        cancelWindow: (appointment) => windowCommand("cancel", appointment),
      }}
    >
      {children}
    </ResultsContext.Provider>
  );
}
