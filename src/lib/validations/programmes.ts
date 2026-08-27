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
  exerciseId: z.string().uuid("Vælg en øvelse"),
  exerciseName: z.string().optional(),
  muscleGroup: z.string().optional(),
  sets: z.coerce.number().int().positive("Angiv et antal sæt"),
  targetReps: z.string().min(1, "Angiv mål-reps"),
  targetWeight: optionalCoercedNumber(z.coerce.number().positive("Indtast en gyldig vægt")),
  restSeconds: optionalCoercedNumber(z.coerce.number().int().nonnegative("Indtast en gyldig varighed")),
  notes: z.string().optional(),
});

export const programmeSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  description: z.string().optional(),
  exercises: z
    .array(programmeExerciseSchema)
    .min(1, "Tilføj mindst én øvelse"),
});

export type ProgrammeExerciseInput = z.infer<typeof programmeExerciseSchema>;
export type ProgrammeInput = z.infer<typeof programmeSchema>;
