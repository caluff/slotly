"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { createHomeCalendarScene, SheetTarget } from "@/lib/home-calendar-scene";

const locale = "es-UY";
const monthFormat = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
const fullDateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" });
const tearDuration = 1320;
const formationDuration = 2050;
const velocityWindow = 94;

type Drag = { id: number; x: number; y: number; yaw: number; axis?: "horizontal" | "vertical" };
type PointerSample = { x: number; time: number };
type SheetDrag = Omit<Drag, "yaw"> & {
  sheetId: number;
  button: HTMLButtonElement;
  lastX: number;
  samples: PointerSample[];
};

function horizontalVelocity(samples: PointerSample[], now: number) {
  const last = samples[samples.length - 1];
  const first = samples[0];
  const sinceMovement = now - last.time;
  const freshness = Math.max(0, 1 - Math.max(0, sinceMovement - 30) / 85);
  const duration = Math.min(velocityWindow, Math.max(12, last.time - first.time));
  const speed = (last.x - first.x) / duration * freshness;
  return Math.abs(speed) < 0.045 ? 0 : speed;
}

function localDay() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function subscribeToLocalDay(notify: () => void) {
  let timeout: number;

  function refresh() {
    notify();
    clearTimeout(timeout);
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // Also detect adjustments to the clock or time zone while the tab stays open.
    timeout = window.setTimeout(refresh, Math.min(60000, midnight.getTime() - now.getTime()));
  }

  refresh();
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);

  return () => {
    clearTimeout(timeout);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

function serverDay() {
  return null;
}

function formatCalendarDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return {
    iso,
    year: date.getUTCFullYear(),
    month: monthFormat.format(date).toLocaleUpperCase(locale),
    day: date.getUTCDate(),
    weekday: weekdayFormat.format(date).toLocaleUpperCase(locale),
    full: fullDateFormat.format(date),
  };
}

function nextDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function HomeParticleCalendar() {
  const day = useSyncExternalStore(subscribeToLocalDay, localDay, serverDay);
  const [preview, setPreview] = useState<{ today: string; date: string }>();
  const [sheets, setSheets] = useState<SheetTarget[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const airborneRef = useRef<HTMLButtonElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const syncDay = useRef<((day: string) => void) | null>(null);
  const helpId = useId();
  const sheetHelpId = useId();
  const displayDay = preview?.today === day ? preview.date : day;
  const date = displayDay ? formatCalendarDate(displayDay) : null;

  useEffect(() => {
    if (day) syncDay.current?.(day);
  }, [day]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const stage = stageRef.current!;
    const sheetControls = sheetsRef.current!;
    const airborne = airborneRef.current!;
    const button = buttonRef.current!;
    const container = canvas.parentElement!;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scene: ReturnType<typeof createHomeCalendarScene> | undefined;
    let disposed = false;
    let requested = false;
    let visible = false;
    let contextLost = false;
    let sized = false;
    let frame = 0;
    let time = 0;
    let lastFrame = 0;
    let formationElapsed = 0;
    let today = localDay();
    let calendarDay = today;
    let yaw = 0;
    let drag: Drag | undefined;
    let sheetDrag: SheetDrag | undefined;
    let keyboardSheet: number | undefined;
    let suppressPointerClick = false;
    let tear: { date: string; start: number; yaw: number; shownAt: number; heldAt?: number } | undefined;

    function updateAirborne(target: SheetTarget | null) {
      airborne.hidden = !target;
      if (!target) return;
      const { left, top, width, height, clipPath } = target;
      Object.assign(airborne.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, clipPath });
    }

    function render(progress = 0, now = performance.now()) {
      if (!scene || contextLost || !sized) return;
      if (reducedMotion.matches) formationElapsed = formationDuration;
      const formation = formationElapsed / formationDuration;
      const movedSheets = scene.draw(reducedMotion.matches ? 0 : time, yaw, progress, now, formation);
      container.toggleAttribute("data-forming", formation < 1);
      if (container.dataset.rendered === undefined) {
        delete container.dataset.fallback;
        container.dataset.rendered = "";
      }
      if (movedSheets) setSheets(scene.sheetTargets());
      updateAirborne(scene.airborneTarget());
    }

    function showToday(day: string) {
      if (day === today) return;
      today = day;
      calendarDay = day;
      tear = undefined;
      releasePointer();
      keyboardSheet = undefined;
      setPreview(undefined);
      setSheets([]);
      scene?.setDate(formatCalendarDate(day));
      render();
    }

    function completeTear(date: string, now = performance.now()) {
      if (sheetDrag?.sheetId === -1) releasePointer();
      calendarDay = date;
      tear = undefined;
      yaw = 0;
      scene?.finishTear(now, reducedMotion.matches);
      updateAirborne(null);
      if (scene) setSheets(scene.sheetTargets());
      setPreview({ today, date });
    }

    function animate(timestamp: number) {
      const elapsed = lastFrame ? timestamp - lastFrame : 0;
      formationElapsed = Math.min(formationElapsed + elapsed, formationDuration);
      if (tear) {
        tear.shownAt = tear.heldAt ?? timestamp;
        const progress = Math.min(Math.max(0, tear.shownAt - tear.start) / tearDuration, 1);
        const turn = Math.min(progress / 0.27, 1);
        yaw = tear.yaw * (1 - turn) ** 3;
        if (progress === 1) completeTear(tear.date, timestamp);
        render(progress, timestamp);
      } else {
        render(0, timestamp);
      }
      time = (time + Math.min(elapsed, 50)) % 12000;
      lastFrame = timestamp;
      frame = requestAnimationFrame(animate);
    }

    function synchronize() {
      cancelAnimationFrame(frame);
      lastFrame = 0;
      if (tear && (contextLost || !visible || document.hidden || reducedMotion.matches)) completeTear(tear.date);
      if (!scene || contextLost || !visible || document.hidden) return;
      if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
      else render();
    }

    function resize() {
      if (!scene || contextLost || !canvas.clientWidth || !canvas.clientHeight || !stage.clientHeight) return;
      const canvasRect = canvas.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      scene.resize(
        canvas.clientWidth, canvas.clientHeight,
        stageRect.left - canvasRect.left + stageRect.width / 2,
        stageRect.top - canvasRect.top + stageRect.height / 2,
        stageRect.height,
      );
      sized = true;
      setSheets(scene.sheetTargets());
      if (!tear) render();
    }

    function onClick(event: MouseEvent) {
      if (tear || sheetDrag || container.hasAttribute("data-forming") || (event.detail !== 0 && suppressPointerClick)) return;
      showToday(localDay());
      const date = nextDate(calendarDay);
      scene?.beginTear(formatCalendarDate(date));
      if (scene && !contextLost && visible && !document.hidden && !reducedMotion.matches) {
        const now = performance.now();
        tear = { date, start: now, shownAt: now, yaw };
        return;
      }
      completeTear(date);
      render();
    }

    function onPointerDown(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || sheetDrag) return;
      suppressPointerClick = false;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw };
      button.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.axis && Math.hypot(dx, dy) >= 7) {
        drag.axis = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
        suppressPointerClick = true;
      }
      if (drag.axis !== "horizontal" || !scene || contextLost || tear) return;

      button.dataset.dragging = "";
      const angle = drag.yaw + dx * Math.PI / button.clientWidth;
      yaw = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (reducedMotion.matches) render();
    }

    function onPointerUp(event: PointerEvent) {
      onPointerMove(event);
      endDrag(event);
    }

    function endDrag(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      drag = undefined;
      delete button.dataset.dragging;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!scene || contextLost || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      if (tear) return;
      const angle = yaw + (event.key === "ArrowRight" ? 1 : -1) * Math.PI / 8;
      yaw = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (reducedMotion.matches) render();
    }

    function moveSheet(id: number, dx: number) {
      if (id === -1) {
        scene?.moveAirborne(dx);
        updateAirborne(scene?.airborneTarget() ?? null);
        return;
      }
      const target = scene?.moveSheet(id, dx);
      if (!target) return;
      setSheets(current => current.map(sheet => sheet.id === id ? target : sheet));
      if (reducedMotion.matches) render();
    }

    function onSheetDown(event: PointerEvent) {
      const target = event.target;
      if (!scene || contextLost || drag || sheetDrag || !event.isPrimary || event.button !== 0 ||
          !(target instanceof HTMLButtonElement)) return;
      const sheetId = target === airborne ? -1 : Number(target.dataset.sheetId);
      if (sheetId === -1 ? !tear || airborne.hidden : !Number.isInteger(sheetId)) return;

      releaseKeyboardSheet();
      const now = performance.now();
      if (sheetId === -1 && tear) {
        tear.heldAt = tear.shownAt;
        scene.holdAirborne();
        event.preventDefault();
      } else {
        scene.liftSheet(sheetId, now, reducedMotion.matches);
        setSheets(scene.sheetTargets());
        if (reducedMotion.matches) render();
      }

      sheetDrag = {
        id: event.pointerId, sheetId, button: target, x: event.clientX, y: event.clientY,
        lastX: event.clientX, samples: [{ x: event.clientX, time: now }],
      };
      target.dataset.dragging = "";
      target.setPointerCapture(event.pointerId);
    }

    function onSheetMove(event: PointerEvent) {
      if (sheetDrag?.id !== event.pointerId) return;
      const dx = event.clientX - sheetDrag.x;
      const dy = event.clientY - sheetDrag.y;
      if (!sheetDrag.axis && Math.hypot(dx, dy) >= 5) {
        sheetDrag.axis = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
      }
      if (sheetDrag.axis !== "horizontal" || event.clientX === sheetDrag.lastX) return;
      const now = performance.now();
      const samples = sheetDrag.samples;
      samples.push({ x: event.clientX, time: now });
      while (samples.length > 2 && now - samples[0].time > velocityWindow) samples.shift();
      scene?.setDragSpeed(sheetDrag.sheetId, horizontalVelocity(samples, now), now);
      moveSheet(sheetDrag.sheetId, event.clientX - sheetDrag.lastX);
      sheetDrag.lastX = event.clientX;
    }

    function releasePointer() {
      const held = sheetDrag;
      if (!held) return;
      sheetDrag = undefined;
      delete held.button.dataset.dragging;
      if (held.button.hasPointerCapture(held.id)) held.button.releasePointerCapture(held.id);
    }

    function endSheetDrag(event: PointerEvent) {
      if (sheetDrag?.id !== event.pointerId) return;
      const { sheetId, axis, samples } = sheetDrag;
      releasePointer();
      const now = performance.now();
      const velocity = event.type === "pointerup" && axis === "horizontal" && !reducedMotion.matches
        ? horizontalVelocity(samples, now) : 0;
      if (sheetId === -1) {
        if (tear?.heldAt !== undefined) {
          scene?.releaseAirborne(now, tearDuration - (tear.heldAt - tear.start), velocity);
          tear.start += now - tear.heldAt;
          tear.heldAt = undefined;
        }
      } else {
        settleSheet(sheetId, now, velocity);
      }
    }

    function onSheetUp(event: PointerEvent) {
      onSheetMove(event);
      endSheetDrag(event);
    }

    function onSheetKey(event: KeyboardEvent) {
      const target = event.target;
      if (contextLost || sheetDrag || !(target instanceof HTMLButtonElement) || target.dataset.sheetId === undefined ||
          (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      event.preventDefault();
      moveSheet(Number(target.dataset.sheetId), (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 56 : 16));
    }

    function settleSheet(id: number, now = performance.now(), velocity = 0) {
      if (!scene) return;
      scene.lowerSheet(id, now, reducedMotion.matches, velocity);
      setSheets(scene.sheetTargets());
      if (reducedMotion.matches) render();
    }

    function releaseKeyboardSheet() {
      if (keyboardSheet === undefined) return;
      settleSheet(keyboardSheet);
      keyboardSheet = undefined;
    }

    function onSheetClick(event: MouseEvent) {
      const target = event.target;
      if (!scene || contextLost || sheetDrag || event.detail !== 0 ||
          !(target instanceof HTMLButtonElement) || target.dataset.sheetId === undefined) return;
      const id = Number(target.dataset.sheetId);
      if (keyboardSheet === id) {
        releaseKeyboardSheet();
      } else {
        releaseKeyboardSheet();
        keyboardSheet = id;
        scene.liftSheet(id, performance.now(), reducedMotion.matches);
        setSheets(scene.sheetTargets());
        if (reducedMotion.matches) render();
      }
    }

    function showFallback() {
      formationElapsed = formationDuration;
      delete container.dataset.forming;
      delete container.dataset.rendered;
      container.dataset.fallback = "";
    }

    function loseContext() {
      contextLost = true;
      showFallback();
      if (sheetDrag && sheetDrag.sheetId !== -1) {
        settleSheet(sheetDrag.sheetId);
        releasePointer();
      }
      releaseKeyboardSheet();
      synchronize();
    }

    function restoreContext() {
      contextLost = false;
      resize();
      synchronize();
    }

    async function loadScene() {
      try {
        const context = canvas.getContext("webgl2", { alpha: true, antialias: false });
        if (!context) {
          showFallback();
          return;
        }
        const { createHomeCalendarScene } = await import("@/lib/home-calendar-scene");
        if (disposed) return;
        scene = createHomeCalendarScene(canvas, context, formatCalendarDate(calendarDay));
        canvas.addEventListener("webglcontextlost", loseContext);
        canvas.addEventListener("webglcontextrestored", restoreContext);
        resize();
        synchronize();
      } catch {
        if (disposed) return;
        scene?.dispose();
        scene = undefined;
        showFallback();
      }
    }

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      synchronize();
      if (!visible || requested) return;
      requested = true;
      void loadScene();
    });
    const size = new ResizeObserver(resize);
    intersection.observe(stage);
    size.observe(canvas);
    size.observe(stage);
    syncDay.current = showToday;
    button.addEventListener("click", onClick);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", onPointerUp);
    button.addEventListener("pointercancel", endDrag);
    button.addEventListener("lostpointercapture", endDrag);
    button.addEventListener("keydown", onKeyDown);
    sheetControls.addEventListener("pointerdown", onSheetDown);
    sheetControls.addEventListener("pointermove", onSheetMove);
    sheetControls.addEventListener("pointerup", onSheetUp);
    sheetControls.addEventListener("pointercancel", endSheetDrag);
    sheetControls.addEventListener("lostpointercapture", endSheetDrag);
    sheetControls.addEventListener("keydown", onSheetKey);
    sheetControls.addEventListener("click", onSheetClick);
    sheetControls.addEventListener("focusout", releaseKeyboardSheet);
    reducedMotion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      intersection.disconnect();
      size.disconnect();
      reducedMotion.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
      canvas.removeEventListener("webglcontextlost", loseContext);
      canvas.removeEventListener("webglcontextrestored", restoreContext);
      scene?.dispose();
      syncDay.current = null;
      button.removeEventListener("click", onClick);
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerup", onPointerUp);
      button.removeEventListener("pointercancel", endDrag);
      button.removeEventListener("lostpointercapture", endDrag);
      button.removeEventListener("keydown", onKeyDown);
      sheetControls.removeEventListener("pointerdown", onSheetDown);
      sheetControls.removeEventListener("pointermove", onSheetMove);
      sheetControls.removeEventListener("pointerup", onSheetUp);
      sheetControls.removeEventListener("pointercancel", endSheetDrag);
      sheetControls.removeEventListener("lostpointercapture", endSheetDrag);
      sheetControls.removeEventListener("keydown", onSheetKey);
      sheetControls.removeEventListener("click", onSheetClick);
      sheetControls.removeEventListener("focusout", releaseKeyboardSheet);
      releasePointer();
      delete button.dataset.dragging;
      delete container.dataset.rendered;
      delete container.dataset.fallback;
      delete container.dataset.forming;
    };
  }, []);

  return (
    <div className="home-calendar">
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="sr-only" role="status">
        {date && <time dateTime={date.iso}>{date.full}</time>}
      </div>
      <p className="sr-only" id={helpId}>
        <span className="home-calendar-rotation-help">Arrastra para girar o usa las flechas izquierda y derecha. </span>
        Pulsa Enter o Espacio para pasar la hoja.
      </p>
      <div className="home-calendar-stage" ref={stageRef}>
        <button ref={buttonRef} type="button" className="home-calendar-control" aria-label="Pasar al día siguiente" aria-describedby={helpId} disabled={!date} />
        <div className="home-calendar-fallback" aria-hidden="true">
          {date && (
            <div className="home-calendar-paper">
              <span>{date.year}</span>
              <span>{date.month}</span>
              <strong>{date.day}</strong>
              <span>{date.weekday}</span>
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" id={sheetHelpId}>Arrastra la hoja o usa las flechas izquierda y derecha para moverla. Pulsa Enter o Espacio para levantarla o soltarla.</p>
      <div className="home-calendar-sheets" ref={sheetsRef}>
        {sheets.map(({ id, label, left, top, width, height, clipPath, layer }) => (
          <button key={id} type="button" className="home-calendar-sheet" data-sheet-id={id} aria-label={`Mover hoja del ${label}`}
            aria-describedby={sheetHelpId} style={{ left, top, width, height, clipPath, zIndex: layer }} />
        ))}
        <button ref={airborneRef} type="button" className="home-calendar-sheet home-calendar-airborne" data-airborne-sheet tabIndex={-1} aria-hidden="true" hidden />
      </div>
    </div>
  );
}
