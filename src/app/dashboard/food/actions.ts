"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, userTrackedMetrics } from "@/db/schema";
import { auth } from "@/auth";
import { logFoodEntrySchema, type LogFoodEntryInput } from "@/lib/validations/food";

const FOOD_METRIC_KEYS = ["calories", "protein", "carbs", "fat"] as const;

function parseDayStart(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function logFoodEntry(values: LogFoodEntryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = logFoodEntrySchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const dayStart = parseDayStart(parsed.data.date);
  if (!dayStart) {
    return { error: "Indtast en gyldig dato." };
  }
  const loggedAt = new Date(dayStart.getTime() + 12 * 60 * 60 * 1000);

  const userId = session.user.id;
  const db = getDb();

  const definitions = await db
    .select({ id: metricDefinitions.id, key: metricDefinitions.key })
    .from(metricDefinitions)
    .where(inArray(metricDefinitions.key, FOOD_METRIC_KEYS));

  const definitionByKey = new Map(definitions.map((d) => [d.key, d.id]));

  const values_: { key: string; value: number }[] = [
    { key: "calories", value: parsed.data.kcal },
  ];
  if (parsed.data.protein !== undefined) {
    values_.push({ key: "protein", value: parsed.data.protein });
  }
  if (parsed.data.carbs !== undefined) {
    values_.push({ key: "carbs", value: parsed.data.carbs });
  }
  if (parsed.data.fat !== undefined) {
    values_.push({ key: "fat", value: parsed.data.fat });
  }

  const existingTracked = await db
    .select({ metricDefinitionId: userTrackedMetrics.metricDefinitionId })
    .from(userTrackedMetrics)
    .where(eq(userTrackedMetrics.userId, userId));
  const trackedIds = new Set(existingTracked.map((row) => row.metricDefinitionId));

  for (const { key, value } of values_) {
    const definitionId = definitionByKey.get(key);
    if (!definitionId) continue;

    if (!trackedIds.has(definitionId)) {
      await db
        .insert(userTrackedMetrics)
        .values({ userId, metricDefinitionId: definitionId })
        .onConflictDoNothing();
    }

    await db.insert(metricEntries).values({
      userId,
      metricDefinitionId: definitionId,
      value: value.toString(),
      loggedAt,
    });
  }

  revalidatePath("/dashboard/food");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteFoodDay(dateStr: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const dayStart = parseDayStart(dateStr);
  if (!dayStart) {
    return { error: "Ugyldig dato." };
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const userId = session.user.id;
  const db = getDb();

  const definitions = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(inArray(metricDefinitions.key, FOOD_METRIC_KEYS));
  const definitionIds = definitions.map((d) => d.id);

  if (definitionIds.length > 0) {
    await db
      .delete(metricEntries)
      .where(
        and(
          eq(metricEntries.userId, userId),
          inArray(metricEntries.metricDefinitionId, definitionIds),
          gte(metricEntries.loggedAt, dayStart),
          lt(metricEntries.loggedAt, dayEnd)
        )
      );
  }

  revalidatePath("/dashboard/food");
  revalidatePath("/dashboard");

  return { success: true };
}
