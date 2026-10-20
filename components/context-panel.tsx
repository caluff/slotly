"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/button";

export function ContextPanel({ open, title, id, onClose, busy = false, trigger, children }: {
  open: boolean; title: string; id: string; onClose: () => void; busy?: boolean;
  trigger: RefObject<HTMLButtonElement | null>; children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("select, input, button[type=submit]")?.focus();
  }, [open]);
  function close() { if (!busy) { onClose(); trigger.current?.focus(); } }
  return <aside ref={panel} id={id} hidden={!open} aria-labelledby={`${id}-title`}
    className="context-panel" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{title}</h2>
      <Button variant="ghost" size="icon" aria-label={`Cerrar ${title.toLowerCase()}`} onClick={close} disabled={busy}><X aria-hidden="true" /></Button>
    </div>
    {children}
  </aside>;
}
