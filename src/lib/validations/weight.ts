import { z } from "zod";

export const logWeightEntrySchema = z.object({
  date: z.string().min(1, "Vælg en dato"),
  weight: z.coerce.number().positive("Indtast et positivt tal"),
});

export type LogWeightEntryInput = z.infer<typeof logWeightEntrySchema>;
