"use client";

import { Loader2, Repeat, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ExerciseFullHistory, ExerciseSessionLog } from "./sessions/live-queries";

export type ExerciseHistoryTarget = {
  id: string;
  name: string;
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatTile({
  icon: Icon,
  iconClassName,
  label,
  children,
}: {
  icon: typeof Trophy;
  iconClassName: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          iconClassName
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}

function SessionSets({ sets }: { sets: ExerciseSessionLog["sets"] }) {
  return (
    <div className="mt-1.5 grid gap-1">
      {sets.map((set, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-md border border-border px-3 py-1.5"
        >
          <span className="text-xs text-muted-foreground">Sæt {index + 1}</span>
          <span className="font-mono text-sm font-medium tabular-nums">
            {set.weight ?? "–"} × {set.reps ?? "–"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ExerciseHistoryDialog({
  target,
  history,
  loading = false,
  onOpenChange,
}: {
  /** The exercise to show history for, or null while the dialog is closed. */
  target: ExerciseHistoryTarget | null;
  history: ExerciseFullHistory | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const hasData = history !== null && history.sessionCount > 0;

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{target?.name}</DialogTitle>
        </DialogHeader>

        {loading || !history ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground">
            Ingen registreringer af denne øvelse endnu.
          </p>
        ) : (
          <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                icon={Trophy}
                iconClassName="bg-amber-400/15 text-amber-500"
                label="Alle tiders rekord"
              >
                {history.allTimeBest ? (
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {history.allTimeBest.weight} × {history.allTimeBest.reps}
                    <span className="mt-0.5 block font-sans text-[11px] font-normal text-muted-foreground">
                      {formatDate(history.allTimeBest.date)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">–</p>
                )}
              </StatTile>
              <StatTile
                icon={Repeat}
                iconClassName="bg-primary/10 text-primary"
                label="Gange trænet"
              >
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {history.sessionCount}
                </p>
              </StatTile>
            </div>

            {history.first && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Første gang · {formatDate(history.first.date)}
                </p>
                <SessionSets sets={history.first.sets} />
              </div>
            )}

            {history.recent.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Seneste træninger
                </p>
                <div className="mt-1.5 grid gap-3">
                  {history.recent.map((log) => (
                    <div key={log.sessionId}>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.date)}
                      </p>
                      <SessionSets sets={log.sets} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
