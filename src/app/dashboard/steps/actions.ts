"use server";

import { and, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, userTrackedMetrics } from "@/db/schema";
import { auth } from "@/auth";
import { logStepsEntrySchema, type LogStepsEntryInput } from "@/lib/validations/steps";

function parseDayStart(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function logStepsEntry(values: LogStepsEntryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = logStepsEntrySchema.safeParse(values);
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

  const [definition] = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(eq(metricDefinitions.key, "steps"));

  if (!definition) {
    return { error: "Skridt-målingen er ikke konfigureret." };
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
    await db
      .insert(userTrackedMetrics)
      .values({ userId, metricDefinitionId: definition.id })
      .onConflictDoNothing();
  }

  await db.insert(metricEntries).values({
    userId,
    metricDefinitionId: definition.id,
    value: parsed.data.steps.toString(),
    loggedAt,
  });

  revalidatePath("/dashboard/steps");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteStepsDay(dateStr: string) {
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

  const [definition] = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(eq(metricDefinitions.key, "steps"));

  if (definition) {
    await db
      .delete(metricEntries)
      .where(
        and(
          eq(metricEntries.userId, userId),
          eq(metricEntries.metricDefinitionId, definition.id),
          gte(metricEntries.loggedAt, dayStart),
          lt(metricEntries.loggedAt, dayEnd)
        )
      );
  }

  revalidatePath("/dashboard/steps");
  revalidatePath("/dashboard");

  return { success: true };
}
