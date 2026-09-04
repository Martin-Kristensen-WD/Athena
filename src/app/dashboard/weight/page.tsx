import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, profiles } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeightLogForm } from "./weight-log-form";
import { WeightLogList, type WeightDayRow } from "./weight-log-list";
import { WeightCalendar } from "./weight-calendar";
import { WeightYearHeatmap } from "./weight-year-heatmap";
import {
  averageForRange,
  computeStreak,
  dateKey,
  entryDayKey,
  startOfWeek,
} from "./date-utils";

function parseMonthParam(month: string | undefined) {
  const now = new Date();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNum] = month.split("-").map(Number);
    return { year, monthIndex: monthNum - 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthParam(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function WeightPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;
  const db = getDb();

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);
  const monthStart = new Date(year, monthIndex, 1);
  const prevMonth = monthParam(year, monthIndex - 1);
  const nextMonth = monthParam(year, monthIndex + 1);
  const prevYear = monthParam(year - 1, monthIndex);
  const nextYear = monthParam(year + 1, monthIndex);
  const monthLabel = monthStart.toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dateKey(todayStart);
  const streakWindowStart = new Date(todayStart);
  streakWindowStart.setDate(streakWindowStart.getDate() - 370);
  const streakWindowEnd = new Date(todayStart);
  streakWindowEnd.setDate(streakWindowEnd.getDate() + 1);

  const [profile, definitionRow] = await Promise.all([
    db
      .select({ weightUnit: profiles.weightUnit })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
    db
      .select({ id: metricDefinitions.id })
      .from(metricDefinitions)
      .where(eq(metricDefinitions.key, "weight")),
  ]);

  const definition = definitionRow[0] ?? null;

  const [yearEntries, streakEntries] = definition
    ? await Promise.all([
        db
          .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
          .from(metricEntries)
          .where(
            and(
              eq(metricEntries.userId, userId),
              eq(metricEntries.metricDefinitionId, definition.id),
              gte(metricEntries.loggedAt, yearStart),
              lt(metricEntries.loggedAt, yearEnd)
            )
          )
          .orderBy(asc(metricEntries.loggedAt)),
        db
          .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
          .from(metricEntries)
          .where(
            and(
              eq(metricEntries.userId, userId),
              eq(metricEntries.metricDefinitionId, definition.id),
              gte(metricEntries.loggedAt, streakWindowStart),
              lt(metricEntries.loggedAt, streakWindowEnd)
            )
          ),
      ])
    : [[], []];

  const dailyLatest = new Map<string, number>();
  for (const entry of yearEntries) {
    dailyLatest.set(entryDayKey(entry.loggedAt), Number(entry.value));
  }

  const monthDayPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const rows: WeightDayRow[] = [...dailyLatest.entries()]
    .filter(([date]) => date.startsWith(monthDayPrefix))
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const yearTrackedDays = new Set(dailyLatest.keys());

  const streakTrackedDays = new Set<string>();
  const streakDailyLatest = new Map<string, number>();
  let todayWeight: number | null = null;
  for (const entry of streakEntries) {
    const key = entryDayKey(entry.loggedAt);
    streakTrackedDays.add(key);
    streakDailyLatest.set(key, Number(entry.value));
    if (key === todayKey) {
      todayWeight = Number(entry.value);
    }
  }
  const streak = computeStreak(streakTrackedDays, todayStart);

  const thisWeekStart = startOfWeek(todayStart);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const thisWeekAverage = averageForRange(streakDailyLatest, thisWeekStart, nextWeekStart);
  const lastWeekAverage = averageForRange(streakDailyLatest, lastWeekStart, thisWeekStart);

  const weightUnit = profile[0]?.weightUnit ?? "kg";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vægt</h1>
        <p className="text-muted-foreground mt-2">
          Registrer din vægt for at følge din udvikling mod dit mål.
        </p>
      </div>

      <div className="flex gap-8">
        <div>
          <p className="text-muted-foreground text-sm">I dag</p>
          <p className="text-2xl font-semibold tabular-nums">
            {todayWeight !== null ? todayWeight.toLocaleString("da-DK") : "–"}{" "}
            <span className="text-muted-foreground text-base font-normal">
              {weightUnit}
            </span>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Streak</p>
          <p className="text-2xl font-semibold tabular-nums">
            {streak}{" "}
            <span className="text-muted-foreground text-base font-normal">
              {streak === 1 ? "dag" : "dage"}
            </span>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Snit denne uge</p>
          <p className="text-2xl font-semibold tabular-nums">
            {thisWeekAverage !== null
              ? thisWeekAverage.toLocaleString("da-DK", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })
              : "–"}{" "}
            <span className="text-muted-foreground text-base font-normal">
              {weightUnit}
            </span>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Snit sidste uge</p>
          <p className="text-2xl font-semibold tabular-nums">
            {lastWeekAverage !== null
              ? lastWeekAverage.toLocaleString("da-DK", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })
              : "–"}{" "}
            <span className="text-muted-foreground text-base font-normal">
              {weightUnit}
            </span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrer vægt</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightLogForm weightUnit={weightUnit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle className="capitalize">{monthLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/weight?month=${prevMonth}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige måned</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/weight?month=${nextMonth}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Næste måned</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <WeightCalendar
            year={year}
            monthIndex={monthIndex}
            trackedDays={yearTrackedDays}
            todayKey={todayKey}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registreringer</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightLogList rows={rows} weightUnit={weightUnit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>{year}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/weight?month=${prevYear}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige år</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/weight?month=${nextYear}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Næste år</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <WeightYearHeatmap year={year} trackedDays={yearTrackedDays} />
        </CardContent>
      </Card>
    </div>
  );
}
