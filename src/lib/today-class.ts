import type { classes, notes, sessions, units } from "@/db/schema";
import { todayAbbreviation, todayISO } from "@/lib/date";

export type TodayClass = {
  class: typeof classes.$inferSelect;
  latestSession: typeof sessions.$inferSelect | null;
  // The latest session's attached "watch for next time" note (see
  // notes.sessionId in src/db/schema.ts), if any — independent of
  // openNotes' done filter, since this exists to show what's already on
  // file when reopening the log sheet, not to list what's still open.
  latestSessionNote: { who: string | null; text: string } | null;
  loggedToday: boolean;
  meetsToday: boolean;
  unit: {
    current: typeof units.$inferSelect | null;
    doneCount: number;
    total: number;
  };
  openNotes: (typeof notes.$inferSelect)[];
};

// The two of the brief's three quietly-ruin-it risks that live here:
// "the Today card always shows the most recent session's nextOpener" is
// just `classSessions[0]` — correct only if the caller passes sessions
// ordered newest-first (queries.ts does: `orderBy(desc(date),
// desc(createdAt))`); "toggling a unit done advances the current-unit
// marker" is `classUnits.find(u => !u.done)` — correct only if units are
// ordered by position. Both are pure and cheap to get right in isolation,
// which is why this function is split out of queries.ts (which can't be
// imported without a live DATABASE_URL) instead of tested through it.
export function toTodayClass(
  cls: typeof classes.$inferSelect,
  classSessions: (typeof sessions.$inferSelect)[],
  classUnits: (typeof units.$inferSelect)[],
  openNoteRows: (typeof notes.$inferSelect)[],
  latestSessionNote: { who: string | null; text: string } | null = null,
): TodayClass {
  const today = todayAbbreviation();
  const todayDate = todayISO();
  const latestSession = classSessions[0] ?? null;

  return {
    class: cls,
    latestSession,
    latestSessionNote,
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
