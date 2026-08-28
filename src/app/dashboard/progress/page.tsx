import { redirect } from "next/navigation";
import { and, asc, eq, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  bodyMeasurements,
  exercises,
  metricDefinitions,
  metricEntries,
  profiles,
  programmeExercises,
  progressPhotos,
  workoutSessions,
  workoutSessionSets,
  PROGRESS_PHOTO_VIEWS,
  type MeasurementType,
  type ProgressPhotoView,
} from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardViewToggle } from "@/components/dashboard-view-toggle";
import { entryDayKey } from "@/lib/date";
import { PHOTO_VIEW_LABELS } from "@/app/dashboard/measurements/constants";
import { parseRangeParam, rangeStart } from "./range";
import { RangeSelector } from "./range-selector";
import { TrendChart } from "./trend-chart";
import { DeltaBadge } from "./delta-badge";
import { MeasurementsChart } from "./measurements-chart";
import { PhotoCompareSlider } from "./photo-compare-slider";

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;
  const db = getDb();

  const { range: rangeParam } = await searchParams;
  const range = parseRangeParam(rangeParam);
  const weightWindowStart = rangeStart(range);

  const [weightDefinition, profileRow] = await Promise.all([
    db
      .select({ id: metricDefinitions.id })
      .from(metricDefinitions)
      .where(eq(metricDefinitions.key, "weight")),
    db
      .select({ weightUnit: profiles.weightUnit })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
  ]);
  const weightUnit = profileRow[0]?.weightUnit ?? "kg";

  const [weightRows, measurementRows, photoRows, setRows] = await Promise.all([
    weightDefinition[0]
      ? db
          .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
          .from(metricEntries)
          .where(
            and(
              eq(metricEntries.userId, userId),
              eq(metricEntries.metricDefinitionId, weightDefinition[0].id),
              ...(weightWindowStart ? [gte(metricEntries.loggedAt, weightWindowStart)] : [])
            )
          )
          .orderBy(asc(metricEntries.loggedAt))
      : Promise.resolve([]),
    // Body measurements and progress photos show the full history, independent
    // of the weight range picker — the measurements chart has its own
    // body-part selector instead of a time range.
    db
      .select({
        type: bodyMeasurements.type,
        value: bodyMeasurements.value,
        loggedAt: bodyMeasurements.loggedAt,
      })
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId))
      .orderBy(asc(bodyMeasurements.loggedAt)),
    db
      .select({
        id: progressPhotos.id,
        view: progressPhotos.view,
        takenAt: progressPhotos.takenAt,
      })
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId))
      .orderBy(asc(progressPhotos.takenAt)),
    db
      .select({
        exerciseName: exercises.name,
        weight: workoutSessionSets.weight,
        reps: workoutSessionSets.reps,
        startedAt: workoutSessions.startedAt,
      })
      .from(workoutSessionSets)
      .innerJoin(workoutSessions, eq(workoutSessionSets.sessionId, workoutSessions.id))
      .innerJoin(
        programmeExercises,
        eq(workoutSessionSets.programmeExerciseId, programmeExercises.id)
      )
      .innerJoin(exercises, eq(programmeExercises.exerciseId, exercises.id))
      .where(eq(workoutSessions.userId, userId))
      .orderBy(asc(workoutSessions.startedAt)),
  ]);

  // Weight trend
  const weightDaily = new Map<string, number>();
  for (const row of weightRows) {
    weightDaily.set(entryDayKey(row.loggedAt), Number(row.value));
  }
  const weightSeries = [...weightDaily.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const weightDelta =
    weightSeries.length >= 2
      ? weightSeries[weightSeries.length - 1].value - weightSeries[0].value
      : null;

  // Body measurements: full time series per body part
  const measurementSeries = new Map<MeasurementType, { date: string; value: number }[]>();
  for (const row of measurementRows) {
    const type = row.type as MeasurementType;
    const date = entryDayKey(row.loggedAt);
    const value = Number(row.value);
    const series = measurementSeries.get(type) ?? [];
    const existingForDay = series.find((point) => point.date === date);
    if (existingForDay) {
      existingForDay.value = value;
    } else {
      series.push({ date, value });
    }
    measurementSeries.set(type, series);
  }
  const seriesByType = Object.fromEntries(measurementSeries) as Partial<
    Record<MeasurementType, { date: string; value: number }[]>
  >;

  // Progress photos: earliest vs latest per view
  const photosByView = new Map<ProgressPhotoView, { id: string; takenAt: Date }[]>();
  for (const row of photoRows) {
    const list = photosByView.get(row.view) ?? [];
    list.push({ id: row.id, takenAt: row.takenAt });
    photosByView.set(row.view, list);
  }

  // Exercises: best set on the first vs. last session ever performed
  type BestSet = { weight: number | null; reps: number | null };
  function isBetter(a: BestSet, b: BestSet) {
    const aWeight = a.weight ?? 0;
    const bWeight = b.weight ?? 0;
    if (aWeight !== bWeight) return aWeight > bWeight;
    return (a.reps ?? 0) > (b.reps ?? 0);
  }
  type ExerciseComparison = {
    firstDate: string;
    firstBest: BestSet;
    lastDate: string;
    lastBest: BestSet;
  };
  const exerciseComparison = new Map<string, ExerciseComparison>();
  for (const row of setRows) {
    const date = entryDayKey(row.startedAt);
    const current: BestSet = {
      weight: row.weight !== null ? Number(row.weight) : null,
      reps: row.reps,
    };
    const existing = exerciseComparison.get(row.exerciseName);
    if (!existing) {
      exerciseComparison.set(row.exerciseName, {
        firstDate: date,
        firstBest: current,
        lastDate: date,
        lastBest: current,
      });
      continue;
    }
    if (date === existing.firstDate && isBetter(current, existing.firstBest)) {
      existing.firstBest = current;
    }
    if (date !== existing.lastDate) {
      existing.lastDate = date;
      existing.lastBest = current;
    } else if (isBetter(current, existing.lastBest)) {
      existing.lastBest = current;
    }
  }
  const exerciseComparisons = [...exerciseComparison.entries()]
    .map(([name, comparison]) => ({ name, ...comparison }))
    .filter((row) => row.firstDate !== row.lastDate)
    .sort((a, b) => {
      const deltaA = (a.lastBest.weight ?? 0) - (a.firstBest.weight ?? 0);
      const deltaB = (b.lastBest.weight ?? 0) - (b.firstBest.weight ?? 0);
      return deltaB - deltaA;
    });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fremgang</h1>
          <p className="text-muted-foreground mt-2">
            Sammenlign vægt, mål, billeder og træning over tid.
          </p>
        </div>
        <DashboardViewToggle active="progress" />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <CardTitle>Vægt</CardTitle>
            {weightDelta !== null && <DeltaBadge delta={weightDelta} unit={weightUnit} />}
          </div>
          <RangeSelector active={range} />
        </CardHeader>
        <CardContent>
          <TrendChart data={weightSeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kropsmål</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasurementsChart seriesByType={seriesByType} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fremgangsbilleder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {PROGRESS_PHOTO_VIEWS.map((view) => {
              const photos = photosByView.get(view) ?? [];
              const first = photos[0];
              const last = photos[photos.length - 1];
              return (
                <div key={view} className="grid gap-2">
                  {!first ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">{PHOTO_VIEW_LABELS[view]}</p>
                      <div className="flex aspect-3/4 items-center justify-center rounded-lg border border-dashed border-input bg-muted/30 text-center text-xs text-muted-foreground">
                        Ingen billeder endnu
                      </div>
                    </div>
                  ) : first.id === last.id ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">{PHOTO_VIEW_LABELS[view]}</p>
                      <div className="aspect-3/4 overflow-hidden rounded-lg border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/progress-photos/${first.id}`}
                          alt={PHOTO_VIEW_LABELS[view]}
                          className="size-full object-cover"
                        />
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        {formatDate(entryDayKey(first.takenAt))}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">{PHOTO_VIEW_LABELS[view]}</p>
                      <PhotoCompareSlider
                        beforeId={first.id}
                        afterId={last.id}
                        beforeLabel={formatDate(entryDayKey(first.takenAt))}
                        afterLabel={formatDate(entryDayKey(last.takenAt))}
                        alt={PHOTO_VIEW_LABELS[view]}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Træning</CardTitle>
        </CardHeader>
        <CardContent>
          {exerciseComparisons.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ingen øvelser med mere end én træning endnu.
            </p>
          ) : (
            <div className="grid gap-3">
              {exerciseComparisons.map((row) => {
                const weightDelta =
                  row.firstBest.weight !== null && row.lastBest.weight !== null
                    ? row.lastBest.weight - row.firstBest.weight
                    : null;
                return (
                  <div
                    key={row.name}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium">{row.name}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground tabular-nums">
                        {row.firstBest.weight ?? 0} kg × {row.firstBest.reps ?? 0}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium tabular-nums">
                        {row.lastBest.weight ?? 0} kg × {row.lastBest.reps ?? 0}
                      </span>
                      {weightDelta !== null && <DeltaBadge delta={weightDelta} unit="kg" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
