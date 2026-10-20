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

export const programmeExerciseSchema = z
  .object({
    exerciseId: z.string().uuid("Vælg en øvelse"),
    exerciseName: z.string().optional(),
    muscleGroup: z.string().optional(),
    sets: z.coerce.number().int().positive("Angiv et antal sæt"),
    targetReps: z.string(),
    // Per-set rep targets; absent means every set uses `targetReps`.
    setTargetReps: z.array(z.string().trim().min(1, "Angiv reps")).optional(),
    targetWeight: optionalCoercedNumber(z.coerce.number().positive("Indtast en gyldig vægt")),
    restSeconds: optionalCoercedNumber(z.coerce.number().int().nonnegative("Indtast en gyldig varighed")),
    notes: z.string().optional(),
    supersetWithNext: z.boolean().optional(),
  })
  .superRefine((exercise, ctx) => {
    if (exercise.setTargetReps) {
      if (exercise.setTargetReps.length !== exercise.sets) {
        ctx.addIssue({
          code: "custom",
          path: ["setTargetReps"],
          message: "Angiv reps for hvert sæt",
        });
      }
    } else if (exercise.targetReps.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["targetReps"],
        message: "Angiv mål-reps",
      });
    }
  })
  // With per-set targets, `targetReps` becomes their compact summary so
  // one-line displays ("3 × 12/10/8") stay meaningful.
  .transform((exercise) =>
    exercise.setTargetReps
      ? { ...exercise, targetReps: exercise.setTargetReps.join("/") }
      : exercise
  );

export const programmeDaySchema = z.object({
  name: z.string().min(1, "Angiv et navn til dagen"),
  exercises: z
    .array(programmeExerciseSchema)
    .min(1, "Tilføj mindst én øvelse"),
});

export const programmeSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  description: z.string().optional(),
  days: z
    .array(programmeDaySchema)
    .min(1, "Tilføj mindst én dag")
    .max(7, "Et program kan højst have 7 dage"),
});

export type ProgrammeExerciseInput = z.infer<typeof programmeExerciseSchema>;
export type ProgrammeDayInput = z.infer<typeof programmeDaySchema>;
export type ProgrammeInput = z.infer<typeof programmeSchema>;
