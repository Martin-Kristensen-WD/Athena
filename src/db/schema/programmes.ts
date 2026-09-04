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
import { exercises } from "./exercises";

export const programmes = pgTable("programmes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const programmeDays = pgTable(
  "programme_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programmeId: uuid("programme_id")
      .notNull()
      .references(() => programmes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("programme_days_programme_order_idx").on(
      table.programmeId,
      table.orderIndex
    ),
  ]
);

export const programmeExercises = pgTable(
  "programme_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayId: uuid("day_id")
      .notNull()
      .references(() => programmeDays.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull(),
    sets: integer("sets").notNull(),
    targetReps: text("target_reps").notNull(),
    targetWeight: numeric("target_weight"),
    restSeconds: integer("rest_seconds"),
    notes: text("notes"),
  },
  (table) => [
    index("programme_exercises_day_order_idx").on(
      table.dayId,
      table.orderIndex
    ),
  ]
);
