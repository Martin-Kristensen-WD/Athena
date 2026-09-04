import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  exercises,
  profiles,
  programmeDays,
  programmeExercises,
  programmes,
} from "@/db/schema";
import { Button } from "@/components/ui/button";
import { ProgrammeStartPicker, type ProgrammeOption } from "../programme-start-picker";
import { DayPicker } from "../day-picker";
import { SessionLogForm } from "../session-log-form";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewSessionPage(
  props: PageProps<"/dashboard/workouts/sessions/new">
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const programmeIdParam = firstParam(searchParams.programmeId);
  const dayIdParam = firstParam(searchParams.dayId);

  const db = getDb();

  if (!programmeIdParam) {
    const [rows, profileRows] = await Promise.all([
      db
        .select({
          programmeId: programmes.id,
          programmeName: programmes.name,
          programmeDescription: programmes.description,
          dayId: programmeDays.id,
          dayName: programmeDays.name,
          dayOrderIndex: programmeDays.orderIndex,
          exerciseId: programmeExercises.id,
        })
        .from(programmes)
        .leftJoin(programmeDays, eq(programmeDays.programmeId, programmes.id))
        .leftJoin(
          programmeExercises,
          eq(programmeExercises.dayId, programmeDays.id)
        )
        .where(eq(programmes.userId, session.user.id))
        .orderBy(asc(programmes.name), asc(programmeDays.orderIndex)),
      db
        .select({ activeProgrammeId: profiles.activeProgrammeId })
        .from(profiles)
        .where(eq(profiles.userId, session.user.id)),
    ]);

    const programmeMap = new Map<string, ProgrammeOption>();
    const dayExerciseCounts = new Map<string, number>();
    for (const row of rows) {
      if (!row.dayId) continue;
      if (row.exerciseId) {
        dayExerciseCounts.set(
          row.dayId,
          (dayExerciseCounts.get(row.dayId) ?? 0) + 1
        );
      } else if (!dayExerciseCounts.has(row.dayId)) {
        dayExerciseCounts.set(row.dayId, 0);
      }
    }
    for (const row of rows) {
      let programme = programmeMap.get(row.programmeId);
      if (!programme) {
        programme = {
          id: row.programmeId,
          name: row.programmeName,
          description: row.programmeDescription,
          days: [],
        };
        programmeMap.set(row.programmeId, programme);
      }
      if (row.dayId && !programme.days.some((day) => day.id === row.dayId)) {
        programme.days.push({
          id: row.dayId,
          name: row.dayName!,
          exerciseCount: dayExerciseCounts.get(row.dayId) ?? 0,
        });
      }
    }
    const userProgrammes = Array.from(programmeMap.values());

    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Start et træningspas
        </h1>
        <p className="text-muted-foreground mt-1">
          Følg et program, eller improviser et tomt træningspas.
        </p>

        <div className="mt-6">
          <h2 className="text-sm font-medium">Fra et program</h2>
          {userProgrammes.length === 0 ? (
            <p className="text-muted-foreground mt-3 rounded-lg border border-dashed p-6 text-center text-sm">
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
            <div className="mt-3">
              <ProgrammeStartPicker
                programmes={userProgrammes}
                activeProgrammeId={profileRows[0]?.activeProgrammeId ?? null}
              />
            </div>
          )}
        </div>

        <div className="mt-8 max-w-md border-t pt-6">
          <h2 className="text-sm font-medium">Uden program</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Tilføj øvelser og sæt løbende, som du laver dem.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            nativeButton={false}
            render={<Link href="/dashboard/workouts/sessions/new/free" />}
          >
            <Plus /> Start tomt træningspas
          </Button>
        </div>
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

  const dayRows = await db
    .select({
      id: programmeDays.id,
      name: programmeDays.name,
      exerciseId: programmeExercises.id,
    })
    .from(programmeDays)
    .leftJoin(
      programmeExercises,
      eq(programmeExercises.dayId, programmeDays.id)
    )
    .where(eq(programmeDays.programmeId, programme.id))
    .orderBy(asc(programmeDays.orderIndex));

  const dayMap = new Map<string, { id: string; name: string; exerciseCount: number }>();
  for (const row of dayRows) {
    const day = dayMap.get(row.id) ?? { id: row.id, name: row.name, exerciseCount: 0 };
    if (row.exerciseId) day.exerciseCount += 1;
    dayMap.set(row.id, day);
  }
  const days = Array.from(dayMap.values());

  if (days.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          {programme.name}
        </h1>
        <p className="text-muted-foreground mt-6 rounded-lg border border-dashed p-6 text-center text-sm">
          Dette program har ingen dage endnu.{" "}
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

  if (!dayIdParam) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          {programme.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Vælg hvilken dag i programmet du skal træne.
        </p>
        <div className="mt-6">
          <DayPicker programmeId={programme.id} days={days} />
        </div>
      </div>
    );
  }

  const day = days.find((d) => d.id === dayIdParam);
  if (!day) {
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
    .where(eq(programmeExercises.dayId, day.id))
    .orderBy(asc(programmeExercises.orderIndex));

  if (plannedExercises.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          {programme.name} — {day.name}
        </h1>
        <p className="text-muted-foreground mt-6 rounded-lg border border-dashed p-6 text-center text-sm">
          Denne dag har ingen øvelser endnu.{" "}
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
        Registrer træningspas: {programme.name} — {day.name}
      </h1>
      <p className="text-muted-foreground mt-1">
        Indtast hvad du faktisk lavede for hvert sæt.
      </p>
      <div className="mt-6">
        <SessionLogForm
          programmeId={programme.id}
          programmeDayId={day.id}
          exercises={plannedExercises}
        />
      </div>
    </div>
  );
}
