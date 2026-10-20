import * as z from "zod";

export const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
const localTime = /^([01]\d|2[0-3]):[0-5]\d$/;

export const weeklyScheduleSchema = z.strictObject({
  days: z.array(z.strictObject({
    dayOfWeek: z.number().int().min(1).max(7),
    isOpen: z.boolean(),
    start: z.string(),
    end: z.string(),
  })).length(7, "La semana debe incluir sus siete días una sola vez."),
}).superRefine(({ days }, ctx) => {
  if (new Set(days.map((day) => day.dayOfWeek)).size !== 7) {
    ctx.addIssue({ code: "custom", path: ["days"], message: "Incluye cada día de la semana una sola vez." });
  }
  days.forEach((day, index) => {
    // Disabled controls may still hold an old draft. Closed days do not require
    // times; both are normalized to null after validation, also on the server.
    if (!day.isOpen) return;
    for (const field of ["start", "end"] as const) {
      if (!localTime.test(day[field])) {
        ctx.addIssue({ code: "custom", path: ["days", index, field], message: "Escribe una hora válida (HH:mm)." });
      }
    }
    if (localTime.test(day.start) && localTime.test(day.end) && day.end <= day.start) {
      ctx.addIssue({ code: "custom", path: ["days", index, "end"], message: "El cierre debe ser posterior a la apertura, dentro del mismo día." });
    }
  });
}).transform(({ days }) => ({
  days: [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((day) => ({
    ...day, start: day.isOpen ? day.start : null, end: day.isOpen ? day.end : null,
  })),
}));

export type WeeklyScheduleFormValues = z.input<typeof weeklyScheduleSchema>;
export type WeeklyScheduleValues = z.output<typeof weeklyScheduleSchema>;

export function scheduleFormValues(schedule: WeeklyScheduleValues | null): WeeklyScheduleFormValues {
  return {
    days: schedule === null
      ? weekDays.map((_, index) => ({ dayOfWeek: index + 1, isOpen: false, start: "", end: "" }))
      : [...schedule.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
        .map((day) => ({ ...day, start: day.start ?? "", end: day.end ?? "" })),
  };
}
