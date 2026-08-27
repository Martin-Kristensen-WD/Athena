import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import * as schema from "../src/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

const ADMIN_EMAIL = "martin.kristensen@aller.com";

const metricCatalog: (typeof schema.metricDefinitions.$inferInsert)[] = [
  {
    key: "weight",
    label: "Vægt",
    unit: "kg",
    dataType: "number",
    icon: "scale",
  },
  {
    key: "steps",
    label: "Skridt",
    unit: "skridt",
    dataType: "integer",
    icon: "footprints",
  },
  {
    key: "calories",
    label: "Kalorier",
    unit: "kcal",
    dataType: "integer",
    icon: "flame",
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    dataType: "number",
    icon: "beef",
  },
  {
    key: "carbs",
    label: "Kulhydrater",
    unit: "g",
    dataType: "number",
    icon: "wheat",
  },
  {
    key: "fat",
    label: "Fedt",
    unit: "g",
    dataType: "number",
    icon: "droplet",
  },
  {
    key: "sleep_hours",
    label: "Søvn",
    unit: "timer",
    dataType: "number",
    icon: "moon",
  },
  {
    key: "body_fat_pct",
    label: "Fedtprocent",
    unit: "%",
    dataType: "number",
    icon: "percent",
  },
];

const exerciseCatalog: {
  name: string;
  muscleGroup: (typeof schema.muscleGroupEnum.enumValues)[number];
  equipment?: string;
}[] = [
  { name: "Barbell Back Squat", muscleGroup: "legs", equipment: "barbell" },
  { name: "Barbell Front Squat", muscleGroup: "legs", equipment: "barbell" },
  { name: "Goblet Squat", muscleGroup: "legs", equipment: "dumbbell" },
  { name: "Bulgarian Split Squat", muscleGroup: "legs", equipment: "dumbbell" },
  { name: "Leg Press", muscleGroup: "legs", equipment: "machine" },
  { name: "Romanian Deadlift", muscleGroup: "legs", equipment: "barbell" },
  { name: "Conventional Deadlift", muscleGroup: "legs", equipment: "barbell" },
  { name: "Hip Thrust", muscleGroup: "glutes", equipment: "barbell" },
  { name: "Glute Bridge", muscleGroup: "glutes", equipment: "bodyweight" },
  { name: "Walking Lunge", muscleGroup: "legs", equipment: "dumbbell" },
  { name: "Standing Calf Raise", muscleGroup: "legs", equipment: "machine" },
  { name: "Barbell Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Dumbbell Flye", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Push-Up", muscleGroup: "chest", equipment: "bodyweight" },
  { name: "Cable Chest Fly", muscleGroup: "chest", equipment: "cable" },
  { name: "Pull-Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Lat Pulldown", muscleGroup: "back", equipment: "machine" },
  { name: "Barbell Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Dumbbell Row", muscleGroup: "back", equipment: "dumbbell" },
  { name: "Seated Cable Row", muscleGroup: "back", equipment: "cable" },
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Face Pull", muscleGroup: "shoulders", equipment: "cable" },
  { name: "Barbell Bicep Curl", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Dumbbell Hammer Curl", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Tricep Pushdown", muscleGroup: "triceps", equipment: "cable" },
  { name: "Skull Crusher", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Dips", muscleGroup: "triceps", equipment: "bodyweight" },
  { name: "Plank", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Cable Crunch", muscleGroup: "core", equipment: "cable" },
  { name: "Russian Twist", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Treadmill Run", muscleGroup: "cardio", equipment: "machine" },
  { name: "Rowing Machine", muscleGroup: "cardio", equipment: "machine" },
  { name: "Cycling", muscleGroup: "cardio", equipment: "machine" },
  { name: "Burpee", muscleGroup: "full_body", equipment: "bodyweight" },
  { name: "Kettlebell Swing", muscleGroup: "full_body", equipment: "kettlebell" },
  { name: "Clean and Press", muscleGroup: "full_body", equipment: "barbell" },
];

async function main() {
  console.log("Seeding metric catalog...");
  for (const metric of metricCatalog) {
    await db
      .insert(schema.metricDefinitions)
      .values(metric)
      .onConflictDoUpdate({
        target: schema.metricDefinitions.key,
        set: { label: metric.label, unit: metric.unit },
      });
  }

  console.log("Seeding exercise catalog...");
  for (const exercise of exerciseCatalog) {
    const existing = await db
      .select({ id: schema.exercises.id })
      .from(schema.exercises)
      .where(
        sql`${schema.exercises.userId} is null and ${schema.exercises.name} = ${exercise.name}`
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.exercises).values({
        userId: null,
        isSystem: true,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
      });
    }
  }

  console.log(`Granting admin role to ${ADMIN_EMAIL} (if the account exists)...`);
  await db
    .update(schema.users)
    .set({ role: "admin" })
    .where(eq(schema.users.email, ADMIN_EMAIL));

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
