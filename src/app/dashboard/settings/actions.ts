"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, userTrackedMetrics } from "@/db/schema";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";

export async function updateSettings(values: SettingsInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const { trackedMetricKeys } = parsed.data;
  const userId = session.user.id;
  const db = getDb();

  const catalog = await db
    .select({ id: metricDefinitions.id, key: metricDefinitions.key })
    .from(metricDefinitions);

  const selectedIds = new Set(
    catalog
      .filter((metric) => trackedMetricKeys.includes(metric.key))
      .map((metric) => metric.id)
  );

  const existing = await db
    .select({
      id: userTrackedMetrics.id,
      metricDefinitionId: userTrackedMetrics.metricDefinitionId,
    })
    .from(userTrackedMetrics)
    .where(eq(userTrackedMetrics.userId, userId));
  const existingIds = new Set(existing.map((row) => row.metricDefinitionId));

  const toAdd = Array.from(selectedIds).filter((id) => !existingIds.has(id));
  const toRemove = existing.filter((row) => !selectedIds.has(row.metricDefinitionId));

  if (toAdd.length > 0) {
    await db
      .insert(userTrackedMetrics)
      .values(toAdd.map((metricDefinitionId) => ({ userId, metricDefinitionId })));
  }

  if (toRemove.length > 0) {
    await db.delete(userTrackedMetrics).where(
      inArray(
        userTrackedMetrics.id,
        toRemove.map((row) => row.id)
      )
    );
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true as const };
}
