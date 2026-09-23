import { describe, expect, it } from "vitest";
import { deriveInitialFormValues, fieldsFromExistingSession } from "./log-sheet-form";

// Regression coverage for: reopening today's already-logged session must
// prefill the form with what's on file, or resubmitting after touching only
// one field nulls out the other two (the bug Codex's review caught).
describe("deriveInitialFormValues", () => {
  it("prefills from the latest session when today is already logged", () => {
    const result = deriveInitialFormValues({
      loggedToday: true,
      latestSession: {
        covered: "Reviewed present simple",
        stuck: "articles",
        nextOpener: "Articles warm-up",
      },
      latestSessionNote: null,
    });
    expect(result).toEqual({
      covered: "Reviewed present simple",
      stuck: "articles",
      nextOpener: "Articles warm-up",
      watchWho: "",
      watchText: "",
    });
  });

  // Regression coverage for Codex's F5 follow-up (GitHub issue #1): an
  // attached note must be visible on the *ordinary* reopen of an
  // already-logged today, not just when switching dates — otherwise
  // typing into the apparently-empty field and saving silently replaces
  // the original note via the upsert in logSessionAction.
  it("prefills the attached watch-for note when today is already logged and one exists", () => {
    const result = deriveInitialFormValues({
      loggedToday: true,
      latestSession: { covered: "x", stuck: null, nextOpener: null },
      latestSessionNote: { who: "Mei", text: "keeps dropping third-person -s" },
    });
    expect(result.watchWho).toBe("Mei");
    expect(result.watchText).toBe("keeps dropping third-person -s");
  });

  it("turns stored nulls into empty strings, not the literal word 'null'", () => {
    const result = deriveInitialFormValues({
      loggedToday: true,
      latestSession: { covered: null, stuck: null, nextOpener: "Opener only" },
      latestSessionNote: null,
    });
    expect(result).toEqual({
      covered: "",
      stuck: "",
      nextOpener: "Opener only",
      watchWho: "",
      watchText: "",
    });
  });

  it("starts blank when today has not been logged yet, even if a past session exists", () => {
    const result = deriveInitialFormValues({
      loggedToday: false,
      latestSession: {
        covered: "Last week's class",
        stuck: "tense choice",
        nextOpener: "Should not leak into a fresh log",
      },
      latestSessionNote: { who: "Someone", text: "Should not leak either" },
    });
    expect(result).toEqual({
      covered: "",
      stuck: "",
      nextOpener: "",
      watchWho: "",
      watchText: "",
    });
  });

  it("starts blank when there has never been a session", () => {
    expect(
      deriveInitialFormValues({ loggedToday: false, latestSession: null, latestSessionNote: null }),
    ).toEqual({ covered: "", stuck: "", nextOpener: "", watchWho: "", watchText: "" });
  });
});

describe("fieldsFromExistingSession", () => {
  it("maps an existing session's fields through unchanged, including its attached watch-for note", () => {
    const existing = {
      covered: "a",
      stuck: "b",
      nextOpener: "c",
      watchWho: "Mei",
      watchText: "keeps dropping third-person -s",
    };
    expect(fieldsFromExistingSession(existing)).toEqual(existing);
  });

  it("blanks all fields, including the watch-for note, when switching to a date with no session (does not carry over the previous date's text)", () => {
    expect(fieldsFromExistingSession(null)).toEqual({
      covered: "",
      stuck: "",
      nextOpener: "",
      watchWho: "",
      watchText: "",
    });
  });
});
