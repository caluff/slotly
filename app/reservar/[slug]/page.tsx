import { ThemeToggle } from "@/components/theme-toggle";
import { FormSkeleton } from "@/components/loading-screens";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { PublicBooking } from "@/components/public-booking";
import { PublicBookingProvider } from "@/components/public-booking-provider";

export const metadata: Metadata = { title: "Reservar cita", robots: { index: false, follow: false }, referrer: "no-referrer" };

async function Booking({ params }: Pick<PageProps<"/reservar/[slug]">, "params">) {
  const { slug } = await params;
  return <PublicBookingProvider><PublicBooking key={slug} slug={slug} /></PublicBookingProvider>;
}

export default function Page({ params }: PageProps<"/reservar/[slug]">) {
  return <>
    <header className="mx-auto w-full max-w-2xl flex items-center justify-between px-5 py-6 sm:px-8"><Brand /><ThemeToggle /></header>
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-4 sm:px-8 sm:pt-8">
      <Suspense fallback={<FormSkeleton />}><Booking params={params} /></Suspense>
    </main>
  </>;
}
