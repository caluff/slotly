"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="class" storageKey="slotly-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>{children}</ThemeProvider>;
}
