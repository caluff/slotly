import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { bookableSlot, checkVersion, confirmedAppointmentsForDate, requireMyAppointment, requireMyBusiness } from "./lib/appointmentData";
import { appointmentSchema } from "../lib/appointment-schema";
import { isLocalDate } from "../lib/local-date";
import { appointmentDateBounds, appointmentFilterError, normalizeClientSearch } from "../lib/appointment-search";

const appointment = v.object({
  _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
  clientName: v.string(), start: v.number(), end: v.number(), status: v.union(v.literal("confirmed"), v.literal("cancelled")),
});

const historyAppointment = v.object({
  _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
  clientName: v.string(), date: v.string(), start: v.number(), end: v.number(),
  status: v.union(v.literal("confirmed"), v.literal("cancelled")), cancelledAt: v.optional(v.number()),
  version: v.number(), rescheduledAt: v.optional(v.number()),
});

function publicAppointment(row: import("./_generated/dataModel").Doc<"appointments">) {
  const { _id, serviceId, serviceName, clientName, date, start, end, status, cancelledAt, rescheduledAt } = row;
  return { _id, serviceId, serviceName, clientName, date, start, end, status, version: row.version ?? 0,
    ...(cancelledAt === undefined ? {} : { cancelledAt }), ...(rescheduledAt === undefined ? {} : { rescheduledAt }) };
}

// Keeps an open confirmation reactive even if a remote move leaves its filters.
export const getMyAppointment = query({
  args: { appointmentId: v.id("appointments") }, returns: historyAppointment,
  handler: async (ctx, { appointmentId }) => publicAppointment((await requireMyAppointment(ctx, appointmentId)).saved),
});

// Bounded reactive occupation, not historical listing. History (including
// cancellations) is always paginated through searchMyAppointments.
export const listMyConfirmedAppointments = query({
  args: { date: v.string() },
  returns: v.array(appointment),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const rows = await confirmedAppointmentsForDate(ctx, business._id, date);
    return rows.map(({ _id, serviceId, serviceName, clientName, start, end, status }) =>
      ({ _id, serviceId, serviceName, clientName, start, end, status }));
  },
});

