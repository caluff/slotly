"use client";

import { useConvex, useMutation, usePaginatedQuery, type UsePaginatedQueryReturnType } from "convex/react";
import { Plus, Clock3, EllipsisVertical, Pencil, Archive, ArchiveRestore } from "@/components/ui/icons";
import { DropdownMenu } from "radix-ui";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { ContextPanel } from "@/components/context-panel";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ServiceValues } from "@/lib/service-schema";
import { ServiceEditor, type ServiceDetail, type ServiceChange, type ServiceCommand } from "@/components/service-editor";
import { usePanelSurface } from "@/components/workspace-panel";
import { useServiceUndo, type ServiceCreation, type UndoService } from "@/components/use-service-undo";

type ServicesPanelProps = Pick<UsePaginatedQueryReturnType<typeof api.services.listMyServices>, "results" | "status"> & {
  onCreate: (values: ServiceValues & { operationId: string }) => Promise<ServiceCreation>;
  onChange: ServiceChange;
  onUndo: UndoService;
  onLoadMore: () => void;
  readBlocked?: boolean;
};

export function BusinessServices({ enabled = true }: { enabled?: boolean }) {
  const createService = useMutation(api.services.createMyService);
  const changeService = useMutation(api.services.changeMyService);
  const undoService = useMutation(api.services.undoMyService);
  const convex = useConvex();
  const [source, setSource] = useState<Pick<ServicesPanelProps, "results" | "status">>({ results: [], status: "LoadingFirstPage" });
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const more = useRef<(count: number) => void>(() => {});
  const read = useCallback((results: ServicesPanelProps["results"], status: ServicesPanelProps["status"], loadMore: (count: number) => void) => {
    more.current = loadMore;
    setSource(previous => {
      const next = status === "LoadingFirstPage" ? previous.results : results;
      // The pagination hook may return a new flattened array/loadMore on render.
      // Publishing the same page back into state would trigger a render loop.
      if (previous.status === status && previous.results.length === next.length && previous.results.every((row, index) => row === next[index])) return previous;
      return { results: next, status };
    });
  }, []);
  return <>
    <ServiceSourceBoundary key={`${retry}:${enabled}`} onError={() => setFailed(true)}><ServiceSource enabled={enabled} onRead={read} /></ServiceSourceBoundary>
    {failed && <div role="alert" className="mb-4 space-y-3 text-sm"><p>No pudimos actualizar los servicios. Conservamos los borradores.</p><Button variant="outline" onClick={() => { setFailed(false); setSource(previous => ({ ...previous, status: "LoadingFirstPage" })); setRetry(value => value + 1); }}>Reintentar lectura</Button></div>}
    <ServicesPanel results={source.results} status={source.status} onCreate={async values => { const id = await createService(values); const undo = await convex.query(api.services.getMyServiceUndo, { id, operationId: values.operationId }); return { id, undo }; }} onChange={changeService} onUndo={undoService} readBlocked={!enabled || failed || source.status === "LoadingFirstPage"} onLoadMore={() => more.current(20)} />
  </>;
}

class ServiceSourceBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function ServiceSource({ enabled, onRead }: { enabled: boolean; onRead: (results: ServicesPanelProps["results"], status: ServicesPanelProps["status"], loadMore: (count: number) => void) => void }) {
  const { results, status, loadMore } = usePaginatedQuery(api.services.listMyServices, enabled ? {} : "skip", { initialNumItems: 20 });
  useEffect(() => { if (enabled) onRead(results, status, loadMore); }, [enabled, results, status, loadMore, onRead]);
  return null;
}

