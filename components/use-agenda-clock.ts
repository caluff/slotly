"use client";

import { useEffect, useState, type RefObject } from "react";

type TimedAppointment = { _id: string; status: string; start: number; end: number };
export function useAgendaClock(rows: TimedAppointment[], ready: boolean) {
  const [clock, setClock] = useState({ now: 0, visible: false });
  useEffect(() => {
    let timer: number;
    function update() {
      window.clearTimeout(timer);
      const now = Date.now(), visible = !document.hidden;
      setClock({ now, visible });
      if (!visible) return;
      let delay = 30_000;
      for (const row of rows) for (const boundary of [row.start - 15 * 60_000, row.start, row.end]) {
        if (boundary > now) delay = Math.min(delay, boundary - now);
      }
      timer = window.setTimeout(update, delay);
    }
    update(); document.addEventListener("visibilitychange", update); window.addEventListener("focus", update);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", update); window.removeEventListener("focus", update); };
  }, [rows, ready]);
  return clock;
}

export function upcomingAppointment(rows: TimedAppointment[], now: number) {
  if (!now) return undefined;
  return rows.filter(row => row.status === "confirmed" && row.start > now && row.start - now <= 15 * 60_000)
    .sort((a, b) => a.start - b.start || a._id.localeCompare(b._id))[0]?._id;
}

// Observe only the one candidate. Month popovers can render a second copy:
// choose one visible representation and never animate both or an entire group.
export function useUpcomingMotion(root: RefObject<HTMLDivElement | null>, candidate: string | undefined, active: boolean) {
  useEffect(() => {
    const surface = root.current; if (!surface || !candidate || !active) return;
    let target: HTMLElement | undefined, frame = 0;
    const intersection = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.target === target) target.toggleAttribute("data-upcoming-motion", entry.isIntersecting);
    }, { threshold: 0.1 });
    function find() {
      const candidates = [...surface!.querySelectorAll<HTMLElement>("[data-agenda-event]")].filter(element => element.dataset.agendaEvent === candidate && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      const next = candidates.find(element => element.closest(".agenda-more-popover")) ?? candidates[0];
      if (next === target) return;
      if (target) { intersection.unobserve(target); target.removeAttribute("data-upcoming-motion"); }
      target = next; if (target) intersection.observe(target);
    }
    const mutation = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(find); });
    mutation.observe(surface, { childList: true, subtree: true }); find();
    return () => { cancelAnimationFrame(frame); mutation.disconnect(); intersection.disconnect(); target?.removeAttribute("data-upcoming-motion"); };
  }, [root, candidate, active]);
}
