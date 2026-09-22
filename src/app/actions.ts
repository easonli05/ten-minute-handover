"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
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
} | null;

// Lets the log sheet load whatever is already on file for a given class+date
// — called on open (for today) and whenever the date field changes — so
// re-saving never silently blanks fields the teacher didn't mean to touch.
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

  return {
    covered: row.covered ?? "",
    stuck: row.stuck ?? "",
    nextOpener: row.nextOpener ?? "",
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
    await db
      .insert(sessions)
      .values({
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
      });

    if (typeof finishUnitId === "string" && finishUnitId) {
      await db.update(units).set({ done: true }).where(eq(units.id, finishUnitId));
    }

    if (watchText) {
      await db.insert(notes).values({
        classId,
        who: watchWho || null,
        text: watchText,
      });
    }
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

    // Sequential, not a transaction — the neon-http driver's transaction
    // support doesn't fit a single-user app well enough to be worth the
    // complexity; see docs/decisions.md.
    for (const id of toDelete) {
      await db.delete(units).where(eq(units.id, id));
    }
    for (const u of toUpdate) {
      await db
        .update(units)
        .set({ title: u.title, position: u.position })
        .where(eq(units.id, u.id));
    }
    if (toInsert.length > 0) {
      await db.insert(units).values(
        toInsert.map((u) => ({
          classId,
          title: u.title,
          position: u.position,
          done: false,
        })),
      );
    }
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
