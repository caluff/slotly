"use client";

import { useConvex, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, Search } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { ContextPanel } from "@/components/context-panel";
import { ClientCreationForm, type ClientSummary } from "@/components/client-creation-form";
import { ClientReadBoundary, ClientRowsSource, clientContext } from "@/components/client-picker";
import { AppointmentStatus, AppointmentStatusIcon } from "@/components/appointment-status";
import type { CalendarAppointment } from "@/components/agenda-calendar";

export function BusinessClients({ businessId, timeZone, enabled = true }: { businessId: Id<"businesses">; timeZone: string; enabled?: boolean }) {
  const create = useMutation(api.clients.createMyClient), convex = useConvex();
  return <ClientsPanel businessId={businessId} timeZone={timeZone} enabled={enabled} onCreate={create} onCheck={command => convex.query(api.clients.getMyClientCreation, command)} />;
}

export function ClientsPanel({ businessId, timeZone, enabled = true, onCreate, onCheck, detailComponent: Detail = ClientDetail }: {
  businessId: Id<"businesses">; timeZone: string; enabled?: boolean;
  onCreate: Parameters<typeof ClientCreationForm>[0]["onCreate"]; onCheck: Parameters<typeof ClientCreationForm>[0]["onCheck"];
  detailComponent?: ComponentType<{ clientId: Id<"clients">; timeZone: string; enabled: boolean }>;
}) {
  const [search, setSearch] = useState(""), [creating, setCreating] = useState(false), [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const trigger = useRef<HTMLButtonElement>(null), selectedTrigger = useRef<HTMLButtonElement | null>(null);
  function closeCreation() { setCreating(false); requestAnimationFrame(() => trigger.current?.focus()); }
  function back() { setSelected(null); requestAnimationFrame(() => (selectedTrigger.current?.isConnected ? selectedTrigger.current : document.getElementById("clients-search"))?.focus()); }
  return <div data-panel-mutation-busy={saving}>
    <div hidden={!!selected || creating}>
      <Button ref={trigger} onClick={() => setCreating(true)} disabled={!enabled || saving} aria-expanded={creating} aria-controls="new-client"><Plus aria-hidden="true" />Nuevo cliente</Button>
    </div>
    <ContextPanel id="new-client" title="Nuevo cliente" open={creating} onClose={closeCreation} busy={saving} trigger={trigger} className="service-form-region">
      <ClientCreationForm storageKey={businessId} onCreate={onCreate} onCheck={onCheck}
        onSaving={setSaving} onSaved={() => { closeCreation(); }} onCancel={closeCreation} disabled={!enabled} />
    </ContextPanel>
    <div hidden={creating || !!selected} className="mt-5 space-y-4">
      <Field className="gap-2"><FieldLabel htmlFor="clients-search">Buscar por nombre</FieldLabel><div className="relative"><Search aria-hidden="true" isAnimated={false} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input id="clients-search" className="pl-9" value={search} maxLength={100} autoComplete="off" onChange={event => setSearch(event.target.value)} /></div></Field>
      <ClientReadBoundary key={search}><ClientRowsSource search={search} timeZone={timeZone} enabled={enabled && !selected && !creating}
        onChoose={(client, element) => { selectedTrigger.current = element; setSelected(client); }} /></ClientReadBoundary>
    </div>
    {selected && !creating && <div onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); back(); } }}>
      <Button type="button" variant="ghost" className="mb-4" onClick={back}><ChevronLeft aria-hidden="true" />Clientes</Button>
      <ClientReadBoundary key={selected._id}><Detail clientId={selected._id} timeZone={timeZone} enabled={enabled} /></ClientReadBoundary>
    </div>}
  </div>;
}

function ClientDetail({ clientId, timeZone, enabled }: { clientId: Id<"clients">; timeZone: string; enabled: boolean }) {
  const client = useQuery(api.clients.getMyClient, enabled ? { clientId } : "skip");
  const { results, status, loadMore } = usePaginatedQuery(api.clients.listMyClientAppointments, enabled ? { clientId } : "skip", { initialNumItems: 20 });
  return <ClientDetailPanel client={client} results={results} status={status} onLoadMore={() => loadMore(20)} timeZone={timeZone} />;
}

export function ClientDetailPanel({ client, results, status, onLoadMore, timeZone }: {
  client: ClientSummary | null | undefined; timeZone: string;
  results: Pick<CalendarAppointment, "_id" | "start" | "end" | "serviceName" | "clientName" | "status">[];
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted"; onLoadMore: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (client) heading.current?.focus(); }, [client]);
  if (!client) return <p role="status" className="py-5 text-sm text-muted">Cargando ficha…</p>;
  const date = new Intl.DateTimeFormat("es-UY", { timeZone, day: "numeric", month: "short", year: "numeric" });
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return <div>
    <h3 ref={heading} tabIndex={-1} className="wrap-anywhere text-lg font-semibold">{client.name}</h3>
    <p className="mt-2 wrap-anywhere text-xs text-muted">{clientContext(client, timeZone)}</p>
    <h4 className="mb-3 mt-7 text-sm font-semibold">Citas vinculadas</h4>
    <div aria-busy={status === "LoadingFirstPage" || status === "LoadingMore"}>
      {status === "LoadingFirstPage" ? <p role="status" className="py-5 text-sm text-muted">Cargando citas…</p>
        : results.length === 0 ? <p role="status" className="py-5 text-sm text-muted">Este cliente todavía no tiene citas vinculadas.</p>
          : <ul aria-label="Historial del cliente" className="divide-y divide-line border-y border-line">{results.map(row => <li key={row._id} className="space-y-1 py-4 text-sm">
            <p className="font-semibold tabular-nums">{date.format(row.start)} · {time.format(row.start)}–{time.format(row.end)}</p>
            <p className="wrap-anywhere">{row.serviceName}</p><p className="wrap-anywhere text-muted">{row.clientName}</p>
            <span className="flex items-center gap-1"><AppointmentStatusIcon status={row.status} /><AppointmentStatus status={row.status} /></span>
          </li>)}</ul>}
      {(status === "CanLoadMore" || status === "LoadingMore") && <Button type="button" variant="outline" className="mt-4" disabled={status === "LoadingMore"} onClick={onLoadMore}>{status === "LoadingMore" ? "Cargando…" : "Cargar más citas"}</Button>}
    </div>
  </div>;
}
