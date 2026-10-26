import { isLocalDate } from "./local-date";
import { isIanaTimeZone } from "./special-date-schema";

export type MoveOrigin = { businessName: string; serviceName: string; date: string; start: number; end: number; timeZone: string; revision: string };
export type MoveIntent = { operationId: string; revision: string; date: string; start: number; origin: MoveOrigin };

// This is a separate, versioned journal. R16 cancellation commands keep their
// exact original storage key and shape; they are never converted to moves.
export function savedMoveIntent(value: unknown): MoveIntent | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>, origin = v.origin;
  if (!origin || typeof origin !== "object") return null;
  const o = origin as Record<string, unknown>;
  if (typeof v.operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.operationId)
    || typeof v.revision !== "string" || !/^[a-f0-9]{64}$/.test(v.revision) || typeof v.date !== "string" || !isLocalDate(v.date)
    || typeof v.start !== "number" || !Number.isSafeInteger(v.start) || o.revision !== v.revision
    || typeof o.businessName !== "string" || typeof o.serviceName !== "string" || typeof o.date !== "string" || !isLocalDate(o.date)
    || typeof o.start !== "number" || !Number.isSafeInteger(o.start) || typeof o.end !== "number" || !Number.isSafeInteger(o.end)
    || o.end <= o.start || !Number.isSafeInteger((o.end - o.start) / 60_000)
    || typeof o.timeZone !== "string" || !isIanaTimeZone(o.timeZone)
    || !Number.isFinite(new Date(o.start).valueOf()) || !Number.isFinite(new Date(o.end).valueOf())
    || !Number.isFinite(new Date(v.start).valueOf()) || !Number.isFinite(new Date(v.start + o.end - o.start).valueOf())) return null;
  return { operationId: v.operationId, revision: v.revision, date: v.date, start: v.start,
    origin: { businessName: o.businessName, serviceName: o.serviceName, date: o.date, start: o.start, end: o.end, timeZone: o.timeZone, revision: v.revision } };
}
export function moveJournalKey(cancelJournal: string) { return cancelJournal.replace("slotly:public-cancel:", "slotly:public-move:v1:"); }
