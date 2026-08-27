"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";

export async function updateProfile(values: ProfileInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." };
  }

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const { milestoneTargetValue, goalTargetValue, dailyCalorieTarget, dailyStepsTarget } =
    parsed.data;
  const userId = session.user.id;
  const db = getDb();

  await db
    .update(profiles)
    .set({
      milestoneTargetValue:
        milestoneTargetValue !== undefined ? milestoneTargetValue.toString() : null,
      goalTargetValue:
        goalTargetValue !== undefined ? goalTargetValue.toString() : null,
      goalTargetMetricKey: goalTargetValue !== undefined ? "weight" : null,
      dailyCalorieTarget:
        dailyCalorieTarget !== undefined ? dailyCalorieTarget.toString() : null,
      dailyStepsTarget:
        dailyStepsTarget !== undefined ? dailyStepsTarget.toString() : null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/food");
  revalidatePath("/dashboard/steps");

  return { success: true as const };
}
