"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getTransactionalDb } from "@/db/transaction";
import {
  programmes,
  programmeDays,
  workoutSessions,
  workoutSessionSets,
} from "@/db/schema";
import {
  workoutSessionSchema,
  type WorkoutSessionInput,
} from "@/lib/validations/sessions";

export async function createWorkoutSession(values: WorkoutSessionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = workoutSessionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const userId = session.user.id;
  const { programmeId, programmeDayId, durationMinutes, notes, exercises } =
    parsed.data;

  const [programme] = await getDb()
    .select({ id: programmes.id, userId: programmes.userId })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1);

  if (!programme || programme.userId !== userId) {
    return { error: "Programmet blev ikke fundet." };
  }

  if (programmeDayId) {
    const [day] = await getDb()
      .select({ id: programmeDays.id })
      .from(programmeDays)
      .where(
        and(
          eq(programmeDays.id, programmeDayId),
          eq(programmeDays.programmeId, programmeId)
        )
      )
      .limit(1);

    if (!day) {
      return { error: "Dagen blev ikke fundet i dette program." };
    }
  }

  const db = getTransactionalDb();
  const sessionId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workoutSessions)
      .values({
        userId,
        programmeId,
        programmeDayId: programmeDayId ?? null,
        durationMinutes: durationMinutes ?? null,
        notes: notes || null,
      })
      .returning({ id: workoutSessions.id });

    const setRows = exercises.flatMap((exercise) =>
      exercise.sets.map((set, index) => ({
        sessionId: created.id,
        programmeExerciseId: exercise.programmeExerciseId,
        setIndex: index,
        reps: set.reps ?? null,
        weight: set.weight !== undefined ? set.weight.toString() : null,
      }))
    );

    if (setRows.length > 0) {
      await tx.insert(workoutSessionSets).values(setRows);
    }

    return created.id;
  });

  revalidatePath("/dashboard/workouts");
  return { success: true as const, sessionId };
}

export async function deleteWorkoutSession(sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: workoutSessions.id, userId: workoutSessions.userId })
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!existing || existing.userId !== session.user.id) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}
