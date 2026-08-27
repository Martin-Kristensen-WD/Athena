import { z } from "zod";

// Coerced numeric inputs that are optional need to treat an empty string
// (the default state of a cleared number input) as "not provided" rather
// than coercing it to 0, which would otherwise fail a `.positive()` check.
function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const programmeExerciseSchema = z.object({
  exerciseId: z.string().uuid("Pick an exercise"),
  exerciseName: z.string().optional(),
  muscleGroup: z.string().optional(),
  sets: z.coerce.number().int().positive("Enter a number of sets"),
  targetReps: z.string().min(1, "Enter target reps"),
  targetWeight: optionalCoercedNumber(z.coerce.number().positive("Enter a valid weight")),
  restSeconds: optionalCoercedNumber(z.coerce.number().int().nonnegative("Enter a valid duration")),
  notes: z.string().optional(),
});

export const programmeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  exercises: z
    .array(programmeExerciseSchema)
    .min(1, "Add at least one exercise"),
});

export type ProgrammeExerciseInput = z.infer<typeof programmeExerciseSchema>;
export type ProgrammeInput = z.infer<typeof programmeSchema>;
