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

// The log sheet's initial date is always today, and today's session (if any)
// is already known from the Today-screen query — no need to round-trip to
// the server just to fill in the form that triggered opening it. The
// Today-screen query doesn't carry the attached watch-for note, though (see
// getSessionForDateAction), so those two fields start blank here even on an
// already-logged day — same as before this note-prefill existed for other
// dates. That's an accepted gap, not a regression: nothing this misses can
// get silently overwritten, since the save path leaves an existing note
// alone whenever watchText is blank (see logSessionAction).
export function deriveInitialFormValues(params: {
  loggedToday: boolean;
  latestSession: {
    covered: string | null;
    stuck: string | null;
    nextOpener: string | null;
  } | null;
}): LogSheetFieldValues {
  if (!params.loggedToday || !params.latestSession) {
    return { ...BLANK_LOG_SHEET_FIELDS };
  }
  const { covered, stuck, nextOpener } = params.latestSession;
  return {
    ...BLANK_LOG_SHEET_FIELDS,
    covered: covered ?? "",
    stuck: stuck ?? "",
    nextOpener: nextOpener ?? "",
  };
}

// What the form should show after the date field changes to `date`:
// whatever is already on file for that date, or blank if nothing is.
export function fieldsFromExistingSession(
  existing: ExistingSessionFields,
): LogSheetFieldValues {
  return existing ?? { ...BLANK_LOG_SHEET_FIELDS };
}
