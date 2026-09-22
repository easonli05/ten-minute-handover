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
});
