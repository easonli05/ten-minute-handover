import { describe, expect, it } from "vitest";
import { countRecurringStuck } from "./recurring-stuck";

describe("countRecurringStuck", () => {
  it("only includes values that repeat more than once", () => {
    expect(countRecurringStuck(["articles", "tense choice", "articles"])).toEqual([
      { value: "articles", count: 2 },
    ]);
  });

  it("normalises case and surrounding whitespace before counting", () => {
    expect(countRecurringStuck([" Articles ", "articles", "ARTICLES"])).toEqual([
      { value: "articles", count: 3 },
    ]);
  });

  it("ignores null and empty values", () => {
    expect(countRecurringStuck([null, "", "  ", "articles"])).toEqual([]);
  });

  it("sorts by count descending, then alphabetically for ties", () => {
    const values = [
      "articles",
      "articles",
      "tense choice",
      "tense choice",
      "tense choice",
      "listening",
      "listening",
    ];
    expect(countRecurringStuck(values)).toEqual([
      { value: "tense choice", count: 3 },
      { value: "articles", count: 2 },
      { value: "listening", count: 2 },
    ]);
  });

  it("returns an empty list when nothing repeats", () => {
    expect(countRecurringStuck(["articles", "tense choice"])).toEqual([]);
  });
});
