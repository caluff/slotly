import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

type AuthShellProps = {
  children: ReactNode;
  label: string;
};

export function AuthShell({ children, label }: AuthShellProps) {
  return (
    <div className="flex min-h-svh items-center bg-surface/60 p-4 sm:p-8 xl:p-12">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Saltar al contenido
      </a>
      <main id="main-content" className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-md bg-background lg:min-h-184 lg:grid-cols-2">
        <section aria-label={label} className="flex min-w-0 flex-col px-6 py-8 sm:px-12 sm:py-10 xl:px-16 xl:py-12">
          <header className="mx-auto flex w-full max-w-sm items-center justify-between">
            <Brand />
            <ThemeToggle />
          </header>

          <div className="mx-auto flex w-full max-w-sm flex-1 items-center py-12 sm:py-14">
            {children}
          </div>

          <footer className="mx-auto flex w-full max-w-sm flex-wrap items-center justify-between gap-4 text-xs text-muted">
            <Link href="/" className="text-link inline-flex min-h-6 items-center gap-2">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 5-7 7 7 7M5 12h14" />
              </svg>
              Volver al inicio
            </Link>
            <p>Tu tiempo cuenta.</p>
          </footer>
        </section>

        <div aria-hidden="true" className="relative hidden bg-surface lg:block">
          <Image
            src="/login-workspace.png"
            alt=""
            fill
            sizes="(min-width: 1248px) 576px, (min-width: 1024px) calc(50vw - 32px), 1px"
            className="object-cover"
          />
        </div>
      </main>
    </div>
  );
}
