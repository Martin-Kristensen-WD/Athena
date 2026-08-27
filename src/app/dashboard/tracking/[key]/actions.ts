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
    return { error: "Du skal være logget ind." };
  }

  const parsed = logMetricEntrySchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const loggedAtDate = new Date(parsed.data.loggedAt);
  if (Number.isNaN(loggedAtDate.getTime())) {
    return { error: "Indtast en gyldig dato og tid." };
  }

  const userId = session.user.id;
  const db = getDb();

  const [definition] = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(eq(metricDefinitions.key, metricKey));

  if (!definition) {
    return { error: "Ukendt måling." };
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
    return { error: "Du sporer ikke denne måling." };
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
    return { error: "Du skal være logget ind." };
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
    return { error: "Posten blev ikke fundet." };
  }

  await db.delete(metricEntries).where(eq(metricEntries.id, entryId));

  revalidatePath(`/dashboard/tracking/${entry.key}`);
  revalidatePath("/dashboard/tracking");
  revalidatePath("/dashboard");

  return { success: true };
}
