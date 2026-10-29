"use client";

import { Component, createContext, createElement, useContext, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import { Field, FieldLabel } from "@/components/ui/field";
import { ListSkeleton } from "@/components/loading-screens";
import type { ClientSummary } from "@/components/client-creation-form";

export type ClientPageStatus = "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";
export function clientContext(client: ClientSummary, timeZone: string) {
  if (client.email) return client.email;
  return `Alta ${new Intl.DateTimeFormat("es-UY", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(client.createdAt)} · ${client._id.slice(-8)}`;
}
export class ClientReadBoundary extends Component<{ children: ReactNode; onRetry?: () => void }, { failed: boolean; retry: number }> {
  state = { failed: false, retry: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div role="alert" className="space-y-3 py-3 text-sm"><p>No pudimos cargar los clientes. Conservamos tu borrador.</p>
      <Button type="button" variant="outline" onClick={() => { this.props.onRetry?.(); this.setState({ failed: false, retry: this.state.retry + 1 }); }}>Reintentar lectura</Button></div>
      : <div key={this.state.retry}>{this.props.children}</div>;
  }
}
export function ClientRows({ rows, status, onChoose, onLoadMore, timeZone }: {
  rows: ClientSummary[]; status: ClientPageStatus; onChoose: (client: ClientSummary, trigger: HTMLButtonElement) => void; onLoadMore: () => void; timeZone: string;
}) {
  return <div aria-busy={status === "LoadingFirstPage" || status === "LoadingMore"}>
    {status === "LoadingFirstPage" ? <ListSkeleton label="Cargando clientes" />
      : rows.length === 0 ? <p role="status" className="py-5 text-sm text-muted">No hay clientes que coincidan. Puedes crear una ficha desde Clientes.</p>
        : <ul aria-label="Clientes encontrados" className="divide-y divide-line border-y border-line">{rows.map(client => <li key={client._id}>
          <button type="button" className="w-full cursor-pointer rounded-sm px-1 py-3 text-left hover:bg-surface" onClick={event => onChoose(client, event.currentTarget)}>
            <span className="block wrap-anywhere text-sm font-semibold">{client.name}</span>
            <span className="mt-1 block wrap-anywhere text-xs text-muted">{clientContext(client, timeZone)}</span>
          </button>
        </li>)}</ul>}
    {(status === "CanLoadMore" || status === "LoadingMore") && <Button type="button" variant="outline" className="mt-4" disabled={status === "LoadingMore"} onClick={onLoadMore}>{status === "LoadingMore" ? "Cargando…" : "Cargar más clientes"}</Button>}
  </div>;
}
export function ConnectedClientRows({ search, timeZone, enabled = true, onChoose }: {
  search: string; timeZone: string; enabled?: boolean; onChoose: (client: ClientSummary, trigger: HTMLButtonElement) => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(api.clients.listMyClients, enabled ? { search } : "skip", { initialNumItems: 20 });
  return <ClientRows rows={results} status={status} onChoose={onChoose} onLoadMore={() => loadMore(20)} timeZone={timeZone} />;
}
type ClientSourceProps = Parameters<typeof ConnectedClientRows>[0];
const ClientSourceContext = createContext<ComponentType<ClientSourceProps>>(ConnectedClientRows);
export function ClientRowsProvider({ source, children }: { source: ComponentType<ClientSourceProps>; children: ReactNode }) { return <ClientSourceContext.Provider value={source}>{children}</ClientSourceContext.Provider>; }
export function ClientRowsSource(props: ClientSourceProps) { const Source = useContext(ClientSourceContext); return createElement(Source, props); }
export function ClientPicker({ selected, onSelect, timeZone, enabled = true }: {
  selected: ClientSummary | null; onSelect: (client: ClientSummary | null) => void; timeZone: string; enabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const change = useRef<HTMLButtonElement>(null);
  const selectedId = selected?._id;
  useEffect(() => { if (selectedId) change.current?.focus(); }, [selectedId]);
  if (selected) return <div className="space-y-2"><p className="wrap-anywhere text-sm font-semibold">{selected.name}</p>
    <p className="wrap-anywhere text-xs text-muted">{clientContext(selected, timeZone)}</p>
    <Button ref={change} type="button" variant="outline" onClick={() => { onSelect(null); requestAnimationFrame(() => document.getElementById("appointment-client-search")?.focus()); }}>Cambiar cliente</Button></div>;
  return <div className="space-y-3"><Field className="gap-2"><FieldLabel htmlFor="appointment-client-search">Buscar cliente</FieldLabel>
    <div className="relative"><Search aria-hidden="true" isAnimated={false} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input id="appointment-client-search" className="pl-9" value={search} maxLength={100} autoComplete="off" onChange={event => setSearch(event.target.value)} /></div></Field>
    <div className="max-h-52 overflow-y-auto"><ClientReadBoundary key={search}><ClientRowsSource search={search} timeZone={timeZone} enabled={enabled} onChoose={client => onSelect(client)} /></ClientReadBoundary></div>
  </div>;
}
