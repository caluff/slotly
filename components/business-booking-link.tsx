"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { ChevronRight, Copy, ExternalLink } from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { navigateWorkspace } from "@/components/dashboard-workspace";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function BusinessBookingLink({ enabled, appearanceHref }: { enabled: boolean; appearanceHref: string }) {
  const link = useQuery(api.bookingLinks.getMyBookingLink, enabled ? {} : "skip");
  const save = useMutation(api.bookingLinks.setMyBookingLink);
  return <BookingLinkPanel enabled={enabled} appearanceHref={appearanceHref} link={link} save={save} />;
}

export function BookingLinkPanel({ enabled, appearanceHref, link, save }: { enabled: boolean; appearanceHref: string; link: FunctionReturnType<typeof api.bookingLinks.getMyBookingLink> | undefined; save: (args: { enabled: boolean }) => Promise<FunctionReturnType<typeof api.bookingLinks.setMyBookingLink>> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const alert = useRef<HTMLParagraphElement>(null);
  const bookingPath = link?.slug ? `/reservar/${link.slug}` : null;
  useEffect(() => { if (error && !busy) alert.current?.focus(); }, [error, busy]);
  async function toggle(checked: boolean) {
    if (lock.current || !enabled || !link || checked === link.enabled) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await save({ enabled: checked });
      toast.success(result.enabled ? "Enlace de reservas activado." : "Enlace de reservas desactivado.");
    } catch (cause) {
      setError(cause instanceof ConvexError && cause.data?.code === "LINK_NAMES_EXHAUSTED"
        ? "No pudimos asignar un enlace único. Reintenta más tarde."
        : "No pudimos cambiar el enlace. Comprueba la conexión y reintenta.");
    } finally { lock.current = false; setBusy(false); }
  }
  async function copy() {
    if (!bookingPath) return;
    setError("");
    try { await navigator.clipboard.writeText(new URL(bookingPath, window.location.origin).href); toast.success("Enlace copiado."); }
    catch { setError("No pudimos copiar el enlace. Puedes abrirlo y copiar su dirección."); }
  }
  return <section aria-labelledby="booking-link-heading" data-panel-mutation-busy={busy}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 id="booking-link-heading" className="font-semibold">Reservas en línea</h3>
        <p className={link?.enabled ? "text-sm text-accent" : "text-sm text-muted"} role="status">
          {busy ? "Guardando…" : link === undefined ? "Cargando…" : link.enabled ? "Activo" : "Desactivado"}
        </p>
      </div>
      <Switch
        aria-labelledby="booking-link-heading"
        checked={link?.enabled ?? false}
        onCheckedChange={toggle}
        disabled={!enabled || !link}
        readOnly={busy}
        aria-disabled={busy || undefined}
      />
    </div>
    <div className="mt-3 divide-y divide-line rounded-md border border-line bg-surface/45">
      {bookingPath && <div className="flex items-center gap-1 p-2">
        <a href={bookingPath} target="_blank" rel="noopener noreferrer" className="text-link flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1 py-2 text-sm text-accent">
          <span className="wrap-anywhere">{bookingPath}</span>
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="sr-only"> (abre en otra pestaña)</span>
        </a>
        <Button type="button" variant="outline" aria-label="Copiar enlace de reservas" onClick={copy}>
          <Copy aria-hidden="true" /> Copiar
        </Button>
      </div>}
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-between text-left" render={<a href={appearanceHref} onClick={navigateWorkspace} />}>
          Personalizar vista pública <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
    {error && <p ref={alert} role="alert" tabIndex={-1} className="mt-3 text-sm text-destructive">{error}</p>}
  </section>;
}
