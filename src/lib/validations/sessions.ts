import { z } from "zod";

// See src/lib/validations/programmes.ts for why optional numeric inputs
// need this treatment instead of a plain `z.coerce.number().optional()`.
function optionalCoercedNumber<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    schema.optional()
  );
}

export const sessionSetLogSchema = z.object({
  reps: optionalCoercedNumber(z.coerce.number().int().nonnegative("Indtast gyldige reps")),
  weight: optionalCoercedNumber(z.coerce.number().nonnegative("Indtast en gyldig vægt")),
});

export const sessionExerciseLogSchema = z.object({
  programmeExerciseId: z.string().uuid(),
  exerciseName: z.string().optional(),
  sets: z.array(sessionSetLogSchema).min(1),
});

export const workoutSessionSchema = z.object({
  programmeId: z.string().uuid("Vælg et program"),
  programmeDayId: z.string().uuid().optional(),
  durationMinutes: optionalCoercedNumber(
    z.coerce.number().int().positive("Indtast en gyldig varighed")
  ),
  notes: z.string().optional(),
  exercises: z
    .array(sessionExerciseLogSchema)
    .min(1, "Dette program har ingen øvelser at registrere"),
});

export const freeSessionExerciseLogSchema = z.object({
  exerciseId: z.string().uuid("Vælg en øvelse"),
  exerciseName: z.string().optional(),
  muscleGroup: z.string().optional(),
  sets: z.array(sessionSetLogSchema).min(1, "Tilføj mindst ét sæt"),
});

export const freeWorkoutSessionSchema = z.object({
  durationMinutes: optionalCoercedNumber(
    z.coerce.number().int().positive("Indtast en gyldig varighed")
  ),
  notes: z.string().optional(),
  exercises: z
    .array(freeSessionExerciseLogSchema)
    .min(1, "Tilføj mindst én øvelse"),
});

export type SessionSetLogInput = z.infer<typeof sessionSetLogSchema>;
export type SessionExerciseLogInput = z.infer<typeof sessionExerciseLogSchema>;
export type WorkoutSessionInput = z.infer<typeof workoutSessionSchema>;
export type FreeSessionExerciseLogInput = z.infer<typeof freeSessionExerciseLogSchema>;
export type FreeWorkoutSessionInput = z.infer<typeof freeWorkoutSessionSchema>;
