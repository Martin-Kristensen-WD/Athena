import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { profiles, programmes, programmeDays, programmeExercises } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ActiveProgrammeToggle } from "./programmes/active-programme-toggle";

export async function ProgrammesTab() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const db = getDb();
  const [rows, profileRows] = await Promise.all([
    db
      .select({
        id: programmes.id,
        name: programmes.name,
        description: programmes.description,
        dayId: programmeDays.id,
        exerciseId: programmeExercises.id,
      })
      .from(programmes)
      .leftJoin(programmeDays, eq(programmeDays.programmeId, programmes.id))
      .leftJoin(programmeExercises, eq(programmeExercises.dayId, programmeDays.id))
      .where(eq(programmes.userId, session.user.id))
      .orderBy(desc(programmes.createdAt)),
    db
      .select({ activeProgrammeId: profiles.activeProgrammeId })
      .from(profiles)
      .where(eq(profiles.userId, session.user.id)),
  ]);

  const activeProgrammeId = profileRows[0]?.activeProgrammeId ?? null;

  const programmeList = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      dayIds: Set<string>;
      exerciseCount: number;
    }
  >();
  for (const row of rows) {
    const existing = programmeList.get(row.id);
    if (existing) {
      if (row.dayId) existing.dayIds.add(row.dayId);
      if (row.exerciseId) existing.exerciseCount += 1;
    } else {
      programmeList.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        dayIds: new Set(row.dayId ? [row.dayId] : []),
        exerciseCount: row.exerciseId ? 1 : 0,
      });
    }
  }
  const list = Array.from(programmeList.values());

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/workouts/programmes/new" />}
        >
          <Plus /> Nyt program
        </Button>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Du har ikke oprettet nogen programmer endnu.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((programme) => (
            <Card key={programme.id} className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <Link href={`/dashboard/workouts/programmes/${programme.id}`}>
                  <CardTitle>{programme.name}</CardTitle>
                </Link>
                <CardAction>
                  <ActiveProgrammeToggle
                    programmeId={programme.id}
                    active={programme.id === activeProgrammeId}
                  />
                </CardAction>
              </CardHeader>
              <Link href={`/dashboard/workouts/programmes/${programme.id}`}>
                <CardContent>
                  {programme.description && (
                    <p className="text-muted-foreground text-sm">
                      {programme.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-2 text-xs">
                    {programme.dayIds.size}{" "}
                    {programme.dayIds.size === 1 ? "dag" : "dage"} ·{" "}
                    {programme.exerciseCount}{" "}
                    {programme.exerciseCount === 1 ? "øvelse" : "øvelser"}
                  </p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
