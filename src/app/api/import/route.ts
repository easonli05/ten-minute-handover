import { NextResponse } from "next/server";
import { db } from "@/db";
import { runAtomically } from "@/db/atomic";
import { classes, notes, sessions, units } from "@/db/schema";
import { assertAuthenticated } from "@/lib/auth-server";
import { validateExportPayload } from "@/lib/export-format";

// Import replaces everything — this is a restore, not a merge. "I want to
// be able to leave" (the brief's words) means a clean escape hatch, and a
// merge would need conflict rules the brief never asked for. Deletes and
// inserts run as one atomic write (runAtomically, see src/db/atomic.ts and
// docs/decisions.md): a malformed payload that gets past validation and
// fails partway through an insert (a duplicate id or FK violation
// validation didn't catch) used to leave the deletes applied but the
// inserts only partly done — wiping existing data and replacing it with a
// broken partial import. Now either the whole replace lands or none of it
// does, so existing data survives any import that doesn't fully succeed.
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
    await runAtomically(db, (h) => {
      const queries: unknown[] = [
        h.delete(notes),
        h.delete(sessions),
        h.delete(units),
        h.delete(classes),
      ];

      if (importClasses.length > 0) {
        queries.push(
          h.insert(classes).values(
            importClasses.map((c) => ({ ...c, createdAt: new Date(c.createdAt) })),
          ),
        );
      }
      if (importUnits.length > 0) {
        queries.push(h.insert(units).values(importUnits));
      }
      if (importSessions.length > 0) {
        queries.push(
          h.insert(sessions).values(
            importSessions.map((s) => ({ ...s, createdAt: new Date(s.createdAt) })),
          ),
        );
      }
      if (importNotes.length > 0) {
        queries.push(
          h.insert(notes).values(
            importNotes.map((n) => ({ ...n, createdAt: new Date(n.createdAt) })),
          ),
        );
      }

      return queries;
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error:
          "Import failed and was rolled back — your existing data is unchanged. Check server logs for details.",
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
