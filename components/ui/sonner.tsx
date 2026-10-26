"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CircleCheckIcon } from "@/components/ui/icons";
import { Toaster as Sonner } from "sonner";

// shadcn/ui's Sonner wrapper, adapted to Slotly's fixed light theme and tokens.
export function Toaster() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // One stable portal: notifications stay visible in a native modal sheet
    // without duplicating the toaster or remounting its active messages.
    const container = document.createElement('div');
    container.dataset.slotlyToastPortal = '';
    const target = document.querySelector('dialog.workspace-sidepanel[open]:modal [data-toast-host]');
    (target ?? document.body).append(container);
    const frame = requestAnimationFrame(() => setHost(container));
    const move = (event: Event) => { const target = (event as CustomEvent<HTMLElement | null>).detail; (target?.isConnected ? target : document.body).append(container); };
    window.addEventListener('slotly:toast-host', move);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('slotly:toast-host', move); container.remove(); };
  }, []);
  return host && createPortal(
    <Sonner
      theme="light"
      className="toaster group"
      containerAriaLabel="Notificaciones"
      icons={{ success: <CircleCheckIcon className="size-4 text-accent" /> }}
      style={{
        "--normal-bg": "var(--surface)",
        "--normal-text": "var(--foreground)",
        "--normal-border": "var(--line)",
        "--border-radius": "var(--radius-md)",
        fontFamily: "var(--font-geist-sans), sans-serif",
      } as CSSProperties}
      toastOptions={{ style: { boxShadow: "none", fontSize: "0.875rem" } }}
    />, host
  );
}
