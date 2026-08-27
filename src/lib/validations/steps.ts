import { z } from "zod";

export const logStepsEntrySchema = z.object({
  date: z.string().min(1, "Vælg en dato"),
  steps: z.coerce.number().int("Indtast et helt tal").positive("Indtast et positivt tal"),
});

export type LogStepsEntryInput = z.infer<typeof logStepsEntrySchema>;
