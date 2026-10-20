import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/site-shell";
import { BusinessProfile } from "@/components/business-profile";
import { ConvexClientProvider } from "@/components/convex-client-provider";

export const metadata: Metadata = { title: "Dashboard" };

// Clerk verifies this private route at request time. Keep navigation validation
// from treating its client auth provider as a prerendering failure.
export const instant = false;

// Send one server-generated list so browser and server time-zone databases
// cannot produce different options during hydration.
const timeZones = [...Intl.supportedValuesOf("timeZone"), "UTC"].sort();

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
        <ConvexClientProvider>
          <BusinessProfile timeZones={timeZones} />
        </ConvexClientProvider>
      </main>
    </SiteShell>
  );
}
