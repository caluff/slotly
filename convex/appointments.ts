import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { appointmentsForDate, overlaps, requireMyBusiness } from "./lib/appointmentData";
import { generateAvailability } from "./lib/availability";
import { appointmentSchema } from "../lib/appointment-schema";
import { isLocalDate } from "../lib/local-date";
import { appointmentDateBounds, appointmentFilterError, normalizeClientSearch } from "../lib/appointment-search";

const appointment = v.object({
  _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
  clientName: v.string(), start: v.number(), end: v.number(), status: v.literal("confirmed"),
});

export const listMyAppointments = query({
  args: { date: v.string() },
  returns: v.array(appointment),
  handler: async (ctx, { date }) => {
    const business = await requireMyBusiness(ctx);
    if (!isLocalDate(date)) throw new ConvexError({ code: "INVALID_DATE" });
    const rows = await appointmentsForDate(ctx, business._id, date);
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
  returns: paginationResultValidator(v.object({
    _id: v.id("appointments"), serviceId: v.id("services"), serviceName: v.string(),
    clientName: v.string(), date: v.string(), start: v.number(), end: v.number(), status: v.literal("confirmed"),
  })),
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
      .map(({ _id, serviceId, serviceName, clientName, date, start, end, status }) =>
        ({ _id, serviceId, serviceName, clientName, date, start, end, status })) };
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
    if (!Number.isSafeInteger(start) || start <= Date.now()) throw new ConvexError({ code: "SLOT_UNAVAILABLE" });
    const service = await ctx.db.get("services", serviceId);
    if (!service || service.businessId !== business._id) throw new ConvexError({ code: "SERVICE_NOT_FOUND" });
    const schedule = await ctx.db.query("weeklySchedules")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id)).unique();
    // Reuse ALL temporal rules from the preview, including current weekly
    // hours, 15-minute grid from opening, real duration, zone and DST policy.
    const slot = generateAvailability({ date, timeZone: business.timeZone, days: schedule?.days ?? null,
      durationMinutes: service.durationMinutes, now: Date.now() }).slots.find((option) => option.start === start);
    if (!slot) throw new ConvexError({ code: "SLOT_UNAVAILABLE" });
    // Read the COMPLETE business/day range (not service-scoped), including an
    // empty range, in THIS mutation. An insertion into that range invalidates
    // concurrent read sets; Convex OCC retries and rechecks before committing.
    const existing = await appointmentsForDate(ctx, business._id, date);
    if (existing.some((saved) => overlaps(slot, saved))) throw new ConvexError({ code: "SLOT_TAKEN" });
    return await ctx.db.insert("appointments", {
      businessId: business._id, serviceId, serviceName: service.name,
      clientName: parsed.data.clientName, date, start: slot.start, end: slot.end, status: "confirmed",
    });
  },
});
