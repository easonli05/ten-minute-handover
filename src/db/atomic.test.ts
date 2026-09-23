// Regression coverage for three of Codex's findings on commit e550072, all
// with the same root cause: logSessionAction, updateSyllabusAction, and
// /api/import ran several dependent writes as separate sequential
// statements, so a failure partway through left committed partial state —
// a finished unit with no saved note, a deleted completed unit with no
// replacement, a wiped database with a failed reimport — while reporting
// plain failure, giving no indication anything had actually changed.
//
// The fix (runAtomically, ./atomic.ts) batches these into one atomic write.
// Production (neon-http) uses db.batch(); node-postgres — the only driver
// this sandbox can run locally, see docs/decisions.md — has no batch(), so
// runAtomically falls back to a real interactive db.transaction() here,
// exercising the same code path with an equivalent atomicity guarantee.
// What this doesn't cover: neon-http's actual HTTP-transaction behavior
// under db.batch() against a real Neon endpoint, which needs a Neon account
// this sandbox doesn't have — see the fix-batch report on the coordination
// issue for what to independently re-verify.
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAtomically } from "./atomic";
import { createPgDb } from "./pg-client";
import { classes, notes, sessions, units } from "./schema";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("runAtomically", () => {
  const { db, pool } = createPgDb(databaseUrl!);
  const classId = randomUUID();

  beforeAll(async () => {
    await db.insert(classes).values({
      id: classId,
      name: "Test class (atomic.test.ts)",
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

  it("commits every query when all succeed", async () => {
    const u1 = randomUUID();
    const u2 = randomUUID();

    await runAtomically(db, (h) => [
      h.insert(units).values({ id: u1, classId, position: 0, title: "Unit A", done: false }),
      h.insert(units).values({ id: u2, classId, position: 1, title: "Unit B", done: false }),
    ]);

    const rows = await db.select().from(units).where(eq(units.classId, classId));
    expect(rows.map((r) => r.id).sort()).toEqual([u1, u2].sort());
  });

  it("rolls back every query in the batch if any one of them fails (proves the atomicity the F1/F2/F3 fixes depend on)", async () => {
    const survivingUnitId = randomUUID();
    await db.insert(units).values({ id: survivingUnitId, classId, position: 5, title: "Should survive", done: true });

    const newUnitId = randomUUID();
    // notes.sessionId has a foreign key to sessions.id — "does-not-exist"
    // deterministically violates it, forcing this batch to fail after its
    // first statement (the unit insert) would otherwise have succeeded.
    await expect(
      runAtomically(db, (h) => [
        h.insert(units).values({ id: newUnitId, classId, position: 6, title: "Should NOT survive", done: false }),
        h.insert(notes).values({ classId, sessionId: "does-not-exist", text: "forces an FK violation" }),
      ]),
    ).rejects.toThrow();

    const survivingRows = await db.select().from(units).where(eq(units.id, survivingUnitId));
    expect(survivingRows).toHaveLength(1); // untouched, as it always should have been

    const shouldNotExist = await db.select().from(units).where(eq(units.id, newUnitId));
    expect(shouldNotExist).toHaveLength(0); // NOT partially committed — this is the actual regression check
  });

  it("a no-op (empty query list) does nothing and does not throw", async () => {
    await expect(runAtomically(db, () => [])).resolves.toBeUndefined();
  });

  // Exercises the exact shape logSessionAction now uses: a session upsert
  // plus a note upsert targeting the partial unique index on
  // notes.sessionId, in the same atomic write, with the session's id
  // resolved up front (see actions.ts's comment on why — batched queries
  // can't feed one statement's result into another).
  it("upserts a session and its attached note atomically, and re-running with the same sessionId updates the note instead of duplicating it (regression: F5, retry duplicated the watch-for note)", async () => {
    const date = "2026-09-22";
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.classId, classId), eq(sessions.date, date)));
    const sessionId = existing[0]?.id ?? randomUUID();

    const save = (text: string) =>
      runAtomically(db, (h) => [
        h
          .insert(sessions)
          .values({ id: sessionId, classId, date, covered: "x", stuck: null, nextOpener: null })
          .onConflictDoUpdate({
            target: [sessions.classId, sessions.date],
            set: { covered: "x", stuck: null, nextOpener: null },
          }),
        h
          .insert(notes)
          .values({ classId, sessionId, who: "Mei", text })
          .onConflictDoUpdate({
            target: notes.sessionId,
            targetWhere: sql`${notes.sessionId} is not null`,
            set: { who: "Mei", text },
          }),
      ]);

    await save("first attempt");
    await save("retry after an apparent failure"); // same sessionId — must update, not duplicate

    const attached = await db.select().from(notes).where(eq(notes.sessionId, sessionId));
    expect(attached).toHaveLength(1);
    expect(attached[0].text).toBe("retry after an apparent failure");

    const sessionRows = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(sessionRows).toHaveLength(1);
  });
});
