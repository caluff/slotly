"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { BusinessServices } from "@/components/business-services";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

type BusinessProfileProps = { timeZones: string[] };

export function BusinessProfile({ timeZones }: BusinessProfileProps) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return <p role="status" className="py-10 text-muted">Comprobando tu acceso al negocio…</p>;
  }
  if (!isAuthenticated) {
    return (
      <div className="mt-10 max-w-xl space-y-4">
        <p role="alert" className="leading-7 text-muted">
          No pudimos verificar tu acceso al negocio. Vuelve a iniciar sesión. Si el problema continúa, revisa la conexión con Convex.
        </p>
        <Link href="/sign-in" className="button-secondary">Volver a iniciar sesión</Link>
      </div>
    );
  }

  return <AuthenticatedBusinessProfile timeZones={timeZones} />;
}

function AuthenticatedBusinessProfile({ timeZones }: BusinessProfileProps) {
  const business = useQuery(api.businesses.getMyBusiness, {});

  if (business === undefined) {
    return <p role="status" className="py-10 text-muted">Cargando el perfil de tu negocio…</p>;
  }

  return (
    <>
    <section aria-labelledby="business-heading" className="mt-10 max-w-2xl border-t border-line pt-8 sm:mt-12">
      {business === null ? (
        <CreateBusinessForm timeZones={timeZones} />
      ) : (
        <>
          <h2 id="business-heading" className="text-2xl font-semibold tracking-tight">Tu negocio</h2>
          <p role="status" className="sr-only">El perfil de tu negocio está guardado.</p>
          <dl className="mt-6 rounded-md bg-surface p-6 sm:p-8">
            <div>
              <dt className="text-sm font-medium text-muted">Nombre del negocio o profesional</dt>
              <dd className="mt-2 text-xl font-semibold">{business.name}</dd>
            </div>
            <div className="mt-6">
              <dt className="text-sm font-medium text-muted">Zona horaria</dt>
              <dd className="mt-2">{business.timeZone}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
    {business !== null && <BusinessServices key={business._id} />}
    </>
  );
}

function CreateBusinessForm({ timeZones }: BusinessProfileProps) {
  const createBusiness = useMutation(api.businesses.createMyBusiness);
  return <BusinessProfileForm timeZones={timeZones} onCreate={createBusiness} />;
}
