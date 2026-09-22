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

// Observations caught in or after class; separate lifecycle from sessions.
export const notes = pgTable("notes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  classId: text("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  who: text("who"),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
