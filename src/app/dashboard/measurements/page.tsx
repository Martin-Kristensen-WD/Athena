import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { bodyMeasurements, progressPhotos, type MeasurementType } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { entryDayKey } from "@/lib/date";
import { MeasurementsLogForm } from "./measurements-log-form";
import { MeasurementsHistory, type MeasurementSession } from "./measurements-history";

export default async function MeasurementsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;
  const db = getDb();

  const [measurementRows, photoRows] = await Promise.all([
    db
      .select({
        type: bodyMeasurements.type,
        value: bodyMeasurements.value,
        loggedAt: bodyMeasurements.loggedAt,
      })
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId))
      .orderBy(desc(bodyMeasurements.loggedAt)),
    db
      .select({
        id: progressPhotos.id,
        view: progressPhotos.view,
        takenAt: progressPhotos.takenAt,
      })
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId))
      .orderBy(desc(progressPhotos.takenAt)),
  ]);

  const sessionsByDate = new Map<string, MeasurementSession>();

  function getSession(date: string) {
    let entry = sessionsByDate.get(date);
    if (!entry) {
      entry = { date, values: {}, photos: [] };
      sessionsByDate.set(date, entry);
    }
    return entry;
  }

  for (const row of measurementRows) {
    const date = entryDayKey(row.loggedAt);
    const entry = getSession(date);
    if (!(row.type in entry.values)) {
      entry.values[row.type as MeasurementType] = Number(row.value);
    }
  }

  for (const row of photoRows) {
    const date = entryDayKey(row.takenAt);
    const entry = getSession(date);
    entry.photos.push({ id: row.id, view: row.view });
  }

  const sessions = [...sessionsByDate.values()].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Målinger</h1>
        <p className="text-muted-foreground mt-2">
          Registrer kropsmål og fremgangsbilleder for at følge din udvikling.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ny registrering</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasurementsLogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historik</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasurementsHistory sessions={sessions} />
        </CardContent>
      </Card>
    </div>
  );
}
