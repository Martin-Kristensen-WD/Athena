// Strength math shared by the progress page and the session summary.

/**
 * Above this rep count the Epley model drifts high, so we don't estimate a
 * 1RM from those sets.
 */
export const ONE_RM_MAX_REPS = 12;

export type PerformedSet = { weight: number | null; reps: number | null };

/** Epley estimated one-rep max. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Estimated 1RM for a logged set, or null if it can't be estimated. */
export function setOneRepMax(set: PerformedSet): number | null {
  if (set.weight == null || set.reps == null) return null;
  if (set.weight <= 0 || set.reps < 1 || set.reps > ONE_RM_MAX_REPS) return null;
  return estimateOneRepMax(set.weight, set.reps);
}

/** Tonnage for a single set (weight × reps). */
export function setVolume(set: PerformedSet): number {
  if (set.weight == null || set.reps == null) return 0;
  if (set.weight <= 0 || set.reps <= 0) return 0;
  return set.weight * set.reps;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: "Bryst",
  back: "Ryg",
  shoulders: "Skuldre",
  biceps: "Biceps",
  triceps: "Triceps",
  quad: "Forlår",
  hamstring: "Baglår",
  glutes: "Balder",
  calves: "Læg",
  core: "Core",
  cardio: "Kondition",
  full_body: "Helkrop",
  other: "Andet",
};

export function muscleGroupLabel(value: string): string {
  return MUSCLE_GROUP_LABELS[value] ?? value;
}
