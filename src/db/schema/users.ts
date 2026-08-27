import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  startingWeight: numeric("starting_weight"),
  weightUnit: text("weight_unit", { enum: ["kg", "lb"] })
    .notNull()
    .default("kg"),
  goalType: text("goal_type", {
    enum: ["lose_weight", "gain_muscle", "maintain"],
  }).notNull(),
  goalTargetMetricKey: text("goal_target_metric_key"),
  goalTargetValue: numeric("goal_target_value"),
  goalTargetDate: date("goal_target_date"),
  milestoneTargetValue: numeric("milestone_target_value"),
  dailyCalorieTarget: numeric("daily_calorie_target"),
  dailyStepsTarget: numeric("daily_steps_target"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
