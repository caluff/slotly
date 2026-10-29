import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoDashboard } from "@/components/demo-dashboard";
import { DashboardSkeleton } from "@/components/loading-screens";

export const metadata: Metadata = { title: "Demo interactiva", robots: { index: false, follow: false } };

export default function DemoPage() { return <Suspense fallback={<DashboardSkeleton />}><DemoDashboard /></Suspense>; }
