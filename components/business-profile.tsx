"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useLastDefined } from "@/components/use-last-defined";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { BusinessBookingLink } from "@/components/business-booking-link";
import { BusinessServices } from "@/components/business-services";
import { BusinessWeeklySchedule } from "@/components/business-weekly-schedule";
import { BusinessAvailability } from "@/components/business-availability";
import { WorkspaceLink } from "@/components/dashboard-workspace";
import { useRetryConvexAuth } from "@/components/convex-client-provider";
import { Button } from "@/components/ui/button";
import { readDashboardView } from "@/lib/dashboard-navigation";
import { api } from "@/convex/_generated/api";
import { WorkspacePanels } from "@/components/workspace-panel";

export function BusinessProfile({ timeZones }: { timeZones: string[] }) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const signedOut = isLoaded && isSignedIn === false;
  // Only an unresolved Clerk state may retain the previous identity. A
  // confirmed sign-out clears it and unmounts every private form below.
  const ownerId = useLastDefined(signedOut ? null : userId ?? undefined);
  const retryAccess = useRetryConvexAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [opened, setOpened] = useState(isAuthenticated);
  if (isAuthenticated && !opened) setOpened(true);
  return <>
    {isLoading && <p role="status" className="py-10 text-muted">Comprobando tu acceso al negocio…</p>}
    {!isLoading && !isAuthenticated && <div className="max-w-xl space-y-4 py-10">
    <h1 className="workspace-title">Recupera tu sesión</h1>
    <p role="alert" className="text-muted">No pudimos verificar tu acceso al negocio. Comprueba la conexión y reintenta. Si tu sesión venció, vuelve a iniciar sesión.</p>
    <div className="flex flex-wrap gap-3">
      <Button onClick={retryAccess} disabled={!isLoaded || !isSignedIn}>Reintentar acceso</Button>
      <Link href="/sign-in" target="_blank" rel="noopener noreferrer" className="button-secondary">Iniciar sesión en otra pestaña</Link>
    </div>
    <p className="text-sm text-muted">{signedOut ? "La sesión se cerró y se descartaron sus borradores." : "Los borradores siguen en esta pestaña mientras recuperas el acceso."}</p>
  </div>}
  {opened && ownerId && !signedOut && <div className="workspace-auth-content" hidden={!isAuthenticated}><AuthenticatedBusinessProfile key={ownerId} timeZones={timeZones} enabled={isAuthenticated} /></div>}
  </>;
}

function AuthenticatedBusinessProfile({ timeZones, enabled }: { timeZones: string[]; enabled: boolean }) {
  const business = useLastDefined(useQuery(api.businesses.getMyBusiness, enabled ? {} : "skip"));
  const params = useSearchParams();
  const active = readDashboardView(params.get("vista"));
  const createBusiness = useMutation(api.businesses.createMyBusiness);
  if (business === undefined) return <p role="status" className="py-10 text-muted">Cargando tu negocio…</p>;
  if (business === null) return <section className="max-w-xl py-4">
    <p className="mb-6 leading-7 text-muted">Empieza con tu negocio. Después podrás añadir servicios, definir tu horario y organizar las citas.</p>
    <BusinessProfileForm timeZones={timeZones} onCreate={createBusiness} />
  </section>;

  return <div key={business._id} className="workspace-business-content">
    {/* Keep each view mounted: back/forward and navigation preserve unsaved work. */}
    <section className="workspace-agenda" aria-label="Agenda"><BusinessAvailability businessName={business.name} timeZone={business.timeZone} enabled={enabled} /></section>
    <WorkspacePanels services={<BusinessServices enabled={enabled} />} schedule={<BusinessWeeklySchedule timeZone={business.timeZone} enabled={enabled} />} business={<>
      <h1 id="business-heading" tabIndex={-1} className="workspace-title">Negocio</h1>
      <p className="workspace-description">Los datos que definen tu espacio de trabajo.</p>
      <dl className="mt-8 max-w-2xl divide-y divide-line border-y border-line">
        <div className="py-5"><dt className="text-sm text-muted">Nombre del negocio o profesional</dt><dd className="mt-1 font-semibold wrap-anywhere">{business.name}</dd></div>
        <div className="py-5"><dt className="text-sm text-muted">Zona horaria</dt><dd className="mt-1 wrap-anywhere">{business.timeZone}</dd></div>
      </dl>
      <BusinessBookingLink enabled={enabled && active === "negocio"} />
      <p className="mt-6 max-w-prose text-sm leading-6 text-muted">Las fechas y horas de tu <WorkspaceLink view="agenda">agenda</WorkspaceLink> y tu <WorkspaceLink view="horario">horario de atención</WorkspaceLink> se muestran en esta zona.</p>
    </>} />
  </div>;
}
