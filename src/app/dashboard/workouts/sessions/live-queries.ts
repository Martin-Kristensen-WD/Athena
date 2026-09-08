import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import {
  exercises,
  programmeDays,
  programmeExercises,
  programmes,
  workoutSessions,
  workoutSessionExerciseNotes,
  workoutSessionSets,
} from "@/db/schema";

// Fallback rest when a programme exercise has no `restSeconds`, and for
// freeform sessions where there is no plan to read it from.
export const DEFAULT_REST_SECONDS = 120;

export type LiveExerciseRef =
  | { kind: "programme"; programmeExerciseId: string }
  | { kind: "exercise"; exerciseId: string };

export type LiveSet = {
  id: string;
  setIndex: number;
  reps: number | null;
  weight: string | null;
  rir: number | null;
  done: boolean;
};

export type LiveExercise = {
  /** Stable group key: the programmeExerciseId or the exerciseId. */
  key: string;
  ref: LiveExerciseRef;
  /** The underlying exercise, used to look up "last time" performance. */
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  /** The exercise's own coaching notes (setup / cues), shown in the info sheet. */
  coachNotes: string | null;
  /** A note the user attached to this exercise for this session only. */
  note: string | null;
  order: number;
  target: {
    sets: number;
    reps: string;
    weight: string | null;
    restSeconds: number | null;
  } | null;
  last: {
    date: string;
    sets: { reps: number | null; weight: string | null }[];
  } | null;
  sets: LiveSet[];
};

export type LiveSession = {
  id: string;
  startedAt: Date;
  programmeName: string | null;
  programmeDayName: string | null;
  isFree: boolean;
  exercises: LiveExercise[];
};

/** The user's single in-progress session, if any. */
export async function getActiveSessionId(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "active")
      )
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  return row?.id ?? null;
}

/**
 * For each of `exerciseIds`, the sets from that exercise's most recent
 * *completed* session — the progressive-overload cue shown next to each input.
 */
export async function getLastPerformance(
  userId: string,
  exerciseIds: string[]
) {
  const result = new Map<
    string,
    { date: string; sets: { reps: number | null; weight: string | null }[] }
  >();
  if (exerciseIds.length === 0) return result;

  const db = getDb();
  const resolvedExerciseId = sql<string>`coalesce(${workoutSessionSets.exerciseId}, ${programmeExercises.exerciseId})`;

  const rows = await db
    .select({
      exerciseId: resolvedExerciseId,
      sessionId: workoutSessionSets.sessionId,
      startedAt: workoutSessions.startedAt,
      setIndex: workoutSessionSets.setIndex,
      reps: workoutSessionSets.reps,
      weight: workoutSessionSets.weight,
    })
    .from(workoutSessionSets)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, workoutSessionSets.sessionId)
    )
    .leftJoin(
      programmeExercises,
      eq(programmeExercises.id, workoutSessionSets.programmeExerciseId)
    )
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
        or(
          inArray(workoutSessionSets.exerciseId, exerciseIds),
          inArray(programmeExercises.exerciseId, exerciseIds)
        )
      )
    )
    .orderBy(desc(workoutSessions.startedAt), asc(workoutSessionSets.setIndex));

  // Rows arrive newest-session-first. The first row seen for an exercise fixes
  // which session counts as "last time"; rows from older sessions are skipped.
  const chosenSession = new Map<string, string>();
  for (const row of rows) {
    if (!row.exerciseId) continue;
    if (!chosenSession.has(row.exerciseId)) {
      chosenSession.set(row.exerciseId, row.sessionId);
    }
    if (chosenSession.get(row.exerciseId) !== row.sessionId) continue;

    const entry =
      result.get(row.exerciseId) ??
      ({
        date: row.startedAt.toISOString().slice(0, 10),
        sets: [] as { reps: number | null; weight: string | null }[],
      });
    entry.sets.push({ reps: row.reps, weight: row.weight });
    result.set(row.exerciseId, entry);
  }

  return result;
}

/**
 * The full state of an in-progress session, normalised for the live logger.
 * Returns null if the session is not the user's, or is no longer active.
 */
