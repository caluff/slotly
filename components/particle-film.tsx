"use client";

import { useEffect, useRef } from "react";

export function ParticleFilm() {
  const first = useRef<HTMLVideoElement>(null), second = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const a = first.current, b = second.current;
    if (!a || !b) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, synchronized = false, live = true;
    function draw() {
      if (!a || !b || !live) return;
      if (Number.isFinite(a.duration) && a.duration > 0 && synchronized) {
        // Each video's wrap occurs while the other layer completely covers it.
        const opacity = Math.sin(Math.PI * a.currentTime / a.duration) ** 2;
        a.style.opacity = String(opacity);
        const expected = (a.currentTime + a.duration / 2) % a.duration;
        if (opacity > .999 && Math.abs(b.currentTime - expected) > .15 && !b.seeking) b.currentTime = expected;
      }
      if (!a.paused) frame = requestAnimationFrame(draw);
    }
    function animate() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }
    async function synchronize() {
      if (!a || !b || !live) return;
      cancelAnimationFrame(frame);
      if (a.readyState < 2 || b.readyState < 2 || !Number.isFinite(a.duration)) return;
      if (!synchronized) { synchronized = true; b.currentTime = (a.currentTime + a.duration / 2) % a.duration; }
      if (document.hidden || preference.matches) { a.pause(); b.pause(); return; }
      try { await Promise.all([a.play(), b.play()]); if (live) animate(); }
      catch { if (live) { a.pause(); b.pause(); a.style.opacity = "1"; } }
    }
    a.addEventListener("canplay", synchronize); b.addEventListener("canplay", synchronize); a.addEventListener("play", animate);
    preference.addEventListener("change", synchronize); document.addEventListener("visibilitychange", synchronize);
    void synchronize();
    return () => { live = false; cancelAnimationFrame(frame); a.pause(); b.pause(); a.removeEventListener("canplay", synchronize); b.removeEventListener("canplay", synchronize); a.removeEventListener("play", animate); preference.removeEventListener("change", synchronize); document.removeEventListener("visibilitychange", synchronize); };
  }, []);
  return <div className="home-film" aria-hidden="true">
    <video ref={second} className="home-film-under" aria-hidden="true" tabIndex={-1} muted loop playsInline preload="auto"><source src="/media/particles-reference.mp4#t=0.001" type="video/mp4" /></video>
    <video ref={first} className="home-film-over" aria-hidden="true" tabIndex={-1} muted loop playsInline preload="auto"><source src="/media/particles-reference.mp4#t=0.001" type="video/mp4" /></video>
    </div>;
}
