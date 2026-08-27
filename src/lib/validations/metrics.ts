import { z } from "zod";

export const logMetricEntrySchema = z.object({
  value: z.coerce.number().positive("Indtast et positivt tal"),
  loggedAt: z.string().min(1, "Vælg en dato og et tidspunkt"),
  note: z
    .string()
    .max(500, "Noter må højst være 500 tegn")
    .optional()
    .or(z.literal("")),
});

export type LogMetricEntryInput = z.infer<typeof logMetricEntrySchema>;
