import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { programmes, programmeExercises } from "./programmes";

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").references(() => programmes.id, {
    onDelete: "set null",
  }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    weight: numeric("weight"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("workout_session_sets_session_idx").on(table.sessionId),
  ]
);
