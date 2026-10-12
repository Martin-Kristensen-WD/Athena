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

// ---------------------------------------------------------------------------
// Live (server-persisted, resumable) workout sessions
// ---------------------------------------------------------------------------

/**
 * How a session set is hung off an exercise: programme sessions reference a
 * `programmeExercise`, freeform sessions reference the `exercise` directly.
 */
export const exerciseRefSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("programme"),
    programmeExerciseId: z.string().uuid(),
  }),
  z.object({
    kind: z.literal("exercise"),
    exerciseId: z.string().uuid(),
  }),
]);

export const startSessionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("programme"),
    programmeId: z.string().uuid("Vælg et program"),
    programmeDayId: z.string().uuid("Vælg en dag"),
  }),
  z.object({ kind: z.literal("free") }),
]);

export const saveSessionSetSchema = z.object({
  sessionId: z.string().uuid(),
  setId: z.string().uuid(),
  ref: exerciseRefSchema,
  setIndex: z.coerce.number().int().nonnegative(),
  reps: optionalCoercedNumber(
    z.coerce.number().int().nonnegative("Indtast gyldige reps")
  ),
  weight: optionalCoercedNumber(
    z.coerce.number().nonnegative("Indtast en gyldig vægt")
  ),
  rir: optionalCoercedNumber(
    z.coerce.number().int().min(0, "Indtast et gyldigt RIR").max(20, "RIR er for højt")
  ),
  done: z.boolean(),
});

export const addSessionSetSchema = z.object({
  sessionId: z.string().uuid(),
  setId: z.string().uuid(),
  ref: exerciseRefSchema,
  setIndex: z.coerce.number().int().nonnegative(),
});

export const removeSessionSetSchema = z.object({
  sessionId: z.string().uuid(),
  setId: z.string().uuid(),
});

export const addSessionExerciseSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid("Vælg en øvelse"),
});

export const removeSessionExerciseSchema = z.object({
  sessionId: z.string().uuid(),
  ref: exerciseRefSchema,
});

export const swapSessionExerciseSchema = z.object({
  sessionId: z.string().uuid(),
  ref: exerciseRefSchema,
  exerciseId: z.string().uuid("Vælg en øvelse"),
});

export const saveSessionExerciseNoteSchema = z.object({
  sessionId: z.string().uuid(),
  ref: exerciseRefSchema,
  note: z.string().max(2000),
});

export const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),
  durationMinutes: optionalCoercedNumber(
    z.coerce.number().int().positive("Indtast en gyldig varighed")
  ),
  notes: z.string().max(2000).optional(),
});

export const discardSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export type ExerciseRef = z.infer<typeof exerciseRefSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type SaveSessionSetInput = z.infer<typeof saveSessionSetSchema>;
export type AddSessionSetInput = z.infer<typeof addSessionSetSchema>;
export type RemoveSessionSetInput = z.infer<typeof removeSessionSetSchema>;
export type AddSessionExerciseInput = z.infer<typeof addSessionExerciseSchema>;
export type RemoveSessionExerciseInput = z.infer<
  typeof removeSessionExerciseSchema
>;
export type SwapSessionExerciseInput = z.infer<
  typeof swapSessionExerciseSchema
>;
export type SaveSessionExerciseNoteInput = z.infer<
  typeof saveSessionExerciseNoteSchema
>;
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;
export type DiscardSessionInput = z.infer<typeof discardSessionSchema>;
