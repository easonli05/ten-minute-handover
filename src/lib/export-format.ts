// The shape /api/export produces and /api/import accepts. Deliberately a
// flat dump of all four tables, not a "backup format" with versioning —
// this exists so Eason can leave (or restore a snapshot), not to be a
// long-term interchange format.
export type ExportedClass = {
  id: string;
  name: string;
  level: string | null;
  days: string[];
  startTime: string | null;
  students: string[];
  archived: boolean;
  createdAt: string;
};

export type ExportedUnit = {
  id: string;
  classId: string;
  position: number;
  title: string;
  done: boolean;
};

export type ExportedSession = {
  id: string;
  classId: string;
  date: string;
  covered: string | null;
  stuck: string | null;
  nextOpener: string | null;
  createdAt: string;
};

export type ExportedNote = {
  id: string;
  classId: string;
  sessionId: string | null;
  who: string | null;
  text: string;
  done: boolean;
  createdAt: string;
};

export type ExportPayload = {
  classes: ExportedClass[];
  units: ExportedUnit[];
  sessions: ExportedSession[];
  notes: ExportedNote[];
};

export type ValidationResult =
  | { ok: true; data: ExportPayload }
  | { ok: false; error: string };

function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null);
}

function hasStringId(row: Record<string, unknown>): boolean {
  return typeof row.id === "string" && row.id.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

// Every id actually used across the payload, checked once up front so the
// per-table loops below can just look values up instead of re-scanning.
function findDuplicateId(rows: Record<string, unknown>[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.id as string;
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}

// Checks shape, field types, and referential integrity (every classId/
// sessionId actually points at a row present in *this same payload*) — not
// a full schema validator (no new dependency for this), but enough that a
// payload passing this can't violate the database's own NOT NULL / foreign
// key / unique constraints on insert. That matters beyond giving a clearer
// error message: /api/import replaces all data atomically (see
// runAtomically in src/db/atomic.ts and docs/decisions.md), so a rejection
// here happens *before* anything is touched, same as a rejection deeper in
// the atomic write would — but catching it here means the common malformed
// case never has to fall back on that safety net at all.
export function validateExportPayload(payload: unknown): ValidationResult {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Expected a JSON object." };
  }
  const p = payload as Record<string, unknown>;

  for (const key of ["classes", "units", "sessions", "notes"] as const) {
    if (!isArrayOfObjects(p[key])) {
      return { ok: false, error: `Missing or invalid "${key}" array.` };
    }
  }

  const classes = p.classes as Record<string, unknown>[];
  const units = p.units as Record<string, unknown>[];
  const sessions = p.sessions as Record<string, unknown>[];
  const notes = p.notes as Record<string, unknown>[];

  for (const [label, rows] of [
    ["class", classes],
    ["unit", units],
    ["session", sessions],
    ["note", notes],
  ] as const) {
    const dup = findDuplicateId(rows);
    if (dup !== null) {
      return { ok: false, error: `Duplicate ${label} id "${dup}" — every id must be unique within its table.` };
    }
  }

  const classIds = new Set(classes.map((c) => c.id as string));
  const sessionIds = new Set(sessions.map((s) => s.id as string));

  for (const row of classes) {
    if (
      !hasStringId(row) ||
      typeof row.name !== "string" ||
      !isStringArray(row.days) ||
      !isStringArray(row.students) ||
      typeof row.archived !== "boolean" ||
      typeof row.createdAt !== "string"
    ) {
      return {
        ok: false,
        error: "Every class needs an id, name, days[]/students[] as string arrays, an archived boolean, and a createdAt string.",
      };
    }
  }
  for (const row of units) {
    if (
      !hasStringId(row) ||
      typeof row.classId !== "string" ||
      typeof row.title !== "string" ||
      typeof row.position !== "number" ||
      typeof row.done !== "boolean"
    ) {
      return { ok: false, error: "Every unit needs an id, classId, title, numeric position, and done boolean." };
    }
    if (!classIds.has(row.classId)) {
      return { ok: false, error: `Unit "${row.id}" references classId "${row.classId}", which isn't in this payload's classes.` };
    }
  }
  for (const row of sessions) {
    if (
      !hasStringId(row) ||
      typeof row.classId !== "string" ||
      typeof row.date !== "string" ||
      typeof row.createdAt !== "string"
    ) {
      return { ok: false, error: "Every session needs an id, classId, date, and createdAt string." };
    }
    if (!classIds.has(row.classId)) {
      return { ok: false, error: `Session "${row.id}" references classId "${row.classId}", which isn't in this payload's classes.` };
    }
  }
  for (const row of notes) {
    if (
      !hasStringId(row) ||
      typeof row.classId !== "string" ||
      typeof row.text !== "string" ||
      typeof row.done !== "boolean" ||
      typeof row.createdAt !== "string" ||
      (row.sessionId !== undefined && row.sessionId !== null && typeof row.sessionId !== "string")
    ) {
      return {
        ok: false,
        error: "Every note needs an id, classId, text, done boolean, createdAt string, and sessionId that's a string or null.",
      };
    }
    if (!classIds.has(row.classId)) {
      return { ok: false, error: `Note "${row.id}" references classId "${row.classId}", which isn't in this payload's classes.` };
    }
    if (typeof row.sessionId === "string" && !sessionIds.has(row.sessionId)) {
      return { ok: false, error: `Note "${row.id}" references sessionId "${row.sessionId}", which isn't in this payload's sessions.` };
    }
  }
  const seenSessionIds = new Set<string>();
  for (const row of notes) {
    const sid = row.sessionId as string | null | undefined;
    if (!sid) continue;
    if (seenSessionIds.has(sid)) {
      return { ok: false, error: `More than one note has sessionId "${sid}" — at most one attached note is allowed per session.` };
    }
    seenSessionIds.add(sid);
  }

  const normalizedNotes = notes.map((row) => ({
    ...row,
    sessionId: row.sessionId ?? null,
  }));

  return {
    ok: true,
    data: { ...(payload as ExportPayload), notes: normalizedNotes as unknown as ExportedNote[] },
  };
}
