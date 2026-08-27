import { redirect } from "next/navigation";
import { asc, or, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { ProgrammeForm } from "../programme-form";

export default async function NewProgrammePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = getDb();
  const availableExercises = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
    })
    .from(exercises)
    .where(or(eq(exercises.userId, session.user.id), eq(exercises.isSystem, true)))
    .orderBy(asc(exercises.name));

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Nyt program</h1>
      <p className="text-muted-foreground mt-1">
        Byg en genanvendelig træningsplan, du kan starte træningspas ud fra.
      </p>
      <div className="mt-6">
        <ProgrammeForm exercises={availableExercises} />
      </div>
    </div>
  );
}
