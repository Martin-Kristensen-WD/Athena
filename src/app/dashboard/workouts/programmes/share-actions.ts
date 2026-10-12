"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getTransactionalDb } from "@/db/transaction";
import {
  exercises,
  programmes,
  programmeDays,
  programmeExercises,
  programmeShares,
  users,
} from "@/db/schema";
import {
  shareProgrammeSchema,
  type ShareProgrammeInput,
} from "@/lib/validations/programme-shares";

export async function shareProgramme(
  programmeId: string,
  values: ShareProgrammeInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = shareProgrammeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Angiv en gyldig e-mail." };
  }

  const userId = session.user.id;
  const email = parsed.data.email.toLowerCase();

  const db = getDb();

  const [programme] = await db
    .select({ id: programmes.id, userId: programmes.userId })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1);

  if (!programme || programme.userId !== userId) {
    return { error: "Programmet blev ikke fundet." };
  }

  const [recipient] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!recipient) {
    return { error: "Ingen bruger fundet med denne e-mail." };
  }

  if (recipient.id === userId) {
    return { error: "Du kan ikke dele et program med dig selv." };
  }

  const [existingPending] = await db
    .select({ id: programmeShares.id })
    .from(programmeShares)
    .where(
      and(
        eq(programmeShares.programmeId, programmeId),
        eq(programmeShares.sharedWithUserId, recipient.id),
        eq(programmeShares.status, "pending")
      )
    )
    .limit(1);

  if (existingPending) {
    return { error: "Programmet er allerede delt med denne bruger." };
  }

  await db.insert(programmeShares).values({
    programmeId,
    sharedByUserId: userId,
    sharedWithUserId: recipient.id,
  });

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}

export async function acceptProgrammeShare(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }
  const userId = session.user.id;

  const db = getDb();
  const [share] = await db
    .select()
    .from(programmeShares)
    .where(eq(programmeShares.id, shareId))
    .limit(1);

  if (!share || share.sharedWithUserId !== userId) {
    return { error: "Delingen blev ikke fundet." };
  }
  if (share.status !== "pending") {
    return { error: "Denne deling er allerede besvaret." };
  }

  const [sourceProgramme] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.id, share.programmeId))
    .limit(1);

  if (!sourceProgramme) {
    return { error: "Det delte program findes ikke længere." };
  }

  const [days, dayExerciseRows] = await Promise.all([
    db
      .select()
      .from(programmeDays)
      .where(eq(programmeDays.programmeId, sourceProgramme.id))
      .orderBy(asc(programmeDays.orderIndex)),
    db
      .select({
        id: programmeExercises.id,
        dayId: programmeExercises.dayId,
        exerciseId: programmeExercises.exerciseId,
        orderIndex: programmeExercises.orderIndex,
        sets: programmeExercises.sets,
        targetReps: programmeExercises.targetReps,
        targetWeight: programmeExercises.targetWeight,
        restSeconds: programmeExercises.restSeconds,
        notes: programmeExercises.notes,
        supersetWithNext: programmeExercises.supersetWithNext,
      })
      .from(programmeExercises)
      .innerJoin(programmeDays, eq(programmeDays.id, programmeExercises.dayId))
      .where(eq(programmeDays.programmeId, sourceProgramme.id))
      .orderBy(asc(programmeExercises.orderIndex)),
  ]);

  const sourceExerciseIds = [
    ...new Set(dayExerciseRows.map((row) => row.exerciseId)),
  ];
  const sourceExercises = sourceExerciseIds.length
    ? await db.select().from(exercises).where(inArray(exercises.id, sourceExerciseIds))
    : [];

  const txDb = getTransactionalDb();
  const newProgrammeId = await txDb.transaction(async (tx) => {
    // Map each exercise referenced by the shared programme to an id the
    // recipient can use: system exercises are shared as-is, custom ones are
    // matched to an existing exercise of theirs by name or copied in fresh.
    const exerciseIdMap = new Map<string, string>();
    for (const exercise of sourceExercises) {
      if (exercise.isSystem) {
        exerciseIdMap.set(exercise.id, exercise.id);
        continue;
      }

      const [existingOwn] = await tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(
          and(eq(exercises.userId, userId), eq(exercises.name, exercise.name))
        )
        .limit(1);

      if (existingOwn) {
        exerciseIdMap.set(exercise.id, existingOwn.id);
        continue;
      }

      const [copied] = await tx
        .insert(exercises)
        .values({
          userId,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          notes: exercise.notes,
          isSystem: false,
        })
        .returning({ id: exercises.id });
      exerciseIdMap.set(exercise.id, copied.id);
    }

    const [newProgramme] = await tx
      .insert(programmes)
      .values({
        userId,
        name: sourceProgramme.name,
        description: sourceProgramme.description,
      })
      .returning({ id: programmes.id });

    for (const day of days) {
      const [newDay] = await tx
        .insert(programmeDays)
        .values({
          programmeId: newProgramme.id,
          name: day.name,
          orderIndex: day.orderIndex,
        })
        .returning({ id: programmeDays.id });

      const dayExercises = dayExerciseRows.filter(
        (row) => row.dayId === day.id
      );
      if (dayExercises.length > 0) {
        await tx.insert(programmeExercises).values(
          dayExercises.map((row) => ({
            dayId: newDay.id,
            exerciseId: exerciseIdMap.get(row.exerciseId)!,
            orderIndex: row.orderIndex,
            sets: row.sets,
            targetReps: row.targetReps,
            targetWeight: row.targetWeight,
            restSeconds: row.restSeconds,
            notes: row.notes,
            supersetWithNext: row.supersetWithNext,
          }))
        );
      }
    }

    await tx
      .update(programmeShares)
      .set({
        status: "accepted",
        respondedAt: new Date(),
        resultingProgrammeId: newProgramme.id,
      })
      .where(eq(programmeShares.id, shareId));

    return newProgramme.id;
  });

  revalidatePath("/dashboard/workouts");
  return { success: true as const, programmeId: newProgrammeId };
}

export async function declineProgrammeShare(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }
  const userId = session.user.id;

  const db = getDb();
  const result = await db
    .update(programmeShares)
    .set({ status: "declined", respondedAt: new Date() })
    .where(
      and(
        eq(programmeShares.id, shareId),
        eq(programmeShares.sharedWithUserId, userId),
        eq(programmeShares.status, "pending")
      )
    )
    .returning({ id: programmeShares.id });

  if (result.length === 0) {
    return { error: "Delingen blev ikke fundet." };
  }

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}

export async function cancelProgrammeShare(shareId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }
  const userId = session.user.id;

  const db = getDb();
  const result = await db
    .delete(programmeShares)
    .where(
      and(
        eq(programmeShares.id, shareId),
        eq(programmeShares.sharedByUserId, userId),
        eq(programmeShares.status, "pending")
      )
    )
    .returning({ id: programmeShares.id });

  if (result.length === 0) {
    return { error: "Delingen blev ikke fundet." };
  }

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}
