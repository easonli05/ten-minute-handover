"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notes, sessions, units } from "@/db/schema";
import { assertAuthenticated } from "@/lib/auth-server";

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

  revalidatePath("/");
  return { error: null, success: true };
}

export async function toggleNoteAction(noteId: string, done: boolean) {
  await assertAuthenticated();
  await db.update(notes).set({ done }).where(eq(notes.id, noteId));
  revalidatePath("/");
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

  await db.insert(notes).values({ classId, who: who || null, text });

  revalidatePath("/");
  return { error: null, success: true };
}
