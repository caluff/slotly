"use client";

import type { CSSProperties } from "react";
import { CircleCheckIcon } from "lucide-react";
import { Toaster as Sonner } from "sonner";

// shadcn/ui's Sonner wrapper, adapted to Slotly's fixed light theme and tokens.
export function Toaster() {
  return (
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
    />
  );
}
