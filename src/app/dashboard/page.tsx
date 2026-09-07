import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  Flame,
  Footprints,
  Scale,
  Moon,
  Dumbbell,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Minus,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfWeek } from "@/lib/date";
import { DashboardViewToggle } from "@/components/dashboard-view-toggle";
import { AnimatedNumber } from "@/components/animated-number";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { getActiveSessionId } from "@/app/dashboard/workouts/sessions/live-queries";
import {
  metricDefinitions,
  metricEntries,
  profiles,
  userTrackedMetrics,
  workoutSessions,
} from "@/db/schema";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CARD_TONES = {
  calories:
    "bg-orange-500/10 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400",
  steps: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400",
  workouts:
    "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
  weight:
    "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400",
  sleep:
    "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400",
} as const;

type CardTone = keyof typeof CARD_TONES;

function CardIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: CardTone }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl",
        CARD_TONES[tone]
      )}
    >
      <Icon className="size-4.5" />
    </span>
  );
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type Direction = "up" | "down" | "flat" | "none";
type Sentiment = "good" | "bad" | "neutral";

type Trend = {
  direction: Direction;
  percent: number | null;
};

function computeTrend(current: number | null, previous: number | null): Trend {
  if (current === null || previous === null) {
    return { direction: "none", percent: null };
  }
  const delta = current - previous;
  const percent = previous !== 0 ? (delta / previous) * 100 : null;
  if (Math.abs(delta) < previous * 0.02) {
    return { direction: "flat", percent };
  }
  return { direction: delta > 0 ? "up" : "down", percent };
}

function TrendBadge({
  trend,
  sentiment,
}: {
  trend: Trend;
  sentiment: Sentiment;
}) {
  if (trend.direction === "none") {
    return (
      <span className="text-xs text-muted-foreground">Ingen data fra sidste uge</span>
    );
  }

  const Icon =
    trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        sentiment === "good" && "bg-success/10 text-success",
        sentiment === "bad" && "bg-destructive/10 text-destructive",
        sentiment === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {trend.percent !== null ? `${Math.abs(trend.percent).toFixed(0)}%` : null}
      <span className="font-normal opacity-70">ift. sidste uge</span>
    </span>
  );
}

type WeeklyStatData = {
  definition: { id: string; key: string; label: string; unit: string } | null;
  isTracked: boolean;
  currentAverage: number | null;
  previousAverage: number | null;
};

// Metrics whose daily value is the latest reading of the day (weight), rather
// than the sum of the day's entries (calories, steps, sleep hours).
const LAST_READING_KEYS = new Set<string>(["weight"]);

/**
 * Weekly (calendar Mon–Sun) daily-average for several metrics at once, in
 * three queries total: the definitions, the user's tracked flags, and one
 * windowed pull of every relevant entry for both the current and previous
 * week. Aggregation (sum vs. last reading) is applied per metric in JS.
 */
async function getWeeklyStats(
  db: ReturnType<typeof getDb>,
  userId: string,
  keys: readonly string[]
): Promise<Map<string, WeeklyStatData>> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = startOfWeek(todayStart);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const result = new Map<string, WeeklyStatData>();
  for (const key of keys) {
    result.set(key, {
      definition: null,
      isTracked: false,
      currentAverage: null,
      previousAverage: null,
    });
  }

  const definitions = await db
    .select({
      id: metricDefinitions.id,
      key: metricDefinitions.key,
      label: metricDefinitions.label,
      unit: metricDefinitions.unit,
    })
    .from(metricDefinitions)
    .where(inArray(metricDefinitions.key, keys as string[]));

  if (definitions.length === 0) return result;

  const defById = new Map(definitions.map((def) => [def.id, def]));
  const defIds = definitions.map((def) => def.id);

  const [tracked, entries] = await Promise.all([
    db
      .select({ metricDefinitionId: userTrackedMetrics.metricDefinitionId })
      .from(userTrackedMetrics)
      .where(
        and(
          eq(userTrackedMetrics.userId, userId),
          eq(userTrackedMetrics.isEnabled, true),
          inArray(userTrackedMetrics.metricDefinitionId, defIds)
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
          inArray(metricEntries.metricDefinitionId, defIds),
          gte(metricEntries.loggedAt, lastWeekStart),
          lt(metricEntries.loggedAt, nextWeekStart)
        )
      )
      .orderBy(asc(metricEntries.loggedAt)),
  ]);

  const trackedIds = new Set(tracked.map((row) => row.metricDefinitionId));

  type DayMap = Map<string, number>;
  const buckets = new Map<string, { current: DayMap; previous: DayMap }>();
  for (const id of defIds) {
    buckets.set(id, { current: new Map(), previous: new Map() });
  }

  for (const entry of entries) {
    const bucket = buckets.get(entry.metricDefinitionId);
    const def = defById.get(entry.metricDefinitionId);
    if (!bucket || !def) continue;
    const dayMap = entry.loggedAt < weekStart ? bucket.previous : bucket.current;
    const dayKey = entry.loggedAt.toISOString().slice(0, 10);
    const value = Number(entry.value);
    if (LAST_READING_KEYS.has(def.key)) {
      // entries are ordered ascending, so the last write wins for the day
      dayMap.set(dayKey, value);
    } else {
      dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + value);
    }
  }

  const averageOf = (dayMap: DayMap): number | null => {
    if (dayMap.size === 0) return null;
    let sum = 0;
    for (const value of dayMap.values()) sum += value;
    return sum / dayMap.size;
  };

  for (const def of definitions) {
    const bucket = buckets.get(def.id)!;
    result.set(def.key, {
      definition: def,
      isTracked: trackedIds.has(def.id),
      currentAverage: averageOf(bucket.current),
      previousAverage: averageOf(bucket.previous),
    });
  }

  return result;
}

