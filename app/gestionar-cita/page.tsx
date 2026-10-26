import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { PublicBookingProvider } from "@/components/public-booking-provider";
import { PublicManagement } from "@/components/public-management";

export const metadata: Metadata = {
  title: "Gestionar cita",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default function Page() {
  return <>
    <header className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8"><Brand /></header>
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-4 sm:px-8 sm:pt-8">
      <Suspense fallback={<p role="status" className="text-muted">Cargando tu cita…</p>}>
        <PublicBookingProvider><PublicManagement /></PublicBookingProvider>
      </Suspense>
    </main>
  </>;
}
