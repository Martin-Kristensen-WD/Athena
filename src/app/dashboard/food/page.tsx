import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, profiles } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  averageForRange,
  computeStreak,
  dateKey,
  entryDayKey,
  startOfWeek,
} from "@/lib/date";
import { TrackingCalendar } from "@/components/tracking-calendar";
import { TrackingYearHeatmap } from "@/components/tracking-year-heatmap";
import { TrackingStats } from "@/components/tracking-stats";
import { FoodLogForm } from "./food-log-form";
import { FoodLogList, type FoodDayRow } from "./food-log-list";

const FOOD_METRIC_KEYS = ["calories", "protein", "carbs", "fat"] as const;

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

export default async function FoodPage({
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
  const monthEnd = new Date(year, monthIndex + 1, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const prevMonth = monthParam(year, monthIndex - 1);
  const nextMonth = monthParam(year, monthIndex + 1);
  const prevYear = monthParam(year - 1, monthIndex);
  const nextYear = monthParam(year + 1, monthIndex);
  const monthLabel = monthStart.toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dateKey(todayStart);
  const streakWindowStart = new Date(todayStart);
  streakWindowStart.setDate(streakWindowStart.getDate() - 370);
  const streakWindowEnd = new Date(todayStart);
  streakWindowEnd.setDate(streakWindowEnd.getDate() + 1);

  const [profile, definitions] = await Promise.all([
    db
      .select({ dailyCalorieTarget: profiles.dailyCalorieTarget })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
    db
      .select({ id: metricDefinitions.id, key: metricDefinitions.key })
      .from(metricDefinitions)
      .where(inArray(metricDefinitions.key, FOOD_METRIC_KEYS)),
  ]);

  const definitionIds = definitions.map((d) => d.id);
  const keyById = new Map(definitions.map((d) => [d.id, d.key]));
  const caloriesId = definitions.find((d) => d.key === "calories")?.id ?? null;

  const [entries, yearEntries, statsEntries] =
    definitionIds.length > 0
      ? await Promise.all([
          db
            .select({
              metricDefinitionId: metricEntries.metricDefinitionId,
              value: metricEntries.value,
              loggedAt: metricEntries.loggedAt,
            })
            .from(metricEntries)
            .where(
              and(
                eq(metricEntries.userId, userId),
                inArray(metricEntries.metricDefinitionId, definitionIds),
                gte(metricEntries.loggedAt, monthStart),
                lt(metricEntries.loggedAt, monthEnd)
              )
            ),
          db
            .select({ loggedAt: metricEntries.loggedAt })
            .from(metricEntries)
            .where(
              and(
                eq(metricEntries.userId, userId),
                inArray(metricEntries.metricDefinitionId, definitionIds),
                gte(metricEntries.loggedAt, yearStart),
                lt(metricEntries.loggedAt, yearEnd)
              )
            ),
          db
            .select({
              metricDefinitionId: metricEntries.metricDefinitionId,
              value: metricEntries.value,
              loggedAt: metricEntries.loggedAt,
            })
            .from(metricEntries)
            .where(
              and(
                eq(metricEntries.userId, userId),
                inArray(metricEntries.metricDefinitionId, definitionIds),
                gte(metricEntries.loggedAt, streakWindowStart),
                lt(metricEntries.loggedAt, streakWindowEnd)
              )
            ),
        ])
      : [[], [], []];

  const byDay = new Map<string, FoodDayRow>();
  for (const entry of entries) {
    const dayKey = entry.loggedAt.toISOString().slice(0, 10);
    const key = keyById.get(entry.metricDefinitionId);
    if (!key) continue;

    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, { date: dayKey, kcal: 0, protein: 0, carbs: 0, fat: 0 });
    }
    const row = byDay.get(dayKey)!;
    const value = Number(entry.value);
    if (key === "calories") row.kcal += value;
    else if (key === "protein") row.protein += value;
    else if (key === "carbs") row.carbs += value;
    else if (key === "fat") row.fat += value;
  }

  const rows = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

  const trackedDays = new Set(
    yearEntries.map((entry) => entry.loggedAt.toISOString().slice(0, 10))
  );

  const streakTrackedDays = new Set<string>();
  const streakDailyKcal = new Map<string, number>();
  let todayKcal: number | null = null;
  for (const entry of statsEntries) {
    const key = entryDayKey(entry.loggedAt);
    streakTrackedDays.add(key);
    if (entry.metricDefinitionId === caloriesId) {
      const next = (streakDailyKcal.get(key) ?? 0) + Number(entry.value);
      streakDailyKcal.set(key, next);
      if (key === todayKey) {
        todayKcal = next;
      }
    }
  }
  const streak = computeStreak(streakTrackedDays, todayStart);

  const thisWeekStart = startOfWeek(todayStart);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const thisWeekAverage = averageForRange(
    streakDailyKcal,
    thisWeekStart,
    nextWeekStart
  );
  const lastWeekAverage = averageForRange(
    streakDailyKcal,
    lastWeekStart,
    thisWeekStart
  );

  const dailyCalorieTarget = profile[0]?.dailyCalorieTarget
    ? Number(profile[0].dailyCalorieTarget)
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kost</h1>
          <p className="text-muted-foreground mt-2">
            Registrer det, du spiser, og følg det op mod dit daglige mål.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-accent px-4 py-2.5 text-accent-foreground">
          <Flame className="size-4.5" />
          {dailyCalorieTarget ? (
            <span className="text-sm font-medium">
              Mål: <span className="font-mono tabular-nums">{dailyCalorieTarget.toLocaleString("da-DK")}</span> kcal/dag
            </span>
          ) : (
            <span className="text-sm font-medium">Intet kaloriemål sat</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/dashboard/profile" />}
          >
            Rediger
          </Button>
        </div>
      </div>

      <TrackingStats
        items={[
          {
            label: "I dag",
            value:
              todayKcal !== null
                ? todayKcal.toLocaleString("da-DK", {
                    maximumFractionDigits: 0,
                  })
                : "–",
            suffix: "kcal",
          },
          {
            label: "Streak",
            value: String(streak),
            suffix: streak === 1 ? "dag" : "dage",
          },
          {
            label: "Snit denne uge",
            value:
              thisWeekAverage !== null
                ? thisWeekAverage.toLocaleString("da-DK", {
                    maximumFractionDigits: 0,
                  })
                : "–",
            suffix: "kcal",
          },
          {
            label: "Snit sidste uge",
            value:
              lastWeekAverage !== null
                ? lastWeekAverage.toLocaleString("da-DK", {
                    maximumFractionDigits: 0,
                  })
                : "–",
            suffix: "kcal",
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Registrer mad</CardTitle>
        </CardHeader>
        <CardContent>
          <FoodLogForm />
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
              render={<Link href={`/dashboard/food?month=${prevMonth}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige måned</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/food?month=${nextMonth}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Næste måned</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TrackingCalendar
            year={year}
            monthIndex={monthIndex}
            trackedDays={trackedDays}
            todayKey={todayKey}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registreringer</CardTitle>
        </CardHeader>
        <CardContent>
          <FoodLogList rows={rows} />
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
              render={<Link href={`/dashboard/food?month=${prevYear}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige år</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/food?month=${nextYear}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Næste år</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TrackingYearHeatmap year={year} trackedDays={trackedDays} />
        </CardContent>
      </Card>
    </div>
  );
}
