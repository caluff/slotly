"use client";

import { useMutation, usePaginatedQuery, type UsePaginatedQueryReturnType } from "convex/react";
import { Plus, Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { ContextPanel } from "@/components/context-panel";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ServiceValues } from "@/lib/service-schema";
import { usePanelSurface } from "@/components/workspace-panel";

type ServicesPanelProps = Pick<UsePaginatedQueryReturnType<typeof api.services.listMyServices>, "results" | "status"> & {
  onCreate: (values: ServiceValues) => Promise<unknown>;
  onLoadMore: () => void;
};

export function BusinessServices({ enabled = true }: { enabled?: boolean }) {
  const createService = useMutation(api.services.createMyService);
  const { results, status, loadMore } = usePaginatedQuery(api.services.listMyServices, enabled ? {} : "skip", { initialNumItems: 20 });
  return <ServicesPanel results={results} status={status} onCreate={createService} onLoadMore={() => loadMore(20)} />;
}

export function ServicesPanel({ results, status, onCreate, onLoadMore }: ServicesPanelProps) {
  const params = useSearchParams();
  const embedded = usePanelSurface();
  const [open, setOpen] = useState(params.get('crear') === 'servicio');
  const [started, setStarted] = useState(params.get('crear') === 'servicio');
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { const start = () => { setStarted(true); setOpen(true); }; window.addEventListener('slotly:new-service', start); return () => window.removeEventListener('slotly:new-service', start); }, []);
  const close = () => { setOpen(false); const query = new URLSearchParams(window.location.search); if (query.get('crear') === 'servicio') { query.delete('crear'); window.history.replaceState(null, '', `${window.location.pathname}?${query}`); } };
  return <>
    <div className="flex flex-wrap items-start justify-between gap-5">
      {!embedded && <div><h1 tabIndex={-1} className="workspace-title">Servicios</h1>
        <p className="workspace-description">Lo que ofreces y el tiempo que necesita cada cita.</p></div>}
      <Button hidden={embedded && open} ref={trigger} aria-expanded={open} aria-controls="new-service" onClick={() => { setStarted(true); setOpen(true); }}><Plus aria-hidden="true" />Nuevo servicio</Button>
    </div>
    <div className={`mt-8 ${open ? "workspace-grid" : ""}`}>
      {started && <ContextPanel id="new-service" title="Nuevo servicio" open={open} onClose={close} busy={busy} trigger={trigger}>
        <ServiceForm onCreate={onCreate} onSaving={setBusy} compact />
        <p className="mt-5 text-xs leading-5 text-muted">Puedes cerrar este panel: el borrador se conserva mientras sigas en tu espacio.</p>
      </ContextPanel>}
      <div className="workspace-list" aria-busy={status === "LoadingFirstPage" || status === "LoadingMore"}>
        {status === "LoadingFirstPage" ? <p role="status" className="py-8 text-sm text-muted">Cargando tus servicios…</p>
          : results.length === 0 ? <div className="rounded-md border border-dashed border-line px-6 py-12">
            <h2 className="text-lg font-semibold">Tu primer servicio empieza aquí</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-muted">Añade su nombre y duración para poder reservar un horario en tu agenda.</p>
          </div> : <>
            <div className="flex justify-between border-b border-line pb-3 text-sm text-muted"><span>Servicio</span><span>Duración</span></div>
            <ul aria-label="Servicios de tu negocio" className="divide-y divide-line border-b border-line">
              {results.map((service) => <li key={service._id} className="flex items-baseline justify-between gap-4 py-6">
                <span className="min-w-0 wrap-anywhere font-semibold">{service.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted tabular-nums"><Clock3 className="size-4" aria-hidden="true" />{service.durationMinutes} min</span>
              </li>)}
            </ul>
          </>}
        {(status === "CanLoadMore" || status === "LoadingMore") && <Button type="button" variant="outline" disabled={status === "LoadingMore"} onClick={onLoadMore} className="mt-5">{status === "LoadingMore" ? "Cargando servicios…" : "Cargar más servicios"}</Button>}
      </div>
    </div>
  </>;
}
