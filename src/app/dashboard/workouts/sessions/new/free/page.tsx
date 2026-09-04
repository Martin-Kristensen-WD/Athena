import { redirect } from "next/navigation";
import { asc, or, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { FreeSessionLogForm } from "../../free-session-log-form";

export default async function NewFreeSessionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = getDb();
  const availableExercises = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
    })
    .from(exercises)
    .where(or(eq(exercises.userId, session.user.id), eq(exercises.isSystem, true)))
    .orderBy(asc(exercises.name));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Tomt træningspas</h1>
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
