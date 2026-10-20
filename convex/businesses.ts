import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const businessProfile = v.object({
  _id: v.id("businesses"),
  _creationTime: v.number(),
  name: v.string(),
  timeZone: v.string(),
});

export const getMyBusiness = query({
  args: {},
  returns: v.union(businessProfile, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    const business = await ctx.db
      .query("businesses")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject))
      .unique();

    if (!business) return null;
    return {
      _id: business._id,
      _creationTime: business._creationTime,
      name: business.name,
      timeZone: business.timeZone,
    };
  },
});

export const createMyBusiness = mutation({
  args: { name: v.string(), timeZone: v.string() },
  returns: v.id("businesses"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new ConvexError({ code: "INVALID_NAME" });
    }

    const timeZone = args.timeZone.trim();
    try {
      // Intl also accepts numeric offsets in recent runtimes; require a named zone.
      if (!timeZone || timeZone.length > 100 || /^[+-]/.test(timeZone)) {
        throw new RangeError();
      }
      new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    } catch {
      throw new ConvexError({ code: "INVALID_TIME_ZONE" });
    }

    // Reading this indexed range and inserting in the same transaction lets
    // Convex retry conflicting submissions before a second business is created.
    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "BUSINESS_ALREADY_EXISTS" });
    }

    return await ctx.db.insert("businesses", {
      ownerId: identity.subject,
      name,
      timeZone,
    });
  },
});
