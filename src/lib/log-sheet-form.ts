import type { ExistingSessionFields } from "@/app/actions";

export type LogSheetFieldValues = {
  covered: string;
  stuck: string;
  nextOpener: string;
  watchWho: string;
  watchText: string;
};

export const BLANK_LOG_SHEET_FIELDS: LogSheetFieldValues = {
  covered: "",
  stuck: "",
  nextOpener: "",
  watchWho: "",
  watchText: "",
};

// The log sheet's initial date is always today, and today's session (if
// any) — including its attached watch-for note — is already known from the
// Today-screen query (TodayClass.latestSessionNote) — no need to round-trip
// to the server just to fill in the form that triggered opening it.
//
// Earlier, the watch-for fields didn't come from this query at all and
// always started blank here, even when a note was already attached to
// today's session — not just on an unusual date-switch case, but on the
// ordinary "reopen today's already-logged class" flow, since this function
// runs on every mount. That made an existing note invisible: typing into
// the apparently-empty field and saving replaced it via the upsert in
// logSessionAction, silently losing the original text — a real bug Codex
// found independently (GitHub issue #1, F5 follow-up) in what the first
// fix's decisions.md entry had wrongly scoped as just the "return to
// today" case. Fixed by having the Today-screen query carry the attached
// note (TodayClass.latestSessionNote, from src/db/queries.ts) so it's
// available here synchronously, same as the other three fields.
export function deriveInitialFormValues(params: {
  loggedToday: boolean;
  latestSession: {
    covered: string | null;
    stuck: string | null;
    nextOpener: string | null;
  } | null;
  latestSessionNote: { who: string | null; text: string } | null;
}): LogSheetFieldValues {
  if (!params.loggedToday || !params.latestSession) {
    return { ...BLANK_LOG_SHEET_FIELDS };
  }
  const { covered, stuck, nextOpener } = params.latestSession;
  return {
    covered: covered ?? "",
    stuck: stuck ?? "",
    nextOpener: nextOpener ?? "",
    watchWho: params.latestSessionNote?.who ?? "",
    watchText: params.latestSessionNote?.text ?? "",
  };
}

// What the form should show after the date field changes to `date`:
// whatever is already on file for that date, or blank if nothing is.
export function fieldsFromExistingSession(
  existing: ExistingSessionFields,
): LogSheetFieldValues {
  return existing ?? { ...BLANK_LOG_SHEET_FIELDS };
}
