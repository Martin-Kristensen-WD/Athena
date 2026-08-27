"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  profiles,
  users,
  metricDefinitions,
  userTrackedMetrics,
  metricEntries,
} from "@/db/schema";
import { auth } from "@/auth";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/onboarding";

export async function completeOnboarding(values: OnboardingInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please check the form and try again." };
  }

  const { startingWeight, weightUnit, goalType, goalTargetValue, trackedMetricKeys } =
    parsed.data;
  const userId = session.user.id;
  const db = getDb();

  await db
    .insert(profiles)
    .values({
      userId,
      startingWeight: startingWeight.toString(),
      weightUnit,
      goalType,
      goalTargetMetricKey: goalTargetValue ? "weight" : null,
      goalTargetValue: goalTargetValue ? goalTargetValue.toString() : null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        startingWeight: startingWeight.toString(),
        weightUnit,
        goalType,
        goalTargetMetricKey: goalTargetValue ? "weight" : null,
        goalTargetValue: goalTargetValue ? goalTargetValue.toString() : null,
        updatedAt: new Date(),
      },
    });

  const catalog = await db
    .select({ id: metricDefinitions.id, key: metricDefinitions.key })
    .from(metricDefinitions);

  const selectedDefinitions = catalog.filter((m) =>
    trackedMetricKeys.includes(m.key)
  );

  for (const metric of selectedDefinitions) {
    await db
      .insert(userTrackedMetrics)
      .values({ userId, metricDefinitionId: metric.id })
      .onConflictDoNothing();
  }

  // Weight is always logged as part of onboarding, so always track it
  // regardless of whether the user left it checked in step 3.
  const weightDefinition = catalog.find((m) => m.key === "weight");
  if (weightDefinition) {
    await db
      .insert(userTrackedMetrics)
      .values({ userId, metricDefinitionId: weightDefinition.id })
      .onConflictDoNothing();

    await db.insert(metricEntries).values({
      userId,
      metricDefinitionId: weightDefinition.id,
      value: startingWeight.toString(),
      loggedAt: new Date(),
      note: "Starting weight from onboarding",
    });
  }

  await db
    .update(users)
    .set({ onboardingCompletedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true };
}
