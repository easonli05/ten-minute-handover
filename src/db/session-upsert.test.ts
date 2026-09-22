// Integration tests against a real Postgres — the unique-constraint /
// onConflictDoUpdate behavior these cover can't be meaningfully faked with a
// mock. Requires DATABASE_URL to point at a disposable database with the
// schema already pushed (`npm run db:push`); skipped entirely otherwise so
// `npm test` still passes in an environment with no database configured.
// See README's "Local setup" for how to point this at a local Postgres.
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgDb } from "./pg-client";
import { classes, sessions, units } from "./schema";
import { toTodayClass } from "@/lib/today-class";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("sessions unique-constraint upsert", () => {
  const { db, pool } = createPgDb(databaseUrl!);
  const classId = randomUUID();
  const today = "2026-09-22";

  beforeAll(async () => {
    await db.insert(classes).values({
      id: classId,
      name: "Test class (session-upsert.test.ts)",
      level: null,
      days: [],
      startTime: null,
      students: [],
    });
  });

  afterAll(async () => {
    await db.delete(classes).where(eq(classes.id, classId)); // cascades
    await pool.end();
  });

  it("logging the same class twice on one day edits the row instead of duplicating it", async () => {
    await db
      .insert(sessions)
      .values({
        classId,
        date: today,
        covered: "first pass",
        stuck: "articles",
        nextOpener: "opener A",
      })
      .onConflictDoUpdate({
        target: [sessions.classId, sessions.date],
        set: { covered: "first pass", stuck: "articles", nextOpener: "opener A" },
      });

    await db
      .insert(sessions)
      .values({
        classId,
        date: today,
        covered: "second pass",
        stuck: null,
        nextOpener: "opener B",
      })
      .onConflictDoUpdate({
        target: [sessions.classId, sessions.date],
        set: { covered: "second pass", stuck: null, nextOpener: "opener B" },
      });

    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.classId, classId), eq(sessions.date, today)));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      covered: "second pass",
      stuck: null,
      nextOpener: "opener B",
    });
  });

  it("a lookup by class+date finds the existing session for prefill, and null for a date with none", async () => {
    const found = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.classId, classId), eq(sessions.date, today)))
      .limit(1);
    expect(found[0]?.nextOpener).toBe("opener B");

    const notFound = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.classId, classId), eq(sessions.date, "2020-01-01")))
      .limit(1);
    expect(notFound).toHaveLength(0);
  });

  // The two remaining "quietly ruin it" risks from build-brief.md section 5.
  // toTodayClass (src/lib/today-class.ts) is unit-tested for the selection
  // logic itself; what only a real database can confirm is that the actual
  // SQL query orders rows the way that logic assumes.
  it("the Today card always shows the most recent session's nextOpener", async () => {
    // A fresh class, independent of the same-day-upsert test above, so this
    // doesn't depend on test execution order.
    const freshClassId = randomUUID();
    await db.insert(classes).values({
      id: freshClassId,
      name: "Ordering test class",
      level: null,
      days: [],
      startTime: null,
      students: [],
    });

    await db.insert(sessions).values([
      { classId: freshClassId, date: "2026-08-01", nextOpener: "oldest" },
      { classId: freshClassId, date: "2026-08-20", nextOpener: "newest" },
      { classId: freshClassId, date: "2026-08-10", nextOpener: "also old, inserted out of order" },
    ]);

    const ordered = await db
      .select()
      .from(sessions)
      .where(eq(sessions.classId, freshClassId))
      .orderBy(desc(sessions.date), desc(sessions.createdAt));

    const [cls] = await db.select().from(classes).where(eq(classes.id, freshClassId));
    const result = toTodayClass(cls, ordered, [], []);
    expect(result.latestSession?.nextOpener).toBe("newest");

    await db.delete(classes).where(eq(classes.id, freshClassId)); // cascades
  });

  it("toggling a unit done advances the current-unit marker, as read back from the database", async () => {
    const [u1, u2, u3] = [randomUUID(), randomUUID(), randomUUID()];
    await db.insert(units).values([
      { id: u1, classId, position: 0, title: "Unit A", done: true },
      { id: u2, classId, position: 1, title: "Unit B", done: false },
      { id: u3, classId, position: 2, title: "Unit C", done: false },
    ]);

    const readOrdered = () =>
      db.select().from(units).where(eq(units.classId, classId)).orderBy(asc(units.position));

    const [cls] = await db.select().from(classes).where(eq(classes.id, classId));
    const before = toTodayClass(cls, [], await readOrdered(), []);
    expect(before.unit.current?.id).toBe(u2);

    await db.update(units).set({ done: true }).where(eq(units.id, u2));

    const after = toTodayClass(cls, [], await readOrdered(), []);
    expect(after.unit.current?.id).toBe(u3);
  });
});
