import { z } from "zod";

function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const logFoodEntrySchema = z.object({
  date: z.string().min(1, "Pick a date"),
  kcal: z.coerce.number().positive("Enter a positive number"),
  protein: optionalCoercedNumber(z.coerce.number().min(0, "Must be zero or more")),
  carbs: optionalCoercedNumber(z.coerce.number().min(0, "Must be zero or more")),
  fat: optionalCoercedNumber(z.coerce.number().min(0, "Must be zero or more")),
});

export type LogFoodEntryInput = z.infer<typeof logFoodEntrySchema>;
