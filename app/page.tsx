import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";

export default function Home() {
  return (
    <Suspense fallback={<SiteShell loading />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { isAuthenticated } = await auth();
  const user = isAuthenticated ? await currentUser() : null;
  const name = user?.firstName || user?.fullName || user?.username;

  return (
    <SiteShell
      account={
        isAuthenticated ? (
          <UserButton />
        ) : (
          <Link className="text-link text-sm" href="/sign-in">
            Iniciar sesión <span aria-hidden="true">↗</span>
          </Link>
        )
      }
    >
      <main id="main-content" className="grid flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div className="max-w-2xl">
          <h1 className="text-balance text-5xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            Gestiona tus citas de forma <span className="text-accent">sencilla.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-muted">
            Un espacio para profesionales y negocios que quieren organizar mejor su tiempo.
          </p>
        </div>

        <section aria-labelledby="account-heading" className="rounded-md bg-surface p-7 sm:p-10 lg:py-12">
          <div aria-hidden="true" className="mb-10 flex size-12 items-center justify-center rounded-md bg-accent text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="16" rx="3" />
              <path d="M8 3v4m8-4v4M4 11h16m-12 5 2 2 5-4" />
            </svg>
          </div>
          <h2 id="account-heading" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            {isAuthenticated ? `Bienvenido${name ? `, ${name}` : ""}.` : "Tu tiempo, mejor organizado."}
          </h2>
          <p className="mt-3 leading-7 text-muted">
            {isAuthenticated
              ? "Qué bueno tenerte de vuelta. Ya puedes entrar a tu espacio."
              : "Crea tu cuenta en Slotly o inicia sesión para entrar a tu espacio."}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard" prefetch={false} className="button-primary">
                Ir al dashboard <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="button-primary">
                  Crear cuenta <span aria-hidden="true">→</span>
                </Link>
                <Link href="/sign-in" className="button-secondary">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">
            {isAuthenticated
              ? "Gestiona tu cuenta y cierra sesión desde tu perfil."
              : "Todo empieza con tu cuenta."}
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
