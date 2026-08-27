import { z } from "zod";

function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const profileSchema = z.object({
  milestoneTargetValue: optionalCoercedNumber(
    z.coerce.number().positive("Enter a valid target")
  ),
  goalTargetValue: optionalCoercedNumber(
    z.coerce.number().positive("Enter a valid target")
  ),
  dailyCalorieTarget: optionalCoercedNumber(
    z.coerce.number().positive("Enter a valid target")
  ),
  dailyStepsTarget: optionalCoercedNumber(
    z.coerce.number().positive("Enter a valid target")
  ),
});

export type ProfileInput = z.infer<typeof profileSchema>;
