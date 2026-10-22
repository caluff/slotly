"use client";

import { UNSAFE_PortalProvider } from "@clerk/nextjs";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Preserve one official UserButton while moving its stable host between the
// desktop rail and native modal rail. Clerk's documented provider keeps its
// floating UI inside the active dialog, without changing authentication.
export function WorkspaceAccount({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null), [portalParent, setPortalParent] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const container = document.createElement('div'); container.dataset.workspaceAccount = '';
    const outer = () => document.querySelector<HTMLElement>('[data-workspace-account-host]');
    const initial = document.querySelector<HTMLElement>('dialog.workspace-sidepanel[open]:modal [data-workspace-account-modal-host]') ?? outer();
    initial?.append(container);
    const frame = requestAnimationFrame(() => { setHost(container); setPortalParent(container.closest<HTMLElement>('dialog:modal') ?? document.body); });
    const move = (event: Event) => {
      const destination = (event as CustomEvent<HTMLElement | null>).detail ?? outer();
      destination?.append(container); setPortalParent(container.closest<HTMLElement>('dialog:modal') ?? document.body);
    };
    window.addEventListener('slotly:account-host', move);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('slotly:account-host', move); container.remove(); };
  }, []);
  const getContainer = useCallback(() => portalParent, [portalParent]);
  return host && createPortal(<UNSAFE_PortalProvider getContainer={getContainer}>{children}</UNSAFE_PortalProvider>, host);
}
