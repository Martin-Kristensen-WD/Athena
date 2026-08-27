import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { programmes, programmeExercises } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export async function ProgrammesTab() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select({
      id: programmes.id,
      name: programmes.name,
      description: programmes.description,
      exerciseId: programmeExercises.exerciseId,
    })
    .from(programmes)
    .leftJoin(
      programmeExercises,
      eq(programmeExercises.programmeId, programmes.id)
    )
    .where(eq(programmes.userId, session.user.id))
    .orderBy(desc(programmes.createdAt));

  const programmeList = new Map<
    string,
    { id: string; name: string; description: string | null; exerciseCount: number }
  >();
  for (const row of rows) {
    const existing = programmeList.get(row.id);
    if (existing) {
      if (row.exerciseId) existing.exerciseCount += 1;
    } else {
      programmeList.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
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
            <Link
              key={programme.id}
              href={`/dashboard/workouts/programmes/${programme.id}`}
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{programme.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {programme.description && (
                    <p className="text-muted-foreground text-sm">
                      {programme.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-2 text-xs">
                    {programme.exerciseCount}{" "}
                    {programme.exerciseCount === 1 ? "øvelse" : "øvelser"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
