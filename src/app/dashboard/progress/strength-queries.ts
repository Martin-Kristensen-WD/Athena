import { and, asc, eq, gte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import {
  exercises,
  programmeExercises,
  workoutSessions,
  workoutSessionSets,
} from "@/db/schema";
import { entryDayKey, startOfWeek } from "@/lib/date";
import {
  muscleGroupLabel,
  round1,
  setOneRepMax,
  setVolume,
} from "@/lib/strength";

type CompletedSet = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  startedAt: Date;
  weight: number | null;
  reps: number | null;
};

async function loadCompletedSets(
  userId: string,
  since: Date | null
): Promise<CompletedSet[]> {
  const db = getDb();
  const directExercise = alias(exercises, "direct_exercise");

  const rows = await db
    .select({
      peExerciseId: programmeExercises.exerciseId,
      peName: exercises.name,
      peMuscle: exercises.muscleGroup,
      directId: directExercise.id,
      directName: directExercise.name,
      directMuscle: directExercise.muscleGroup,
      startedAt: workoutSessions.startedAt,
      weight: workoutSessionSets.weight,
      reps: workoutSessionSets.reps,
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
    .leftJoin(exercises, eq(exercises.id, programmeExercises.exerciseId))
    .leftJoin(
      directExercise,
      eq(directExercise.id, workoutSessionSets.exerciseId)
    )
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
        ...(since ? [gte(workoutSessions.startedAt, since)] : [])
      )
    )
    .orderBy(asc(workoutSessions.startedAt));

  const result: CompletedSet[] = [];
  for (const row of rows) {
    const exerciseId = row.peExerciseId ?? row.directId;
    const name = row.peName ?? row.directName;
    const muscleGroup = row.peMuscle ?? row.directMuscle;
    if (!exerciseId || !name || !muscleGroup) continue;
    result.push({
      exerciseId,
      name,
      muscleGroup,
      startedAt: row.startedAt,
      weight: row.weight !== null ? Number(row.weight) : null,
      reps: row.reps,
    });
  }
  return result;
}

export type ExerciseStrength = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  muscleGroupLabel: string;
  sessions: number;
  totalVolume: number;
  bestOneRm: {
    value: number;
    date: string;
    weight: number;
    reps: number;
  } | null;
  maxWeight: { value: number; date: string; reps: number } | null;
  oneRmSeries: { date: string; value: number }[];
};

export type MuscleVolumeChart = {
  buckets: { key: string; label: string }[];
  unit: "week" | "month";
  groups: {
    muscleGroup: string;
    label: string;
    values: number[];
    total: number;
  }[];
};

export type StrengthData = {
  exercises: ExerciseStrength[];
  volume: MuscleVolumeChart;
  totalVolume: number;
};

