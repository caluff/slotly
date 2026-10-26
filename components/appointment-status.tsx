import { Check, CheckCheck, UserX, X } from "@/components/ui/icons";
import { appointmentStatusLabels, type AppointmentStatus as Status } from "@/lib/appointment-status";

const icons = { confirmed: Check, completed: CheckCheck, cancelled: X, no_show: UserX };
export function AppointmentStatusIcon({ status }: { status: Status }) {
  const Icon = icons[status];
  return <Icon size={12} aria-hidden="true" className="agenda-status-icon" />;
}
export function AppointmentStatus({ status }: { status: Status }) {
  return <span className={`appointment-status-${status}`}>{appointmentStatusLabels[status]}</span>;
}
