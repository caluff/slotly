import { z } from "zod";
import type { Id } from "@/convex/_generated/dataModel";
import { clientOperationPattern, clientNameSchema } from "./client-schema";
import { clientEmailSchema } from "./client-email";
import { isLocalDate } from "./local-date";

// Only an unfinished creation command is durable; ordinary drafts stay in memory.
export const privateCreationSchema = z.object({
  operationId: z.string().regex(clientOperationPattern),
  serviceId: z.custom<Id<"services">>(value => typeof value === "string" && value.length > 0),
  date: z.string().refine(isLocalDate), start: z.number().int().safe(),
  clientName: clientNameSchema, email: clientEmailSchema.optional(),
  clientId: z.custom<Id<"clients">>(value => typeof value === "string" && value.length > 0).optional(),
  expectedService: z.object({ name: z.string(), durationMinutes: z.number().int().positive(), version: z.number().int().nonnegative() }),
}).refine(value => value.clientId ? value.email === undefined : value.email !== undefined);
export type PrivateBookingCommand = z.infer<typeof privateCreationSchema>;
export type PrivateBookingResult = { outcome: "created" | "already_applied"; appointmentId: Id<"appointments"> };
export function privateCreationKey(businessId: string) { return `slotly:appointment-creation:${businessId}`; }
