const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// All dates in this app are plain "YYYY-MM-DD" strings (the Postgres `date`
// column's default mode) so class-day comparisons never depend on timezone.
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function todayAbbreviation(): string {
  return DAY_ABBREVIATIONS[new Date().getDay()];
}

function daysBetween(dateISO: string, todayIsoDate: string): number {
  const a = new Date(`${dateISO}T00:00:00`);
  const b = new Date(`${todayIsoDate}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function formatTaught(dateISO: string | null): string {
  if (!dateISO) return "not yet taught";
  const days = daysBetween(dateISO, todayISO());
  if (days === 0) return "taught today";
  if (days === 1) return "taught yesterday";
  if (days > 1) return `taught ${days} days ago`;
  return "taught in the future";
}

export function isCold(dateISO: string | null): boolean {
  if (!dateISO) return false;
  return daysBetween(dateISO, todayISO()) > 10;
}
