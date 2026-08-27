import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { auth } from "@/auth";
import { ExercisesTabClient } from "./exercises-tab-client";

export async function ExercisesTab() {
  const session = await auth();
  const userId = session?.user?.id;

  const db = getDb();
  const [myExercises, catalogExercises] = await Promise.all([
    userId
      ? db
          .select()
          .from(exercises)
          .where(and(eq(exercises.userId, userId), eq(exercises.isSystem, false)))
          .orderBy(exercises.name)
      : Promise.resolve([]),
    db
      .select()
      .from(exercises)
      .where(eq(exercises.isSystem, true))
      .orderBy(exercises.name),
  ]);

  return (
    <ExercisesTabClient
      myExercises={myExercises}
      catalogExercises={catalogExercises}
    />
  );
}
