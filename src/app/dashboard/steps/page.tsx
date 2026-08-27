import Link from "next/link";
import { ChevronLeft, ChevronRight, Footprints, Trophy, CalendarDays } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, profiles } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepsLogForm } from "./steps-log-form";
import { StepsLogList, type StepsDayRow } from "./steps-log-list";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

function StatIcon({ icon: Icon }: { icon: typeof Trophy }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
      <Icon className="size-4.5" />
    </span>
  );
}

export default async function StepsPage({
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
  const prevMonth = monthParam(year, monthIndex - 1);
  const nextMonth = monthParam(year, monthIndex + 1);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const monthKeyPrefix = monthParam(year, monthIndex);

  const [profile, definitionRow] = await Promise.all([
    db
      .select({ dailyStepsTarget: profiles.dailyStepsTarget })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
    db
      .select({ id: metricDefinitions.id })
      .from(metricDefinitions)
      .where(eq(metricDefinitions.key, "steps")),
  ]);

  const definition = definitionRow[0] ?? null;

  const entries = definition
    ? await db
        .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
        .from(metricEntries)
        .where(
          and(
            eq(metricEntries.userId, userId),
            eq(metricEntries.metricDefinitionId, definition.id)
          )
        )
    : [];

  const dailyTotals = new Map<string, number>();
  for (const entry of entries) {
    const dayKey = entry.loggedAt.toISOString().slice(0, 10);
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + Number(entry.value));
  }

  let allTimeHigh: { date: string; value: number } | null = null;
  const weekdayTotals = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));

  for (const [date, value] of dailyTotals) {
    if (!allTimeHigh || value > allTimeHigh.value) {
      allTimeHigh = { date, value };
    }
    const weekday = new Date(`${date}T00:00:00`).getDay();
    weekdayTotals[weekday].sum += value;
    weekdayTotals[weekday].count += 1;
  }

  let bestWeekday: { name: string; average: number } | null = null;
  for (let index = 0; index < weekdayTotals.length; index += 1) {
    const totals = weekdayTotals[index];
    if (totals.count === 0) continue;
    const average = totals.sum / totals.count;
    if (!bestWeekday || average > bestWeekday.average) {
      bestWeekday = { name: WEEKDAY_NAMES[index], average };
    }
  }

  const monthRows: StepsDayRow[] = [...dailyTotals.entries()]
    .filter(([date]) => date.startsWith(monthKeyPrefix))
    .map(([date, steps]) => ({ date, steps }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const dailyStepsTarget = profile[0]?.dailyStepsTarget
    ? Number(profile[0].dailyStepsTarget)
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Steps</h1>
          <p className="text-muted-foreground mt-2">
            Log your daily steps and track them against your target.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-accent px-4 py-2.5 text-accent-foreground">
          <Footprints className="size-4.5" />
          {dailyStepsTarget ? (
            <span className="text-sm font-medium">
              Target: <span className="font-mono tabular-nums">{dailyStepsTarget.toLocaleString()}</span> steps/day
            </span>
          ) : (
            <span className="text-sm font-medium">No steps target set</span>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-3 space-y-0">
            <StatIcon icon={Trophy} />
            <div>
              <CardTitle>All-time high</CardTitle>
              <CardDescription>
                {allTimeHigh
                  ? new Date(`${allTimeHigh.date}T00:00:00`).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "No entries yet"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              {allTimeHigh ? allTimeHigh.value.toLocaleString() : "—"}{" "}
              <span className="font-sans text-lg font-normal text-muted-foreground">
                steps
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3 space-y-0">
            <StatIcon icon={CalendarDays} />
            <div>
              <CardTitle>Best day of the week</CardTitle>
              <CardDescription>
                {bestWeekday ? "Average on this day" : "Not enough data yet"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {bestWeekday ? bestWeekday.name : "—"}
            </p>
            {bestWeekday && (
              <p className="font-mono text-sm text-muted-foreground tabular-nums">
                {Math.round(bestWeekday.average).toLocaleString()} steps avg
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log steps</CardTitle>
        </CardHeader>
        <CardContent>
          <StepsLogForm />
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
              render={<Link href={`/dashboard/steps?month=${prevMonth}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous month</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/steps?month=${nextMonth}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <StepsLogList rows={monthRows} />
        </CardContent>
      </Card>
    </div>
  );
}
