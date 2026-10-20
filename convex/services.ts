import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

const service = v.object({
  _id: v.id("services"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  name: v.string(),
  durationMinutes: v.number(),
});

// QueryCtx's read-only database is also available in mutations. Every public
// operation resolves ownership from the verified identity, never from arguments.
async function requireMyBusiness(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });

  const business = await ctx.db
    .query("businesses")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", identity.subject))
    .unique();
  if (!business) throw new ConvexError({ code: "BUSINESS_NOT_FOUND" });
  return business;
}

export const listMyServices = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(service),
  handler: async (ctx, { paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    if (!Number.isSafeInteger(paginationOpts.numItems) || paginationOpts.numItems <= 0) {
      throw new ConvexError({ code: "INVALID_PAGINATION" });
    }
    return await ctx.db
      .query("services")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id))
      .order("desc")
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, 50),
        maximumRowsRead: 100,
        maximumBytesRead: 128_000,
      });
  },
});

export const createMyService = mutation({
  args: { name: v.string(), durationMinutes: v.number() },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx);
    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new ConvexError({ code: "INVALID_NAME" });
    }
    if (!Number.isSafeInteger(args.durationMinutes) || args.durationMinutes <= 0) {
      throw new ConvexError({ code: "INVALID_DURATION" });
    }
    return await ctx.db.insert("services", {
      businessId: business._id,
      name,
      durationMinutes: args.durationMinutes,
    });
  },
});
