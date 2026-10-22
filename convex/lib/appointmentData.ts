import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { generateAvailability } from "./availability";
import { isLocalDate } from "../../lib/local-date";
import { scheduleForDate } from "./scheduleForDate";
import { activeBlocksForDate } from "./timeBlocks";

export async function requireMyBusiness(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
  const business = await ctx.db.query("businesses")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject)).unique();
  if (!business) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
  return business;
}

export async function requireMyAppointment(ctx: QueryCtx, appointmentId: Id<"appointments">) {
  const business = await requireMyBusiness(ctx);
  const saved = await ctx.db.get("appointments", appointmentId);
  if (!saved || saved.businessId !== business._id) throw new ConvexError({ code: "APPOINTMENT_NOT_FOUND" });
  return { business, saved };
}

export function checkVersion(actual: number, expected: number) {
  if (!Number.isSafeInteger(expected) || expected < 0 || expected >= Number.MAX_SAFE_INTEGER) {
    throw new ConvexError({ code: "INVALID_VERSION" });
  }
  if (actual !== expected) throw new ConvexError({ code: "APPOINTMENT_CONFLICT" });
}

// Confirmed appointments stay within one local date and have integer-minute starts
// and positive integer-minute durations. Even after changing the opening/grid,
// at most 1440 non-overlapping starts can fit. Read one extra and fail closed:
// a limit must NEVER silently hide a conflict. Cancelled history is unbounded
// and must never consume this limit: it is read via paginated history indexes.
export async function confirmedAppointmentsForDate(ctx: QueryCtx, businessId: Id<"businesses">, date: string) {
  const appointments = await ctx.db.query("appointments")
    .withIndex("by_businessId_and_date_and_status", (q) => q.eq("businessId", businessId).eq("date", date).eq("status", "confirmed"))
    .take(1441);
  if (appointments.length > 1440) throw new ConvexError({ code: "DAY_CAPACITY_EXCEEDED" });
  return appointments.sort((a, b) => a.start - b.start);
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

// Shared by private creation/moves and anonymous confirmation. The caller's
// transaction reads the same complete business/day occupation range.
export async function bookableSlot(ctx: QueryCtx, business: { _id: Id<"businesses">; timeZone: string },
  serviceId: Id<"services">, date: string, start: number, now: number, exclude?: Id<"appointments">,
  expectedService?: { name: string; durationMinutes: number; version: number }, historicalDuration?: number) {
  if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
  if (!Number.isSafeInteger(start) || start <= now) throw new ConvexError({ code: "SLOT_UNAVAILABLE" });
  const service = await ctx.db.get("services", serviceId);
  if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
  if (!exclude) {
    if (service.archived === true) throw new ConvexError({ code: "SERVICE_ARCHIVED" });
    if (!expectedService || expectedService.name !== service.name || expectedService.durationMinutes !== service.durationMinutes
      || expectedService.version !== (service.version ?? 0)) throw new ConvexError({ code: "SERVICE_CHANGED" });
  }
  if (exclude && (!Number.isSafeInteger(historicalDuration) || historicalDuration! <= 0)) throw new ConvexError({ code: "INVALID_APPOINTMENT_STATE" });
  const schedule = await scheduleForDate(ctx, business._id, date);
  const slot = generateAvailability({ date, timeZone: business.timeZone, ...schedule,
    durationMinutes: historicalDuration ?? service.durationMinutes, now }).slots.find((option) => option.start === start);
  if (!slot) throw new ConvexError({ code: "SLOT_UNAVAILABLE" });
  const existing = await confirmedAppointmentsForDate(ctx, business._id, date);
  if (existing.some((saved) => saved._id !== exclude && overlaps(slot, saved))) throw new ConvexError({ code: "SLOT_TAKEN" });
  if ((await activeBlocksForDate(ctx, business._id, date)).some(saved => overlaps(slot, saved))) throw new ConvexError({ code: "SLOT_TAKEN" });
  return { slot, service };
}
