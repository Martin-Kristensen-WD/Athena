import { z } from "zod";

export const logStepsEntrySchema = z.object({
  date: z.string().min(1, "Pick a date"),
  steps: z.coerce.number().int("Enter a whole number").positive("Enter a positive number"),
});

export type LogStepsEntryInput = z.infer<typeof logStepsEntrySchema>;
