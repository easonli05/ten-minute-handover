import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { classes, notes, sessions, units } from "./schema";
import { todayAbbreviation, todayISO } from "@/lib/date";

export type TodayClass = {
  class: typeof classes.$inferSelect;
  latestSession: typeof sessions.$inferSelect | null;
  loggedToday: boolean;
  meetsToday: boolean;
  unit: {
    current: typeof units.$inferSelect | null;
    doneCount: number;
    total: number;
  };
  openNotes: (typeof notes.$inferSelect)[];
};

// N+1 per class is fine here — a single teacher has a handful of classes,
// not thousands.
export async function getTodayData(): Promise<TodayClass[]> {
  const allClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.archived, false));

  const today = todayAbbreviation();
  const todayDate = todayISO();

  const withData = await Promise.all(
    allClasses.map(async (cls) => {
      const [latestSessionRows, classUnits, openNoteRows] = await Promise.all(
        [
          db
            .select()
            .from(sessions)
            .where(eq(sessions.classId, cls.id))
            .orderBy(desc(sessions.date), desc(sessions.createdAt))
            .limit(1),
          db
            .select()
            .from(units)
            .where(eq(units.classId, cls.id))
            .orderBy(asc(units.position)),
          db
            .select()
            .from(notes)
            .where(and(eq(notes.classId, cls.id), eq(notes.done, false)))
            .orderBy(desc(notes.createdAt)),
        ],
      );

      const latestSession = latestSessionRows[0] ?? null;

      return {
        class: cls,
        latestSession,
        loggedToday: latestSession?.date === todayDate,
        meetsToday: cls.days.includes(today),
        unit: {
          current: classUnits.find((u) => !u.done) ?? null,
          doneCount: classUnits.filter((u) => u.done).length,
          total: classUnits.length,
        },
        openNotes: openNoteRows,
      };
    }),
  );

  // Stable sort: classes meeting today first, original order preserved
  // within each group.
  return withData
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const byToday = Number(b.row.meetsToday) - Number(a.row.meetsToday);
      return byToday !== 0 ? byToday : a.index - b.index;
    })
    .map(({ row }) => row);
}
