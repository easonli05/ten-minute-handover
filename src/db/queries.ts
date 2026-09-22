import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { classes, notes, sessions, units } from "./schema";
import { todayAbbreviation, todayISO } from "@/lib/date";
import { countRecurringStuck } from "@/lib/recurring-stuck";

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

function toTodayClass(
  cls: typeof classes.$inferSelect,
  classSessions: (typeof sessions.$inferSelect)[],
  classUnits: (typeof units.$inferSelect)[],
  openNoteRows: (typeof notes.$inferSelect)[],
): TodayClass {
  const today = todayAbbreviation();
  const todayDate = todayISO();
  const latestSession = classSessions[0] ?? null;

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
}

async function loadClassParts(classId: string) {
  const [classSessions, classUnits, openNoteRows] = await Promise.all([
    db
      .select()
      .from(sessions)
      .where(eq(sessions.classId, classId))
      .orderBy(desc(sessions.date), desc(sessions.createdAt)),
    db
      .select()
      .from(units)
      .where(eq(units.classId, classId))
      .orderBy(asc(units.position)),
    db
      .select()
      .from(notes)
      .where(and(eq(notes.classId, classId), eq(notes.done, false)))
      .orderBy(desc(notes.createdAt)),
  ]);
  return { classSessions, classUnits, openNoteRows };
}

// N+1 per class is fine here — a single teacher has a handful of classes,
// not thousands.
export async function getTodayData(): Promise<TodayClass[]> {
  const allClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.archived, false));

  const withData = await Promise.all(
    allClasses.map(async (cls) => {
      const { classSessions, classUnits, openNoteRows } = await loadClassParts(
        cls.id,
      );
      return toTodayClass(cls, classSessions, classUnits, openNoteRows);
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

export type ClassDetail = {
  today: TodayClass;
  units: (typeof units.$inferSelect)[];
  sessions: (typeof sessions.$inferSelect)[];
};

export async function getClassDetail(
  classId: string,
): Promise<ClassDetail | null> {
  const [cls] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  if (!cls) return null;

  const { classSessions, classUnits, openNoteRows } = await loadClassParts(
    classId,
  );

  return {
    today: toTodayClass(cls, classSessions, classUnits, openNoteRows),
    units: classUnits,
    sessions: classSessions,
  };
}

export type ReviewData = {
  pacing: {
    class: typeof classes.$inferSelect;
    doneCount: number;
    total: number;
    lastTaughtDate: string | null;
  }[];
  openNotesByClass: {
    class: typeof classes.$inferSelect;
    notes: (typeof notes.$inferSelect)[];
  }[];
  recurringStuck: { value: string; count: number }[];
};

export async function getReviewData(): Promise<ReviewData> {
  const allClasses = await db
    .select()
    .from(classes)
    .where(eq(classes.archived, false));

  const perClass = await Promise.all(
    allClasses.map(async (cls) => {
      const { classSessions, classUnits, openNoteRows } = await loadClassParts(
        cls.id,
      );
      return { cls, classSessions, classUnits, openNoteRows };
    }),
  );

  const pacing = perClass.map(({ cls, classSessions, classUnits }) => ({
    class: cls,
    doneCount: classUnits.filter((u) => u.done).length,
    total: classUnits.length,
    lastTaughtDate: classSessions[0]?.date ?? null,
  }));

  const openNotesByClass = perClass
    .filter(({ openNoteRows }) => openNoteRows.length > 0)
    .map(({ cls, openNoteRows }) => ({ class: cls, notes: openNoteRows }));

  const allStuckValues = perClass.flatMap(({ classSessions }) =>
    classSessions.map((s) => s.stuck),
  );
  const recurringStuck = countRecurringStuck(allStuckValues);

  return { pacing, openNotesByClass, recurringStuck };
}
