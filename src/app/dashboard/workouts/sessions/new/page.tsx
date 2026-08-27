import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { exercises, programmeExercises, programmes } from "@/db/schema";
import { ProgrammePicker } from "../programme-picker";
import { SessionLogForm } from "../session-log-form";

export default async function NewSessionPage(
  props: PageProps<"/dashboard/workouts/sessions/new">
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const rawProgrammeId = searchParams.programmeId;
  const programmeIdParam = Array.isArray(rawProgrammeId)
    ? rawProgrammeId[0]
    : rawProgrammeId;

  const db = getDb();

  if (!programmeIdParam) {
    const userProgrammes = await db
      .select({ id: programmes.id, name: programmes.name })
      .from(programmes)
      .where(eq(programmes.userId, session.user.id))
      .orderBy(asc(programmes.name));

    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          Start et træningspas
        </h1>
        <p className="text-muted-foreground mt-1">
          Vælg et program at registrere et træningspas ud fra.
        </p>
        {userProgrammes.length === 0 ? (
          <p className="text-muted-foreground mt-6 rounded-lg border border-dashed p-6 text-center text-sm">
            Du har ikke oprettet nogen programmer endnu.{" "}
            <Link
              href="/dashboard/workouts/programmes/new"
              className="text-foreground underline"
            >
              Opret et
            </Link>{" "}
            først.
          </p>
        ) : (
          <div className="mt-6">
            <ProgrammePicker programmes={userProgrammes} />
          </div>
        )}
      </div>
    );
  }

  const [programme] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.id, programmeIdParam))
    .limit(1);

  if (!programme || programme.userId !== session.user.id) {
    notFound();
  }

  const plannedExercises = await db
    .select({
      id: programmeExercises.id,
      exerciseName: exercises.name,
      sets: programmeExercises.sets,
      targetReps: programmeExercises.targetReps,
      targetWeight: programmeExercises.targetWeight,
    })
    .from(programmeExercises)
    .innerJoin(exercises, eq(exercises.id, programmeExercises.exerciseId))
    .where(eq(programmeExercises.programmeId, programme.id))
    .orderBy(asc(programmeExercises.orderIndex));

  if (plannedExercises.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          {programme.name}
        </h1>
        <p className="text-muted-foreground mt-6 rounded-lg border border-dashed p-6 text-center text-sm">
          Dette program har ingen øvelser endnu.{" "}
          <Link
            href={`/dashboard/workouts/programmes/${programme.id}`}
            className="text-foreground underline"
          >
            Tilføj nogle
          </Link>{" "}
          før du registrerer et træningspas.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Registrer træningspas: {programme.name}
      </h1>
      <p className="text-muted-foreground mt-1">
        Indtast hvad du faktisk lavede for hvert sæt.
      </p>
      <div className="mt-6">
        <SessionLogForm programmeId={programme.id} exercises={plannedExercises} />
      </div>
    </div>
  );
}
