import { getDb } from "@/db";
import { metricDefinitions } from "@/db/schema";
import { Logo } from "@/components/logo";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const db = getDb();
  const metrics = await db
    .select()
    .from(metricDefinitions)
    .orderBy(metricDefinitions.label);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8 h-8 w-auto" priority />
      <OnboardingWizard metrics={metrics} />
    </div>
  );
}
