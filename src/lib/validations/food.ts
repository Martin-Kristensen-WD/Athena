import { z } from "zod";

function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const logFoodEntrySchema = z.object({
  date: z.string().min(1, "Vælg en dato"),
  kcal: z.coerce.number().positive("Indtast et positivt tal"),
  protein: optionalCoercedNumber(z.coerce.number().min(0, "Skal være nul eller mere")),
  carbs: optionalCoercedNumber(z.coerce.number().min(0, "Skal være nul eller mere")),
  fat: optionalCoercedNumber(z.coerce.number().min(0, "Skal være nul eller mere")),
});

export type LogFoodEntryInput = z.infer<typeof logFoodEntrySchema>;
