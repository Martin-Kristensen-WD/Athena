import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
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

  const initialValues = {
    goalType: profile?.goalType ?? ("maintain" as const),
    milestoneTargetValue:
      profile?.milestoneTargetValue !== null && profile?.milestoneTargetValue !== undefined
        ? Number(profile.milestoneTargetValue)
        : undefined,
    goalTargetValue:
      profile?.goalTargetValue !== null && profile?.goalTargetValue !== undefined
        ? Number(profile.goalTargetValue)
        : undefined,
    dailyCalorieTarget:
      profile?.dailyCalorieTarget !== null && profile?.dailyCalorieTarget !== undefined
        ? Number(profile.dailyCalorieTarget)
        : undefined,
    dailyStepsTarget:
      profile?.dailyStepsTarget !== null && profile?.dailyStepsTarget !== undefined
        ? Number(profile.dailyStepsTarget)
        : undefined,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
      <p className="text-muted-foreground mt-2">
        Sæt de delmål og daglige mål, du arbejder hen imod.
      </p>
      <div className="mt-6">
        <ProfileForm
          initialValues={initialValues}
          weightUnit={profile?.weightUnit ?? "kg"}
        />
      </div>
    </div>
  );
}
