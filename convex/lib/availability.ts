import { Temporal } from "@js-temporal/polyfill";
import { isLocalDate } from "../../lib/local-date";

type Day = { dayOfWeek: number; isOpen: boolean; start: string | null; end: string | null };
export type AvailabilityStatus = "available" | "unconfigured" | "week_closed" | "day_closed" | "past_date" | "empty" | "time_change";
export type Slot = { start: number; end: number; startTime: string; endTime: string };

// Reject instead of Temporal's default shifting/choosing an offset. This small
// challenge deliberately omits ambiguous endpoints and offset-crossing slots.
function uniqueInstant(local: Temporal.PlainDateTime, timeZone: string) {
  try {
    return local.toZonedDateTime(timeZone, { disambiguation: "reject" });
  } catch (cause) {
    if (cause instanceof RangeError) return null;
    throw cause;
  }
}

export function generateAvailability(input: {
  date: string; timeZone: string; durationMinutes: number; days: Day[] | null; now: number;
  specialDay?: { isOpen: boolean; start: string | null; end: string | null } | null;
}) {
  if (!isLocalDate(input.date)) throw new Error("INVALID_DATE");
  if (!Number.isSafeInteger(input.durationMinutes) || input.durationMinutes <= 0) throw new Error("INVALID_DURATION");
  const date = Temporal.PlainDate.from(input.date, { overflow: "reject" });
  const today = Temporal.Instant.fromEpochMilliseconds(input.now).toZonedDateTimeISO(input.timeZone).toPlainDate();
  const slots: Slot[] = [];
  let omittedForTimeChange = false;
  const result = (status: AvailabilityStatus) => ({ status, slots, omittedForTimeChange });
  if (!input.specialDay && input.days === null) return result("unconfigured");
  if (!input.specialDay && input.days?.every((day) => !day.isOpen)) return result("week_closed");
  if (Temporal.PlainDate.compare(date, today) < 0) return result("past_date");
  const day = input.specialDay ?? input.days?.find((item) => item.dayOfWeek === date.dayOfWeek);
  if (!day?.isOpen) return result("day_closed");
  const openingLocal = date.toPlainDateTime(day.start!);
  const closingLocal = date.toPlainDateTime(day.end!);
  const opening = uniqueInstant(openingLocal, input.timeZone);
  const closing = uniqueInstant(closingLocal, input.timeZone);
  if (!opening || !closing) return { ...result("time_change"), omittedForTimeChange: true };

  // Compare BEFORE multiplication/addition: even MAX_SAFE_INTEGER duration is
  // supported by services. At most 96 local grid candidates, never duration-
  // proportional loops or unsafe epoch/duration arithmetic.
  const spanMinutes = (closing.epochMilliseconds - opening.epochMilliseconds) / 60_000;
  if (input.durationMinutes > spanMinutes) return result("empty");
  for (let local = openingLocal; Temporal.PlainDateTime.compare(local, closingLocal) < 0; local = local.add({ minutes: 15 })) {
    const start = uniqueInstant(local, input.timeZone);
    if (!start) { omittedForTimeChange = true; continue; }
    if (start.epochMilliseconds < input.now) continue;
    const end = start.add({ minutes: input.durationMinutes });
    if (end.epochMilliseconds > closing.epochMilliseconds) continue;
    const uniqueEnd = uniqueInstant(end.toPlainDateTime(), input.timeZone);
    if (!uniqueEnd || start.offsetNanoseconds !== end.offsetNanoseconds) {
      omittedForTimeChange = true;
      continue;
    }
    slots.push({
      start: start.epochMilliseconds, end: end.epochMilliseconds,
      startTime: local.toPlainTime().toString({ smallestUnit: "minute" }),
      endTime: end.toPlainTime().toString({ smallestUnit: "minute" }),
    });
  }
  return result(slots.length ? "available" : "empty");
}
