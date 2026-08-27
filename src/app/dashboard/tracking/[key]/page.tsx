import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, userTrackedMetrics } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricLogForm } from "./metric-log-form";
import { MetricHistoryTable, type MetricEntryRow } from "./metric-history-table";
import { MetricTrendChart } from "./metric-trend-chart";

export default async function MetricDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  const db = getDb();

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
    notFound();
  }

  const [tracked] = await db
    .select({ id: userTrackedMetrics.id })
    .from(userTrackedMetrics)
    .where(
      and(
        eq(userTrackedMetrics.userId, userId),
        eq(userTrackedMetrics.metricDefinitionId, definition.id)
      )
    );

  if (!tracked) {
    notFound();
  }

  const entries = await db
    .select({
      id: metricEntries.id,
      value: metricEntries.value,
      loggedAt: metricEntries.loggedAt,
      note: metricEntries.note,
    })
    .from(metricEntries)
    .where(
      and(
        eq(metricEntries.userId, userId),
        eq(metricEntries.metricDefinitionId, definition.id)
      )
    )
    .orderBy(desc(metricEntries.loggedAt))
    .limit(30);

  const historyRows: MetricEntryRow[] = entries.map((entry) => ({
    id: entry.id,
    value: entry.value,
    loggedAt: entry.loggedAt.toISOString(),
    note: entry.note,
  }));

  const chartData = [...entries]
    .reverse()
    .map((entry) => ({
      date: entry.loggedAt.toLocaleDateString("da-DK", {
        month: "short",
        day: "numeric",
      }),
      value: Number(entry.value),
    }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {definition.label}
        </h1>
        <p className="text-muted-foreground mt-2">
          Registrer målinger, og følg din udvikling for {definition.label.toLowerCase()} over
          tid.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrer en post</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricLogForm metricKey={definition.key} unit={definition.unit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Udvikling</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricTrendChart data={chartData} unit={definition.unit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historik</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricHistoryTable entries={historyRows} unit={definition.unit} />
        </CardContent>
      </Card>
    </div>
  );
}
