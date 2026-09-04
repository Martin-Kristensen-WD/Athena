"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getTransactionalDb } from "@/db/transaction";
import { profiles, programmes, programmeDays, programmeExercises } from "@/db/schema";
import { programmeSchema, type ProgrammeInput } from "@/lib/validations/programmes";

export async function createProgramme(values: ProgrammeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = programmeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const { name, description, days } = parsed.data;
  const userId = session.user.id;

  const db = getTransactionalDb();
  const programmeId = await db.transaction(async (tx) => {
    const [programme] = await tx
      .insert(programmes)
      .values({ userId, name, description: description || null })
      .returning({ id: programmes.id });

    for (const [dayIndex, day] of days.entries()) {
      const [dayRow] = await tx
        .insert(programmeDays)
        .values({ programmeId: programme.id, name: day.name, orderIndex: dayIndex })
        .returning({ id: programmeDays.id });

      await tx.insert(programmeExercises).values(
        day.exercises.map((exercise, index) => ({
          dayId: dayRow.id,
          exerciseId: exercise.exerciseId,
          orderIndex: index,
          sets: exercise.sets,
          targetReps: exercise.targetReps,
          targetWeight:
            exercise.targetWeight !== undefined
              ? exercise.targetWeight.toString()
              : null,
          restSeconds: exercise.restSeconds ?? null,
          notes: exercise.notes || null,
        }))
      );
    }

    return programme.id;
  });

  revalidatePath("/dashboard/workouts");
  return { success: true as const, programmeId };
}

export async function updateProgramme(
  programmeId: string,
  values: ProgrammeInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = programmeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const userId = session.user.id;
  const db = getDb();
  const [existing] = await db
    .select({ id: programmes.id, userId: programmes.userId })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1);

  if (!existing || existing.userId !== userId) {
    return { error: "Programmet blev ikke fundet." };
  }

  const { name, description, days } = parsed.data;
  const txDb = getTransactionalDb();

  await txDb.transaction(async (tx) => {
    await tx
      .update(programmes)
      .set({ name, description: description || null, updatedAt: new Date() })
      .where(eq(programmes.id, programmeId));

    // Replace the day/exercise list wholesale — simpler and safer than
    // diffing, and consistent with the schema's "set null" / "cascade"
    // behaviour for any past session sets that referenced the removed rows.
    await tx
      .delete(programmeDays)
      .where(eq(programmeDays.programmeId, programmeId));

    for (const [dayIndex, day] of days.entries()) {
      const [dayRow] = await tx
        .insert(programmeDays)
        .values({ programmeId, name: day.name, orderIndex: dayIndex })
        .returning({ id: programmeDays.id });

      await tx.insert(programmeExercises).values(
        day.exercises.map((exercise, index) => ({
          dayId: dayRow.id,
          exerciseId: exercise.exerciseId,
          orderIndex: index,
          sets: exercise.sets,
          targetReps: exercise.targetReps,
          targetWeight:
            exercise.targetWeight !== undefined
              ? exercise.targetWeight.toString()
              : null,
          restSeconds: exercise.restSeconds ?? null,
          notes: exercise.notes || null,
        }))
      );
    }
  });

  revalidatePath("/dashboard/workouts");
  revalidatePath(`/dashboard/workouts/programmes/${programmeId}`);
  return { success: true as const };
}

export async function deleteProgramme(programmeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const userId = session.user.id;
  const db = getDb();
  const [existing] = await db
    .select({ id: programmes.id, userId: programmes.userId })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1);

  if (!existing || existing.userId !== userId) {
    return { error: "Programmet blev ikke fundet." };
  }

  await db.delete(programmes).where(eq(programmes.id, programmeId));

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}

export async function setActiveProgramme(programmeId: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const userId = session.user.id;
  const db = getDb();

  if (programmeId) {
    const [existing] = await db
      .select({ id: programmes.id, userId: programmes.userId })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .limit(1);

    if (!existing || existing.userId !== userId) {
      return { error: "Programmet blev ikke fundet." };
    }
  }

  await db
    .update(profiles)
    .set({ activeProgrammeId: programmeId })
    .where(eq(profiles.userId, userId));

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}
