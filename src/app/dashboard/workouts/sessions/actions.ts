"use server";

import { randomUUID } from "crypto";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getTransactionalDb } from "@/db/transaction";
import {
  exercises,
  programmes,
  programmeDays,
  programmeExercises,
  workoutSessions,
  workoutSessionExerciseNotes,
  workoutSessionSets,
} from "@/db/schema";
import {
  addSessionExerciseSchema,
  addSessionSetSchema,
  discardSessionSchema,
  finishSessionSchema,
  freeWorkoutSessionSchema,
  removeSessionExerciseSchema,
  removeSessionSetSchema,
  saveSessionExerciseNoteSchema,
  saveSessionSetSchema,
  startSessionSchema,
  swapSessionExerciseSchema,
  workoutSessionSchema,
  type AddSessionExerciseInput,
  type AddSessionSetInput,
  type DiscardSessionInput,
  type ExerciseRef,
  type FinishSessionInput,
  type FreeWorkoutSessionInput,
  type RemoveSessionExerciseInput,
  type RemoveSessionSetInput,
  type SaveSessionExerciseNoteInput,
  type SaveSessionSetInput,
  type StartSessionInput,
  type SwapSessionExerciseInput,
  type WorkoutSessionInput,
} from "@/lib/validations/sessions";
import { getActiveSessionId } from "./live-queries";

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

