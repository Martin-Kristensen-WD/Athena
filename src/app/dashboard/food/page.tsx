import Link from "next/link";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, profiles } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const prevMonth = monthParam(year, monthIndex - 1);
  const nextMonth = monthParam(year, monthIndex + 1);
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

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

  const entries =
    definitionIds.length > 0
      ? await db
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
          )
      : [];

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

  const dailyCalorieTarget = profile[0]?.dailyCalorieTarget
    ? Number(profile[0].dailyCalorieTarget)
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Food</h1>
          <p className="text-muted-foreground mt-2">
            Log what you eat and track it against your daily target.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-accent px-4 py-2.5 text-accent-foreground">
          <Flame className="size-4.5" />
          {dailyCalorieTarget ? (
            <span className="text-sm font-medium">
              Target: <span className="font-mono tabular-nums">{dailyCalorieTarget.toLocaleString()}</span> kcal/day
            </span>
          ) : (
            <span className="text-sm font-medium">No calorie target set</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/dashboard/settings" />}
          >
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log food</CardTitle>
        </CardHeader>
        <CardContent>
          <FoodLogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>{monthLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/food?month=${prevMonth}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous month</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/food?month=${nextMonth}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FoodLogList rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
