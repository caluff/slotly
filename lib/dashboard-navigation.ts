export const dashboardViews = ["agenda", "clientes", "servicios", "horario", "negocio", "personalizar"] as const;
export type DashboardView = typeof dashboardViews[number];

export function readDashboardView(value: string | null): DashboardView {
  return dashboardViews.find((view) => view === value) ?? "agenda";
}

export function dashboardHref(view: DashboardView, date?: string | null, source?: { toString(): string }) {
  const params = new URLSearchParams(source?.toString());
  if (view !== 'servicios') params.delete('crear');
  if (view !== "agenda") params.set("vista", view); else params.delete("vista");
  if (date) params.set("fecha", date); else params.delete("fecha");
  return `/dashboard${params.size ? `?${params}` : ""}`;
}

// The public demo shares the workspace UI, but navigation must stay on its own route.
export function currentWorkspaceHref(href: string) {
  if (typeof window !== "undefined" && window.location.pathname === "/demo") {
    const target = new URL(href, window.location.origin);
    if (target.origin === window.location.origin && target.pathname === "/dashboard") return `/demo${target.search}${target.hash}`;
  }
  return href;
}
