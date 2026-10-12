import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, or, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { FreeSessionLogForm } from "../../free-session-log-form";
import { StartSessionButton } from "../../start-session-button";
import { getActiveSessionId } from "../../live-queries";

export default async function NewFreeSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { mode } = await searchParams;
  const manual = mode === "manual";

  const activeSessionId = await getActiveSessionId(session.user.id);
  if (activeSessionId && !manual) {
    redirect(`/dashboard/workouts/sessions/${activeSessionId}/live`);
  }

  if (manual) {
    const db = getDb();
    const availableExercises = await db
      .select({
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      })
      .from(exercises)
      .where(
        or(eq(exercises.userId, session.user.id), eq(exercises.isSystem, true))
      )
      .orderBy(asc(exercises.name));

    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tomt træningspas
        </h1>
        <p className="text-muted-foreground mt-1">
          Improviser dit træningspas — tilføj øvelser og sæt løbende, som du
          laver dem.
        </p>
        <div className="mt-6">
          <FreeSessionLogForm exercises={availableExercises} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Tomt træningspas</h1>
      <p className="text-muted-foreground mt-1">
        Start et tomt pas og tilføj øvelser og sæt løbende, som du laver dem.
        Hviletimer og sidste gangs tal vises for hver øvelse.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <StartSessionButton input={{ kind: "free" }}>
          Start tomt træningspas
        </StartSessionButton>
        <Link
          href="/dashboard/workouts/sessions/new/free?mode=manual"
          className="text-sm text-muted-foreground underline"
        >
          Registrér manuelt i stedet
        </Link>
      </div>
    </div>
  );
}
