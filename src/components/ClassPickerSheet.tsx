"use client";

import type { TodayClass } from "@/db/queries";

// Shown only when pickObviousClass() can't guess — one extra tap, honestly,
// rather than silently picking the wrong class.
export function ClassPickerSheet({
  title,
  classes,
  onPick,
  onClose,
}: {
  title: string;
  classes: TodayClass[];
  onPick: (classId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-surface sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-surface-border px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>
        <div className="space-y-2 p-5">
          {classes.length === 0 ? (
            <p className="text-sm text-muted">No classes yet.</p>
          ) : (
            classes.map(({ class: cls }) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => onPick(cls.id)}
                className="block w-full rounded-lg border border-surface-border px-4 py-3 text-left text-sm font-medium active:bg-accent-soft"
              >
                {cls.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
