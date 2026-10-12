import { pgTable, uuid, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { programmes } from "./programmes";

export const programmeShareStatusEnum = pgEnum("programme_share_status", [
  "pending",
  "accepted",
  "declined",
]);

export const programmeShares = pgTable(
  "programme_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programmeId: uuid("programme_id")
      .notNull()
      .references(() => programmes.id, { onDelete: "cascade" }),
    sharedByUserId: uuid("shared_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharedWithUserId: uuid("shared_with_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: programmeShareStatusEnum("status").notNull().default("pending"),
    // The copy created in the recipient's account once they accept — kept
    // for reference, not used to drive any cascade behaviour.
    resultingProgrammeId: uuid("resulting_programme_id").references(
      () => programmes.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    respondedAt: timestamp("responded_at"),
  },
  (table) => [
    // "Shares waiting on me" / "shares I've sent" lookups.
    index("programme_shares_recipient_status_idx").on(
      table.sharedWithUserId,
      table.status
    ),
    index("programme_shares_sender_idx").on(
      table.sharedByUserId,
      table.createdAt
    ),
  ]
);
