import { paginationOptsValidator, paginationResultValidator, type PaginationOptions, type PaginationResult } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireMyBusiness } from "./lib/appointmentData";
import { clientNameSchema, clientOperationPattern, clientPrefixEnd } from "../lib/client-schema";
import { clientForEmail, requireClientEmail, requireMyClient } from "./lib/clientIdentity";
import { normalizeClientSearch } from "../lib/appointment-search";

const client = v.object({ _id: v.id("clients"), name: v.string(), createdAt: v.number(), email: v.optional(v.string()) });
const historyItem = v.object({ _id: v.id("appointments"), clientName: v.string(), serviceName: v.string(),
  date: v.string(), start: v.number(), end: v.number(),
  status: v.union(v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"), v.literal("no_show")) });
const presentClient = ({ _id, name, createdAt, email }: Pick<Doc<"clients">, "_id" | "name" | "createdAt" | "email">) =>
  ({ _id, name, createdAt, ...(email === undefined ? {} : { email }) });

function command(name: string, operationId: string) {
  if (!clientOperationPattern.test(operationId)) throw new ConvexError({ code: "INVALID_OPERATION" });
  const parsed = clientNameSchema.safeParse(name);
  if (!parsed.success) throw new ConvexError({ code: "INVALID_CLIENT_NAME" });
  return parsed.data;
}
function pageOptions(options: PaginationOptions) {
  if (!Number.isSafeInteger(options.numItems) || options.numItems <= 0) throw new ConvexError({ code: "INVALID_PAGINATION" });
  // Reactive endCursor ranges can exceed numItems. Bound the actual read too,
  // allowing the SDK to split an expanded range without shipping >20 rows.
  return { ...options, numItems: Math.min(options.numItems, 20), maximumRowsRead: 20, maximumBytesRead: 64_000 };
}
function boundedPage<T>(result: PaginationResult<T>): PaginationResult<T> {
  if (result.page.length <= 20) return result;
  // Engine reads are batched, so maximumRowsRead is not a returned-row cap.
  // Expanded reactive ranges must be split by the SDK BEFORE exposing rows.
  // Keep the exact engine cursors; never slice rows and silently skip a tail.
  if (!result.splitCursor) throw new ConvexError({ code: "CLIENT_PAGE_REQUIRES_SPLIT" });
  return { ...result, page: [], pageStatus: "SplitRequired" };
}
const creationArgs = { name: v.string(), operationId: v.string(), email: v.optional(v.string()) };
async function findCreation(ctx: import("./_generated/server").QueryCtx, businessId: import("./_generated/dataModel").Id<"businesses">,
  args: { name: string; operationId: string; email?: string }) {
  const name = command(args.name, args.operationId);
  const prior = await ctx.db.query("clientCreationReceipts").withIndex("by_businessId_and_operationId",
    q => q.eq("businessId", businessId).eq("operationId", args.operationId)).unique();
  if (prior) {
    if (prior.requestedName !== name || prior.email !== requireClientEmail(args.email)) throw new ConvexError({ code: "CLIENT_OPERATION_CONFLICT" });
    return { _id: prior.clientId, name: prior.clientName, createdAt: prior.clientCreatedAt, email: prior.email };
  }
  // Accepted commands from the name-only release retain their original replay.
  const legacy = await ctx.db.query("clients").withIndex("by_businessId_and_creationKey",
    q => q.eq("businessId", businessId).eq("creationKey", args.operationId)).unique();
  if (legacy) {
    if (legacy.name !== name || args.email !== undefined) throw new ConvexError({ code: "CLIENT_OPERATION_CONFLICT" });
    return presentClient(legacy);
  }
  return null;
}
export const createMyClient = mutation({
  args: creationArgs,
  returns: v.object({ outcome: v.union(v.literal("created"), v.literal("reused"), v.literal("already_applied")), client }),
  handler: async (ctx, args) => {
    const business = await requireMyBusiness(ctx), name = command(args.name, args.operationId);
    const prior = await findCreation(ctx, business._id, args);
    if (prior) return { outcome: "already_applied" as const, client: prior };
    const email = requireClientEmail(args.email), result = await clientForEmail(ctx, business._id, name, email);
    const outcome = result.created ? "created" as const : "reused" as const;
    await ctx.db.insert("clientCreationReceipts", { businessId: business._id, operationId: args.operationId, requestedName: name, email,
      clientId: result.client._id, clientName: result.client.name, clientCreatedAt: result.client.createdAt, outcome });
    return { outcome, client: presentClient(result.client) };
  },
});
export const getMyClientCreation = query({
  args: creationArgs, returns: v.union(client, v.null()),
  handler: async (ctx, args) => findCreation(ctx, (await requireMyBusiness(ctx))._id, args),
});

export const listMyClients = query({
  args: { search: v.string(), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(client),
  handler: async (ctx, { search, paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    if (search.length > 100 || /[\p{Cc}\p{Cf}]/u.test(search)) throw new ConvexError({ code: "INVALID_CLIENT_SEARCH" });
    const prefix = normalizeClientSearch(search), end = clientPrefixEnd(prefix);
    const result = await ctx.db.query("clients").withIndex("by_businessId_and_normalizedName", q => {
      const owned = q.eq("businessId", business._id);
      if (!prefix) return owned;
      const lower = owned.gte("normalizedName", prefix);
      return end === null ? lower : lower.lt("normalizedName", end);
    }).order("asc").paginate(pageOptions(paginationOpts));
    return boundedPage({ ...result, page: result.page.map(presentClient) });
  },
});

export const getMyClient = query({
  args: { clientId: v.id("clients") }, returns: client,
  handler: async (ctx, { clientId }) => presentClient(await requireMyClient(ctx, (await requireMyBusiness(ctx))._id, clientId)),
});

export const listMyClientAppointments = query({
  args: { clientId: v.id("clients"), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(historyItem),
  handler: async (ctx, { clientId, paginationOpts }) => {
    const business = await requireMyBusiness(ctx);
    await requireMyClient(ctx, business._id, clientId);
    const result = await ctx.db.query("appointments").withIndex("by_businessId_and_clientId_and_start",
      q => q.eq("businessId", business._id).eq("clientId", clientId)).order("desc").paginate(pageOptions(paginationOpts));
    return boundedPage({ ...result, page: result.page.map(({ _id, clientName, serviceName, date, start, end, status }) =>
      ({ _id, clientName, serviceName, date, start, end, status })) });
  },
});
