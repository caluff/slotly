import { CalendarDays } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type Appointments = FunctionReturnType<typeof api.appointments.listMyAppointments>;

export function AppointmentList({ appointments, timeZone, date }: { appointments: Appointments | undefined; timeZone: string; date: string }) {
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return <div aria-busy={appointments === undefined}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
      <h2 className="font-semibold">Citas del día</h2>
      <p role="status" className="text-sm text-muted">{appointments === undefined ? "Cargando…" : `${appointments.length} ${appointments.length === 1 ? "cita" : "citas"}`} · Todos los servicios</p>
    </div>
    {appointments === undefined ? <div role="status" className="space-y-4 py-8"><span className="sr-only">Cargando citas…</span><div className="h-14 rounded-md bg-surface" /><div className="h-14 rounded-md bg-surface/50" /></div>
      : appointments.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
        <CalendarDays aria-hidden="true" className="mb-5 size-8 text-muted" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold">Un día sin citas</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">No hay citas para esta fecha. Puedes consultar otro día o añadir una con «Nueva cita».</p>
      </div>
        : <ol aria-label={`Citas confirmadas del ${date}`} className="divide-y divide-line border-b border-line">
          {appointments.map((item) => <li key={item._id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-6 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-x-6">
            <div className="tabular-nums"><time className="text-lg font-semibold" dateTime={new Date(item.start).toISOString()}>{time.format(item.start)}</time>
              <p className="mt-1 text-sm text-muted"><time dateTime={new Date(item.end).toISOString()}>{time.format(item.end)}</time></p></div>
            <div className="min-w-0"><p className="wrap-anywhere font-semibold">{item.clientName}</p><p className="mt-1 wrap-anywhere text-sm text-muted">{item.serviceName}</p></div>
            <p className="col-start-2 flex items-center gap-2 text-xs text-accent sm:col-start-auto"><span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />Confirmada</p>
          </li>)}
        </ol>}
  </div>;
}
