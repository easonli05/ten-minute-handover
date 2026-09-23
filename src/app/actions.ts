"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { runAtomically } from "@/db/atomic";
import { classes, notes, sessions, units } from "@/db/schema";
import { assertAuthenticated } from "@/lib/auth-server";
import { diffSyllabus, parseSyllabusText } from "@/lib/syllabus";

// A write failing (school wifi dropping mid-save, Neon hiccuping) must never
// crash the form the teacher is typing into — that's exactly how you lose a
// half-written note. Every action below catches its own DB errors and
// returns a message instead of letting the exception reach the client as an
// unhandled rejection / error boundary, which would unmount the form.
function toSaveError(err: unknown): string {
  console.error(err);
  return "Couldn't save — check your connection and try again. What you typed is still here.";
}

export type ExistingSessionFields = {
  covered: string;
  stuck: string;
  nextOpener: string;
  watchWho: string;
  watchText: string;
} | null;

// Lets the log sheet load whatever is already on file for a given class+date
// — called on open (for today) and whenever the date field changes — so
// re-saving never silently blanks fields the teacher didn't mean to touch.
// Also looks up the session's attached "watch for next time" note (if any),
// so reopening an already-logged day shows that note too, not just the
// three main fields — before this, resubmitting a day that already had a
// watch-for note attached had no way to show what was already there, which
// is how re-submitting the same text ended up creating a duplicate instead
// of updating it (see logSessionAction and docs/decisions.md).
export async function getSessionForDateAction(
  classId: string,
  date: string,
): Promise<ExistingSessionFields> {
  await assertAuthenticated();

  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.classId, classId), eq(sessions.date, date)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const noteRows = await db
    .select({ who: notes.who, text: notes.text })
    .from(notes)
    .where(eq(notes.sessionId, row.id))
    .limit(1);
  const note = noteRows[0];

  return {
    covered: row.covered ?? "",
    stuck: row.stuck ?? "",
    nextOpener: row.nextOpener ?? "",
    watchWho: note?.who ?? "",
    watchText: note?.text ?? "",
  };
}

export type LogSessionState = {
  error: string | null;
  success: boolean;
};

export async function logSessionAction(
  _prevState: LogSessionState,
  formData: FormData,
): Promise<LogSessionState> {
  await assertAuthenticated();

  const classId = String(formData.get("classId") ?? "");
  const date = String(formData.get("date") ?? "");
  const covered = String(formData.get("covered") ?? "").trim();
  const stuck = String(formData.get("stuck") ?? "").trim();
  const nextOpener = String(formData.get("nextOpener") ?? "").trim();
  const finishUnitId = formData.get("finishUnitId");
  const watchWho = String(formData.get("watchWho") ?? "").trim();
  const watchText = String(formData.get("watchText") ?? "").trim();

  if (!classId || !date) {
    return { error: "Missing class or date.", success: false };
  }

  if (!covered && !stuck && !nextOpener) {
    return {
      error: "Fill in at least one of the three fields.",
      success: false,
    };
  }

  try {
    // The session's id has to be known *before* building the atomic batch
    // below (batched queries can't feed one statement's result into
    // another — see src/db/atomic.ts), so it's resolved with a plain read
    // first: reuse the existing row's id if this class+date is already
    // logged, or mint a new one if not. Either way this is the same id the
    // upsert below will end up with, so the attached note (if any) can
    // target it directly in the same atomic write.
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.classId, classId), eq(sessions.date, date)))
      .limit(1);
    const sessionId = existing[0]?.id ?? crypto.randomUUID();

    await runAtomically(db, (h) => {
      const queries: unknown[] = [
        h
          .insert(sessions)
          .values({
            id: sessionId,
            classId,
            date,
            covered: covered || null,
            stuck: stuck || null,
            nextOpener: nextOpener || null,
          })
          .onConflictDoUpdate({
            target: [sessions.classId, sessions.date],
            set: {
              covered: covered || null,
              stuck: stuck || null,
              nextOpener: nextOpener || null,
            },
          }),
      ];

      if (typeof finishUnitId === "string" && finishUnitId) {
        queries.push(
          h.update(units).set({ done: true }).where(eq(units.id, finishUnitId)),
        );
      }

      // onConflictDoUpdate targets the partial unique index on
      // notes.sessionId (see src/db/schema.ts): resubmitting the same
      // session's watch-for text updates the one note already attached to
      // it instead of inserting a duplicate — this is what fixes both "a
      // failed save silently duplicates the note on retry" and "reopening
      // an already-logged day and resaving duplicates it" (same root
      // cause, no failure required). Leaving watchText blank on a resave
      // deliberately does *not* delete an already-attached note — notes
      // have their own done/not-done lifecycle (see docs/decisions.md,
      // 2026-09-21), and this field isn't its undo control.
      if (watchText) {
        queries.push(
          h
            .insert(notes)
            .values({
              classId,
              sessionId,
              who: watchWho || null,
              text: watchText,
            })
            .onConflictDoUpdate({
              target: notes.sessionId,
              // notes_session_id_unique (src/db/schema.ts) is a *partial*
              // unique index (`where session_id is not null`) — Postgres
              // only matches an ON CONFLICT target against an index whose
              // predicate is restated here exactly; without targetWhere it
              // fails at query time with "no unique or exclusion
              // constraint matching the ON CONFLICT specification" (caught
              // by src/db/atomic.test.ts before this ever ran for real).
              targetWhere: sql`${notes.sessionId} is not null`,
              set: { who: watchWho || null, text: watchText },
            }),
        );
      }

      return queries;
    });
  } catch (err) {
    return { error: toSaveError(err), success: false };
  }

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath(`/class/${classId}`);
  return { error: null, success: true };
}

