import { describe, expect, it } from "vitest";
import { formatTaught, isCold, todayAbbreviation, todayISO } from "./date";

// Asia/Taipei is UTC+8 with no DST. 2026-09-21T17:00:00Z is already
// 2026-09-22 01:00 in Taipei — a UTC server (Vercel's default) and a Taiwan
// phone must agree it's the 22nd, a Tuesday, not the 21st, a Monday.
const JUST_AFTER_TAIPEI_MIDNIGHT = new Date("2026-09-21T17:00:00Z");
const JUST_BEFORE_TAIPEI_MIDNIGHT = new Date("2026-09-21T15:59:00Z");

describe("todayISO", () => {
  it("reports the Taipei calendar date even when the instant is still 'yesterday' in UTC", () => {
    expect(todayISO(JUST_AFTER_TAIPEI_MIDNIGHT)).toBe("2026-09-22");
  });

  it("does not roll over before Taipei midnight", () => {
    expect(todayISO(JUST_BEFORE_TAIPEI_MIDNIGHT)).toBe("2026-09-21");
  });
});

describe("todayAbbreviation", () => {
  it("reports the Taipei weekday, matching the brief's day-code format", () => {
    expect(todayAbbreviation(JUST_AFTER_TAIPEI_MIDNIGHT)).toBe("Tue");
    expect(todayAbbreviation(JUST_BEFORE_TAIPEI_MIDNIGHT)).toBe("Mon");
  });
});

describe("formatTaught", () => {
  it("says 'taught today' for a session dated today in Taipei, just after the UTC-day boundary", () => {
    expect(formatTaught("2026-09-22", JUST_AFTER_TAIPEI_MIDNIGHT)).toBe(
      "taught today",
    );
  });

  it("does not call yesterday's Taipei session 'today' just because the UTC date matches", () => {
    // UTC date at this instant is still 2026-09-21, but Taipei's is 09-22.
    expect(formatTaught("2026-09-21", JUST_AFTER_TAIPEI_MIDNIGHT)).toBe(
      "taught yesterday",
    );
  });

  it("handles null (never taught)", () => {
    expect(formatTaught(null)).toBe("not yet taught");
  });

  it("counts multiple days correctly", () => {
    expect(formatTaught("2026-09-15", JUST_AFTER_TAIPEI_MIDNIGHT)).toBe(
      "taught 7 days ago",
    );
  });
});

describe("isCold", () => {
  it("is false at exactly 10 days", () => {
    expect(isCold("2026-09-12", JUST_AFTER_TAIPEI_MIDNIGHT)).toBe(false);
  });

  it("is true past 10 days", () => {
    expect(isCold("2026-09-11", JUST_AFTER_TAIPEI_MIDNIGHT)).toBe(true);
  });

  it("is false for a class never taught", () => {
    expect(isCold(null)).toBe(false);
  });
});
