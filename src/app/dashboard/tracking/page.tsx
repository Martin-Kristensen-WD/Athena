import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, userTrackedMetrics } from "@/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TrackingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tracking</h1>
        <p className="text-muted-foreground mt-2">
          You need to be signed in to view your tracked metrics.
        </p>
      </div>
    );
  }

  const db = getDb();

  const trackedMetrics = await db
    .select({
      key: metricDefinitions.key,
      label: metricDefinitions.label,
      unit: metricDefinitions.unit,
      sortOrder: userTrackedMetrics.sortOrder,
    })
    .from(userTrackedMetrics)
    .innerJoin(
      metricDefinitions,
      eq(userTrackedMetrics.metricDefinitionId, metricDefinitions.id)
    )
    .where(
      and(eq(userTrackedMetrics.userId, userId), eq(userTrackedMetrics.isEnabled, true))
    )
    .orderBy(userTrackedMetrics.sortOrder, metricDefinitions.label);

  const latestValues = await Promise.all(
    trackedMetrics.map(async (metric) => {
      const [entry] = await db
        .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
        .from(metricEntries)
        .innerJoin(
          metricDefinitions,
          eq(metricEntries.metricDefinitionId, metricDefinitions.id)
        )
        .where(
          and(
            eq(metricEntries.userId, userId),
            eq(metricDefinitions.key, metric.key)
          )
        )
        .orderBy(desc(metricEntries.loggedAt))
        .limit(1);
      return entry ?? null;
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Tracking</h1>
      <p className="text-muted-foreground mt-2">
        The metrics you&apos;re currently tracking.
      </p>

      {trackedMetrics.length === 0 ? (
        <Card className="mt-6">
          <CardContent>
            <p className="text-muted-foreground">
              You aren&apos;t tracking any metrics yet. Enable some from your
              settings to start logging entries.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-3">
          {trackedMetrics.map((metric, index) => {
            const latest = latestValues[index];
            return (
              <Card key={metric.key}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{metric.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {latest
                        ? `${Number(latest.value).toLocaleString()} ${metric.unit} · ${latest.loggedAt.toLocaleDateString()}`
                        : `No entries yet · ${metric.unit}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/dashboard/tracking/${metric.key}`} />}
                  >
                    View
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
