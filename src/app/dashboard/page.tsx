import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { Scale, Footprints, Dumbbell, type LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  metricDefinitions,
  metricEntries,
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

type MetricCardData = {
  definition: {
    id: string;
    key: string;
    label: string;
    unit: string;
  } | null;
  isTracked: boolean;
  latestEntry: { value: string; loggedAt: Date } | null;
};

async function getLatestMetricCardData(
  db: ReturnType<typeof getDb>,
  userId: string,
  key: string
): Promise<MetricCardData> {
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
    return { definition: null, isTracked: false, latestEntry: null };
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

  const [latestEntry] = await db
    .select({
      value: metricEntries.value,
      loggedAt: metricEntries.loggedAt,
    })
    .from(metricEntries)
    .where(
      and(
        eq(metricEntries.userId, userId),
        eq(metricEntries.metricDefinitionId, definition.id)
      )
    )
    .orderBy(desc(metricEntries.loggedAt))
    .limit(1);

  return {
    definition,
    isTracked: Boolean(tracked),
    latestEntry: latestEntry ?? null,
  };
}

function MetricCard({
  title,
  icon,
  data,
}: {
  title: string;
  icon: LucideIcon;
  data: MetricCardData;
}) {
  const { definition, isTracked, latestEntry } = data;

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

  if (!latestEntry) {
    return (
      <Card>
        <CardHeader className="flex items-center gap-3 space-y-0">
          <CardIcon icon={icon} />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>No entries yet</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/dashboard/tracking/${definition.key}`} />}
          >
            Log your first entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-3 space-y-0">
        <CardIcon icon={icon} />
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription className="truncate">
            Last logged {latestEntry.loggedAt.toLocaleDateString()}
          </CardDescription>
        </div>
        <CardAction>
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href={`/dashboard/tracking/${definition.key}`} />}
          >
            View
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
          {Number(latestEntry.value).toLocaleString()}{" "}
          <span className="font-sans text-lg font-normal text-muted-foreground">
            {definition.unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
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

  const [weightData, stepsData, recentSessions, weekSessions] =
    await Promise.all([
      getLatestMetricCardData(db, userId, "weight"),
      getLatestMetricCardData(db, userId, "steps"),
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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="text-muted-foreground mt-2">
        Your weight, steps, and workout summary at a glance.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Weight" icon={Scale} data={weightData} />
        <MetricCard title="Steps" icon={Footprints} data={stepsData} />

        <Card>
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
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/dashboard/workouts" />}
              >
                View
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {lastSession ? (
              <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
                {sessionsThisWeek}{" "}
                <span className="font-sans text-lg font-normal text-muted-foreground">
                  session{sessionsThisWeek === 1 ? "" : "s"} this week
                </span>
              </p>
            ) : (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/workouts" />}
              >
                Log a workout
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
