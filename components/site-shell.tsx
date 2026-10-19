import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

type SiteShellProps = {
  children?: ReactNode;
  account?: ReactNode;
  loading?: boolean;
};

export function SiteShell({ children, account, loading = false }: SiteShellProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 sm:px-10">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Saltar al contenido
      </a>
      <header className="flex min-h-14 items-center justify-between gap-5 border-b border-line">
        <Brand />
        {account}
      </header>
      {loading ? (
        <main id="main-content" className="flex flex-1 items-center justify-center py-20">
          <p role="status" className="text-muted">Cargando tu espacio…</p>
        </main>
      ) : children}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs leading-5 text-muted">
        <p>Slotly · Tu tiempo cuenta.</p>
        <p>Un lugar para empezar a organizarte.</p>
      </footer>
    </div>
  );
}
