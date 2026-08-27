import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, userTrackedMetrics } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const db = getDb();

  const metrics = await db
    .select()
    .from(metricDefinitions)
    .orderBy(asc(metricDefinitions.label));

  const tracked = await db
    .select({ metricDefinitionId: userTrackedMetrics.metricDefinitionId })
    .from(userTrackedMetrics)
    .where(eq(userTrackedMetrics.userId, userId));

  const trackedIds = new Set(tracked.map((row) => row.metricDefinitionId));
  const trackedKeys = metrics
    .filter((metric) => trackedIds.has(metric.id))
    .map((metric) => metric.key);

  const initialValues = {
    trackedMetricKeys: trackedKeys,
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Indstillinger</h1>
        <p className="text-muted-foreground mt-2">
          Administrer udseende og hvilke kort der vises på dashboardet.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Udseende</CardTitle>
          <CardDescription>Vælg mellem lyst og mørkt tema.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <SettingsForm metrics={metrics} initialValues={initialValues} />
    </div>
  );
}
