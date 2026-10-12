"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendChart } from "./trend-chart";
import type { ExerciseStrength } from "./strength-queries";

const compact = new Intl.NumberFormat("da-DK", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-muted-foreground text-xs tabular-nums">{sub}</p>}
    </div>
  );
}

export function ExerciseStrength({
  exercises,
}: {
  exercises: ExerciseStrength[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (exercises.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Registrér et træningspas med vægt og reps for at se styrketal.
      </p>
    );
  }

  const active =
    exercises.find((exercise) => exercise.exerciseId === selectedId) ??
    exercises[0];

  return (
    <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
      <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
        {exercises.map((exercise) => (
          <button
            key={exercise.exerciseId}
            type="button"
            onClick={() => setSelectedId(exercise.exerciseId)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              exercise.exerciseId === active.exerciseId
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="block">{exercise.name}</span>
            <span
              className={cn(
                "block text-xs font-normal",
                exercise.exerciseId === active.exerciseId
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {exercise.muscleGroupLabel}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Stat
            label="Bedste est. 1RM"
            value={
              active.bestOneRm ? `${active.bestOneRm.value} kg` : "–"
            }
            sub={
              active.bestOneRm
                ? `${active.bestOneRm.reps} reps @ ${active.bestOneRm.weight} kg`
                : undefined
            }
          />
          <Stat
            label="Tungeste løft"
            value={active.maxWeight ? `${active.maxWeight.value} kg` : "–"}
            sub={
              active.maxWeight && active.maxWeight.reps
                ? `× ${active.maxWeight.reps} reps`
                : undefined
            }
          />
          <Stat
            label="Samlet volumen"
            value={`${compact.format(active.totalVolume)} kg`}
          />
          <Stat
            label="Træningspas"
            value={String(active.sessions)}
          />
        </div>

        <TrendChart
          data={active.oneRmSeries}
          emptyMessage="Registrér denne øvelse på mindst to forskellige dage for at se en 1RM-graf."
        />
      </div>
    </div>
  );
}