export async function createFreeWorkoutSession(values: FreeWorkoutSessionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = freeWorkoutSessionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const userId = session.user.id;
  const { durationMinutes, notes, exercises } = parsed.data;

  const db = getTransactionalDb();
  const sessionId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workoutSessions)
      .values({
        userId,
        programmeId: null,
        programmeDayId: null,
        durationMinutes: durationMinutes ?? null,
        notes: notes || null,
      })
      .returning({ id: workoutSessions.id });

    const setRows = exercises.flatMap((exercise) =>
      exercise.sets.map((set, index) => ({
        sessionId: created.id,
        exerciseId: exercise.exerciseId,
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

// ---------------------------------------------------------------------------
// Live (server-persisted, resumable) workout sessions
// ---------------------------------------------------------------------------

function refColumns(ref: ExerciseRef) {
  return {
    programmeExerciseId:
      ref.kind === "programme" ? ref.programmeExerciseId : null,
    exerciseId: ref.kind === "exercise" ? ref.exerciseId : null,
  };
}

/** Drizzle condition matching rows (sets or notes) hung off `ref`. */
function refMatch(
  columns: { programmeExerciseId: AnyPgColumn; exerciseId: AnyPgColumn },
  ref: ExerciseRef
) {
  return ref.kind === "programme"
    ? eq(columns.programmeExerciseId, ref.programmeExerciseId)
    : eq(columns.exerciseId, ref.exerciseId);
}

/** Loads a session and confirms it is the caller's and still in progress. */
async function loadOwnedActiveSession(userId: string, sessionId: string) {
  const [row] = await getDb()
    .select({
      id: workoutSessions.id,
      userId: workoutSessions.userId,
      status: workoutSessions.status,
      startedAt: workoutSessions.startedAt,
      notes: workoutSessions.notes,
    })
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!row || row.userId !== userId || row.status !== "active") return null;
  return row;
}

export async function startWorkoutSession(input: StartSessionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }
  const userId = session.user.id;

  const parsed = startSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke starte træningspasset." };
  }

  // At most one live session at a time — resume the existing one instead.
  const existing = await getActiveSessionId(userId);
  if (existing) {
    return { success: true as const, sessionId: existing, resumed: true as const };
  }

  if (parsed.data.kind === "free") {
    const [created] = await getDb()
      .insert(workoutSessions)
      .values({ userId, status: "active" })
      .returning({ id: workoutSessions.id });

    revalidatePath("/dashboard/workouts");
    return { success: true as const, sessionId: created.id };
  }

  const { programmeId, programmeDayId } = parsed.data;

  const [programme] = await getDb()
    .select({ id: programmes.id, userId: programmes.userId })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1);
  if (!programme || programme.userId !== userId) {
    return { error: "Programmet blev ikke fundet." };
  }

  const planned = await getDb()
    .select({
      id: programmeExercises.id,
      sets: programmeExercises.sets,
    })
    .from(programmeExercises)
    .innerJoin(programmeDays, eq(programmeDays.id, programmeExercises.dayId))
    .where(
      and(
        eq(programmeExercises.dayId, programmeDayId),
        eq(programmeDays.programmeId, programmeId)
      )
    )
    .orderBy(asc(programmeExercises.orderIndex));

  if (planned.length === 0) {
    return { error: "Denne dag har ingen øvelser at træne." };
  }

  const db = getTransactionalDb();
  const sessionId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workoutSessions)
      .values({ userId, programmeId, programmeDayId, status: "active" })
      .returning({ id: workoutSessions.id });

    const setRows = planned.flatMap((pe) =>
      Array.from({ length: pe.sets }, (_, index) => ({
        id: randomUUID(),
        sessionId: created.id,
        programmeExerciseId: pe.id,
        setIndex: index,
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

export async function saveSessionSet(input: SaveSessionSetInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = saveSessionSetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ugyldigt sæt." };
  }
  const { sessionId, setId, ref, setIndex, reps, weight, rir, done } =
    parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  const repsValue = reps ?? null;
  const weightValue = weight !== undefined ? weight.toString() : null;
  const rirValue = rir ?? null;
  const completedAt = done ? new Date() : null;

  await getDb()
    .insert(workoutSessionSets)
    .values({
      id: setId,
      sessionId,
      setIndex,
      reps: repsValue,
      weight: weightValue,
      rir: rirValue,
      completedAt,
      ...refColumns(ref),
    })
    .onConflictDoUpdate({
      target: workoutSessionSets.id,
      set: {
        setIndex,
        reps: repsValue,
        weight: weightValue,
        rir: rirValue,
        completedAt,
      },
    });

  return { success: true as const };
}

export async function addSessionSet(input: AddSessionSetInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = addSessionSetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke tilføje sættet." };
  }
  const { sessionId, setId, ref, setIndex } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  await getDb()
    .insert(workoutSessionSets)
    .values({ id: setId, sessionId, setIndex, ...refColumns(ref) })
    .onConflictDoNothing();

  return { success: true as const };
}

export async function removeSessionSet(input: RemoveSessionSetInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = removeSessionSetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke fjerne sættet." };
  }
  const { sessionId, setId } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  await getDb()
    .delete(workoutSessionSets)
    .where(
      and(
        eq(workoutSessionSets.id, setId),
        eq(workoutSessionSets.sessionId, sessionId)
      )
    );

  return { success: true as const };
}

export async function addSessionExercise(input: AddSessionExerciseInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = addSessionExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke tilføje øvelsen." };
  }
  const { sessionId, exerciseId } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  const [exercise] = await getDb()
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
    })
    .from(exercises)
    .where(
      and(
        eq(exercises.id, exerciseId),
        or(eq(exercises.userId, session.user.id), eq(exercises.isSystem, true))
      )
    )
    .limit(1);
  if (!exercise) {
    return { error: "Øvelsen blev ikke fundet." };
  }

  const setId = randomUUID();
  await getDb()
    .insert(workoutSessionSets)
    .values({ id: setId, sessionId, exerciseId, setIndex: 0 });

  return { success: true as const, setId, exercise };
}

export async function removeSessionExercise(input: RemoveSessionExerciseInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = removeSessionExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke fjerne øvelsen." };
  }
  const { sessionId, ref } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  await getDb()
    .delete(workoutSessionSets)
    .where(
      and(
        eq(workoutSessionSets.sessionId, sessionId),
        refMatch(workoutSessionSets, ref)
      )
    );

  return { success: true as const };
}

