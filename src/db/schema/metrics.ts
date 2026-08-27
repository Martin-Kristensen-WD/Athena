import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  boolean,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const metricDefinitions = pgTable("metric_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  unit: text("unit").notNull(),
  dataType: text("data_type", {
    enum: ["number", "integer", "duration", "boolean"],
  }).notNull(),
  icon: text("icon"),
  isSystem: boolean("is_system").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userTrackedMetrics = pgTable(
  "user_tracked_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metricDefinitionId: uuid("metric_definition_id")
      .notNull()
      .references(() => metricDefinitions.id, { onDelete: "cascade" }),
    isEnabled: boolean("is_enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    targetValue: numeric("target_value"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.metricDefinitionId)]
);

export const metricEntries = pgTable(
  "metric_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metricDefinitionId: uuid("metric_definition_id")
      .notNull()
      .references(() => metricDefinitions.id, { onDelete: "cascade" }),
    value: numeric("value").notNull(),
    loggedAt: timestamp("logged_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("metric_entries_user_metric_logged_idx").on(
      table.userId,
      table.metricDefinitionId,
      table.loggedAt
    ),
  ]
);
