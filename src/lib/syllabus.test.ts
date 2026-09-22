import { describe, expect, it } from "vitest";
import { diffSyllabus, parseSyllabusText, type SyllabusUnit } from "./syllabus";

describe("parseSyllabusText", () => {
  it("splits lines, trims, and drops blanks", () => {
    expect(parseSyllabusText("Unit 1\n  Unit 2  \n\nUnit 3\n")).toEqual([
      "Unit 1",
      "Unit 2",
      "Unit 3",
    ]);
  });

  it("returns empty for blank input", () => {
    expect(parseSyllabusText("   \n\n  ")).toEqual([]);
  });
});

describe("diffSyllabus", () => {
  const existing: SyllabusUnit[] = [
    { id: "u1", title: "Present simple", done: true },
    { id: "u2", title: "Present perfect", done: false },
    { id: "u3", title: "Articles", done: false },
  ];

  it("keeps a unit's id and done flag when its title is unchanged, even reordered", () => {
    const diff = diffSyllabus(existing, ["Articles", "Present simple", "Present perfect"]);
    expect(diff.toDelete).toEqual([]);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toUpdate).toEqual([
      { id: "u3", title: "Articles", position: 0 },
      { id: "u1", title: "Present simple", position: 1 },
      { id: "u2", title: "Present perfect", position: 2 },
    ]);
  });

  it("treats a reworded line as delete-old + insert-new (done resets)", () => {
    const diff = diffSyllabus(existing, [
      "Present simple",
      "Present perfect — extended",
      "Articles",
    ]);
    expect(diff.toDelete).toEqual(["u2"]);
    expect(diff.toInsert).toEqual([{ title: "Present perfect — extended", position: 1 }]);
    expect(diff.toUpdate).toEqual([
      { id: "u1", title: "Present simple", position: 0 },
      { id: "u3", title: "Articles", position: 2 },
    ]);
  });

  it("deletes units whose lines were removed entirely", () => {
    const diff = diffSyllabus(existing, ["Present simple"]);
    expect(diff.toDelete.sort()).toEqual(["u2", "u3"]);
    expect(diff.toUpdate).toEqual([{ id: "u1", title: "Present simple", position: 0 }]);
  });

  it("inserts new units for lines added at the end", () => {
    const diff = diffSyllabus(existing, [
      "Present simple",
      "Present perfect",
      "Articles",
      "Reported speech",
    ]);
    expect(diff.toInsert).toEqual([{ title: "Reported speech", position: 3 }]);
    expect(diff.toDelete).toEqual([]);
  });

  it("matches duplicate identical titles one-to-one, in order", () => {
    const dupes: SyllabusUnit[] = [
      { id: "a", title: "Review", done: true },
      { id: "b", title: "Review", done: false },
    ];
    const diff = diffSyllabus(dupes, ["Review", "Review"]);
    expect(diff.toUpdate).toEqual([
      { id: "a", title: "Review", position: 0 },
      { id: "b", title: "Review", position: 1 },
    ]);
    expect(diff.toDelete).toEqual([]);
    expect(diff.toInsert).toEqual([]);
  });

  it("handles an empty new list by deleting everything", () => {
    const diff = diffSyllabus(existing, []);
    expect(diff.toDelete.sort()).toEqual(["u1", "u2", "u3"]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toInsert).toEqual([]);
  });
});
