// Eason teaches in Taiwan. "Today" for this app is always Taiwan's calendar
// date, regardless of where the code happens to run: the server (UTC on
// Vercel) and the phone (Asia/Taipei, usually — but a traveling teacher's
// device could be in any timezone) must agree, or a class logged just after
// midnight Taipei time could land on the wrong day depending on which side
// computed it. So every "today" in this module is derived with an explicit
// `timeZone: "Asia/Taipei"` rather than the runtime's local timezone, and
// day-difference math parses "YYYY-MM-DD" parts directly with Date.UTC
// instead of letting the Date constructor apply a local timezone offset.
const TEACHING_TIMEZONE = "Asia/Taipei";

const ISO_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TEACHING_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TEACHING_TIMEZONE,
  weekday: "short",
});

// Accepts an optional `now` so callers (and tests) can pin the instant being
// evaluated instead of always reading the system clock.
export function todayISO(now: Date = new Date()): string {
  return ISO_DATE_FORMATTER.format(now);
}

export function todayAbbreviation(now: Date = new Date()): string {
  return WEEKDAY_FORMATTER.format(now);
}

function parseISODateToUTCMillis(dateISO: string): number {
  const [year, month, day] = dateISO.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(dateISO: string, todayIsoDate: string): number {
  const a = parseISODateToUTCMillis(dateISO);
  const b = parseISODateToUTCMillis(todayIsoDate);
  return Math.round((b - a) / 86_400_000);
}

export function formatTaught(
  dateISO: string | null,
  now: Date = new Date(),
): string {
  if (!dateISO) return "not yet taught";
  const days = daysBetween(dateISO, todayISO(now));
  if (days === 0) return "taught today";
  if (days === 1) return "taught yesterday";
  if (days > 1) return `taught ${days} days ago`;
  return "taught in the future";
}

export function isCold(dateISO: string | null, now: Date = new Date()): boolean {
  if (!dateISO) return false;
  return daysBetween(dateISO, todayISO(now)) > 10;
}