// Page the whole owned index, including past and distant years. Only the
// normalized name is a residual predicate, applied on this bounded server page.
// Preserve pagination metadata even for zero matches: an empty intermediate
// page does NOT mean that the search is exhausted.
export const searchMyAppointments = query({
  args: {
    client: v.string(), serviceId: v.optional(v.id("services")),
    period: v.union(v.literal("todas"), v.literal("proximas"), v.literal("pasadas")),
    from: v.string(), until: v.string(), referenceDate: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(historyAppointment),
  handler: async (ctx, { client, serviceId, period, from, until, referenceDate, paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    const filters = { client, service: serviceId ?? "", period, from, until };
    if (appointmentFilterError(filters)) throw new ConvexError({ code: "INVALID_FILTERS" });
    if ((referenceDate !== undefined && !isLocalDate(referenceDate)) || (period !== "todas" && !referenceDate)) {
      throw new ConvexError({ code: "INVALID_REFERENCE_DATE" });
    }
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
    if (serviceId) {
      const service = await ctx.db.get("services", serviceId);
      if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    }
    const bounds = appointmentDateBounds(filters, referenceDate);
    if (bounds.empty) return { page: [], isDone: true, continueCursor: "" };
    const indexed = serviceId
      ? ctx.db.query("appointments").withIndex("by_businessId_and_serviceId_and_date_and_start", (q) => {
        const owned = q.eq("businessId", business._id).eq("serviceId", serviceId);
        const lower = bounds.from ? owned.gte("date", bounds.from) : owned;
        if (bounds.before && (!bounds.until || bounds.before <= bounds.until)) return lower.lt("date", bounds.before);
        return bounds.until ? lower.lte("date", bounds.until) : lower;
      })
      : ctx.db.query("appointments").withIndex("by_businessId_and_date_and_start", (q) => {
        const owned = q.eq("businessId", business._id);
        const lower = bounds.from ? owned.gte("date", bounds.from) : owned;
        if (bounds.before && (!bounds.until || bounds.before <= bounds.until)) return lower.lt("date", bounds.before);
        return bounds.until ? lower.lte("date", bounds.until) : lower;
      });
    const page = await indexed.order("asc").paginate({ ...paginationOpts,
      numItems: Math.min(paginationOpts.numItems, 100), maximumRowsRead: 200, maximumBytesRead: 256_000 });
    const needle = normalizeClientSearch(client);
    return { ...page, page: page.page
      .filter((row) => !needle || normalizeClientSearch(row.clientName).includes(needle))
      .map(publicAppointment) };
  },
});

export const createMyAppointment = mutation({
  args: { serviceId: v.id("services"), date: v.string(), start: v.number(), clientName: v.string() },
  returns: v.id("appointments"),
  handler: async (ctx, { serviceId, date, start, clientName }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const parsed = appointmentSchema.safeParse({ clientName, start: String(start) });
    if (!parsed.success) throw new ConvexError({ code: "INVALID_CLIENT_NAME" });
    const { slot, service } = await bookableSlot(ctx, business, serviceId, date, start, Date.now());
    return await ctx.db.insert("appointments", {
      businessId: business._id, serviceId, serviceName: service.name,
      clientName: parsed.data.clientName, date, start: slot.start, end: slot.end, status: "confirmed",
    });
  },
});

export const cancelMyAppointment = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number() },
  returns: v.object({ outcome: v.union(v.literal("cancelled"), v.literal("already_cancelled")), cancelledAt: v.number() }),
  handler: async (ctx, { appointmentId, expectedVersion }) => {
    const { saved } = await requireMyAppointment(ctx, appointmentId);
    if (saved.status === "cancelled") {
      if (saved.cancelledAt === undefined) throw new ConvexError({ code: "INVALID_APPOINTMENT_STATE" });
      return { outcome: "already_cancelled" as const, cancelledAt: saved.cancelledAt };
    }
    checkVersion(saved.version ?? 0, expectedVersion);
    const cancelledAt = Date.now();
    if (saved.start <= cancelledAt) throw new ConvexError({ code: "APPOINTMENT_STARTED" });
    // The read and status/index transition share a transaction. OCC retries a
    // concurrent cancellation or creation reading this confirmed range.
    await ctx.db.patch("appointments", appointmentId, { status: "cancelled", cancelledAt, version: expectedVersion + 1 });
    return { outcome: "cancelled" as const, cancelledAt };
  },
});

export const rescheduleMyAppointment = mutation({
  args: { appointmentId: v.id("appointments"), expectedVersion: v.number(), date: v.string(), start: v.number() },
  returns: v.object({ outcome: v.union(v.literal("rescheduled"), v.literal("already_rescheduled"), v.literal("unchanged")),
    version: v.number(), rescheduledAt: v.optional(v.number()), date: v.string(), start: v.number(), end: v.number() }),
  handler: async (ctx, { appointmentId, expectedVersion, date, start }) => {
    const { business, saved } = await requireMyAppointment(ctx, appointmentId);
    if (saved.status !== "confirmed") throw new ConvexError({ code: "APPOINTMENT_CANCELLED" });
    const version = saved.version ?? 0;
    const response = { version, date: saved.date, start: saved.start, end: saved.end,
      ...(saved.rescheduledAt === undefined ? {} : { rescheduledAt: saved.rescheduledAt }) };
    // Only the immediately preceding effective move can be replayed. Once any
    // later transition commits, this old request conflicts instead of reverting it.
    if (Number.isSafeInteger(expectedVersion) && expectedVersion >= 0 && version === expectedVersion + 1
      && saved.rescheduledFromVersion === expectedVersion && saved.date === date && saved.start === start) {
      return { ...response, outcome: "already_rescheduled" as const };
    }
    checkVersion(version, expectedVersion);
    const now = Date.now();
    if (saved.start <= now) throw new ConvexError({ code: "APPOINTMENT_STARTED" });
    const { slot } = await bookableSlot(ctx, business, saved.serviceId, date, start, now, saved._id);
    if (saved.date === date && saved.start === start && saved.end === slot.end) return { ...response, outcome: "unchanged" as const };
    await ctx.db.patch("appointments", appointmentId, { date, start: slot.start, end: slot.end,
      version: version + 1, rescheduledAt: now, rescheduledFromVersion: version });
    return { outcome: "rescheduled" as const, version: version + 1, rescheduledAt: now, date, start: slot.start, end: slot.end };
  },
});
