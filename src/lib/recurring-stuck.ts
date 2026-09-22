// Simple normalise-and-count, no fuzzy matching — the log sheet's chips
// already make values repeat exactly; see build-brief.md section 4.
export function countRecurringStuck(
  values: (string | null)[],
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const normalised = raw?.trim().toLowerCase();
    if (!normalised) continue;
    counts.set(normalised, (counts.get(normalised) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
