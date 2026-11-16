"use client";

import { Dialog, DialogBackdrop, DialogContent, DialogDescription, DialogTitle } from "@ui-sdk/react/dialog";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle } from "@ui-sdk/react/popover";
import { X } from "@/components/ui/icons";
import { useMemo, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";

export type CreateContext = { element: HTMLElement; x?: number; y?: number };
function subscribe(notify: () => void) { const m = window.matchMedia("(max-width: 639px)"); m.addEventListener("change", notify); return () => m.removeEventListener("change", notify); }
const readMobile = () => window.matchMedia("(max-width: 639px)").matches;

export function AppointmentEditor({ open, context, trigger, busy, saving, dirty, created, onClose, children, title = "Nueva cita", description = "Elige cliente, servicio, fecha y horario disponible. El borrador se conserva al cerrar.", initialFocusId = "appointment-client" }: {
  open: boolean; context: CreateContext | null; trigger: RefObject<HTMLButtonElement | null>; busy: RefObject<boolean>;
  saving: boolean; dirty: boolean; created: boolean; onClose: () => void; children: ReactNode;
  title?: string; description?: string; initialFocusId?: string;
}) {
  const mobile = useSyncExternalStore(subscribe, readMobile, () => false);
  const anchor = useMemo(() => ({
    getBoundingClientRect: () => {
      const element = context?.element.isConnected ? context.element : trigger.current;
      const rect = element?.getBoundingClientRect();
      if (!rect) return new DOMRect(16, 16, 1, 1);
      return context?.x !== undefined && context.y !== undefined && context.element.isConnected ? new DOMRect(context.x, context.y, 1, 1) : rect;
    },
  }), [context, trigger]);
  function returnFocus() {
    const target = context?.element.isConnected && context.element.matches("button,[tabindex]") ? context.element : trigger.current;
    requestAnimationFrame(() => (target ?? document.querySelector<HTMLElement>(".agenda-toolbar button"))?.focus());
  }
  const initialFocus = () => document.getElementById(initialFocusId);
  const close = () => {
    if (busy.current) return;
    onClose();
    returnFocus();
  };
  function changeOpen(value: boolean, details: { reason: string; cancel: () => void }) {
    if (value) return;
    if (busy.current || (dirty && details.reason === "outside-press")) details.cancel();
    else close();
  }
  const footer = <div className="mt-4 flex justify-end"><Button type="button" variant="outline" disabled={saving} onClick={close}>{created ? "Cerrar" : "Cancelar"}</Button></div>;
  const body = <>{children}{footer}</>;
  if (mobile) return <Dialog open={open} onOpenChange={changeOpen}><DialogBackdrop className="fixed inset-0 z-50 bg-foreground/30" />
    <DialogContent initialFocus={initialFocus} finalFocus="none" className="appointment-editor appointment-editor-particles fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-3"><DialogTitle className="text-lg font-semibold">{title}</DialogTitle><Button size="icon" variant="ghost" aria-label={`Cerrar ${title.toLowerCase()}`} disabled={saving} onClick={close}><X aria-hidden="true" /></Button></div>
      <DialogDescription className="sr-only">{description}</DialogDescription>{body}
    </DialogContent></Dialog>;
  return <Popover open={open} modal onOpenChange={changeOpen}>
    <PopoverContent anchor={anchor} initialFocus={initialFocus} finalFocus="none" side="right" align="start" sideOffset={12} collisionPadding={16}
      className="appointment-editor appointment-editor-particles z-50 max-h-[min(calc(100dvh-2rem),var(--available-height))] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-line bg-background p-5 text-foreground">
      <div className="mb-4 flex items-center justify-between gap-3"><PopoverTitle className="text-lg font-semibold">{title}</PopoverTitle><Button size="icon" variant="ghost" aria-label={`Cerrar ${title.toLowerCase()}`} disabled={saving} onClick={close}><X aria-hidden="true" /></Button></div>
      <PopoverDescription className="sr-only">{description}</PopoverDescription>{body}
    </PopoverContent>
  </Popover>;
}