export function ServicesPanel({ results, status, onCreate, onChange, onUndo, onLoadMore, readBlocked = false }: ServicesPanelProps) {
  const params = useSearchParams();
  const embedded = usePanelSurface();
  const [open, setOpen] = useState(params.get('crear') === 'servicio');
  const [started, setStarted] = useState(params.get('crear') === 'servicio');
  const [saving, setBusy] = useState(false);
  const undo = useServiceUndo(onUndo);
  const busy = saving || undo.busy;
  const blocked = readBlocked || undo.busy || undo.uncertain;
  const [archived, setArchived] = useState(false);
  const [session, setSession] = useState<{ initial: ServiceDetail; kind: ServiceCommand["change"]["kind"]; key: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const formOpen = open || editing;
  const dirty = useRef(false);
  const focusAfterSave = useRef(false);
  const onDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const rows = results.filter(service => service.archived === archived);
  function startService(service: ServiceDetail, kind: ServiceCommand["change"]["kind"], element: HTMLButtonElement | null) {
    if (busy || blocked) return;
    if (!session || !dirty.current) { setSession(previous => ({ initial: service, kind, key: (previous?.key ?? 0) + 1 })); trigger.current = element; }
    setOpen(false); setEditing(true);
  }
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open && !editing && !busy && focusAfterSave.current) {
      focusAfterSave.current = false;
      document.getElementById("new-service-trigger")?.focus();
    }
  }, [open, editing, busy]);
  function restoreFocus() { requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus(); else document.getElementById("new-service-trigger")?.focus(); }); }
  useEffect(() => { const start = () => { if (dirty.current) { setEditing(true); return; } setEditing(false); setStarted(true); setOpen(true); }; window.addEventListener('slotly:new-service', start); return () => window.removeEventListener('slotly:new-service', start); }, []);
  const close = () => { setOpen(false); const query = new URLSearchParams(window.location.search); if (query.get('crear') === 'servicio') { query.delete('crear'); window.history.replaceState(null, '', `${window.location.pathname}?${query}`); } };
  function saved(message: string, ticket: ServiceCreation["undo"]) {
    dirty.current = false; focusAfterSave.current = true; setEditing(false); setSession(null); close();
    undo.announce(message, ticket);
  }
  return <>
    <div hidden={embedded && formOpen} className="flex flex-wrap items-start justify-between gap-5" data-panel-mutation-busy={busy}>
      {!embedded && <div><h1 tabIndex={-1} className="workspace-title">Servicios</h1>
        <p className="workspace-description">Lo que ofreces y el tiempo que necesita cada cita.</p></div>}
      <Button id="new-service-trigger" hidden={formOpen} disabled={busy || blocked} aria-expanded={open} aria-controls="new-service" onClick={event => { if (dirty.current) { setEditing(true); return; } trigger.current = event.currentTarget; setEditing(false); setStarted(true); setOpen(true); }}><Plus aria-hidden="true" />Nuevo servicio</Button>
    </div>
    <div className={`${embedded && formOpen ? "" : "mt-6"} ${formOpen ? "workspace-grid" : ""}`}>
      {session && <ContextPanel className="service-form-region" id="edit-service" title={session.kind === "edit" ? "Editar servicio" : session.kind === "archive" ? "Archivar servicio" : "Restaurar servicio"} open={editing} onClose={() => { setEditing(false); restoreFocus(); }} busy={busy} trigger={trigger}>
        <ServiceEditor key={session.key} initial={session.initial} latest={results.find(service => service._id === session.initial._id)} kind={session.kind} onChange={onChange} onBusy={setBusy} onDirty={onDirty} blocked={blocked} onSaved={result => saved(result.outcome === "unchanged" ? "No había cambios que guardar." : result.outcome === "already_applied" ? "Servicio confirmado." : session.kind === "edit" ? "Servicio guardado." : session.kind === "archive" ? "Servicio archivado." : "Servicio restaurado.", result.undo)} onDiscard={() => { dirty.current = false; setEditing(false); setSession(null); restoreFocus(); }} />
      </ContextPanel>}
      {started && <ContextPanel className="service-form-region" id="new-service" title="Nuevo servicio" open={open} onClose={() => { close(); restoreFocus(); }} busy={busy} trigger={trigger}>
        <ServiceForm onCreate={onCreate} onSaving={setBusy} disabled={blocked} compact onSaved={result => saved("Servicio creado.", result.undo)} onDiscard={() => { close(); restoreFocus(); }} />
      </ContextPanel>}
      <div className="workspace-list" aria-busy={status === "LoadingFirstPage" || status === "LoadingMore"}>
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Estado de servicios"><Button variant={!archived ? "secondary" : "ghost"} aria-pressed={!archived} disabled={busy} onClick={() => setArchived(false)}>Activos</Button><Button variant={archived ? "secondary" : "ghost"} aria-pressed={archived} disabled={busy} onClick={() => setArchived(true)}>Archivados</Button></div>
        {status === "LoadingFirstPage" ? <p role="status" className="py-8 text-sm text-muted">Cargando tus servicios…</p>
          : rows.length === 0 ? <div className="py-6">
            <p role="status" className="text-sm text-muted">{archived ? "No hay servicios archivados en esta página." : "No hay servicios activos en esta página."}</p>
          </div> : <>
            <div className="flex justify-between border-b border-line pb-3 text-sm text-muted"><span>Servicio</span><span>Duración</span></div>
            <ul aria-label="Servicios de tu negocio" className="divide-y divide-line border-b border-line">
              {rows.map((service) => <li key={service._id} className="flex items-center justify-between gap-3 py-4">
                <span className="min-w-0 wrap-anywhere font-semibold">{service.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-sm text-muted tabular-nums"><Clock3 className="size-4" aria-hidden="true" />{service.durationMinutes} min
                  <ServiceMenu service={service} disabled={busy || blocked} onAction={(kind, element) => startService(service, kind, element)} />
                </span>
              </li>)}
            </ul>
          </>}
        {(status === "CanLoadMore" || status === "LoadingMore") && <Button type="button" variant="outline" disabled={status === "LoadingMore"} onClick={onLoadMore} className="mt-5">{status === "LoadingMore" ? "Cargando servicios…" : "Cargar más servicios"}</Button>}
      </div>
    </div>
  </>;
}

function ServiceMenu({ service, disabled, onAction }: { service: ServiceDetail; disabled: boolean; onAction: (kind: ServiceCommand["change"]["kind"], element: HTMLButtonElement | null) => void }) {
  const trigger = useRef<HTMLButtonElement>(null), pending = useRef<ServiceCommand["change"]["kind"] | null>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  const item = "flex cursor-default select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-surface [&_svg]:size-4";
  return <DropdownMenu.Root onOpenChange={open => { if (open) setContainer(trigger.current?.closest("dialog") ?? undefined); }}><DropdownMenu.Trigger asChild><Button ref={trigger} variant="ghost" size="icon" disabled={disabled} aria-label={`Opciones de ${service.name}`}><EllipsisVertical aria-hidden="true" /></Button></DropdownMenu.Trigger>
    <DropdownMenu.Portal container={container}><DropdownMenu.Content align="end" sideOffset={4} collisionPadding={12} className="z-50 max-w-[calc(100vw-1.5rem)] rounded-md border border-line bg-background p-1 text-foreground" onCloseAutoFocus={event => { if (pending.current) { event.preventDefault(); const kind = pending.current; pending.current = null; onAction(kind, trigger.current); } }}>
      {!service.archived && <DropdownMenu.Item className={item} onSelect={() => { pending.current = "edit"; }}><Pencil aria-hidden="true" />Editar</DropdownMenu.Item>}
      <DropdownMenu.Item className={item} onSelect={() => { pending.current = service.archived ? "restore" : "archive"; }}>{service.archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}{service.archived ? "Restaurar" : "Archivar"}</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
