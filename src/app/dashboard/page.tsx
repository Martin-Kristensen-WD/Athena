import Link from "next/link";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import {
  Flame,
  Footprints,
  Dumbbell,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { getDb } from "@/db";
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

function CardIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
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
      <span className="text-xs text-muted-foreground">No data last week</span>
    );
  }

  const Icon =
    trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        sentiment === "good" && "bg-primary/10 text-primary",
        sentiment === "bad" && "bg-destructive/10 text-destructive",
        sentiment === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {trend.percent !== null ? `${Math.abs(trend.percent).toFixed(0)}%` : null}
      <span className="font-normal opacity-70">vs last week</span>
    </span>
  );
}

type WeeklyStatData = {
  definition: { id: string; key: string; label: string; unit: string } | null;
  isTracked: boolean;
  currentAverage: number | null;
  previousAverage: number | null;
};

async function getWeeklyAverage(
  db: ReturnType<typeof getDb>,
  userId: string,
  metricDefinitionId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<number | null> {
  const entries = await db
    .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
    .from(metricEntries)
    .where(
      and(
        eq(metricEntries.userId, userId),
        eq(metricEntries.metricDefinitionId, metricDefinitionId),
        gte(metricEntries.loggedAt, windowStart),
        lt(metricEntries.loggedAt, windowEnd)
      )
    );

  if (entries.length === 0) {
    return null;
  }

  const dailyTotals = new Map<string, number>();
  for (const entry of entries) {
    const dayKey = entry.loggedAt.toISOString().slice(0, 10);
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + Number(entry.value));
  }

  const totals = [...dailyTotals.values()];
  return totals.reduce((sum, value) => sum + value, 0) / totals.length;
}

async function getWeeklyStatData(
  db: ReturnType<typeof getDb>,
  userId: string,
  key: string
): Promise<WeeklyStatData> {
  const [definition] = await db
    .select({
      id: metricDefinitions.id,
      key: metricDefinitions.key,
      label: metricDefinitions.label,
      unit: metricDefinitions.unit,
    })
    .from(metricDefinitions)
    .where(eq(metricDefinitions.key, key));

  if (!definition) {
    return { definition: null, isTracked: false, currentAverage: null, previousAverage: null };
  }

  const [tracked] = await db
    .select({ id: userTrackedMetrics.id })
    .from(userTrackedMetrics)
    .where(
      and(
        eq(userTrackedMetrics.userId, userId),
        eq(userTrackedMetrics.metricDefinitionId, definition.id),
        eq(userTrackedMetrics.isEnabled, true)
      )
    );

  const [currentAverage, previousAverage] = await Promise.all([
    getWeeklyAverage(db, userId, definition.id, daysAgo(7), new Date()),
    getWeeklyAverage(db, userId, definition.id, daysAgo(14), daysAgo(7)),
  ]);

  return { definition, isTracked: Boolean(tracked), currentAverage, previousAverage };
}

function StatCard({
  href,
  title,
  icon,
  unit,
  data,
  sentimentFor,
}: {
  href: string;
  title: string;
  icon: LucideIcon;
  unit?: string;
  data: WeeklyStatData;
  sentimentFor: (direction: Direction) => Sentiment;
}) {
  const { definition, isTracked, currentAverage, previousAverage } = data;

  if (!definition || !isTracked) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-3 space-y-0">
          <CardIcon icon={icon} />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Not tracked yet</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard/settings" />}
          >
            Enable in settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (currentAverage === null) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-3 space-y-0">
          <CardIcon icon={icon} />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>No entries this week</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button size="sm" nativeButton={false} render={<Link href={href} />}>
            Log an entry
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
          <CardIcon icon={icon} />
          <div className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>Daily average this week</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {currentAverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            {unit && (
              <span className="font-sans text-lg font-normal text-muted-foreground">
                {unit}
              </span>
            )}
          </p>
          <TrendBadge trend={trend} sentiment={sentimentFor(trend.direction)} />
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDistance(current: number, target: number, unit: string) {
  const diff = Math.abs(current - target);
  return `${diff.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          You need to be signed in to view your dashboard.
        </p>
      </div>
    );
  }

  const db = getDb();

  const [caloriesData, stepsData, latestWeight, profile, recentSessions, weekSessions] =
    await Promise.all([
      getWeeklyStatData(db, userId, "calories"),
      getWeeklyStatData(db, userId, "steps"),
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
    ]);

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
      ? `You're ${formatDistance(currentWeight, milestoneTarget, weightUnit)} from your milestone and ${goalDistance} from your end goal.`
      : `You're ${goalDistance} from your end goal.`;
  }

  const firstName = session.user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Hello, {firstName}
      </h1>
      <p className="text-muted-foreground mt-2">
        {progressText ??
          "Log your weight and set a goal in onboarding to track your progress here."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          href="/dashboard/food"
          title="Calorie intake"
          icon={Flame}
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
          title="Steps"
          icon={Footprints}
          data={stepsData}
          sentimentFor={(direction) => {
            if (direction === "up") return "good";
            if (direction === "down") return "bad";
            return "neutral";
          }}
        />

        <Link href="/dashboard/workouts" className="group block">
          <Card className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardHeader className="flex items-center gap-3 space-y-0">
              <CardIcon icon={Dumbbell} />
              <div className="min-w-0 flex-1">
                <CardTitle>Workouts</CardTitle>
                <CardDescription className="truncate">
                  {lastSession
                    ? `Last session ${lastSession.startedAt.toLocaleDateString()}`
                    : "No sessions logged yet"}
                </CardDescription>
              </div>
              <CardAction>
                <ChevronRight className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
                {sessionsThisWeek}{" "}
                <span className="font-sans text-lg font-normal text-muted-foreground">
                  workout{sessionsThisWeek === 1 ? "" : "s"} this week
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
