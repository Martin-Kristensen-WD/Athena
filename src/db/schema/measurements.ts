import { pgTable, uuid, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const MEASUREMENT_TYPES = [
  "chest",
  "waist",
  "hips",
  "shoulders",
  "biceps",
  "thigh",
  "calf",
  "neck",
] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: MEASUREMENT_TYPES }).notNull(),
    value: numeric("value").notNull(),
    loggedAt: timestamp("logged_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("body_measurements_user_logged_idx").on(table.userId, table.loggedAt),
  ]
);

export const PROGRESS_PHOTO_VIEWS = ["front", "side", "back"] as const;

export type ProgressPhotoView = (typeof PROGRESS_PHOTO_VIEWS)[number];

export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    view: text("view", { enum: PROGRESS_PHOTO_VIEWS }).notNull(),
    pathname: text("pathname").notNull(),
    contentType: text("content_type").notNull(),
    takenAt: timestamp("taken_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("progress_photos_user_taken_idx").on(table.userId, table.takenAt),
  ]
);
