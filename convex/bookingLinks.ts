import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMyBusiness } from "./lib/appointmentData";
import { bookingSlugBase } from "../lib/booking-slug";

const link = v.object({ slug: v.union(v.string(), v.null()), enabled: v.boolean() });

export const getMyBookingLink = query({
  args: {}, returns: link,
  handler: async (ctx) => {
    const business = await requireMyBusiness(ctx);
    return { slug: business.publicBookingSlug ?? null, enabled: business.publicBookingEnabled === true };
  },
});

export const setMyBookingLink = mutation({
  args: { enabled: v.boolean() }, returns: link,
  handler: async (ctx, { enabled }) => {
    const business = await requireMyBusiness(ctx);
    let slug = business.publicBookingSlug;
    if (enabled && !slug) {
      const base = bookingSlugBase(business.name);
      // An index is NOT a uniqueness constraint. Every candidate's range read
      // and the assignment occur in this transaction, including empty ranges.
      for (let suffix = 1; suffix <= 100; suffix++) {
        const candidate = suffix === 1 ? base : `${base}-${suffix}`;
        const taken = await ctx.db.query("businesses")
          .withIndex("by_publicBookingSlug", (q) => q.eq("publicBookingSlug", candidate)).unique();
        if (!taken) { slug = candidate; break; }
      }
      if (!slug) throw new ConvexError({ code: "LINK_NAMES_EXHAUSTED" });
    }
    if (business.publicBookingEnabled !== enabled || business.publicBookingSlug !== slug) {
      await ctx.db.patch("businesses", business._id, { publicBookingEnabled: enabled,
        ...(slug === undefined ? {} : { publicBookingSlug: slug }) });
    }
    return { slug: slug ?? null, enabled };
  },
});
