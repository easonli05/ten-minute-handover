import { describe, expect, it } from "vitest";
import { pickObviousClass } from "./class-picker";
import type { TodayClass } from "@/db/queries";

function stubClass(id: string, meetsToday: boolean): TodayClass {
  return {
    class: {
      id,
      name: id,
      level: null,
      days: [],
      startTime: null,
      students: [],
      archived: false,
      createdAt: new Date(),
    },
    latestSession: null,
    latestSessionNote: null,
    loggedToday: false,
    meetsToday,
    unit: { current: null, doneCount: 0, total: 0 },
    openNotes: [],
  };
}

describe("pickObviousClass", () => {
  it("picks the only class when there is exactly one", () => {
    const only = stubClass("a", false);
    expect(pickObviousClass([only])).toBe(only);
  });

  it("picks the one class meeting today when several classes exist", () => {
    const today = stubClass("today", true);
    const classes = [stubClass("other1", false), today, stubClass("other2", false)];
    expect(pickObviousClass(classes)).toBe(today);
  });

  it("is ambiguous (null) when multiple classes meet today", () => {
    const classes = [stubClass("a", true), stubClass("b", true)];
    expect(pickObviousClass(classes)).toBeNull();
  });

  it("is ambiguous (null) when several classes exist and none meets today", () => {
    const classes = [stubClass("a", false), stubClass("b", false)];
    expect(pickObviousClass(classes)).toBeNull();
  });

  it("is ambiguous (null) with no classes at all", () => {
    expect(pickObviousClass([])).toBeNull();
  });
});
