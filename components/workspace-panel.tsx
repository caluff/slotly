"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, ListChecks, Store, Users, X } from "@/components/ui/icons";
import { Tooltip } from "radix-ui";
import { Button } from "@/components/ui/button";
import { currentWorkspaceHref, dashboardHref, readDashboardView, type DashboardView } from "@/lib/dashboard-navigation";
import { usePanelMotion } from "@/components/use-panel-motion";

export const workspaceSections = [{ view: 'clientes', label: 'Clientes', icon: Users }, { view: 'servicios', label: 'Servicios', icon: ListChecks }, { view: 'horario', label: 'Horario', icon: Clock3 }, { view: 'negocio', label: 'Negocio', icon: Store }] as const;
const PanelSurface = createContext(false);
export const usePanelSurface = () => useContext(PanelSurface);
function subscribe(notify: () => void) { const query = window.matchMedia('(max-width: 1199px)'); query.addEventListener('change', notify); return () => query.removeEventListener('change', notify); }
function isCompact() { return window.matchMedia('(max-width: 1199px)').matches; }
export function panelBusy() { return !!document.querySelector('.workspace-sidepanel [data-panel-section]:not([hidden]) form[aria-busy="true"],.workspace-sidepanel [data-panel-section]:not([hidden]) [data-panel-mutation-busy="true"],.workspace-customization:not([hidden]) [data-panel-mutation-busy="true"]'); }

export function openWorkspaceSection(view: DashboardView, createService = false) {
  if (panelBusy()) return;
  const source = new URLSearchParams(window.location.search);
  source.delete('crear');
  if (createService) source.set('crear', 'servicio');
  window.history.pushState(null, '', currentWorkspaceHref(dashboardHref(view, source.get('fecha'), source)));
  if (createService) window.dispatchEvent(new Event('slotly:new-service'));
}

export function WorkspaceRail({ insidePanel = false }: { insidePanel?: boolean }) {
  const params = useSearchParams(), active = readDashboardView(params.get('vista'));
  return <Tooltip.Provider delayDuration={200}><nav aria-label={insidePanel ? 'Secciones del panel' : 'Secciones del negocio'} className={insidePanel ? 'workspace-panel-rail' : 'workspace-rail'}>
    <div className="workspace-account-slot" data-workspace-account-host={insidePanel ? undefined : ''} data-workspace-account-modal-host={insidePanel ? '' : undefined} />
    {workspaceSections.map(({ view, label, icon: Icon }) => <Tooltip.Root key={view}><Tooltip.Trigger asChild>
      <Button size="icon" variant="ghost" data-workspace-trigger={insidePanel ? undefined : view} aria-label={label} aria-controls="workspace-sidepanel" aria-expanded={active === view} className={active === view ? 'workspace-rail-selected' : ''} onClick={() => openWorkspaceSection(readDashboardView(new URLSearchParams(window.location.search).get('vista')) === view ? 'agenda' : view)}><Icon aria-hidden="true" /></Button>
    </Tooltip.Trigger><Tooltip.Portal><Tooltip.Content side="left" sideOffset={8} className="workspace-rail-tooltip">{label}</Tooltip.Content></Tooltip.Portal></Tooltip.Root>)}
  </nav></Tooltip.Provider>;
}

export function WorkspacePanels({ clients, services, schedule, business }: { clients?: ReactNode; services: ReactNode; schedule: ReactNode; business: ReactNode }) {
  const params = useSearchParams(), active = readDashboardView(params.get('vista')), open = active !== 'agenda' && active !== 'personalizar';
  const creatingService = params.get('crear') === 'servicio';
  const compact = useSyncExternalStore(subscribe, isCompact, () => false);
  const host = useRef<HTMLDivElement>(null), previous = useRef<DashboardView>('agenda');
  const [lastSection, setLastSection] = useState<DashboardView>(active === 'personalizar' ? 'negocio' : active);
  if (open && lastSection !== active) setLastSection(active);
  const displayedSection = open ? active : lastSection;
  const panel = usePanelMotion({ open, modal: compact, side: 'right',
    onShow: dialog => {
      window.dispatchEvent(new CustomEvent('slotly:toast-host', { detail: compact ? host.current : null }));
      window.dispatchEvent(new CustomEvent('slotly:account-host', { detail: compact ? dialog.querySelector('[data-workspace-account-modal-host]') : null }));
    },
    onHide: () => { window.dispatchEvent(new CustomEvent('slotly:toast-host', { detail: null })); window.dispatchEvent(new CustomEvent('slotly:account-host', { detail: null })); },
    onClosed: () => { const customizing = new URLSearchParams(window.location.search).get('vista') === 'personalizar'; document.querySelector<HTMLElement>(customizing ? '#appearance-heading' : `[data-workspace-trigger="${previous.current}"]`)?.focus(); previous.current = 'agenda'; },
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const dialog = panel.current; if (!dialog) return;
    const observer = new MutationObserver(() => setBusy(panelBusy()));
    observer.observe(dialog, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy', 'data-panel-mutation-busy', 'hidden'] });
    return () => observer.disconnect();
  }, [panel]);
  useEffect(() => {
    const dialog = panel.current; if (!dialog) return;
    if (open) {
      const frame = requestAnimationFrame(() => {
        const target = creatingService ? dialog.querySelector<HTMLElement>('#service-name') : dialog.querySelector<HTMLElement>('#workspace-panel-heading');
        target?.focus();
      });
      previous.current = active;
      return () => cancelAnimationFrame(frame);
    }
  }, [open, compact, active, creatingService, panel]);
  useEffect(() => () => { window.dispatchEvent(new CustomEvent('slotly:toast-host', { detail: null })); window.dispatchEvent(new CustomEvent('slotly:account-host', { detail: null })); }, []);
  const close = () => { if (!panelBusy()) openWorkspaceSection('agenda'); };
  return <PanelSurface.Provider value={true}><dialog ref={panel} id="workspace-sidepanel" className="workspace-sidepanel" aria-labelledby="workspace-panel-heading"
    onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { if (!compact && event.key === 'Escape') { event.preventDefault(); close(); } }}
    onClick={event => { if (compact && event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientY < rect.top || event.clientX > rect.right || event.clientY > rect.bottom) close(); } }}>
    <div className="workspace-panel-heading"><h2 id="workspace-panel-heading" tabIndex={-1}>{workspaceSections.find(row => row.view === displayedSection)?.label ?? 'Panel del negocio'}</h2><Button variant="ghost" size="icon" aria-label="Cerrar panel" disabled={busy} onClick={close}><X aria-hidden="true" /></Button></div>
    <div className="workspace-panel-content">
      <section data-panel-section="clientes" aria-label="Clientes" hidden={displayedSection !== 'clientes'}>{clients}</section>
      <section data-panel-section="servicios" aria-label="Servicios" hidden={displayedSection !== 'servicios'}>{services}</section>
      <section data-panel-section="horario" aria-label="Horario" hidden={displayedSection !== 'horario'}>{schedule}</section>
      <section data-panel-section="negocio" aria-label="Negocio" hidden={displayedSection !== 'negocio'}>{business}</section>
    </div><div ref={host} data-toast-host />{compact && <WorkspaceRail insidePanel />}
  </dialog></PanelSurface.Provider>;
}