function buildExercises(sets: CompletedSet[]): ExerciseStrength[] {
  const byExercise = new Map<string, CompletedSet[]>();
  for (const set of sets) {
    const list = byExercise.get(set.exerciseId) ?? [];
    list.push(set);
    byExercise.set(set.exerciseId, list);
  }

  const result: ExerciseStrength[] = [];
  for (const [exerciseId, exerciseSets] of byExercise) {
    const { name, muscleGroup } = exerciseSets[0];
    let totalVolume = 0;
    let maxWeight: ExerciseStrength["maxWeight"] = null;
    let bestOneRm: ExerciseStrength["bestOneRm"] = null;

    // Best estimated 1RM per session date, for the trend line.
    const bestOneRmByDate = new Map<string, number>();

    for (const set of exerciseSets) {
      totalVolume += setVolume(set);
      const date = entryDayKey(set.startedAt);

      if (set.weight != null && (!maxWeight || set.weight > maxWeight.value)) {
        maxWeight = { value: set.weight, date, reps: set.reps ?? 0 };
      }

      const oneRm = setOneRepMax(set);
      if (oneRm != null) {
        if (!bestOneRm || oneRm > bestOneRm.value) {
          bestOneRm = {
            value: oneRm,
            date,
            weight: set.weight ?? 0,
            reps: set.reps ?? 0,
          };
        }
        const prevForDate = bestOneRmByDate.get(date) ?? 0;
        if (oneRm > prevForDate) bestOneRmByDate.set(date, oneRm);
      }
    }

    const sessionDates = new Set(
      exerciseSets.map((set) => entryDayKey(set.startedAt))
    );

    result.push({
      exerciseId,
      name,
      muscleGroup,
      muscleGroupLabel: muscleGroupLabel(muscleGroup),
      sessions: sessionDates.size,
      totalVolume: Math.round(totalVolume),
      bestOneRm: bestOneRm
        ? { ...bestOneRm, value: round1(bestOneRm.value) }
        : null,
      maxWeight,
      oneRmSeries: [...bestOneRmByDate.entries()]
        .map(([date, value]) => ({ date, value: round1(value) }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    });
  }

  return result.sort((a, b) => b.totalVolume - a.totalVolume);
}

function buildVolumeChart(sets: CompletedSet[]): MuscleVolumeChart {
  if (sets.length === 0) {
    return { buckets: [], unit: "week", groups: [] };
  }

  // Weekly buckets, downsampled to monthly once there are too many to read.
  const weekKeys = new Set<string>();
  for (const set of sets) {
    weekKeys.add(entryDayKey(startOfWeek(set.startedAt)));
  }
  const unit: "week" | "month" = weekKeys.size > 26 ? "month" : "week";

  const bucketKey = (date: Date) =>
    unit === "week"
      ? entryDayKey(startOfWeek(date))
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const bucketLabel = (key: string) =>
    unit === "week"
      ? new Date(`${key}T00:00:00`).toLocaleDateString("da-DK", {
          day: "numeric",
          month: "short",
        })
      : new Date(`${key}-01T00:00:00`).toLocaleDateString("da-DK", {
          month: "short",
          year: "2-digit",
        });

  const bucketKeys = [
    ...new Set(sets.map((set) => bucketKey(set.startedAt))),
  ].sort();
  const bucketIndex = new Map(bucketKeys.map((key, index) => [key, index]));

  const groupTotals = new Map<string, number[]>();
  for (const set of sets) {
    const volume = setVolume(set);
    if (volume === 0) continue;
    const values =
      groupTotals.get(set.muscleGroup) ??
      new Array(bucketKeys.length).fill(0);
    values[bucketIndex.get(bucketKey(set.startedAt))!] += volume;
    groupTotals.set(set.muscleGroup, values);
  }

  const groups = [...groupTotals.entries()]
    .map(([muscleGroup, values]) => ({
      muscleGroup,
      label: muscleGroupLabel(muscleGroup),
      values: values.map((value) => Math.round(value)),
      total: Math.round(values.reduce((sum, value) => sum + value, 0)),
    }))
    .filter((group) => group.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    buckets: bucketKeys.map((key) => ({ key, label: bucketLabel(key) })),
    unit,
    groups,
  };
}

export async function getStrengthData(
  userId: string,
  since: Date | null
): Promise<StrengthData> {
  const sets = await loadCompletedSets(userId, since);
  return {
    exercises: buildExercises(sets),
    volume: buildVolumeChart(sets),
    totalVolume: Math.round(sets.reduce((sum, set) => sum + setVolume(set), 0)),
  };
}

export type SessionPr = { kind: "e1rm" | "weight" | "both" };

/**
 * Which sets in a completed session set a new all-time record (estimated 1RM
 * or heaviest weight) for their exercise. The exercise's first-ever session
 * is never flagged.
 */
export async function getSessionPersonalRecords(
  userId: string,
  sessionId: string
): Promise<{ byKey: Map<string, SessionPr>; count: number }> {
  const db = getDb();

  const rows = await db
    .select({
      rowId: workoutSessionSets.id,
      sessionId: workoutSessionSets.sessionId,
      setIndex: workoutSessionSets.setIndex,
      programmeExerciseId: workoutSessionSets.programmeExerciseId,
      directExerciseId: workoutSessionSets.exerciseId,
      resolvedExerciseId: sql<
        string | null
      >`coalesce(${workoutSessionSets.exerciseId}, ${programmeExercises.exerciseId})`,
      weight: workoutSessionSets.weight,
      reps: workoutSessionSets.reps,
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
        eq(workoutSessions.status, "completed")
      )
    )
    .orderBy(asc(workoutSessions.startedAt), asc(workoutSessionSets.setIndex));

  const bestOneRm = new Map<string, number>();
  const maxWeight = new Map<string, number>();
  const firstSession = new Map<string, string>();
  const byKey = new Map<string, SessionPr>();

  for (const row of rows) {
    const exerciseId = row.resolvedExerciseId;
    if (!exerciseId) continue;

    if (!firstSession.has(exerciseId)) {
      firstSession.set(exerciseId, row.sessionId);
    }

    const weight = row.weight !== null ? Number(row.weight) : null;
    const set = { weight, reps: row.reps };
    const oneRm = setOneRepMax(set);
    const priorOneRm = bestOneRm.get(exerciseId) ?? 0;
    const priorWeight = maxWeight.get(exerciseId) ?? 0;

    const beatsOneRm = oneRm != null && oneRm > priorOneRm + 1e-6;
    const beatsWeight = weight != null && weight > priorWeight + 1e-6;

    if (
      row.sessionId === sessionId &&
      (beatsOneRm || beatsWeight) &&
      firstSession.get(exerciseId) !== sessionId
    ) {
      const groupKey =
        row.programmeExerciseId ??
        row.directExerciseId ??
        `unlinked-${row.rowId}`;
      byKey.set(`${groupKey}:${row.setIndex}`, {
        kind:
          beatsOneRm && beatsWeight ? "both" : beatsOneRm ? "e1rm" : "weight",
      });
    }

    if (oneRm != null && oneRm > priorOneRm) bestOneRm.set(exerciseId, oneRm);
    if (weight != null && weight > priorWeight) maxWeight.set(exerciseId, weight);
  }

  return { byKey, count: byKey.size };
}
