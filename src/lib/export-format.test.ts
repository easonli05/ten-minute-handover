import { describe, expect, it } from "vitest";
import { validateExportPayload } from "./export-format";

const validPayload = {
  classes: [
    {
      id: "c1",
      name: "Tuesday adults",
      level: "B1",
      days: ["Tue"],
      startTime: "18:30",
      students: ["Mei"],
      archived: false,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  units: [{ id: "u1", classId: "c1", position: 0, title: "Present simple", done: false }],
  sessions: [
    {
      id: "s1",
      classId: "c1",
      date: "2026-09-22",
      covered: "review",
      stuck: null,
      nextOpener: "next",
      createdAt: "2026-09-22T00:00:00.000Z",
    },
  ],
  notes: [{ id: "n1", classId: "c1", who: null, text: "watch this", done: false, createdAt: "2026-09-22T00:00:00.000Z" }],
};

describe("validateExportPayload", () => {
  it("accepts a well-formed export", () => {
    const result = validateExportPayload(validPayload);
    expect(result.ok).toBe(true);
  });

  it("accepts all-empty arrays (a fresh, empty install)", () => {
    const result = validateExportPayload({ classes: [], units: [], sessions: [], notes: [] });
    expect(result.ok).toBe(true);
  });

  it("rejects non-object input", () => {
    expect(validateExportPayload(null).ok).toBe(false);
    expect(validateExportPayload("a string").ok).toBe(false);
    expect(validateExportPayload([1, 2, 3]).ok).toBe(false);
  });

  it("rejects a payload missing one of the four arrays", () => {
    const { notes: _notes, ...missingNotes } = validPayload;
    void _notes;
    expect(validateExportPayload(missingNotes).ok).toBe(false);
  });

  it("rejects a class row missing a name", () => {
    const bad = { ...validPayload, classes: [{ id: "c1", days: [], students: [] }] };
    const result = validateExportPayload(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects a unit row missing classId", () => {
    const bad = { ...validPayload, units: [{ id: "u1", title: "x", position: 0, done: false }] };
    expect(validateExportPayload(bad).ok).toBe(false);
  });

  it("rejects a session row missing date", () => {
    const bad = { ...validPayload, sessions: [{ id: "s1", classId: "c1" }] };
    expect(validateExportPayload(bad).ok).toBe(false);
  });

  it("rejects a note row missing text", () => {
    const bad = { ...validPayload, notes: [{ id: "n1", classId: "c1" }] };
    expect(validateExportPayload(bad).ok).toBe(false);
  });

  // Regression coverage for Codex's finding: a malformed import that passed
  // this validator used to delete existing data before failing at the
  // database's own constraints. Every case below is exactly the kind of
  // "shaped right, references or types wrong" payload that used to slip
  // through — now caught here, before /api/import ever touches the
  // database (import route's own atomicity, in src/db/atomic.ts, is the
  // remaining safety net for whatever this still doesn't catch).
  describe("referential integrity and type checks (regression: malformed import used to delete data before failing)", () => {
    it("rejects a unit referencing a classId absent from this payload", () => {
      const bad = { ...validPayload, units: [{ id: "u1", classId: "nonexistent", position: 0, title: "x", done: false }] };
      const result = validateExportPayload(bad);
      expect(result.ok).toBe(false);
    });

    it("rejects a session referencing a classId absent from this payload", () => {
      const bad = {
        ...validPayload,
        sessions: [{ id: "s1", classId: "nonexistent", date: "2026-09-22", covered: null, stuck: null, nextOpener: null, createdAt: "2026-09-22T00:00:00.000Z" }],
      };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects a note referencing a classId absent from this payload", () => {
      const bad = { ...validPayload, notes: [{ id: "n1", classId: "nonexistent", who: null, text: "x", done: false, createdAt: "2026-09-22T00:00:00.000Z" }] };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects a note referencing a sessionId absent from this payload", () => {
      const bad = { ...validPayload, notes: [{ id: "n1", classId: "c1", sessionId: "nonexistent", who: null, text: "x", done: false, createdAt: "2026-09-22T00:00:00.000Z" }] };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("accepts a note with sessionId null, and with sessionId omitted entirely", () => {
      const withNull = { ...validPayload, notes: [{ ...validPayload.notes[0], sessionId: null }] };
      expect(validateExportPayload(withNull).ok).toBe(true);
      expect(validateExportPayload(validPayload).ok).toBe(true); // sessionId omitted, as in exports taken before it existed
    });

    it("accepts a note whose sessionId matches a session in this payload", () => {
      const ok = { ...validPayload, notes: [{ ...validPayload.notes[0], sessionId: "s1" }] };
      expect(validateExportPayload(ok).ok).toBe(true);
    });

    it("rejects two notes sharing the same non-null sessionId", () => {
      const bad = {
        ...validPayload,
        notes: [
          { id: "n1", classId: "c1", sessionId: "s1", who: null, text: "first", done: false, createdAt: "2026-09-22T00:00:00.000Z" },
          { id: "n2", classId: "c1", sessionId: "s1", who: null, text: "second", done: false, createdAt: "2026-09-22T00:00:00.000Z" },
        ],
      };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects duplicate ids within the same table", () => {
      const bad = {
        ...validPayload,
        classes: [validPayload.classes[0], { ...validPayload.classes[0] }],
      };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects a class whose days/students aren't string arrays", () => {
      const bad = { ...validPayload, classes: [{ ...validPayload.classes[0], days: "Tue" }] };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects a class whose archived field isn't a boolean", () => {
      const bad = { ...validPayload, classes: [{ ...validPayload.classes[0], archived: "false" }] };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects a unit whose position isn't a number", () => {
      const bad = { ...validPayload, units: [{ ...validPayload.units[0], position: "0" }] };
      expect(validateExportPayload(bad).ok).toBe(false);
    });

    it("rejects a unit or note whose done field isn't a boolean", () => {
      expect(validateExportPayload({ ...validPayload, units: [{ ...validPayload.units[0], done: "false" }] }).ok).toBe(false);
      expect(validateExportPayload({ ...validPayload, notes: [{ ...validPayload.notes[0], done: "false" }] }).ok).toBe(false);
    });
  });
});
