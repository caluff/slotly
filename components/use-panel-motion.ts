"use client";

import { useEffectEvent, useLayoutEffect, useRef } from "react";

// Keep native dialogs mounted through exit. Each effect owns its animation, so
// reversing or changing modality cannot let an old completion close a new panel.
export function usePanelMotion({ open, modal, side, onShow, onHide, onClosed }: {
  open: boolean; modal: boolean; side: "left" | "right";
  onShow?: (dialog: HTMLDialogElement) => void; onHide?: () => void; onClosed?: () => void;
}) {
  const panel = useRef<HTMLDialogElement>(null);
  const previousModal = useRef(modal), initialized = useRef(false);
  const shown = useEffectEvent((dialog: HTMLDialogElement) => onShow?.(dialog));
  const hidden = useEffectEvent(() => onHide?.());
  const closed = useEffectEvent(() => onClosed?.());
  useLayoutEffect(() => {
    const dialog = panel.current; if (!dialog) return;
    const initial = !initialized.current; initialized.current = true;
    const changedMode = previousModal.current !== modal; previousModal.current = modal;
    if (changedMode && dialog.open) { hidden(); dialog.close(); }
    if (!open && !dialog.open) { dialog.dataset.motion = "closed"; return; }
    const alreadyOpen = dialog.open;
    const resuming = alreadyOpen && dialog.inert;
    const offset = `translateX(${side === "left" ? "-" : ""}100%)`;
    const from = alreadyOpen ? { transform: getComputedStyle(dialog).transform, opacity: getComputedStyle(dialog).opacity } : { transform: offset, opacity: "0" };
    dialog.inert = !open; dialog.style.pointerEvents = open ? "" : "none";
    dialog.dataset.motion = open ? "opening" : "closing";
    if (open && !dialog.open) { if (modal) dialog.showModal(); else dialog.show(); }
    if (open && (!alreadyOpen || changedMode || resuming)) shown(dialog);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let live = true, settled = false, animation: Animation | undefined;
    const finish = () => {
      if (!live || settled) return;
      settled = true;
      dialog.style.transform = ""; dialog.style.opacity = "";
      dialog.dataset.motion = open ? "open" : "closed";
      if (!open) { hidden(); dialog.close(); closed(); }
      animation?.cancel();
    };
    if (media.matches || (initial && !modal) || changedMode) finish();
    else {
      animation = dialog.animate([from, { transform: open ? "translateX(0)" : offset, opacity: open ? "1" : "0" }], { duration: 200, easing: "ease-out", fill: "both" });
      void animation.finished.then(finish, () => {});
    }
    const reduce = () => { if (media.matches) finish(); };
    media.addEventListener("change", reduce);
    return () => {
      live = false; media.removeEventListener("change", reduce);
      if (animation?.playState === "running") {
        const current = getComputedStyle(dialog);
        dialog.style.transform = current.transform; dialog.style.opacity = current.opacity;
      }
      animation?.cancel();
    };
  }, [open, modal, side]);
  return panel;
}
