"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries, userTrackedMetrics } from "@/db/schema";
import { auth } from "@/auth";
import {
  logMetricEntrySchema,
  type LogMetricEntryInput,
} from "@/lib/validations/metrics";

export async function logMetricEntry(
  metricKey: string,
  values: LogMetricEntryInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const parsed = logMetricEntrySchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please check the form and try again." };
  }

  const loggedAtDate = new Date(parsed.data.loggedAt);
  if (Number.isNaN(loggedAtDate.getTime())) {
    return { error: "Please enter a valid date and time." };
  }

  const userId = session.user.id;
  const db = getDb();

  const [definition] = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(eq(metricDefinitions.key, metricKey));

  if (!definition) {
    return { error: "Unknown metric." };
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
    return { error: "You are not tracking this metric." };
  }

  await db.insert(metricEntries).values({
    userId,
    metricDefinitionId: definition.id,
    value: parsed.data.value.toString(),
    loggedAt: loggedAtDate,
    note: parsed.data.note ? parsed.data.note : null,
  });

  revalidatePath(`/dashboard/tracking/${metricKey}`);
  revalidatePath("/dashboard/tracking");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteMetricEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const db = getDb();

  const [entry] = await db
    .select({
      id: metricEntries.id,
      userId: metricEntries.userId,
      key: metricDefinitions.key,
    })
    .from(metricEntries)
    .innerJoin(
      metricDefinitions,
      eq(metricEntries.metricDefinitionId, metricDefinitions.id)
    )
    .where(eq(metricEntries.id, entryId));

  if (!entry || entry.userId !== session.user.id) {
    return { error: "Entry not found." };
  }

  await db.delete(metricEntries).where(eq(metricEntries.id, entryId));

  revalidatePath(`/dashboard/tracking/${entry.key}`);
  revalidatePath("/dashboard/tracking");
  revalidatePath("/dashboard");

  return { success: true };
}
