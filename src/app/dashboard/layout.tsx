import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, userTrackedMetrics } from "@/db/schema";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const trackedMetricKeys = userId
    ? (
        await getDb()
          .select({ key: metricDefinitions.key })
          .from(userTrackedMetrics)
          .innerJoin(
            metricDefinitions,
            eq(userTrackedMetrics.metricDefinitionId, metricDefinitions.id)
          )
          .where(eq(userTrackedMetrics.userId, userId))
      ).map((row) => row.key)
    : [];

  return (
    <DashboardShell
      user={{
        name: session?.user?.name,
        email: session?.user?.email,
        role: session?.user?.role ?? "user",
      }}
      trackedMetricKeys={trackedMetricKeys}
    >
      {children}
    </DashboardShell>
  );
}
