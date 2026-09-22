import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, notes, sessions, units } from "@/db/schema";
import { assertAuthenticated } from "@/lib/auth-server";

export async function GET() {
  await assertAuthenticated();

  const [allClasses, allUnits, allSessions, allNotes] = await Promise.all([
    db.select().from(classes),
    db.select().from(units),
    db.select().from(sessions),
    db.select().from(notes),
  ]);

  const filename = `ten-minute-handover-export-${new Date().toISOString().slice(0, 10)}.json`;

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      classes: allClasses,
      units: allUnits,
      sessions: allSessions,
      notes: allNotes,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    },
  );
}
