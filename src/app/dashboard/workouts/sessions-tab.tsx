import Link from "next/link";
import { format } from "date-fns";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { programmes, workoutSessions, workoutSessionSets } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export async function SessionsTab() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select({
      id: workoutSessions.id,
      startedAt: workoutSessions.startedAt,
      durationMinutes: workoutSessions.durationMinutes,
      programmeName: programmes.name,
      setId: workoutSessionSets.id,
    })
    .from(workoutSessions)
    .leftJoin(programmes, eq(programmes.id, workoutSessions.programmeId))
    .leftJoin(
      workoutSessionSets,
      eq(workoutSessionSets.sessionId, workoutSessions.id)
    )
    .where(eq(workoutSessions.userId, session.user.id))
    .orderBy(desc(workoutSessions.startedAt));

  const sessionMap = new Map<
    string,
    {
      id: string;
      startedAt: Date;
      durationMinutes: number | null;
      programmeName: string | null;
      setCount: number;
    }
  >();
  for (const row of rows) {
    const existing = sessionMap.get(row.id);
    if (existing) {
      if (row.setId) existing.setCount += 1;
    } else {
      sessionMap.set(row.id, {
        id: row.id,
        startedAt: row.startedAt,
        durationMinutes: row.durationMinutes,
        programmeName: row.programmeName,
        setCount: row.setId ? 1 : 0,
      });
    }
  }
  const sessions = Array.from(sessionMap.values());

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/workouts/sessions/new" />}
        >
          <Plus /> Log session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No workout sessions logged yet.
        </p>
      ) : (
        <div className="grid gap-3">
          {sessions.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/workouts/sessions/${item.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {item.programmeName ?? "Freeform session"}
                  </CardTitle>
                  <span className="text-muted-foreground text-sm">
                    {format(item.startedAt, "PPP")}
                  </span>
                </CardHeader>
                <CardContent className="text-muted-foreground flex gap-4 text-sm">
                  <span>
                    {item.setCount} {item.setCount === 1 ? "set" : "sets"}
                  </span>
                  {item.durationMinutes != null && (
                    <span>{item.durationMinutes} min</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
