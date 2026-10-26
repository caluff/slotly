"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { leaveWithoutDrafts } from "@/components/use-draft-warning";
import { dashboardHref, readDashboardView, type DashboardView } from "@/lib/dashboard-navigation";
import { WorkspaceRail, panelBusy } from "@/components/workspace-panel";
import { WorkspaceAccount } from "@/components/workspace-account";
import "@/components/dashboard-workspace.css";

export function navigateWorkspace(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (panelBusy()) return;
  window.history.pushState(null, "", event.currentTarget.href);
}

export function WorkspaceLink({ view, children }: { view: DashboardView; children: ReactNode }) {
  const params = useSearchParams();
  return <a className="text-link text-accent" href={dashboardHref(view, params.get("fecha"), params)} onClick={navigateWorkspace}>{children}</a>;
}

export function DashboardWorkspace({ account, children }: { account: ReactNode; children: ReactNode }) {
  const params = useSearchParams();
  const active = readDashboardView(params.get("vista"));
  const [leaving, setLeaving] = useState<string | null>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function request(event: Event) { setLeaving((event as CustomEvent<string>).detail); }
    window.addEventListener("slotly:leave-with-draft", request);
    return () => window.removeEventListener("slotly:leave-with-draft", request);
  }, []);
  useEffect(() => {
    if (leaving) leaveDialog.current?.showModal();
    else leaveDialog.current?.close();
  }, [leaving]);
  useEffect(() => {
    document.title = `Agenda${active !== 'agenda' ? ` · ${active[0].toUpperCase()}${active.slice(1)}` : ''} · Slotly`;
  }, [active]);

  return <div className="workspace-root" data-panel-open={active !== 'agenda' && active !== 'personalizar'}>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:p-3">Saltar al contenido</a>
    <div className="workspace-stage"><main id="main-content" className="workspace-main">{children}</main><WorkspaceRail /></div>
    <WorkspaceAccount>{account}</WorkspaceAccount>
    <dialog ref={leaveDialog} aria-labelledby="leave-draft-title" aria-describedby="leave-draft-description" onCancel={() => setLeaving(null)} onClose={() => setLeaving(null)}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border border-line bg-background p-6 text-foreground backdrop:bg-foreground/20">
      <h2 id="leave-draft-title" className="text-lg font-semibold">Tienes cambios sin guardar</h2>
      <p id="leave-draft-description" className="mt-3 text-sm leading-6 text-muted">Si sales de tu espacio, perderás los borradores. Puedes seguir editando para guardarlos.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button autoFocus onClick={() => setLeaving(null)}>Seguir editando</Button>
        <Button variant="outline" onClick={() => leaving && leaveWithoutDrafts(leaving)}>Salir sin guardar</Button>
      </div>
    </dialog>
  </div>;
}
