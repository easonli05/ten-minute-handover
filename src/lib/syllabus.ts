// Reordering the syllabus is done by rewriting the whole textarea, one unit
// per line (see build-brief.md section 4) — not drag-and-drop. Turning that
// rewritten text back into a diff against the existing rows is the part
// worth getting right: a line whose text exactly matches an existing unit
// keeps that unit's `done` flag and id (so ticking a unit off survives its
// neighbors being reordered or reworded); everything else is either a
// genuinely new unit or one that got deleted by being left out.
export type SyllabusUnit = { id: string; title: string; done: boolean };

export type SyllabusDiff = {
  toDelete: string[];
  toUpdate: { id: string; title: string; position: number }[];
  toInsert: { title: string; position: number }[];
};

export function parseSyllabusText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function diffSyllabus(
  existing: SyllabusUnit[],
  newTitles: string[],
): SyllabusDiff {
  const remaining = [...existing];
  const toUpdate: SyllabusDiff["toUpdate"] = [];
  const toInsert: SyllabusDiff["toInsert"] = [];

  newTitles.forEach((title, position) => {
    const matchIndex = remaining.findIndex((u) => u.title === title);
    if (matchIndex !== -1) {
      const [matched] = remaining.splice(matchIndex, 1);
      toUpdate.push({ id: matched.id, title, position });
    } else {
      toInsert.push({ title, position });
    }
  });

  return {
    toDelete: remaining.map((u) => u.id),
    toUpdate,
    toInsert,
  };
}
