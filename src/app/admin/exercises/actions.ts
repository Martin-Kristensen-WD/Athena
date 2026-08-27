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

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Du skal være logget ind." } as const;
  }
  if (session.user.role !== "admin") {
    return { error: "Du har ikke rettigheder til at gøre dette." } as const;
  }
  return { session } as const;
}

export async function createSystemExercise(values: ExerciseFormInput) {
  const check = await requireAdmin();
  if ("error" in check) return check;

  const parsed = exerciseFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const db = getDb();
  try {
    await db.insert(exercises).values({
      userId: null,
      isSystem: true,
      ...normalize(parsed.data),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Der findes allerede en katalogøvelse med dette navn." };
    }
    throw error;
  }

  revalidatePath("/admin/exercises");
  return { success: true };
}

export async function updateSystemExercise(
  id: string,
  values: ExerciseFormInput
) {
  const check = await requireAdmin();
  if ("error" in check) return check;

  const parsed = exerciseFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Tjek formularen, og prøv igen." };
  }

  const db = getDb();
  try {
    const result = await db
      .update(exercises)
      .set(normalize(parsed.data))
      .where(and(eq(exercises.id, id), eq(exercises.isSystem, true)))
      .returning({ id: exercises.id });

    if (result.length === 0) {
      return { error: "Øvelsen blev ikke fundet." };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "Der findes allerede en katalogøvelse med dette navn." };
    }
    throw error;
  }

  revalidatePath("/admin/exercises");
  return { success: true };
}

export async function deleteSystemExercise(id: string) {
  const check = await requireAdmin();
  if ("error" in check) return check;

  const db = getDb();
  try {
    const result = await db
      .delete(exercises)
      .where(and(eq(exercises.id, id), eq(exercises.isSystem, true)))
      .returning({ id: exercises.id });

    if (result.length === 0) {
      return { error: "Øvelsen blev ikke fundet." };
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return {
        error: "Denne øvelse bruges i et program og kan ikke slettes.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/exercises");
  return { success: true };
}
