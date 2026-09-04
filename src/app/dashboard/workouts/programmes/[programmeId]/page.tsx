import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq, or } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { exercises, programmeDays, programmeExercises, programmes } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { ProgrammeForm } from "../programme-form";
import { DeleteProgrammeDialog } from "./delete-programme-dialog";

export default async function ProgrammePage(
  props: PageProps<"/dashboard/workouts/programmes/[programmeId]">
) {
  const { programmeId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = getDb();
  const [programme] = await db
    .select()
    .from(programmes)
    .where(eq(programmes.id, programmeId))
    .limit(1);

  if (!programme || programme.userId !== session.user.id) {
    notFound();
  }

  const [days, rows, availableExercises] = await Promise.all([
    db
      .select()
      .from(programmeDays)
      .where(eq(programmeDays.programmeId, programmeId))
      .orderBy(asc(programmeDays.orderIndex)),
    db
      .select({
        id: programmeExercises.id,
        dayId: programmeExercises.dayId,
        exerciseId: programmeExercises.exerciseId,
        orderIndex: programmeExercises.orderIndex,
        sets: programmeExercises.sets,
        targetReps: programmeExercises.targetReps,
        targetWeight: programmeExercises.targetWeight,
        restSeconds: programmeExercises.restSeconds,
        notes: programmeExercises.notes,
      })
      .from(programmeExercises)
      .innerJoin(
        programmeDays,
        eq(programmeDays.id, programmeExercises.dayId)
      )
      .where(eq(programmeDays.programmeId, programmeId))
      .orderBy(asc(programmeExercises.orderIndex)),
    db
      .select({
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
      })
      .from(exercises)
      .where(
        or(eq(exercises.userId, session.user.id), eq(exercises.isSystem, true))
      )
      .orderBy(asc(exercises.name)),
  ]);

  const exerciseNameById = new Map(
    availableExercises.map((exercise) => [exercise.id, exercise])
  );

  const exercisesByDayId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = exercisesByDayId.get(row.dayId) ?? [];
    list.push(row);
    exercisesByDayId.set(row.dayId, list);
  }

  const initialValues = {
    name: programme.name,
    description: programme.description ?? "",
    days: days.map((day) => ({
      name: day.name,
      exercises: (exercisesByDayId.get(day.id) ?? []).map((row) => ({
        exerciseId: row.exerciseId,
        exerciseName: exerciseNameById.get(row.exerciseId)?.name,
        muscleGroup: exerciseNameById.get(row.exerciseId)?.muscleGroup,
        sets: row.sets,
        targetReps: row.targetReps,
        targetWeight:
          row.targetWeight != null ? Number(row.targetWeight) : undefined,
        restSeconds: row.restSeconds ?? undefined,
        notes: row.notes ?? "",
      })),
    })),
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {programme.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Rediger dette program, eller start et træningspas ud fra det.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/dashboard/workouts/sessions/new?programmeId=${programme.id}`}
              />
            }
          >
            <Play /> Start træningspas
          </Button>
          <DeleteProgrammeDialog programmeId={programme.id} />
        </div>
      </div>
      <div className="mt-6">
        <ProgrammeForm
          exercises={availableExercises}
          programmeId={programme.id}
          initialValues={initialValues}
        />
      </div>
    </div>
  );
}