export async function loadLiveSession(
  userId: string,
  sessionId: string
): Promise<LiveSession | null> {
  const db = getDb();

  const [session] = await db
    .select({
      id: workoutSessions.id,
      userId: workoutSessions.userId,
      status: workoutSessions.status,
      startedAt: workoutSessions.startedAt,
      programmeId: workoutSessions.programmeId,
      programmeDayId: workoutSessions.programmeDayId,
      programmeName: programmes.name,
      programmeDayName: programmeDays.name,
    })
    .from(workoutSessions)
    .leftJoin(programmes, eq(programmes.id, workoutSessions.programmeId))
    .leftJoin(
      programmeDays,
      eq(programmeDays.id, workoutSessions.programmeDayId)
    )
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!session || session.userId !== userId || session.status !== "active") {
    return null;
  }

  const planned = session.programmeDayId
    ? await db
        .select({
          programmeExerciseId: programmeExercises.id,
          exerciseId: programmeExercises.exerciseId,
          name: exercises.name,
          muscleGroup: exercises.muscleGroup,
          equipment: exercises.equipment,
          coachNotes: exercises.notes,
          order: programmeExercises.orderIndex,
          sets: programmeExercises.sets,
          targetReps: programmeExercises.targetReps,
          targetWeight: programmeExercises.targetWeight,
          restSeconds: programmeExercises.restSeconds,
        })
        .from(programmeExercises)
        .innerJoin(
          exercises,
          eq(exercises.id, programmeExercises.exerciseId)
        )
        .where(eq(programmeExercises.dayId, session.programmeDayId))
        .orderBy(asc(programmeExercises.orderIndex))
    : [];

  const directExercise = alias(exercises, "direct_exercise");
  const setRows = await db
    .select({
      id: workoutSessionSets.id,
      programmeExerciseId: workoutSessionSets.programmeExerciseId,
      exerciseId: workoutSessionSets.exerciseId,
      setIndex: workoutSessionSets.setIndex,
      reps: workoutSessionSets.reps,
      weight: workoutSessionSets.weight,
      rir: workoutSessionSets.rir,
      completedAt: workoutSessionSets.completedAt,
      createdAt: workoutSessionSets.createdAt,
      directName: directExercise.name,
      directMuscleGroup: directExercise.muscleGroup,
      directEquipment: directExercise.equipment,
      directCoachNotes: directExercise.notes,
    })
    .from(workoutSessionSets)
    .leftJoin(
      directExercise,
      eq(directExercise.id, workoutSessionSets.exerciseId)
    )
    .where(eq(workoutSessionSets.sessionId, sessionId))
    .orderBy(asc(workoutSessionSets.createdAt), asc(workoutSessionSets.setIndex));

  const groups = new Map<string, LiveExercise>();

  for (const p of planned) {
    groups.set(p.programmeExerciseId, {
      key: p.programmeExerciseId,
      ref: { kind: "programme", programmeExerciseId: p.programmeExerciseId },
      exerciseId: p.exerciseId,
      name: p.name,
      muscleGroup: p.muscleGroup,
      equipment: p.equipment,
      coachNotes: p.coachNotes,
      note: null,
      order: p.order,
      target: {
        sets: p.sets,
        reps: p.targetReps,
        weight: p.targetWeight,
        restSeconds: p.restSeconds,
      },
      last: null,
      sets: [],
    });
  }

  let extraOrder = 1000;
  for (const row of setRows) {
    let key: string;
    let ref: LiveExerciseRef;
    if (row.programmeExerciseId) {
      key = row.programmeExerciseId;
      ref = { kind: "programme", programmeExerciseId: row.programmeExerciseId };
    } else if (row.exerciseId) {
      key = row.exerciseId;
      ref = { kind: "exercise", exerciseId: row.exerciseId };
    } else {
      continue;
    }

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        ref,
        exerciseId: row.exerciseId ?? "",
        name: row.directName ?? "Øvelse",
        muscleGroup: row.directMuscleGroup ?? "other",
        equipment: row.directEquipment ?? null,
        coachNotes: row.directCoachNotes ?? null,
        note: null,
        order: extraOrder++,
        target: null,
        last: null,
        sets: [],
      };
      groups.set(key, group);
    }

    group.sets.push({
      id: row.id,
      setIndex: row.setIndex,
      reps: row.reps,
      weight: row.weight,
      rir: row.rir,
      done: row.completedAt !== null,
    });
  }

  // A planned programme slot always has its sets pre-created at start; if it has
  // none now it was either cleared or swapped away (its sets moved to a direct
  // exercise group), so drop the empty shell.
  const list = [...groups.values()]
    .filter(
      (group) => group.ref.kind !== "programme" || group.sets.length > 0
    )
    .sort((a, b) => a.order - b.order);
  for (const group of list) {
    group.sets.sort((a, b) => a.setIndex - b.setIndex);
  }

  const exerciseIds = [
    ...new Set(list.map((g) => g.exerciseId).filter(Boolean)),
  ];
  const lastByExercise = await getLastPerformance(userId, exerciseIds);
  for (const group of list) {
    const last = group.exerciseId
      ? lastByExercise.get(group.exerciseId)
      : undefined;
    if (last) group.last = last;
  }

  const noteRows = await db
    .select({
      programmeExerciseId: workoutSessionExerciseNotes.programmeExerciseId,
      exerciseId: workoutSessionExerciseNotes.exerciseId,
      note: workoutSessionExerciseNotes.note,
    })
    .from(workoutSessionExerciseNotes)
    .where(eq(workoutSessionExerciseNotes.sessionId, sessionId));
  const noteByKey = new Map<string, string>();
  for (const row of noteRows) {
    const key = row.programmeExerciseId ?? row.exerciseId;
    if (key) noteByKey.set(key, row.note);
  }
  for (const group of list) {
    const note = noteByKey.get(group.key);
    if (note) group.note = note;
  }

  return {
    id: session.id,
    startedAt: session.startedAt,
    programmeName: session.programmeName,
    programmeDayName: session.programmeDayName,
    isFree: session.programmeId === null,
    exercises: list,
  };
}
