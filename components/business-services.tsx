import { useMutation, usePaginatedQuery, type UsePaginatedQueryReturnType } from "convex/react";
import { ServiceForm } from "@/components/service-form";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ServiceValues } from "@/lib/service-schema";

type ServicesPanelProps = Pick<UsePaginatedQueryReturnType<typeof api.services.listMyServices>, "results" | "status"> & {
  onCreate: (values: ServiceValues) => Promise<unknown>;
  onLoadMore: () => void;
};

// Mounted only after the authenticated business query has found a profile.
// Convex still authorizes both operations independently of this UI gate.
export function BusinessServices() {
  const createService = useMutation(api.services.createMyService);
  const { results, status, loadMore } = usePaginatedQuery(
    api.services.listMyServices, {}, { initialNumItems: 20 },
  );

  return <ServicesPanel results={results} status={status} onCreate={createService} onLoadMore={() => loadMore(20)} />;
}

export function ServicesPanel({ results, status, onCreate, onLoadMore }: ServicesPanelProps) {
  return (
    <section aria-labelledby="services-heading" className="mt-10 max-w-2xl border-t border-line pt-8">
      <h2 id="services-heading" className="text-2xl font-semibold tracking-tight">Servicios</h2>
      <div className="mt-6">
        <ServiceForm onCreate={onCreate} />
      </div>
      <div className="mt-8" aria-busy={status === "LoadingFirstPage" || status === "LoadingMore"}>
        {status === "LoadingFirstPage" ? (
          <p role="status" className="text-sm text-muted">Cargando tus servicios…</p>
        ) : results.length === 0 ? (
          <p role="status" className="rounded-md bg-surface p-5 text-sm text-muted">Todavía no tienes servicios. Crea el primero.</p>
        ) : (
          <ul aria-label="Servicios de tu negocio" className="divide-y divide-line border-y border-line">
            {results.map((service) => (
              <li key={service._id} className="flex items-baseline justify-between gap-4 py-4">
                <span className="min-w-0 wrap-anywhere font-medium">{service.name}</span>
                <span className="shrink-0 text-sm text-muted tabular-nums">{service.durationMinutes} min</span>
              </li>
            ))}
          </ul>
        )}
        {(status === "CanLoadMore" || status === "LoadingMore") && (
          <Button type="button" variant="outline" disabled={status === "LoadingMore"}
            onClick={onLoadMore} className="mt-4 w-full sm:w-auto">
            {status === "LoadingMore" ? "Cargando servicios…" : "Cargar más servicios"}
          </Button>
        )}
        <p role="status" className="sr-only">{status === "LoadingMore" ? "Cargando más servicios." : ""}</p>
      </div>
    </section>
  );
}
