import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { clientOperationPattern, clientNameSchema } from "../../lib/client-schema";
import { clientEmailSchema } from "../../lib/client-email";
import { serviceContext } from "../serviceValidators";
import { creationHash } from "./clientIdentity";

export const privateCreationArgs = {
  operationId: v.string(), serviceId: v.id("services"), date: v.string(), start: v.number(),
  clientName: v.string(), email: v.optional(v.string()), clientId: v.optional(v.id("clients")), expectedService: serviceContext,
};
export type PrivateCreationCommand = {
  operationId: string; serviceId: Id<"services">; date: string; start: number;
  clientName: string; email?: string; clientId?: Id<"clients">;
  expectedService: { name: string; durationMinutes: number; version: number };
};
export const creationSnapshot = v.object({ appointmentId: v.id("appointments"), clientId: v.id("clients"),
  serviceId: v.id("services"), clientName: v.string(), serviceName: v.string(), date: v.string(), start: v.number(), end: v.number() });

export async function privateCreationCommand(args: PrivateCreationCommand) {
  if (!clientOperationPattern.test(args.operationId)) throw new ConvexError({ code: "INVALID_OPERATION" });
  const name = clientNameSchema.safeParse(args.clientName);
  if (!name.success) throw new ConvexError({ code: "INVALID_CLIENT_NAME" });
  // An explicit ID never silently fills an email on a legacy record.
  if (args.clientId !== undefined && args.email !== undefined) throw new ConvexError({ code: "CLIENT_IDENTITY_CONFLICT" });
  const email = args.clientId === undefined ? clientEmailSchema.safeParse(args.email) : null;
  if (email && !email.success) throw new ConvexError({ code: "INVALID_CLIENT_EMAIL" });
  const normalizedEmail = email?.success ? email.data : undefined;
  const requestHash = await creationHash([args.serviceId, args.date, args.start, name.data,
    args.clientId ?? null, normalizedEmail ?? null,
    [args.expectedService.name, args.expectedService.durationMinutes, args.expectedService.version]]);
  return { name: name.data, email: normalizedEmail, requestHash };
}
export async function privateCreationReceipt(ctx: QueryCtx, businessId: Id<"businesses">, args: PrivateCreationCommand, requestHash: string) {
  const prior = await ctx.db.query("privateBookingReceipts").withIndex("by_businessId_and_operationId",
    q => q.eq("businessId", businessId).eq("operationId", args.operationId)).unique();
  if (prior && prior.requestHash !== requestHash) throw new ConvexError({ code: "APPOINTMENT_OPERATION_CONFLICT" });
  return prior;
}
export function presentCreation(row: { appointmentId: Id<"appointments">; clientId: Id<"clients">; serviceId: Id<"services">;
  clientName: string; serviceName: string; date: string; start: number; end: number }) {
  const { appointmentId, clientId, serviceId, clientName, serviceName, date, start, end } = row;
  return { appointmentId, clientId, serviceId, clientName, serviceName, date, start, end };
}
