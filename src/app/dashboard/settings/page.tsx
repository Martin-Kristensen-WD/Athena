import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, profiles, userTrackedMetrics } from "@/db/schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const db = getDb();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

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
    goalType: profile?.goalType ?? ("maintain" as const),
    goalTargetValue:
      profile?.goalTargetValue !== null && profile?.goalTargetValue !== undefined
        ? Number(profile.goalTargetValue)
        : undefined,
    dailyCalorieTarget:
      profile?.dailyCalorieTarget !== null && profile?.dailyCalorieTarget !== undefined
        ? Number(profile.dailyCalorieTarget)
        : undefined,
    trackedMetricKeys: trackedKeys,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="text-muted-foreground mt-2">
        Manage your goal and the metrics you track.
      </p>
      <div className="mt-6">
        <SettingsForm metrics={metrics} initialValues={initialValues} />
      </div>
    </div>
  );
}
