// Integration tests against a real Postgres — the unique-constraint /
// onConflictDoUpdate behavior these cover can't be meaningfully faked with a
// mock. Requires DATABASE_URL to point at a disposable database with the
// schema already pushed (`npm run db:push`); skipped entirely otherwise so
// `npm test` still passes in an environment with no database configured.
// See README's "Local setup" for how to point this at a local Postgres.
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgDb } from "./pg-client";
import { classes, sessions } from "./schema";

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
});
