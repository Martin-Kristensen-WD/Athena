import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { asc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { del, put } from "@vercel/blob";
import * as schema from "../src/db/schema";
import { seedCatalog } from "./lib/catalog";
import type { MeasurementType, ProgressPhotoView } from "../src/db/schema";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

const TEST_EMAIL = "demo@athena.test";
const TEST_PASSWORD = "Demo1234!";
const TEST_NAME = "Demo Bruger";
const HISTORY_DAYS = 150;
const FOOD_HISTORY_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(12, 0, 0, 0);

function daysAgo(days: number) {
  return new Date(today.getTime() - days * DAY_MS);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.round(rand(min, max));
}

function chance(p: number) {
  return Math.random() < p;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function placeholderPhotoSvg(label: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

async function resetTestUser() {
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, TEST_EMAIL));

  if (!existing) return;

  const oldPhotos = await db
    .select({ pathname: schema.progressPhotos.pathname })
    .from(schema.progressPhotos)
    .where(eq(schema.progressPhotos.userId, existing.id));

  if (oldPhotos.length > 0) {
    await del(oldPhotos.map((photo) => photo.pathname));
  }

  // Cascades to profiles, metric entries, tracked metrics, body measurements,
  // progress photos, programmes/programme exercises, and workout sessions/sets.
  await db.delete(schema.users).where(eq(schema.users.id, existing.id));
}

async function main() {
  console.log("Ensuring metric + exercise catalog...");
  await seedCatalog(db);

  console.log(`Resetting existing test user ${TEST_EMAIL} (if any)...`);
  await resetTestUser();

  console.log("Creating test user + profile...");
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const [user] = await db
    .insert(schema.users)
    .values({
      email: TEST_EMAIL,
      passwordHash,
      name: TEST_NAME,
      onboardingCompletedAt: daysAgo(HISTORY_DAYS),
    })
    .returning({ id: schema.users.id });
  const userId = user.id;

  await db.insert(schema.profiles).values({
    userId,
    startingWeight: "92.4",
    weightUnit: "kg",
    goalType: "lose_weight",
    goalTargetMetricKey: "weight",
    goalTargetValue: "80",
    milestoneTargetValue: "85",
    dailyCalorieTarget: "2200",
    dailyStepsTarget: "8000",
  });

  const definitions = await db
    .select({ id: schema.metricDefinitions.id, key: schema.metricDefinitions.key })
    .from(schema.metricDefinitions);
  const defByKey = new Map(definitions.map((d) => [d.key, d.id]));
  function metricId(key: string) {
    const id = defByKey.get(key);
    if (!id) throw new Error(`Missing metric definition: ${key}`);
    return id;
  }

  console.log("Enabling dashboard cards...");
  const trackedKeys = ["weight", "steps", "calories", "protein", "carbs", "fat", "sleep_hours"];
  await db.insert(schema.userTrackedMetrics).values(
    trackedKeys.map((key) => ({ userId, metricDefinitionId: metricId(key) }))
  );

  console.log("Seeding weight entries...");
  const weightStart = 92.4;
  const weightEnd = 82;
  const weightEntries: (typeof schema.metricEntries.$inferInsert)[] = [];
  for (let d = HISTORY_DAYS; d >= 0; d--) {
    if (chance(0.15)) continue;
    const progress = (HISTORY_DAYS - d) / HISTORY_DAYS;
    const trend = weightStart + (weightEnd - weightStart) * progress;
    weightEntries.push({
      userId,
      metricDefinitionId: metricId("weight"),
      value: (trend + rand(-0.5, 0.5)).toFixed(1),
      loggedAt: daysAgo(d),
    });
  }
  for (const batch of chunk(weightEntries, 200)) {
    await db.insert(schema.metricEntries).values(batch);
  }

  console.log("Seeding steps entries...");
  const stepsEntries: (typeof schema.metricEntries.$inferInsert)[] = [];
  for (let d = HISTORY_DAYS; d >= 0; d--) {
    if (chance(0.1)) continue;
    stepsEntries.push({
      userId,
      metricDefinitionId: metricId("steps"),
      value: String(randInt(4000, 12000)),
      loggedAt: daysAgo(d),
    });
  }
  for (const batch of chunk(stepsEntries, 200)) {
    await db.insert(schema.metricEntries).values(batch);
  }

  console.log("Seeding sleep entries...");
  const sleepEntries: (typeof schema.metricEntries.$inferInsert)[] = [];
  for (let d = HISTORY_DAYS; d >= 0; d--) {
    if (chance(0.1)) continue;
    sleepEntries.push({
      userId,
      metricDefinitionId: metricId("sleep_hours"),
      value: rand(5.5, 8.5).toFixed(1),
      loggedAt: daysAgo(d),
    });
  }
  for (const batch of chunk(sleepEntries, 200)) {
    await db.insert(schema.metricEntries).values(batch);
  }

  console.log("Seeding food entries...");
  const foodEntries: (typeof schema.metricEntries.$inferInsert)[] = [];
  for (let d = FOOD_HISTORY_DAYS; d >= 0; d--) {
    if (chance(0.15)) continue;
    const meals = randInt(2, 3);
    for (let m = 0; m < meals; m++) {
      const loggedAt = new Date(daysAgo(d).getTime() + m * 4 * 60 * 60 * 1000);
      foodEntries.push(
        {
          userId,
          metricDefinitionId: metricId("calories"),
          value: String(randInt(450, 850)),
          loggedAt,
        },
        {
          userId,
          metricDefinitionId: metricId("protein"),
          value: String(randInt(20, 45)),
          loggedAt,
        },
        {
          userId,
          metricDefinitionId: metricId("carbs"),
          value: String(randInt(30, 80)),
          loggedAt,
        },
        {
          userId,
          metricDefinitionId: metricId("fat"),
          value: String(randInt(10, 35)),
          loggedAt,
        }
      );
    }
  }
  for (const batch of chunk(foodEntries, 200)) {
    await db.insert(schema.metricEntries).values(batch);
  }

  console.log("Seeding body measurements...");
  const measurementStart: Record<MeasurementType, number> = {
    chest: 104,
    waist: 98,
    hips: 106,
    shoulders: 118,
    biceps: 36,
    thigh: 62,
    calf: 40,
    neck: 40,
  };
  const measurementDelta: Record<MeasurementType, number> = {
    chest: 2,
    waist: -8,
    hips: -6,
    shoulders: 3,
    biceps: 1.5,
    thigh: -3,
    calf: 0.5,
    neck: -1,
  };
  const measurementRows: (typeof schema.bodyMeasurements.$inferInsert)[] = [];
  for (let d = HISTORY_DAYS; d >= 0; d -= 14) {
    const progress = (HISTORY_DAYS - d) / HISTORY_DAYS;
    for (const type of schema.MEASUREMENT_TYPES) {
      const value = measurementStart[type] + measurementDelta[type] * progress + rand(-0.3, 0.3);
      measurementRows.push({
        userId,
        type,
        value: value.toFixed(1),
        loggedAt: daysAgo(d),
      });
    }
  }
  for (const batch of chunk(measurementRows, 200)) {
    await db.insert(schema.bodyMeasurements).values(batch);
  }

  console.log("Uploading placeholder progress photos...");
  const viewColors: Record<ProgressPhotoView, string> = {
    front: "#2563eb",
    side: "#7c3aed",
    back: "#059669",
  };
  for (let d = HISTORY_DAYS; d >= 0; d -= 30) {
    const takenAt = daysAgo(d);
    const dateLabel = takenAt.toLocaleDateString("da-DK");
    for (const view of schema.PROGRESS_PHOTO_VIEWS) {
      const svg = placeholderPhotoSvg(`${view} — ${dateLabel}`, viewColors[view]);
      const pathname = `${userId}/${dayKey(takenAt)}-${view}-${crypto.randomUUID()}.svg`;
      await put(pathname, svg, { access: "private", contentType: "image/svg+xml" });
      await db.insert(schema.progressPhotos).values({
        userId,
        view,
        pathname,
        contentType: "image/svg+xml",
        takenAt,
      });
    }
  }

  console.log("Creating workout programmes...");
  const systemExercises = await db
    .select({ id: schema.exercises.id, name: schema.exercises.name })
    .from(schema.exercises)
    .where(eq(schema.exercises.isSystem, true));
  const exerciseByName = new Map(systemExercises.map((row) => [row.name, row.id]));
  function exerciseId(name: string) {
    const id = exerciseByName.get(name);
    if (!id) throw new Error(`Missing system exercise: ${name}`);
    return id;
  }

  const [programmeA] = await db
    .insert(schema.programmes)
    .values({ userId, name: "Fuld krop A", description: "Push-fokuseret helkropsprogram" })
    .returning({ id: schema.programmes.id });
  const [programmeB] = await db
    .insert(schema.programmes)
    .values({ userId, name: "Fuld krop B", description: "Pull-fokuseret helkropsprogram" })
    .returning({ id: schema.programmes.id });

  const programmeAPlan = [
    { name: "Barbell Back Squat", sets: 3, targetReps: "6-8", startWeight: 60 },
    { name: "Barbell Bench Press", sets: 3, targetReps: "6-8", startWeight: 50 },
    { name: "Barbell Row", sets: 3, targetReps: "8-10", startWeight: 45 },
    { name: "Overhead Press", sets: 3, targetReps: "6-8", startWeight: 30 },
    { name: "Plank", sets: 3, targetReps: "45s", startWeight: null },
  ];
  const programmeBPlan = [
    { name: "Conventional Deadlift", sets: 3, targetReps: "5", startWeight: 70 },
    { name: "Incline Dumbbell Press", sets: 3, targetReps: "8-10", startWeight: 20 },
    { name: "Pull-Up", sets: 3, targetReps: "6-10", startWeight: null },
    { name: "Dumbbell Shoulder Press", sets: 3, targetReps: "8-10", startWeight: 16 },
    { name: "Hanging Leg Raise", sets: 3, targetReps: "10-12", startWeight: null },
  ];

  async function insertProgrammeExercises(programmeId: string, plan: typeof programmeAPlan) {
    const [day] = await db
      .insert(schema.programmeDays)
      .values({ programmeId, name: "Dag 1", orderIndex: 0 })
      .returning({ id: schema.programmeDays.id });

    await db.insert(schema.programmeExercises).values(
      plan.map((exercise, index) => ({
        dayId: day.id,
        exerciseId: exerciseId(exercise.name),
        orderIndex: index,
        sets: exercise.sets,
        targetReps: exercise.targetReps,
        targetWeight: exercise.startWeight !== null ? String(exercise.startWeight) : null,
      }))
    );
    const inserted = await db
      .select({ id: schema.programmeExercises.id, orderIndex: schema.programmeExercises.orderIndex })
      .from(schema.programmeExercises)
      .where(eq(schema.programmeExercises.dayId, day.id))
      .orderBy(asc(schema.programmeExercises.orderIndex));
    return {
      dayId: day.id,
      exercises: plan.map((exercise, index) => ({
        ...exercise,
        programmeExerciseId: inserted[index].id,
      })),
    };
  }

  const programmeADay = await insertProgrammeExercises(programmeA.id, programmeAPlan);
  const programmeBDay = await insertProgrammeExercises(programmeB.id, programmeBPlan);

  console.log("Seeding workout sessions...");
  const sessionRows: (typeof schema.workoutSessions.$inferInsert & { id: string })[] = [];
  const setRows: (typeof schema.workoutSessionSets.$inferInsert)[] = [];
  let toggle = 0;
  for (let d = HISTORY_DAYS; d >= 0; d -= randInt(2, 3)) {
    const useA = toggle % 2 === 0;
    toggle++;
    const exercisesForSession = useA ? programmeADay.exercises : programmeBDay.exercises;
    const programmeId = useA ? programmeA.id : programmeB.id;
    const programmeDayId = useA ? programmeADay.dayId : programmeBDay.dayId;

    const sessionId = crypto.randomUUID();
    const startedAt = daysAgo(d);
    const progress = (HISTORY_DAYS - d) / HISTORY_DAYS;

    sessionRows.push({
      id: sessionId,
      userId,
      programmeId,
      programmeDayId,
      startedAt,
      durationMinutes: randInt(40, 70),
    });

    for (const exercise of exercisesForSession) {
      for (let setIndex = 0; setIndex < exercise.sets; setIndex++) {
        let weight: string | null = null;
        if (exercise.startWeight !== null) {
          const progressed = exercise.startWeight * (1 + 0.35 * progress) + rand(-1, 1);
          weight = (Math.round(progressed / 1.25) * 1.25).toFixed(2);
        }
        const reps = exercise.startWeight !== null ? randInt(5, 10) : randInt(8, 15);
        setRows.push({
          id: crypto.randomUUID(),
          sessionId,
          programmeExerciseId: exercise.programmeExerciseId,
          setIndex,
          reps,
          weight,
        });
      }
    }
  }
  for (const batch of chunk(sessionRows, 200)) {
    await db.insert(schema.workoutSessions).values(batch);
  }
  for (const batch of chunk(setRows, 200)) {
    await db.insert(schema.workoutSessionSets).values(batch);
  }

  console.log("\nDone! Test user ready:");
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log(`  ${weightEntries.length} weight, ${stepsEntries.length} steps, ${sleepEntries.length} sleep entries`);
  console.log(`  ${foodEntries.length / 4} meals logged`);
  console.log(`  ${measurementRows.length / schema.MEASUREMENT_TYPES.length} measurement sessions`);
  console.log(`  ${sessionRows.length} workout sessions across 2 programmes`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
