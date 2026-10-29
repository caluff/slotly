"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <Button size="icon" variant="ghost" className="theme-toggle" aria-label="Cambiar tema" title="Alternar claro y oscuro"
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    <span className="theme-toggle-day"><ThemeIcon mode="light" /></span><span className="theme-toggle-night"><ThemeIcon mode="dark" /></span>
  </Button>;
}

function ThemeIcon({ mode }: { mode: "light" | "dark" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {mode === "light" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />}
  </svg>;
}
