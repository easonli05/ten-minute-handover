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
  // with .returning() to get the *actually persisted* row's id (not a
  // pre-guessed one — see below), then a batch for the optional unit-finish
  // and note upsert, the note targeting the partial unique index on
  // notes.sessionId.
  async function saveSession(date: string, text: string) {
    const [sessionRow] = await db
      .insert(sessions)
      .values({ classId, date, covered: "x", stuck: null, nextOpener: null })
      .onConflictDoUpdate({
        target: [sessions.classId, sessions.date],
        set: { covered: "x", stuck: null, nextOpener: null },
      })
      .returning({ id: sessions.id });
    const sessionId = sessionRow.id;

    await runAtomically(db, (h) => [
      h
        .insert(notes)
        .values({ classId, sessionId, who: "Mei", text })
        .onConflictDoUpdate({
          target: notes.sessionId,
          targetWhere: sql`${notes.sessionId} is not null`,
          set: { who: "Mei", text },
        }),
    ]);
    return sessionId;
  }

  it("upserts a session and its attached note atomically, and re-running updates the note instead of duplicating it (regression: F5, retry duplicated the watch-for note)", async () => {
    const date = "2026-09-22";
    const sessionId = await saveSession(date, "first attempt");
    const sessionId2 = await saveSession(date, "retry after an apparent failure");
    expect(sessionId2).toBe(sessionId); // same row, not a second one

    const attached = await db.select().from(notes).where(eq(notes.sessionId, sessionId));
    expect(attached).toHaveLength(1);
    expect(attached[0].text).toBe("retry after an apparent failure");

    const sessionRows = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    expect(sessionRows).toHaveLength(1);
  });

  // Regression coverage for Codex's F8 finding (GitHub issue #1): two
  // overlapping requests both saving the *first* session for the same
  // class+date used to each read "no row yet" and mint different ids; the
  // loser's session upsert lost the conflict (kept the winner's id) but its
  // note insert still targeted the id it had minted itself, which was
  // never actually persisted — a foreign-key violation, a false failure
  // for an entirely valid concurrent save. Getting the id from
  // .returning() instead of a pre-read fixes this: both requests always
  // reference whichever row actually exists after their own upsert.
  it("two overlapping first-time saves for the same class+date both succeed, with exactly one session and one note (regression: F8, false failure on overlapping saves)", async () => {
    const date = "2026-09-23";
    const [idA, idB] = await Promise.all([
      saveSession(date, "observation A"),
      saveSession(date, "observation B"),
    ]);
    expect(idA).toBe(idB); // both resolved to the same actual row

    const sessionRows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.classId, classId), eq(sessions.date, date)));
    expect(sessionRows).toHaveLength(1);

    const noteRows = await db.select().from(notes).where(eq(notes.sessionId, idA));
    expect(noteRows).toHaveLength(1);
    expect(["observation A", "observation B"]).toContain(noteRows[0].text); // whichever won, not both/neither
  });
});
