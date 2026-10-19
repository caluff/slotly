import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<SiteShell loading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // Check the session here, before reading user data or rendering protected UI.
  await auth.protect();
  const user = await currentUser();
  const name = user?.firstName || user?.fullName || user?.username;

  return (
    <SiteShell
      account={
        <UserButton />
      }
    >
      <main id="main-content" className="flex-1 py-12 sm:py-20">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Bienvenido{name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-4 leading-7 text-muted">Este es tu espacio en Slotly.</p>
        <section aria-labelledby="workspace-heading" className="mt-12 rounded-md border border-dashed border-line px-6 py-16 text-center sm:py-24">
          <h2 id="workspace-heading" className="text-xl font-medium">Aquí empieza tu organización</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
            Este espacio está reservado para las próximas funcionalidades de Slotly.
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