function StatCard({
  href,
  title,
  icon,
  tone,
  unit,
  data,
  sentimentFor,
}: {
  href: string;
  title: string;
  icon: LucideIcon;
  tone: CardTone;
  unit?: string;
  data: WeeklyStatData;
  sentimentFor?: (direction: Direction) => Sentiment;
}) {
  const { definition, isTracked, currentAverage, previousAverage } = data;

  if (!definition || !isTracked) {
    return null;
  }

  if (currentAverage === null) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-3 space-y-0">
          <CardIcon icon={icon} tone={tone} />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Ingen registreringer denne uge</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button size="sm" nativeButton={false} render={<Link href={href} />}>
            Registrer en post
          </Button>
        </CardContent>
      </Card>
    );
  }

  const trend = computeTrend(currentAverage, previousAverage);

  return (
    <Link href={href} className="group block">
      <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardHeader className="flex items-center gap-3 space-y-0">
          <CardIcon icon={icon} tone={tone} />
          <div className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>Dagligt gennemsnit denne uge</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber
                value={currentAverage}
                formatOptions={{ maximumFractionDigits: 0 }}
              />{" "}
              {unit && (
                <span className="font-sans text-lg font-normal text-muted-foreground">
                  {unit}
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Sidste uge:{" "}
              {previousAverage !== null
                ? `${previousAverage.toLocaleString("da-DK", {
                    maximumFractionDigits: 0,
                  })}${unit ? ` ${unit}` : ""}`
                : "–"}
            </p>
          </div>
          {sentimentFor && (
            <TrendBadge trend={trend} sentiment={sentimentFor(trend.direction)} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDistance(current: number, target: number, unit: string) {
  const diff = Math.abs(current - target);
  return `${diff.toLocaleString("da-DK", { maximumFractionDigits: 1 })} ${unit}`;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Du skal være logget ind for at se dit dashboard.
        </p>
      </div>
    );
  }

  const db = getDb();

  const [
    weeklyStats,
    latestWeight,
    profile,
    recentSessions,
    weekSessions,
    activeSessionId,
  ] = await Promise.all([
    getWeeklyStats(db, userId, ["calories", "steps", "weight", "sleep_hours"]),
    db
      .select({ value: metricEntries.value })
      .from(metricEntries)
      .innerJoin(
        metricDefinitions,
        eq(metricEntries.metricDefinitionId, metricDefinitions.id)
      )
      .where(
        and(eq(metricEntries.userId, userId), eq(metricDefinitions.key, "weight"))
      )
      .orderBy(desc(metricEntries.loggedAt))
      .limit(1),
    db
      .select({
        weightUnit: profiles.weightUnit,
        goalType: profiles.goalType,
        goalTargetValue: profiles.goalTargetValue,
        milestoneTargetValue: profiles.milestoneTargetValue,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
    db
      .select({ startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1),
    db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, daysAgo(7))
        )
      ),
    getActiveSessionId(userId),
  ]);

  const caloriesData = weeklyStats.get("calories")!;
  const stepsData = weeklyStats.get("steps")!;
  const weightData = weeklyStats.get("weight")!;
  const sleepData = weeklyStats.get("sleep_hours")!;

  const lastSession = recentSessions[0] ?? null;
  const sessionsThisWeek = weekSessions.length;
  const userProfile = profile[0] ?? null;

  const currentWeight = latestWeight[0] ? Number(latestWeight[0].value) : null;
  const goalTarget = userProfile?.goalTargetValue
    ? Number(userProfile.goalTargetValue)
    : null;
  const milestoneTarget = userProfile?.milestoneTargetValue
    ? Number(userProfile.milestoneTargetValue)
    : null;
  const weightUnit = userProfile?.weightUnit ?? "kg";

  let progressText: string | null = null;
  if (currentWeight !== null && goalTarget !== null) {
    const goalDistance = formatDistance(currentWeight, goalTarget, weightUnit);
    progressText = milestoneTarget
      ? `Du mangler ${formatDistance(currentWeight, milestoneTarget, weightUnit)} til dit delmål og ${goalDistance} til dit slutmål.`
      : `Du mangler ${goalDistance} til dit slutmål.`;
  }

  const firstName = session.user?.name?.split(" ")[0];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {firstName ? `Hej, ${firstName}` : "Hej!"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {progressText ??
              "Registrer din vægt, og sæt et mål under opsætning for at følge din udvikling her."}
          </p>
          {(milestoneTarget !== null || goalTarget !== null) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
              {milestoneTarget !== null && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="size-4" />
                  Delmål
                  <span className="font-medium text-foreground tabular-nums">
                    {milestoneTarget.toLocaleString("da-DK")} {weightUnit}
                  </span>
                </span>
              )}
              {goalTarget !== null && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="size-4 text-[#eab308]" />
                  Slutmål
                  <span className="font-medium text-foreground tabular-nums">
                    {goalTarget.toLocaleString("da-DK")} {weightUnit}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
        <DashboardViewToggle active="main" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          href="/dashboard/food"
          title="Kalorieindtag"
          icon={Flame}
          tone="calories"
          unit="kcal"
          data={caloriesData}
          sentimentFor={(direction) => {
            if (direction === "flat" || direction === "none") return "neutral";
            if (userProfile?.goalType === "gain_muscle") {
              return direction === "up" ? "good" : "bad";
            }
            if (userProfile?.goalType === "lose_weight") {
              return direction === "down" ? "good" : "bad";
            }
            return "neutral";
          }}
        />
        <StatCard
          href="/dashboard/steps"
          title="Skridt"
          icon={Footprints}
          tone="steps"
          data={stepsData}
          sentimentFor={(direction) => {
            if (direction === "up") return "good";
            if (direction === "down") return "bad";
            return "neutral";
          }}
        />
        <StatCard
          href="/dashboard/weight"
          title="Vægt"
          icon={Scale}
          tone="weight"
          unit={weightUnit}
          data={weightData}
          sentimentFor={(direction) => {
            if (direction === "flat" || direction === "none") return "neutral";
            if (userProfile?.goalType === "gain_muscle") {
              return direction === "up" ? "good" : "bad";
            }
            if (userProfile?.goalType === "lose_weight") {
              return direction === "down" ? "good" : "bad";
            }
            return "neutral";
          }}
        />
        <StatCard
          href="/dashboard/sleep"
          title="Søvn"
          icon={Moon}
          tone="sleep"
          unit="timer"
          data={sleepData}
        />

        <Link
          href={
            activeSessionId
              ? `/dashboard/workouts/sessions/${activeSessionId}/live`
              : "/dashboard/workouts"
          }
          className="group block"
        >
          <Card
            className={cn(
              "transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
              activeSessionId && "border-primary/40 bg-primary/5"
            )}
          >
            <CardHeader className="flex items-center gap-3 space-y-0">
              <CardIcon icon={Dumbbell} tone="workouts" />
              <div className="min-w-0 flex-1">
                <CardTitle>Træning</CardTitle>
                <CardDescription className="truncate">
                  {activeSessionId
                    ? "Træningspas i gang – fortsæt"
                    : lastSession
                      ? `Seneste træning ${lastSession.startedAt.toLocaleDateString("da-DK")}`
                      : "Ingen træning registreret endnu"}
                </CardDescription>
              </div>
              <CardAction>
                <ChevronRight className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
                <AnimatedNumber value={sessionsThisWeek} />{" "}
                <span className="font-sans text-lg font-normal text-muted-foreground">
                  træningspas denne uge
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