export type ToggleResult = { ok: boolean; error?: string };

export async function toggleNoteAction(
  noteId: string,
  done: boolean,
): Promise<ToggleResult> {
  await assertAuthenticated();
  try {
    const [row] = await db
      .update(notes)
      .set({ done })
      .where(eq(notes.id, noteId))
      .returning({ classId: notes.classId });
    revalidatePath("/");
    revalidatePath("/review");
    if (row) revalidatePath(`/class/${row.classId}`);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't save that — try again." };
  }
}

export async function toggleUnitAction(
  unitId: string,
  done: boolean,
): Promise<ToggleResult> {
  await assertAuthenticated();
  try {
    const [row] = await db
      .update(units)
      .set({ done })
      .where(eq(units.id, unitId))
      .returning({ classId: units.classId });
    revalidatePath("/");
    revalidatePath("/review");
    if (row) revalidatePath(`/class/${row.classId}`);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't save that — try again." };
  }
}

export type SyllabusState = {
  error: string | null;
  success: boolean;
};

export async function updateSyllabusAction(
  classId: string,
  text: string,
): Promise<SyllabusState> {
  await assertAuthenticated();

  const titles = parseSyllabusText(text);

  try {
    const existing = await db
      .select({ id: units.id, title: units.title, done: units.done })
      .from(units)
      .where(eq(units.classId, classId));

    const { toDelete, toUpdate, toInsert } = diffSyllabus(existing, titles);

    // Atomic (see src/db/atomic.ts): previously these ran as separate
    // sequential statements, so a failure partway through — say, the
    // delete of a reworded unit succeeding but the matching insert of its
    // replacement then failing — permanently lost that unit's progress
    // even though the save reported failure. Batching them means the
    // delete/update/insert either all land or none do.
    await runAtomically(db, (h) => {
      const queries: unknown[] = [];
      for (const id of toDelete) {
        queries.push(h.delete(units).where(eq(units.id, id)));
      }
      for (const u of toUpdate) {
        queries.push(
          h
            .update(units)
            .set({ title: u.title, position: u.position })
            .where(eq(units.id, u.id)),
        );
      }
      if (toInsert.length > 0) {
        queries.push(
          h.insert(units).values(
            toInsert.map((u) => ({
              classId,
              title: u.title,
              position: u.position,
              done: false,
            })),
          ),
        );
      }
      return queries;
    });
  } catch (err) {
    return { error: toSaveError(err), success: false };
  }

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath(`/class/${classId}`);
  return { error: null, success: true };
}

export type UpdateClassState = {
  error: string | null;
  success: boolean;
};

export async function updateClassAction(
  _prevState: UpdateClassState,
  formData: FormData,
): Promise<UpdateClassState> {
  await assertAuthenticated();

  const classId = String(formData.get("classId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const days = String(formData.get("days") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const startTime = String(formData.get("startTime") ?? "").trim();
  const students = String(formData.get("students") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!classId || !name) {
    return { error: "A class needs at least a name.", success: false };
  }

  try {
    await db
      .update(classes)
      .set({ name, level: level || null, days, startTime: startTime || null, students })
      .where(eq(classes.id, classId));
  } catch (err) {
    return { error: toSaveError(err), success: false };
  }

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath(`/class/${classId}`);
  return { error: null, success: true };
}

export async function toggleArchiveAction(
  classId: string,
  archived: boolean,
): Promise<ToggleResult> {
  await assertAuthenticated();
  try {
    await db.update(classes).set({ archived }).where(eq(classes.id, classId));
    revalidatePath("/");
    revalidatePath("/review");
    revalidatePath(`/class/${classId}`);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't save that — try again." };
  }
}

export type AddNoteState = {
  error: string | null;
  success: boolean;
};

export async function addNoteAction(
  _prevState: AddNoteState,
  formData: FormData,
): Promise<AddNoteState> {
  await assertAuthenticated();

  const classId = String(formData.get("classId") ?? "");
  const who = String(formData.get("who") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (!classId || !text) {
    return { error: "Write something to catch.", success: false };
  }

  try {
    await db.insert(notes).values({ classId, who: who || null, text });
  } catch (err) {
    return { error: toSaveError(err), success: false };
  }

  revalidatePath("/");
  revalidatePath("/review");
  revalidatePath(`/class/${classId}`);
  return { error: null, success: true };
}
