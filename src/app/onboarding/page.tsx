import { getDb } from "@/db";
import { metricDefinitions } from "@/db/schema";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const db = getDb();
  const metrics = await db
    .select()
    .from(metricDefinitions)
    .orderBy(metricDefinitions.label);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <OnboardingWizard metrics={metrics} />
    </div>
  );
}
