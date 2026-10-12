import { redirect } from "next/navigation";
import { asc, eq, or } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { loadLiveSession } from "../../live-queries";
import { LiveSessionLogger } from "./live-session-logger";

export default async function LiveSessionPage(
  props: PageProps<"/dashboard/workouts/sessions/[sessionId]/live">
) {
  const { sessionId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const live = await loadLiveSession(session.user.id, sessionId);
  if (!live) {
    // Finished, discarded, or not the caller's — show the summary instead.
    redirect(`/dashboard/workouts/sessions/${sessionId}`);
  }

  const availableExercises = await getDb()
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
    <LiveSessionLogger session={live} availableExercises={availableExercises} />
  );
}
