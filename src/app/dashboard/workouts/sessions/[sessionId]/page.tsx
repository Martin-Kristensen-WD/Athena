import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  exercises,
  programmeExercises,
  programmes,
  workoutSessions,
  workoutSessionSets,
} from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteSessionDialog } from "./delete-session-dialog";

export default async function SessionDetailPage(
  props: PageProps<"/dashboard/workouts/sessions/[sessionId]">
) {
  const { sessionId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = getDb();
  const [workoutSession] = await db
    .select({
      id: workoutSessions.id,
      userId: workoutSessions.userId,
      startedAt: workoutSessions.startedAt,
      durationMinutes: workoutSessions.durationMinutes,
      notes: workoutSessions.notes,
      programmeName: programmes.name,
    })
    .from(workoutSessions)
    .leftJoin(programmes, eq(programmes.id, workoutSessions.programmeId))
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!workoutSession || workoutSession.userId !== session.user.id) {
    notFound();
  }

  const setRows = await db
    .select({
      id: workoutSessionSets.id,
      programmeExerciseId: workoutSessionSets.programmeExerciseId,
      setIndex: workoutSessionSets.setIndex,
      reps: workoutSessionSets.reps,
      weight: workoutSessionSets.weight,
      exerciseName: exercises.name,
    })
    .from(workoutSessionSets)
    .leftJoin(
      programmeExercises,
      eq(programmeExercises.id, workoutSessionSets.programmeExerciseId)
    )
    .leftJoin(exercises, eq(exercises.id, programmeExercises.exerciseId))
    .where(eq(workoutSessionSets.sessionId, sessionId))
    .orderBy(asc(workoutSessionSets.setIndex));

  const groups = new Map<
    string,
    { label: string; sets: { setIndex: number; reps: number | null; weight: string | null }[] }
  >();
  for (const row of setRows) {
    const key = row.programmeExerciseId ?? `unlinked-${row.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.sets.push({ setIndex: row.setIndex, reps: row.reps, weight: row.weight });
    } else {
      groups.set(key, {
        label: row.exerciseName ?? "Exercise removed from programme",
        sets: [{ setIndex: row.setIndex, reps: row.reps, weight: row.weight }],
      });
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workoutSession.programmeName ?? "Freeform session"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(workoutSession.startedAt, "PPP p")}
            {workoutSession.durationMinutes != null &&
              ` · ${workoutSession.durationMinutes} min`}
          </p>
        </div>
        <DeleteSessionDialog sessionId={workoutSession.id} />
      </div>

      {workoutSession.notes && (
        <p className="text-muted-foreground mt-4 text-sm">
          {workoutSession.notes}
        </p>
      )}

      <div className="mt-6 grid gap-4">
        {groups.size === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No sets logged for this session.
          </p>
        ) : (
          Array.from(groups.values()).map((group, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Set</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sets.map((set) => (
                      <TableRow key={set.setIndex}>
                        <TableCell>{set.setIndex + 1}</TableCell>
                        <TableCell>{set.reps ?? "—"}</TableCell>
                        <TableCell>{set.weight ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
