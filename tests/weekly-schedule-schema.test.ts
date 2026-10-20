import { describe, expect, test } from "vitest";
import { scheduleFormValues, weeklyScheduleSchema } from "../lib/weekly-schedule-schema";

const closedWeek = () => scheduleFormValues(null);
function openWeek() {
  const values = closedWeek();
  values.days[0] = { dayOfWeek: 1, isOpen: true, start: "09:00", end: "17:30" };
  return values;
}

describe("formulario del horario semanal", () => {
  test("no inventa tramos; una semana cerrada es válida y normaliza sus horas", () => {
    const values = closedWeek();
    expect(values.days).toHaveLength(7);
    expect(values.days.every((day) => !day.isOpen && day.start === "" && day.end === "")).toBe(true);
    values.days[3].start = "valor anterior incompleto";
    values.days[3].end = "23:99";
    const parsed = weeklyScheduleSchema.parse(values);
    expect(parsed.days.every((day) => day.start === null && day.end === null)).toBe(true);
  });

  test("ordena días ISO y conserva horas locales al recuperar el formulario", () => {
    const values = openWeek();
    values.days.reverse();
    const parsed = weeklyScheduleSchema.parse(values);
    expect(parsed.days.map((day) => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scheduleFormValues(parsed)).toEqual(openWeek());
  });

  test.each(["", " ", "9:00", "24:00", "12:60", "-1:00", "09:00:00", "09:00Z", "2026-10-20T09:00", "09:00 "])
    ("rechaza apertura inválida %j con error en el campo", (start) => {
      const values = openWeek();
      values.days[0].start = start;
      const result = weeklyScheduleSchema.safeParse(values);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual(["days", 0, "start"]);
    });

  test.each(["", "24:00", "09:00", "08:59", "02:00"])("rechaza cierre incompleto, igual o anterior %j", (end) => {
    const values = openWeek();
    values.days[0].end = end;
    const result = weeklyScheduleSchema.safeParse(values);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["days", 0, "end"]);
  });

  test("acepta límites del mismo día, incluso un minuto, sin transformar a UTC", () => {
    const values = openWeek();
    values.days[0].start = "00:00";
    values.days[0].end = "23:59";
    values.days[6] = { dayOfWeek: 7, isOpen: true, start: "23:58", end: "23:59" };
    const parsed = weeklyScheduleSchema.parse(values);
    expect(parsed.days[0]).toEqual(values.days[0]);
    expect(parsed.days[6]).toEqual(values.days[6]);
  });

  test.each(["missing", "extra", "duplicate", "range", "fraction", "wrong-type", "extra-field"])
    ("rechaza estructura semanal manipulada: %s", (kind) => {
      const values = openWeek();
      if (kind === "missing") values.days.pop();
      if (kind === "extra") values.days.push({ ...values.days[0] });
      if (kind === "duplicate") values.days[6].dayOfWeek = 1;
      if (kind === "range") values.days[6].dayOfWeek = 8;
      if (kind === "fraction") values.days[6].dayOfWeek = 6.5;
      if (kind === "wrong-type") Object.assign(values.days[0], { isOpen: "true" });
      if (kind === "extra-field") Object.assign(values.days[0], { ownerId: "forged" });
      expect(weeklyScheduleSchema.safeParse(values).success).toBe(false);
    });
});
