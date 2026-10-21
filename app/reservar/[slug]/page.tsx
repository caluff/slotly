import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { PublicBooking } from "@/components/public-booking";
import { PublicBookingProvider } from "@/components/public-booking-provider";

export const metadata: Metadata = { title: "Reservar cita", robots: { index: false, follow: false } };

async function Booking({ params }: Pick<PageProps<"/reservar/[slug]">, "params">) {
  const { slug } = await params;
  return <PublicBookingProvider><PublicBooking key={slug} slug={slug} /></PublicBookingProvider>;
}

export default function Page({ params }: PageProps<"/reservar/[slug]">) {
  return <>
    <header className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8"><Brand /></header>
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-4 sm:px-8 sm:pt-8">
      <Suspense fallback={<p role="status" className="text-muted">Cargando reservas…</p>}><Booking params={params} /></Suspense>
    </main>
  </>;
}
