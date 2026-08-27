import { z } from "zod";

export const onboardingSchema = z.object({
  startingWeight: z.coerce.number().positive("Enter a valid weight"),
  weightUnit: z.enum(["kg", "lb"]),
  goalType: z.enum(["lose_weight", "gain_muscle", "maintain"]),
  goalTargetValue: z.coerce.number().positive().optional(),
  trackedMetricKeys: z
    .array(z.string())
    .min(1, "Pick at least one metric to track"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