export async function swapSessionExercise(input: SwapSessionExerciseInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = swapSessionExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke bytte øvelsen." };
  }
  const { sessionId, ref, exerciseId } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  const [exercise] = await getDb()
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
      equipment: exercises.equipment,
      notes: exercises.notes,
    })
    .from(exercises)
    .where(
      and(
        eq(exercises.id, exerciseId),
        or(eq(exercises.userId, session.user.id), eq(exercises.isSystem, true))
      )
    )
    .limit(1);
  if (!exercise) {
    return { error: "Øvelsen blev ikke fundet." };
  }

  const db = getTransactionalDb();
  await db.transaction(async (tx) => {
    // Re-point this slot's sets at the chosen exercise for this session only;
    // the programme link (and its planned target) is dropped for the slot.
    await tx
      .update(workoutSessionSets)
      .set({ programmeExerciseId: null, exerciseId })
      .where(
        and(
          eq(workoutSessionSets.sessionId, sessionId),
          refMatch(workoutSessionSets, ref)
        )
      );

    // Carry any exercise note across to the new ref.
    await tx
      .update(workoutSessionExerciseNotes)
      .set({
        programmeExerciseId: null,
        exerciseId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workoutSessionExerciseNotes.sessionId, sessionId),
          refMatch(workoutSessionExerciseNotes, ref)
        )
      );
  });

  return { success: true as const, exercise };
}

export async function saveSessionExerciseNote(
  input: SaveSessionExerciseNoteInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = saveSessionExerciseNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke gemme noten." };
  }
  const { sessionId, ref, note } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  const trimmed = note.trim();
  const db = getDb();
  const refCondition = and(
    eq(workoutSessionExerciseNotes.sessionId, sessionId),
    refMatch(workoutSessionExerciseNotes, ref)
  );

  const [existing] = await db
    .select({ id: workoutSessionExerciseNotes.id })
    .from(workoutSessionExerciseNotes)
    .where(refCondition)
    .limit(1);

  if (!trimmed) {
    if (existing) {
      await db
        .delete(workoutSessionExerciseNotes)
        .where(eq(workoutSessionExerciseNotes.id, existing.id));
    }
    return { success: true as const, note: "" };
  }

  if (existing) {
    await db
      .update(workoutSessionExerciseNotes)
      .set({ note: trimmed, updatedAt: new Date() })
      .where(eq(workoutSessionExerciseNotes.id, existing.id));
  } else {
    await db
      .insert(workoutSessionExerciseNotes)
      .values({ sessionId, note: trimmed, ...refColumns(ref) });
  }

  return { success: true as const, note: trimmed };
}

export async function finishWorkoutSession(input: FinishSessionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke afslutte træningspasset." };
  }
  const { sessionId, durationMinutes, notes } = parsed.data;

  const active = await loadOwnedActiveSession(session.user.id, sessionId);
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  const completedAt = new Date();
  const duration =
    durationMinutes ??
    Math.max(
      1,
      Math.round((completedAt.getTime() - active.startedAt.getTime()) / 60000)
    );
  const trimmedNotes = notes?.trim();

  const db = getTransactionalDb();
  await db.transaction(async (tx) => {
    // Drop planned sets the user never touched so history stays clean.
    await tx
      .delete(workoutSessionSets)
      .where(
        and(
          eq(workoutSessionSets.sessionId, sessionId),
          isNull(workoutSessionSets.reps),
          isNull(workoutSessionSets.weight),
          isNull(workoutSessionSets.rir),
          isNull(workoutSessionSets.completedAt)
        )
      );

    await tx
      .update(workoutSessions)
      .set({
        status: "completed",
        completedAt,
        durationMinutes: duration,
        notes: trimmedNotes ? trimmedNotes : active.notes ?? null,
      })
      .where(eq(workoutSessions.id, sessionId));
  });

  revalidatePath("/dashboard/workouts");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workouts/sessions/${sessionId}`);
  return { success: true as const, sessionId };
}

export async function discardWorkoutSession(input: DiscardSessionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = discardSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Kunne ikke kassere træningspasset." };
  }

  const active = await loadOwnedActiveSession(
    session.user.id,
    parsed.data.sessionId
  );
  if (!active) {
    return { error: "Træningspasset blev ikke fundet." };
  }

  await getDb()
    .delete(workoutSessions)
    .where(eq(workoutSessions.id, parsed.data.sessionId));

  revalidatePath("/dashboard/workouts");
  return { success: true as const };
}
