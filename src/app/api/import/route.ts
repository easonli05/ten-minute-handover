import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, notes, sessions, units } from "@/db/schema";
import { assertAuthenticated } from "@/lib/auth-server";
import { validateExportPayload } from "@/lib/export-format";

// Import replaces everything — this is a restore, not a merge. "I want to
// be able to leave" (the brief's words) means a clean escape hatch, and a
// merge would need conflict rules the brief never asked for. Deletes go in
// FK-safe order (children before classes), inserts the reverse.
export async function POST(request: Request) {
  await assertAuthenticated();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validation = validateExportPayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { classes: importClasses, units: importUnits, sessions: importSessions, notes: importNotes } =
    validation.data;

  try {
    await db.delete(notes);
    await db.delete(sessions);
    await db.delete(units);
    await db.delete(classes);

    if (importClasses.length > 0) {
      await db.insert(classes).values(
        importClasses.map((c) => ({ ...c, createdAt: new Date(c.createdAt) })),
      );
    }
    if (importUnits.length > 0) {
      await db.insert(units).values(importUnits);
    }
    if (importSessions.length > 0) {
      await db.insert(sessions).values(
        importSessions.map((s) => ({ ...s, createdAt: new Date(s.createdAt) })),
      );
    }
    if (importNotes.length > 0) {
      await db.insert(notes).values(
        importNotes.map((n) => ({ ...n, createdAt: new Date(n.createdAt) })),
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          "Import failed partway through — the database may be in a mixed state. Check server logs and consider importing again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    imported: {
      classes: importClasses.length,
      units: importUnits.length,
      sessions: importSessions.length,
      notes: importNotes.length,
    },
  });
}
