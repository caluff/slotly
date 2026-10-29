import { Skeleton } from "@/components/ui/skeleton";
import "./loading-screens.css";

export function DashboardSkeleton({ embedded = false }: { embedded?: boolean }) {
  return <div className="loading-workspace" data-embedded={embedded} role="status" aria-label="Cargando agenda" aria-busy="true">
    <div className="loading-toolbar"><Skeleton className="loading-brand" /><Skeleton className="loading-date" /><Skeleton className="loading-view" /></div>
    <div className="loading-dashboard-body">
      <aside className="loading-filters"><Skeleton className="loading-mini" />{Array.from({ length: 4 }, (_, i) => <Skeleton className="loading-field" key={i} />)}</aside>
      <div className="loading-calendar"><div className="loading-days">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} />)}</div><div className="loading-calendar-grid"><Skeleton className="loading-appointment loading-appointment-first" /><Skeleton className="loading-appointment loading-appointment-second" /><Skeleton className="loading-appointment loading-appointment-third" /></div></div>
      {!embedded && <aside className="loading-rail">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} />)}</aside>}
    </div>
  </div>;
}

export function FormSkeleton({ compact = false, label }: { compact?: boolean; label?: string }) {
  return <div className="loading-form" role="status" aria-label={label ?? (compact ? "Cargando acceso" : "Cargando reservas")} aria-busy="true">
    <Skeleton className="loading-form-title" /><Skeleton className="loading-form-subtitle" />
    <div className="loading-form-content">{!compact && <Skeleton className="loading-booking-calendar" />}<div className="loading-form-fields">{Array.from({ length: compact ? 3 : 4 }, (_, i) => <Skeleton className="loading-field" key={i} />)}<Skeleton className="loading-submit" /></div></div>
  </div>;
}

export function ListSkeleton({ label }: { label: string }) {
  return <div className="loading-list" role="status" aria-label={label} aria-busy="true">
    {Array.from({ length: 3 }, (_, index) => <div className="loading-list-row" key={index}>
      <Skeleton className="loading-list-title" /><Skeleton className="loading-list-detail" />
    </div>)}
  </div>;
}

export function CalendarSkeleton() {
  return <div className="loading-calendar-overlay" role="status" aria-label="Cargando calendario" aria-busy="true">
    <div className="loading-days">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} />)}</div>
    <div className="loading-calendar-grid"><Skeleton className="loading-appointment loading-appointment-first" /><Skeleton className="loading-appointment loading-appointment-second" /></div>
  </div>;
}
