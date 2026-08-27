"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { auth } from "@/auth";
import { exerciseFormSchema, type ExerciseFormInput } from "@/lib/validations/exercises";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";

function normalize(values: ExerciseFormInput) {
  return {
    name: values.name.trim(),
    muscleGroup: values.muscleGroup,
    equipment: values.equipment?.trim() ? values.equipment.trim() : null,
    notes: values.notes?.trim() ? values.notes.trim() : null,
  };
}

export async function createExercise(values: ExerciseFormInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const parsed = exerciseFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please check the form and try again." };
  }

  const db = getDb();
  try {
    await db.insert(exercises).values({
      userId: session.user.id,
      isSystem: false,
      ...normalize(parsed.data),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "You already have an exercise with this name." };
    }
    throw error;
  }

  revalidatePath("/dashboard/workouts");
  return { success: true };
}

export async function updateExercise(id: string, values: ExerciseFormInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const parsed = exerciseFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Please check the form and try again." };
  }

  const db = getDb();
  try {
    const result = await db
      .update(exercises)
      .set(normalize(parsed.data))
      .where(
        and(
          eq(exercises.id, id),
          eq(exercises.userId, session.user.id),
          eq(exercises.isSystem, false)
        )
      )
      .returning({ id: exercises.id });

    if (result.length === 0) {
      return { error: "Exercise not found." };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "You already have an exercise with this name." };
    }
    throw error;
  }

  revalidatePath("/dashboard/workouts");
  return { success: true };
}

export async function deleteExercise(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const db = getDb();
  try {
    const result = await db
      .delete(exercises)
      .where(
        and(
          eq(exercises.id, id),
          eq(exercises.userId, session.user.id),
          eq(exercises.isSystem, false)
        )
      )
      .returning({ id: exercises.id });

    if (result.length === 0) {
      return { error: "Exercise not found." };
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return {
        error: "This exercise is used in a programme and can't be deleted.",
      };
    }
    throw error;
  }

  revalidatePath("/dashboard/workouts");
  return { success: true };
}
