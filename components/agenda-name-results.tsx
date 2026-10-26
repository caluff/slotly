"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function AgendaNameResults({ open, modal, name, onClose, children }: { open: boolean; modal: boolean; name: string; onClose: (restoreFocus?: boolean) => void; children: ReactNode }) {
  const panel = useRef<HTMLDialogElement>(null), previousModal = useRef(modal);
  useEffect(() => {
    const dialog = panel.current; if (!dialog) return;
    if (dialog.open && (!open || previousModal.current !== modal)) dialog.close();
    previousModal.current = modal;
    if (!open) return;
    if (!dialog.open) { if (modal) dialog.showModal(); else dialog.show(); }
    const place = () => {
      const input = document.querySelector<HTMLInputElement>('#search-client'), rect = input?.getBoundingClientRect();
      dialog.style.left = `${modal ? Math.max(16, (window.innerWidth - dialog.offsetWidth) / 2) : Math.max(16, Math.min(rect?.left ?? 16, window.innerWidth - dialog.offsetWidth - 16))}px`;
      const top = modal ? 72 : Math.max(72, Math.min((rect?.bottom ?? 64) + 8, window.innerHeight - Math.min(dialog.offsetHeight, 300) - 16));
      dialog.style.top = `${top}px`; dialog.style.maxHeight = `${Math.max(120, window.innerHeight - top - 16)}px`;
    };
    place(); window.addEventListener('resize', place);
    const outside = (event: PointerEvent) => { if (!modal && !dialog.contains(event.target as Node) && !(event.target as HTMLElement).closest('.agenda-name-search')) onClose(false); };
    document.addEventListener('pointerdown', outside);
    const frame = requestAnimationFrame(() => dialog.querySelector<HTMLElement>('#agenda-name-results-title')?.focus());
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', place); document.removeEventListener('pointerdown', outside); };
  }, [open, modal, onClose]);
  return <dialog ref={panel} id="agenda-name-results" className="agenda-name-results" aria-labelledby="agenda-name-results-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}
    onClick={event => { if (modal && event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <div className="agenda-find-heading"><h2 id="agenda-name-results-title" tabIndex={-1}>{name ? `Citas de «${name}»` : 'Buscar citas'}</h2><Button size="icon" variant="ghost" aria-label="Cerrar resultados" onClick={() => onClose()}><X aria-hidden="true" /></Button></div>
    <div className="agenda-find-content">{open && children}</div>
  </dialog>;
}
