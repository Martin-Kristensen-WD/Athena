import { z } from "zod";

function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const profileSchema = z.object({
  goalType: z.enum(["lose_weight", "gain_muscle", "maintain"]),
  milestoneTargetValue: optionalCoercedNumber(
    z.coerce.number().positive("Indtast et gyldigt mål")
  ),
  goalTargetValue: optionalCoercedNumber(
    z.coerce.number().positive("Indtast et gyldigt mål")
  ),
  dailyCalorieTarget: optionalCoercedNumber(
    z.coerce.number().positive("Indtast et gyldigt mål")
  ),
  dailyStepsTarget: optionalCoercedNumber(
    z.coerce.number().positive("Indtast et gyldigt mål")
  ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
