import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const muscleGroupEnum = pgEnum("exercise_muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "cardio",
  "full_body",
  "other",
]);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    muscleGroup: muscleGroupEnum("muscle_group").notNull(),
    equipment: text("equipment"),
    notes: text("notes"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.name)]
);
