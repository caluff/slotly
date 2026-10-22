"use client";

import { createElement, useId, useRef, useState } from "react";
import { ConvexError } from "convex/values";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export type ServiceUndoTicket = NonNullable<FunctionReturnType<typeof api.services.getMyServiceUndo>>;
export type ServiceCreation = { id: Id<"services">; undo: ServiceUndoTicket | null };
type Command = FunctionArgs<typeof api.services.undoMyService>;
export type UndoService = (command: Command) => Promise<FunctionReturnType<typeof api.services.undoMyService>>;

// The panel owns this hook, outside either form. Closing/unmounting a form must
// not destroy the exact confirmed operation or an uncertain undo command.
export function useServiceUndo(onUndo: UndoService) {
  const id = useId();
  const lock = useRef(false), attempt = useRef<Command | null>(null);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  async function undo(ticket: ServiceUndoTicket) {
    if (lock.current) return;
    const command = attempt.current ?? { id: ticket.id, expectedVersion: ticket.version, targetOperationId: ticket.operationId, operationId: crypto.randomUUID() };
    attempt.current = command; lock.current = true; setBusy(true);
    toast.loading("Deshaciendo servicio…", { id, duration: Infinity, action: undefined, dismissible: false });
    try {
      const result = await onUndo(command);
      attempt.current = null; setUncertain(false);
      toast.success(result.outcome === "already_applied" ? "El cambio ya se había deshecho." : "Cambio deshecho.", { id, duration: 5000, dismissible: true, action: undefined });
    } catch (cause) {
      const code = cause instanceof ConvexError ? cause.data?.code : undefined;
      if (code) {
        attempt.current = null; setUncertain(false);
        toast.error(code === "SERVICE_CONFLICT" ? "El servicio cambió después. No se deshizo el cambio." : "No pudimos deshacer el cambio. Comprueba tu sesión.", { id, duration: 10000, dismissible: true, action: undefined });
      } else {
        setUncertain(true);
        toast.error("No recibimos la respuesta de Deshacer.", { id, duration: Infinity, dismissible: false,
          action: createElement(Button, { type: "button", onClick: () => { void undo(ticket); } }, "Comprobar") });
      }
    } finally {
      lock.current = false; setBusy(false);
      if (!attempt.current) requestAnimationFrame(() => {
        const trigger = document.getElementById("new-service-trigger") as HTMLButtonElement | null;
        if (trigger && !trigger.hidden && !trigger.disabled && trigger.getClientRects().length) trigger.focus();
      });
    }
  }
  function announce(message: string, ticket: ServiceUndoTicket | null) {
    // One replaceable notification for service saves/undo; no stacked duplicates.
    toast.success(message, { id, duration: ticket ? 10000 : 5000, dismissible: true,
      action: ticket ? createElement(Button, { type: "button", onClick: () => { void undo(ticket); } }, "Deshacer") : undefined });
  }
  return { busy, uncertain, announce };
}
