"use client";

import { CalendarDays, Clock3, Store, ListChecks } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { leaveWithoutDrafts } from "@/components/use-draft-warning";
import { dashboardHref, readDashboardView, type DashboardView } from "@/lib/dashboard-navigation";

const destinations = [
  { view: "agenda", label: "Agenda", icon: CalendarDays },
  { view: "servicios", label: "Servicios", icon: ListChecks },
  { view: "horario", label: "Horario", icon: Clock3 },
  { view: "negocio", label: "Negocio", icon: Store },
] as const;

export function navigateWorkspace(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState(null, "", event.currentTarget.href);
}

export function WorkspaceLink({ view, children }: { view: DashboardView; children: ReactNode }) {
  const params = useSearchParams();
  return <a className="text-link text-accent" href={dashboardHref(view, params.get("fecha"), params)} onClick={navigateWorkspace}>{children}</a>;
}

export function DashboardWorkspace({ account, children }: { account: ReactNode; children: ReactNode }) {
  const params = useSearchParams();
  const active = readDashboardView(params.get("vista"));
  const previous = useRef(active);
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
    if (previous.current !== active) {
      document.querySelector<HTMLElement>("main section:not([hidden]) h1")?.focus();
      previous.current = active;
    }
    document.title = `${destinations.find((item) => item.view === active)?.label} · Slotly`;
  }, [active]);

  return <div className="min-h-dvh">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:p-3">Saltar al contenido</a>
    <header className="border-b border-line bg-white">
      <div className="workspace-width grid grid-cols-[1fr_auto] items-center gap-x-8 md:grid-cols-[auto_1fr_auto]">
        <div className="flex h-16 items-center"><Brand /></div>
        <nav aria-label="Espacio de trabajo" className="col-span-2 row-start-2 grid grid-cols-4 md:col-span-1 md:col-start-2 md:row-start-1 md:flex md:self-stretch">
          {destinations.map(({ view, label, icon: Icon }) => <a key={view}
            href={dashboardHref(view, params.get("fecha"), params)} onClick={navigateWorkspace}
            aria-current={active === view ? "page" : undefined}
            className={`workspace-nav ${active === view ? "workspace-nav-active" : ""}`}>
            <Icon aria-hidden="true" className="size-4" />{label}
          </a>)}
        </nav>
        <div className="col-start-2 row-start-1 flex items-center justify-end md:col-start-3">{account}</div>
      </div>
    </header>
    <main id="main-content" className="workspace-width py-7 sm:py-10">{children}</main>
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
