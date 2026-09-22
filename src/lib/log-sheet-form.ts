import type { ExistingSessionFields } from "@/app/actions";

export type LogSheetFieldValues = {
  covered: string;
  stuck: string;
  nextOpener: string;
};

export const BLANK_LOG_SHEET_FIELDS: LogSheetFieldValues = {
  covered: "",
  stuck: "",
  nextOpener: "",
};

// The log sheet's initial date is always today, and today's session (if any)
// is already known from the Today-screen query — no need to round-trip to
// the server just to fill in the form that triggered opening it.
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
