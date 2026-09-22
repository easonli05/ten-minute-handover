import { describe, expect, it } from "vitest";
import { toTodayClass } from "./today-class";
import type { classes, notes, sessions, units } from "@/db/schema";

type Class = typeof classes.$inferSelect;
type Session = typeof sessions.$inferSelect;
type Unit = typeof units.$inferSelect;
type Note = typeof notes.$inferSelect;

const baseClass: Class = {
  id: "c1",
  name: "Tuesday adults",
  level: "B1",
  days: ["Tue", "Thu"],
  startTime: "18:30",
  students: [],
  archived: false,
  createdAt: new Date("2026-01-01"),
};

function session(overrides: Partial<Session>): Session {
  return {
    id: "s",
    classId: "c1",
    date: "2026-09-01",
    covered: null,
    stuck: null,
    nextOpener: null,
    createdAt: new Date("2026-09-01"),
    ...overrides,
  };
}

function unit(overrides: Partial<Unit>): Unit {
  return { id: "u", classId: "c1", position: 0, title: "Unit", done: false, ...overrides };
}

const noNotes: Note[] = [];

describe("toTodayClass — nextOpener always reflects the most recent session", () => {
  it("picks the first session in the (caller-ordered, newest-first) list as latestSession", () => {
    const sessions = [
      session({ id: "s2", date: "2026-09-15", nextOpener: "newer opener" }),
      session({ id: "s1", date: "2026-09-08", nextOpener: "older opener" }),
    ];
    const result = toTodayClass(baseClass, sessions, [], noNotes);
    expect(result.latestSession?.nextOpener).toBe("newer opener");
  });

  it("logging again same day (caller places the updated row first) immediately reflects the new opener", () => {
    // Simulates re-fetching after an onConflictDoUpdate: the same date's
    // row now carries the edited fields, still first in the ordered list.
    const beforeEdit = [session({ id: "s1", date: "2026-09-22", nextOpener: "opener v1" })];
    const afterEdit = [session({ id: "s1", date: "2026-09-22", nextOpener: "opener v2" })];

    expect(toTodayClass(baseClass, beforeEdit, [], noNotes).latestSession?.nextOpener).toBe(
      "opener v1",
    );
    expect(toTodayClass(baseClass, afterEdit, [], noNotes).latestSession?.nextOpener).toBe(
      "opener v2",
    );
  });

  it("has no latestSession when the class has never been taught", () => {
    expect(toTodayClass(baseClass, [], [], noNotes).latestSession).toBeNull();
  });
});

describe("toTodayClass — toggling a unit done advances the current-unit marker", () => {
  it("current is the first not-done unit, in position order", () => {
    const units = [
      unit({ id: "u1", position: 0, title: "Present simple", done: true }),
      unit({ id: "u2", position: 1, title: "Present perfect", done: false }),
      unit({ id: "u3", position: 2, title: "Articles", done: false }),
    ];
    const result = toTodayClass(baseClass, [], units, noNotes);
    expect(result.unit.current?.id).toBe("u2");
    expect(result.unit.doneCount).toBe(1);
    expect(result.unit.total).toBe(3);
  });

  it("marking the current unit done advances current to the next one", () => {
    const before = [
      unit({ id: "u1", position: 0, done: true }),
      unit({ id: "u2", position: 1, done: false }),
      unit({ id: "u3", position: 2, done: false }),
    ];
    expect(toTodayClass(baseClass, [], before, noNotes).unit.current?.id).toBe("u2");

    const afterTogglingU2 = [
      unit({ id: "u1", position: 0, done: true }),
      unit({ id: "u2", position: 1, done: true }),
      unit({ id: "u3", position: 2, done: false }),
    ];
    expect(toTodayClass(baseClass, [], afterTogglingU2, noNotes).unit.current?.id).toBe("u3");
  });

  it("current is null once every unit is done", () => {
    const allDone = [unit({ id: "u1", done: true }), unit({ id: "u2", done: true })];
    const result = toTodayClass(baseClass, [], allDone, noNotes);
    expect(result.unit.current).toBeNull();
    expect(result.unit.doneCount).toBe(2);
    expect(result.unit.total).toBe(2);
  });

  it("current is null when there is no syllabus", () => {
    const result = toTodayClass(baseClass, [], [], noNotes);
    expect(result.unit.current).toBeNull();
    expect(result.unit.total).toBe(0);
  });
});
