import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { auth } from "@/auth";
import { AdminExercisesClient } from "./admin-exercises-client";

export default async function AdminExercisesPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const db = getDb();
  const catalogExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.isSystem, true))
    .orderBy(exercises.name);

  return (
    <div>
      <p className="text-muted-foreground mb-6 text-sm">
        Manage the system exercise catalog available to every user.
      </p>
      <AdminExercisesClient exercises={catalogExercises} />
    </div>
  );
}
