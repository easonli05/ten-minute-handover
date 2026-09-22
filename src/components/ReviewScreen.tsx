"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleNoteAction } from "@/app/actions";
import type { ReviewData } from "@/db/queries";
import { formatTaught } from "@/lib/date";

export function ReviewScreen({ data }: { data: ReviewData }) {
  const { pacing, openNotesByClass, recurringStuck } = data;
  const [, startTransition] = useTransition();

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 pb-10">
      <div>
        <Link href="/" className="inline-block px-1 text-sm text-muted">
          ← Today
        </Link>
        <h1 className="mt-1 px-1 text-xl font-semibold">Weekly review</h1>
      </div>

      <section>
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Pacing
        </h2>
        <div className="mt-2 space-y-3">
          {pacing.length === 0 ? (
            <p className="px-1 text-sm text-muted">No classes yet.</p>
          ) : (
            pacing.map(({ class: cls, doneCount, total, lastTaughtDate }) => (
              <Link
                key={cls.id}
                href={`/class/${cls.id}`}
                className="block rounded-2xl border border-surface-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{cls.name}</p>
                  <p className="text-xs text-muted">{formatTaught(lastTaughtDate)}</p>
                </div>
                {total > 0 ? (
                  <>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {doneCount} of {total} units
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted">No syllabus yet</p>
                )}
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Still open
        </h2>
        <div className="mt-2 space-y-3">
          {openNotesByClass.length === 0 ? (
            <p className="px-1 text-sm text-muted">Nothing open. Clean slate.</p>
          ) : (
            openNotesByClass.map(({ class: cls, notes }) => (
              <div key={cls.id} className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
                <p className="font-medium">{cls.name}</p>
                <ul className="mt-2 space-y-1.5">
                  {notes.map((note) => (
                    <li key={note.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                        onChange={() =>
                          startTransition(() => {
                            toggleNoteAction(note.id, true);
                          })
                        }
                        aria-label={`Mark done: ${note.text}`}
                      />
                      <span>
                        {note.who ? <span className="font-medium">{note.who}: </span> : null}
                        {note.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Keeps coming back
        </h2>
        <div className="mt-2 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          {recurringStuck.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing has repeated yet — needs at least two logged sessions
              with the same &ldquo;stuck&rdquo; value.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recurringStuck.map(({ value, count }) => (
                <li key={value} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{value}</span>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    {count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
