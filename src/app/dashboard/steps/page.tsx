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
import { averageForRange, dateKey, startOfWeek } from "@/lib/date";
import { TrackingCalendar } from "@/components/tracking-calendar";
import { TrackingYearHeatmap } from "@/components/tracking-year-heatmap";
import { StepsLogForm } from "./steps-log-form";
import { StepsLogList, type StepsDayRow } from "./steps-log-list";

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

function StatIcon({
  icon: Icon,
  tone,
}: {
  icon: typeof Trophy;
  tone?: "gold";
}) {
  if (tone === "gold") {
    return (
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#fde68a] to-[#f59e0b] text-[#4a2f00] shadow-[0_0_12px_rgba(234,179,8,0.5)]">
        <Icon className="size-4.5" />
        <span
          aria-hidden
          className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/55 blur-[2px]"
        />
      </span>
    );
  }
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
  const prevYear = monthParam(year - 1, monthIndex);
  const nextYear = monthParam(year + 1, monthIndex);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });
  const monthKeyPrefix = monthParam(year, monthIndex);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dateKey(todayStart);

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
  for (const [date, value] of dailyTotals) {
    if (!allTimeHigh || value > allTimeHigh.value) {
      allTimeHigh = { date, value };
    }
  }

  const thisWeekStart = startOfWeek(todayStart);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const thisWeekAverage = averageForRange(
    dailyTotals,
    thisWeekStart,
    nextWeekStart
  );

  const monthRows: StepsDayRow[] = [...dailyTotals.entries()]
    .filter(([date]) => date.startsWith(monthKeyPrefix))
    .map(([date, steps]) => ({ date, steps }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const trackedDays = new Set(dailyTotals.keys());

  const dailyStepsTarget = profile[0]?.dailyStepsTarget
    ? Number(profile[0].dailyStepsTarget)
    : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skridt</h1>
          <p className="text-muted-foreground mt-2">
            Registrer dine daglige skridt, og følg dem op mod dit mål.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-button px-4 py-2.5 text-button-foreground">
          <Footprints className="size-4.5" />
          {dailyStepsTarget ? (
            <span className="text-sm font-medium">
              Mål: <span className="font-mono tabular-nums">{dailyStepsTarget.toLocaleString("da-DK")}</span> skridt/dag
            </span>
          ) : (
            <span className="text-sm font-medium">Intet skridtmål sat</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-3 space-y-0">
            <StatIcon icon={Trophy} tone="gold" />
            <div>
              <CardTitle>Højeste antal nogensinde</CardTitle>
              <CardDescription>
                {allTimeHigh
                  ? new Date(`${allTimeHigh.date}T00:00:00`).toLocaleDateString(
                      "da-DK",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "Ingen registreringer endnu"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              {allTimeHigh ? allTimeHigh.value.toLocaleString("da-DK") : "—"}{" "}
              <span className="font-sans text-lg font-normal text-muted-foreground">
                skridt
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-3 space-y-0">
            <StatIcon icon={CalendarDays} />
            <div>
              <CardTitle>Snit denne uge</CardTitle>
              <CardDescription>
                {thisWeekAverage !== null
                  ? "Dagligt gennemsnit"
                  : "Ingen registreringer denne uge"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              {thisWeekAverage !== null
                ? Math.round(thisWeekAverage).toLocaleString("da-DK")
                : "—"}{" "}
              <span className="font-sans text-lg font-normal text-muted-foreground">
                skridt
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrer skridt</CardTitle>
        </CardHeader>
        <CardContent>
          <StepsLogForm />
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
              render={<Link href={`/dashboard/steps?month=${prevMonth}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige måned</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/steps?month=${nextMonth}`} />}
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
          <StepsLogList rows={monthRows} />
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
              render={<Link href={`/dashboard/steps?month=${prevYear}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige år</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/steps?month=${nextYear}`} />}
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
