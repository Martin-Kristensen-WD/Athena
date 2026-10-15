"use client";

import { Loader2, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ExerciseStats = {
  name: string;
  allTimeBest: { weight: number; reps: number; date: string } | null;
  last: {
    date: string;
    sets: { reps: number | null; weight: string | null }[];
  } | null;
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExerciseStatsDialog({
  exercise,
  loading = false,
  onOpenChange,
}: {
  /** The exercise to show stats for, or null while the dialog is closed. */
  exercise: ExerciseStats | null;
  /** True while the stats are still being fetched (on-demand callers only). */
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={exercise !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{exercise?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-500">
                <Trophy className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Alle tiders rekord
                </p>
                {exercise?.allTimeBest ? (
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {exercise.allTimeBest.weight} × {exercise.allTimeBest.reps}
                    <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
                      {formatDate(exercise.allTimeBest.date)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ingen registreringer endnu
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Sidste gang
                {exercise?.last && ` · ${formatDate(exercise.last.date)}`}
              </p>
              {exercise?.last ? (
                <div className="mt-1.5 grid gap-1">
                  {exercise.last.sets.map((set, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">
                        Sæt {index + 1}
                      </span>
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {set.weight ?? "–"} × {set.reps ?? "–"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Ingen tidligere registreringer
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
