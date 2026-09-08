import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/auth";
import { getDb } from "@/db";
import {
  exercises,
  programmeDays,
  programmeExercises,
  programmes,
  workoutSessions,
  workoutSessionExerciseNotes,
  workoutSessionSets,
} from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/date";
import { round1, setOneRepMax } from "@/lib/strength";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionPersonalRecords, type SessionPr } from "@/app/dashboard/progress/strength-queries";
import { DeleteSessionDialog } from "./delete-session-dialog";

function prTitle(kind: SessionPr["kind"]) {
  if (kind === "both") return "Ny rekord i både estimeret 1RM og vægt";
  if (kind === "weight") return "Ny rekord i vægt";
  return "Ny rekord i estimeret 1RM";
}

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
      status: workoutSessions.status,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      durationMinutes: workoutSessions.durationMinutes,
      notes: workoutSessions.notes,
      programmeName: programmes.name,
      programmeDayName: programmeDays.name,
    })
    .from(workoutSessions)
    .leftJoin(programmes, eq(programmes.id, workoutSessions.programmeId))
    .leftJoin(
      programmeDays,
      eq(programmeDays.id, workoutSessions.programmeDayId)
    )
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!workoutSession || workoutSession.userId !== session.user.id) {
    notFound();
  }

  if (workoutSession.status === "active") {
    redirect(`/dashboard/workouts/sessions/${sessionId}/live`);
  }

  const directExercise = alias(exercises, "direct_exercise");

  const [setRows, personalRecords, noteRows] = await Promise.all([
    db
      .select({
        id: workoutSessionSets.id,
        programmeExerciseId: workoutSessionSets.programmeExerciseId,
        exerciseId: workoutSessionSets.exerciseId,
        setIndex: workoutSessionSets.setIndex,
        reps: workoutSessionSets.reps,
        weight: workoutSessionSets.weight,
        rir: workoutSessionSets.rir,
        programmeExerciseName: exercises.name,
        directExerciseName: directExercise.name,
      })
      .from(workoutSessionSets)
      .leftJoin(
        programmeExercises,
        eq(programmeExercises.id, workoutSessionSets.programmeExerciseId)
      )
      .leftJoin(exercises, eq(exercises.id, programmeExercises.exerciseId))
      .leftJoin(
        directExercise,
        eq(directExercise.id, workoutSessionSets.exerciseId)
      )
      .where(eq(workoutSessionSets.sessionId, sessionId))
      .orderBy(asc(workoutSessionSets.setIndex)),
    getSessionPersonalRecords(session.user.id, sessionId),
    db
      .select({
        programmeExerciseId: workoutSessionExerciseNotes.programmeExerciseId,
        exerciseId: workoutSessionExerciseNotes.exerciseId,
        note: workoutSessionExerciseNotes.note,
      })
      .from(workoutSessionExerciseNotes)
      .where(eq(workoutSessionExerciseNotes.sessionId, sessionId)),
  ]);
  const prByKey = personalRecords.byKey;

  const noteByKey = new Map<string, string>();
  for (const row of noteRows) {
    const key = row.programmeExerciseId ?? row.exerciseId;
    if (key) noteByKey.set(key, row.note);
  }

  const groups = new Map<
    string,
    {
      label: string;
      note: string | null;
      sets: {
        setIndex: number;
        reps: number | null;
        weight: string | null;
        rir: number | null;
      }[];
    }
  >();
  for (const row of setRows) {
    const key = row.programmeExerciseId ?? row.exerciseId ?? `unlinked-${row.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.sets.push({
        setIndex: row.setIndex,
        reps: row.reps,
        weight: row.weight,
        rir: row.rir,
      });
    } else {
      groups.set(key, {
        label:
          row.programmeExerciseName ??
          row.directExerciseName ??
          "Øvelse fjernet fra program",
        note: noteByKey.get(key) ?? null,
        sets: [
          { setIndex: row.setIndex, reps: row.reps, weight: row.weight, rir: row.rir },
        ],
      });
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {workoutSession.programmeName
              ? workoutSession.programmeDayName
                ? `${workoutSession.programmeName} — ${workoutSession.programmeDayName}`
                : workoutSession.programmeName
              : "Frit træningspas"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(workoutSession.completedAt ?? workoutSession.startedAt, "PPP p", {
              locale: da,
            })}
            {workoutSession.durationMinutes != null &&
              ` · ${formatDuration(workoutSession.durationMinutes)}`}
          </p>
          {personalRecords.count > 0 && (
            <Badge className="mt-2">
              🎉{" "}
              {personalRecords.count === 1
                ? "1 ny rekord"
                : `${personalRecords.count} nye rekorder`}
            </Badge>
          )}
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
            Ingen sæt registreret for dette træningspas.
          </p>
        ) : (
          Array.from(groups.entries()).map(([key, group]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">{group.label}</CardTitle>
                {group.note && (
                  <p className="text-muted-foreground text-sm">{group.note}</p>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sæt</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Vægt</TableHead>
                      <TableHead>RIR</TableHead>
                      <TableHead>Est. 1RM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sets.map((set) => {
                      const oneRm = setOneRepMax({
                        weight: set.weight != null ? Number(set.weight) : null,
                        reps: set.reps,
                      });
                      const pr = prByKey.get(`${key}:${set.setIndex}`);
                      return (
                        <TableRow key={set.setIndex}>
                          <TableCell>{set.setIndex + 1}</TableCell>
                          <TableCell>{set.reps ?? "—"}</TableCell>
                          <TableCell>{set.weight ?? "—"}</TableCell>
                          <TableCell>{set.rir ?? "—"}</TableCell>
                          <TableCell className="tabular-nums">
                            <span className="text-muted-foreground">
                              {oneRm != null ? `${round1(oneRm)} kg` : "—"}
                            </span>
                            {pr && (
                              <Badge
                                className="ml-2 align-middle"
                                title={prTitle(pr.kind)}
                              >
                                PR
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
