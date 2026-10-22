"use client";

import { Dialog, Popover } from "radix-ui";
import { X } from "lucide-react";
import { useMemo, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";

export type CreateContext = { element: HTMLElement; x?: number; y?: number };
function subscribe(notify: () => void) { const m = window.matchMedia("(max-width: 639px)"); m.addEventListener("change", notify); return () => m.removeEventListener("change", notify); }
const readMobile = () => window.matchMedia("(max-width: 639px)").matches;

export function AppointmentEditor({ open, context, trigger, busy, saving, dirty, created, onClose, children }: {
  open: boolean; context: CreateContext | null; trigger: RefObject<HTMLButtonElement | null>; busy: RefObject<boolean>;
  saving: boolean; dirty: boolean; created: boolean; onClose: () => void; children: ReactNode;
}) {
  const mobile = useSyncExternalStore(subscribe, readMobile, () => false);
  const virtualRef = useMemo(() => {
    return { current: { getBoundingClientRect: () => {
      const element = context?.element.isConnected ? context.element : trigger.current;
      const rect = element?.getBoundingClientRect();
      if (!rect) return new DOMRect(16, 16, 1, 1);
      return context?.x !== undefined && context.y !== undefined && context.element.isConnected ? new DOMRect(context.x, context.y, 1, 1) : rect;
    } } };
  }, [context, trigger]);
  function returnFocus() {
    const target = context?.element.isConnected && context.element.matches("button,[tabindex]") ? context.element : trigger.current;
    requestAnimationFrame(() => target?.focus());
  }
  const handlers = {
    onOpenAutoFocus: (event: Event) => { event.preventDefault(); document.querySelector<HTMLInputElement>("#appointment-client")?.focus(); },
    onCloseAutoFocus: (event: Event) => { event.preventDefault(); returnFocus(); },
    onEscapeKeyDown: (event: KeyboardEvent) => { if (busy.current) event.preventDefault(); },
    onInteractOutside: (event: Event) => { if (busy.current || dirty) event.preventDefault(); },
  };
  const close = () => { if (!busy.current) onClose(); };
  const footer = <div className="mt-4 flex justify-end"><Button type="button" variant="outline" disabled={saving} onClick={close}>{created ? "Cerrar" : "Cancelar"}</Button></div>;
  const body = <>{children}{footer}</>;
  if (mobile) return <Dialog.Root open={open} onOpenChange={value => { if (!value) close(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
    <Dialog.Content {...handlers} className="appointment-editor fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-line bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-3"><Dialog.Title className="text-lg font-semibold">Nueva cita</Dialog.Title><Button size="icon" variant="ghost" aria-label="Cerrar nueva cita" disabled={saving} onClick={close}><X aria-hidden="true" /></Button></div>
      <Dialog.Description className="sr-only">Elige cliente, servicio, fecha y horario disponible. El borrador se conserva al cerrar.</Dialog.Description>{body}
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
  return <Popover.Root open={open} modal onOpenChange={value => { if (!value) close(); }}><Popover.Anchor virtualRef={virtualRef} /><Popover.Portal>
    <Popover.Content {...handlers} aria-labelledby="new-appointment-title" aria-describedby="new-appointment-description" side="right" align="start" sideOffset={12} collisionPadding={16}
      className="appointment-editor z-50 max-h-[min(calc(100dvh-2rem),var(--radix-popover-content-available-height))] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-line bg-background p-5 text-foreground">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 id="new-appointment-title" className="text-lg font-semibold">Nueva cita</h2><Button size="icon" variant="ghost" aria-label="Cerrar nueva cita" disabled={saving} onClick={close}><X aria-hidden="true" /></Button></div>
      <p id="new-appointment-description" className="sr-only">Elige cliente, servicio, fecha y horario disponible. El borrador se conserva al cerrar.</p>{body}
    </Popover.Content>
  </Popover.Portal></Popover.Root>;
}
