"use client";

import { useEffect } from "react";

const checkedEvents = new WeakSet<MouseEvent>();
let discarding = false;

export function leaveWithoutDrafts(href: string) {
  discarding = true;
  window.location.assign(href);
}

// Views stay mounted inside the workspace. Warn when leaving the document.
// Drafts and personal data are never put in shared/browser storage.
export function useDraftWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { if (!discarding) { event.preventDefault(); event.returnValue = ""; } }
    function leave(event: MouseEvent) {
      if (checkedEvents.has(event)) return;
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin === location.origin && url.pathname === location.pathname) return;
      checkedEvents.add(event);
      event.preventDefault(); event.stopImmediatePropagation();
      window.dispatchEvent(new CustomEvent("slotly:leave-with-draft", { detail: link.href }));
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true); };
  }, [dirty]);
}
