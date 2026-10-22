"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export function BusinessBookingLink({ enabled }: { enabled: boolean }) {
  const link = useQuery(api.bookingLinks.getMyBookingLink, enabled ? {} : "skip");
  const save = useMutation(api.bookingLinks.setMyBookingLink);
  return <BookingLinkPanel enabled={enabled} link={link} save={save} />;
}

export function BookingLinkPanel({ enabled, link, save }: { enabled: boolean; link: FunctionReturnType<typeof api.bookingLinks.getMyBookingLink> | undefined; save: (args: { enabled: boolean }) => Promise<FunctionReturnType<typeof api.bookingLinks.setMyBookingLink>> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error && !busy) alert.current?.focus(); }, [error, busy]);
  async function toggle() {
    if (lock.current || !link) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await save({ enabled: !link.enabled });
      toast.success(result.enabled ? "Enlace de reservas activado." : "Enlace de reservas desactivado.");
    } catch (cause) {
      setError(cause instanceof ConvexError && cause.data?.code === "LINK_NAMES_EXHAUSTED"
        ? "No pudimos asignar un enlace único. Reintenta más tarde."
        : "No pudimos cambiar el enlace. Comprueba la conexión y reintenta.");
    } finally { lock.current = false; setBusy(false); }
  }
  async function copy() {
    if (!link?.slug) return;
    try { await navigator.clipboard.writeText(new URL(`/reservar/${link.slug}`, window.location.origin).href); toast.success("Enlace copiado."); }
    catch { setError("No pudimos copiar el enlace. Puedes abrirlo y copiar su dirección."); }
  }
  return <section aria-labelledby="booking-link-heading" data-panel-mutation-busy={busy} className="mt-8 max-w-2xl border-b border-line pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="booking-link-heading" className="text-lg font-semibold tracking-tight">Reservas por enlace</h2>
        <p className="text-sm text-muted" role="status">{link === undefined ? "Cargando…" : link.enabled ? "Activo" : "Desactivado"}</p>
      </div>
      <Button variant={link?.enabled ? "outline" : "default"} disabled={!enabled || !link || busy} onClick={toggle}>
        {busy ? "Guardando…" : link?.enabled ? "Desactivar enlace" : "Activar enlace"}
      </Button>
    </div>
    {link?.slug && <div className="mt-4 flex items-center gap-2">
      <a href={`/reservar/${link.slug}`} target="_blank" rel="noopener noreferrer" className="text-link min-w-0 flex-1 wrap-anywhere text-sm">
        /reservar/{link.slug}<ExternalLink aria-hidden="true" className="ml-2 inline size-3.5" />
        <span className="sr-only"> (abre en otra pestaña)</span>
      </a>
      <Button variant="ghost" size="icon" aria-label="Copiar enlace de reservas" onClick={copy}><Copy aria-hidden="true" /></Button>
    </div>}
    {error && <p ref={alert} role="alert" tabIndex={-1} className="mt-4 text-sm text-destructive">{error}</p>}
  </section>;
}
