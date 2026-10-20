import { z } from "zod";
import { isLocalDate } from "./local-date";

export const availabilitySchema = z.object({
  serviceId: z.string().min(1, "Elige un servicio."),
  date: z.string().refine(isLocalDate, "Elige una fecha real con formato AAAA-MM-DD."),
});
export type AvailabilityValues = z.infer<typeof availabilitySchema>;
