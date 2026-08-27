import { z } from "zod";

// See src/lib/validations/programmes.ts for why optional numeric inputs
// need this treatment instead of a plain `z.coerce.number().optional()`.
function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const settingsSchema = z.object({
  goalType: z.enum(["lose_weight", "gain_muscle", "maintain"]),
  goalTargetValue: optionalCoercedNumber(
    z.coerce.number().positive("Enter a valid target")
  ),
  trackedMetricKeys: z
    .array(z.string())
    .min(1, "Pick at least one metric to track"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
