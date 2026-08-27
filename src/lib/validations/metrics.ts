import { z } from "zod";

export const logMetricEntrySchema = z.object({
  value: z.coerce.number().positive("Enter a positive number"),
  loggedAt: z.string().min(1, "Pick a date and time"),
  note: z
    .string()
    .max(500, "Keep notes under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type LogMetricEntryInput = z.infer<typeof logMetricEntrySchema>;
