import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { programmes, programmeDays, programmeExercises } from "./programmes";
import { exercises } from "./exercises";

export const workoutSessionStatusEnum = pgEnum("workout_session_status", [
  "active",
  "completed",
]);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").references(() => programmes.id, {
      onDelete: "set null",
    }),
    programmeDayId: uuid("programme_day_id").references(() => programmeDays.id, {
      onDelete: "set null",
    }),
    // "completed" by default so historical rows and the manual "log a past
    // workout" path stay valid without a backfill. A live session is created
    // as "active" and flipped to "completed" when the user finishes it.
    status: workoutSessionStatusEnum("status").notNull().default("completed"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Find the user's in-progress session (there is at most one).
    index("workout_sessions_user_status_idx").on(
      table.userId,
      table.status,
      table.startedAt
    ),
    // Sessions list + dashboard "latest session" lookups.
    index("workout_sessions_user_started_idx").on(
      table.userId,
      table.startedAt
    ),
  ]
);

export const workoutSessionSets = pgTable(
  "workout_session_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    programmeExerciseId: uuid("programme_exercise_id").references(
      () => programmeExercises.id,
      { onDelete: "set null" }
    ),
    // Set directly for freeform (no-programme) sessions, where there is no
    // programmeExercise to hang the exercise off of.
    exerciseId: uuid("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    weight: numeric("weight"),
    // Reps in reserve logged for the set (0 = to failure). Null until entered.
    rir: integer("rir"),
    // Null while a live-session set is still just planned; stamped when the
    // user marks the set done (this is what triggers the rest timer).
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("workout_session_sets_session_idx").on(table.sessionId),
  ]
);

// A free-text note the user attaches to one exercise for the duration of a
// single session — jotted mid-workout, surfaced again on the session recap.
// Hangs off the same programmeExercise / exercise ref split as the sets.
export const workoutSessionExerciseNotes = pgTable(
  "workout_session_exercise_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    programmeExerciseId: uuid("programme_exercise_id").references(
      () => programmeExercises.id,
      { onDelete: "cascade" }
    ),
    exerciseId: uuid("exercise_id").references(() => exercises.id, {
      onDelete: "cascade",
    }),
    note: text("note").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("workout_session_exercise_notes_session_idx").on(table.sessionId),
  ]
);
