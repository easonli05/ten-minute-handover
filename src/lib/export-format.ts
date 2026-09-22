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

// Deliberately shallow: checks every row has an id and the table has the
// right shape, not a full schema validator (no new dependency for this —
// the database's own NOT NULL / foreign key constraints catch anything
// this misses, just later and less legibly).
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

  for (const row of classes) {
    if (!hasStringId(row) || typeof row.name !== "string") {
      return { ok: false, error: "Every class needs an id and a name." };
    }
  }
  for (const row of units) {
    if (!hasStringId(row) || typeof row.classId !== "string" || typeof row.title !== "string") {
      return { ok: false, error: "Every unit needs an id, classId, and title." };
    }
  }
  for (const row of sessions) {
    if (!hasStringId(row) || typeof row.classId !== "string" || typeof row.date !== "string") {
      return { ok: false, error: "Every session needs an id, classId, and date." };
    }
  }
  for (const row of notes) {
    if (!hasStringId(row) || typeof row.classId !== "string" || typeof row.text !== "string") {
      return { ok: false, error: "Every note needs an id, classId, and text." };
    }
  }

  return {
    ok: true,
    data: payload as ExportPayload,
  };
}
