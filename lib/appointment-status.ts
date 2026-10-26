export const appointmentStatuses = ["confirmed", "completed", "cancelled", "no_show"] as const;
export type AppointmentStatus = typeof appointmentStatuses[number];
export type AppointmentResult = "completed" | "no_show";
export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};
export const appointmentStatusFilters: Record<AppointmentStatus, string> = {
  confirmed: "Confirmadas", completed: "Completadas", cancelled: "Canceladas", no_show: "No asistió",
};

// Existing single-state links keep their exact meaning. An absent predicate
// means all states; explicit subsets never acquire a newly introduced state.
export function selectedAppointmentStatuses(value?: string): readonly AppointmentStatus[] | null {
  if (!value) return appointmentStatuses;
  if (value === "none") return [];
  const parts = value.split(",");
  if (new Set(parts).size !== parts.length || parts.some(part => !appointmentStatuses.includes(part as AppointmentStatus))) return null;
  return appointmentStatuses.filter(status => parts.includes(status));
}

export function appointmentStatusSummary(value?: string) {
  const selected = selectedAppointmentStatuses(value);
  return !selected ? "Estado no válido" : selected.length === 4 ? "Todos los estados" : !selected.length
    ? "Ningún estado seleccionado" : selected.map(status => appointmentStatusFilters[status]).join(", ");
}
