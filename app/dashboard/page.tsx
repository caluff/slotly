import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessProfile } from "@/components/business-profile";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { DashboardSkeleton } from "@/components/loading-screens";

export const metadata: Metadata = { title: "Agenda" };
export const instant = false;
const timeZones = [...Intl.supportedValuesOf("timeZone"), "UTC"].sort();

export default function DashboardPage() {
  return <Suspense fallback={<DashboardSkeleton />}>
    <DashboardContent />
  </Suspense>;
}

async function DashboardContent() {
  // Every view and date uses this private route. Authenticate before rendering.
  await auth.protect();
  return <DashboardWorkspace account={<UserButton />}>
    <ConvexClientProvider><BusinessProfile timeZones={timeZones} /></ConvexClientProvider>
  </DashboardWorkspace>;
}
