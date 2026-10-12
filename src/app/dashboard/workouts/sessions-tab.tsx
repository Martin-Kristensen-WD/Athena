import Link from "next/link";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { programmes, workoutSessions, workoutSessionSets } from "@/db/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Plus } from "lucide-react";
import { formatDuration } from "@/lib/date";
import { getActiveSessionId } from "./sessions/live-queries";

export async function SessionsTab() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const db = getDb();
  const [activeSessionId, rows] = await Promise.all([
    getActiveSessionId(session.user.id),
    db
      .select({
        id: workoutSessions.id,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
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
      .where(
        and(
          eq(workoutSessions.userId, session.user.id),
          eq(workoutSessions.status, "completed")
        )
      )
      .orderBy(desc(workoutSessions.startedAt)),
  ]);

  const sessionMap = new Map<
    string,
    {
      id: string;
      date: Date;
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
        date: row.completedAt ?? row.startedAt,
        durationMinutes: row.durationMinutes,
        programmeName: row.programmeName,
        setCount: row.setId ? 1 : 0,
      });
    }
  }
  const sessions = Array.from(sessionMap.values());

  return (
    <div className="grid gap-4">
      {activeSessionId && (
        <Link href={`/dashboard/workouts/sessions/${activeSessionId}/live`}>
          <Card className="border-primary/40 bg-primary/5 transition-colors hover:bg-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Træningspas i gang</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Fortsæt hvor du slap.
                </p>
              </div>
              <span className={buttonVariants({ size: "sm" })}>
                Fortsæt <ChevronRight />
              </span>
            </CardHeader>
          </Card>
        </Link>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/workouts/sessions/new" />}
        >
          <Plus /> Registrer træningspas
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Ingen træningspas registreret endnu.
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
                    {item.programmeName ?? "Frit træningspas"}
                  </CardTitle>
                  <span className="text-muted-foreground text-sm">
                    {format(item.date, "PPP", { locale: da })}
                  </span>
                </CardHeader>
                <CardContent className="text-muted-foreground flex gap-4 text-sm">
                  <span>{item.setCount} sæt</span>
                  {item.durationMinutes != null && (
                    <span>{formatDuration(item.durationMinutes)}</span>
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
