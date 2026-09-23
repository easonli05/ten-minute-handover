import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const classes = pgTable("classes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  level: text("level"),
  days: jsonb("days").$type<string[]>().notNull().default([]),
  startTime: text("start_time"),
  students: jsonb("students").$type<string[]>().notNull().default([]),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The syllabus, ordered per class.
export const units = pgTable("units", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  classId: text("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
});

// One row per class actually taught. Unique on (classId, date) so logging the
// same class twice in a day upserts instead of creating a second row.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    covered: text("covered"),
    stuck: text("stuck"),
    nextOpener: text("next_opener"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_class_id_date_unique").on(table.classId, table.date),
  ],
);

// Observations caught in or after class; separate lifecycle from sessions —
// they stay open across several classes until ticked off (see
// docs/decisions.md, 2026-09-21). `sessionId` is set only for the optional
// "watch for next time" note attached directly to a log-sheet submission —
// it links that one note to the session it was saved with, so resubmitting
// the same day's log (or retrying after a failure) updates that one
// attached note instead of piling up a duplicate. A "Catch a note" entry
// (the separate, freestanding capture path) always has `sessionId: null`
// and is unaffected — nothing here changes its accumulate-until-ticked-off
// behavior. The partial unique index enforces "at most one attached note
// per session" only where sessionId is set.
export const notes = pgTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, {
      onDelete: "cascade",
    }),
    who: text("who"),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notes_session_id_unique")
      .on(table.sessionId)
      .where(sql`${table.sessionId} is not null`),
  ],
);
