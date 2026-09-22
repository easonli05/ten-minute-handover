import type { TodayClass } from "@/db/queries";

// The bottom bar's "Catch a note" / "Log a class" buttons aren't tied to a
// specific card, so they need to guess which class the teacher means. The
// brief only spells this out for notes ("class, pre-filled if only one is
// plausible") but the same rule makes sense for both buttons: if there's
// truly one plausible class, skip asking; otherwise a class picker (one
// extra tap) is unavoidable and honest, rather than guessing wrong.
export function pickObviousClass(classes: TodayClass[]): TodayClass | null {
  if (classes.length === 1) return classes[0];

  const meetingToday = classes.filter((c) => c.meetsToday);
  if (meetingToday.length === 1) return meetingToday[0];

  return null;
}
