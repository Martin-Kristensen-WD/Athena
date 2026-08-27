import { z } from "zod";

export const logSleepEntrySchema = z.object({
  date: z.string().min(1, "Vælg en dato"),
  hours: z.coerce.number().positive("Indtast et positivt tal"),
});

export type LogSleepEntryInput = z.infer<typeof logSleepEntrySchema>;
