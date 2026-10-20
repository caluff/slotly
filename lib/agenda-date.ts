import { isLocalDate } from "./local-date";

export function todayInZone(timeZone: string, now = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
}

export function shiftLocalDate(value: string, days: number): string | null {
  if (!isLocalDate(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const result = date.toISOString().slice(0, 10);
  return isLocalDate(result) ? result : null;
}

export function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat("es-UY", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}
