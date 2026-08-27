import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { and, eq, gte, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { metricDefinitions, metricEntries } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SleepLogForm } from "./sleep-log-form";
import { SleepLogList, type SleepDayRow } from "./sleep-log-list";

function parseMonthParam(month: string | undefined) {
  const now = new Date();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNum] = month.split("-").map(Number);
    return { year, monthIndex: monthNum - 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthParam(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function SleepPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;
  const db = getDb();

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 1);
  const prevMonth = monthParam(year, monthIndex - 1);
  const nextMonth = monthParam(year, monthIndex + 1);
  const monthLabel = monthStart.toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });

  const definitionRow = await db
    .select({ id: metricDefinitions.id })
    .from(metricDefinitions)
    .where(eq(metricDefinitions.key, "sleep_hours"));

  const definition = definitionRow[0] ?? null;

  const entries = definition
    ? await db
        .select({ value: metricEntries.value, loggedAt: metricEntries.loggedAt })
        .from(metricEntries)
        .where(
          and(
            eq(metricEntries.userId, userId),
            eq(metricEntries.metricDefinitionId, definition.id),
            gte(metricEntries.loggedAt, monthStart),
            lt(metricEntries.loggedAt, monthEnd)
          )
        )
    : [];

  const dailyTotals = new Map<string, number>();
  for (const entry of entries) {
    const dayKey = entry.loggedAt.toISOString().slice(0, 10);
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + Number(entry.value));
  }

  const rows: SleepDayRow[] = [...dailyTotals.entries()]
    .map(([date, hours]) => ({ date, hours }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Søvn</h1>
        <p className="text-muted-foreground mt-2">
          Registrer dine søvntimer for at følge din udvikling.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrer søvn</CardTitle>
        </CardHeader>
        <CardContent>
          <SleepLogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>{monthLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/sleep?month=${prevMonth}`} />}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Forrige måned</span>
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/sleep?month=${nextMonth}`} />}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Næste måned</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SleepLogList rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
