import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoDashboard } from "@/components/demo-dashboard";

export const metadata: Metadata = { title: "Demo interactiva", robots: { index: false, follow: false } };

export default function DemoPage() { return <Suspense fallback={<p role="status">Cargando demo…</p>}><DemoDashboard /></Suspense>; }
