import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type Appointments = FunctionReturnType<typeof api.appointments.listMyAppointments>;

export function AppointmentList({ appointments, timeZone, date }: { appointments: Appointments | undefined; timeZone: string; date: string }) {
  const time = new Intl.DateTimeFormat("es-UY", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return <div className="mt-8 border-t border-line pt-6" aria-busy={appointments === undefined}>
    <h3 className="font-semibold">Citas del {date}</h3>
    <p className="mt-2 text-sm text-muted">Todos los servicios · {timeZone}</p>
    {appointments === undefined ? <p role="status" className="mt-4 text-sm text-muted">Cargando citas…</p>
      : appointments.length === 0 ? <p role="status" className="mt-4 rounded-md bg-surface p-5 text-sm text-muted">No hay citas para esta fecha.</p>
        : <ul aria-label="Citas confirmadas" className="mt-4 divide-y divide-line border-y border-line">
          {appointments.map((item) => <li key={item._id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 py-4">
            <div className="min-w-0"><p className="wrap-anywhere font-medium">{item.clientName}</p>
              <p className="wrap-anywhere text-sm text-muted">{item.serviceName} · Confirmada</p></div>
            <p className="shrink-0 text-sm tabular-nums"><time dateTime={new Date(item.start).toISOString()}>{time.format(item.start)}</time>
              {" – "}<time dateTime={new Date(item.end).toISOString()}>{time.format(item.end)}</time></p>
          </li>)}
        </ul>}
  </div>;
}
