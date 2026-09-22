"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleNoteAction } from "@/app/actions";
import type { TodayClass } from "@/db/queries";

// Ticking a note off is exactly the "quick tap while walking" interaction
// the brief means by "a spinner between me and saving a note means I will
// stop using this" — it disappears immediately, and only reappears if the
// save actually failed. Shared by ClassCard (per-class) and ReviewScreen
// (grouped across classes) so both get the same optimistic behavior.
export function NoteChecklist({
  notes,
}: {
  notes: TodayClass["openNotes"];
}) {
  const [optimisticNotes, removeOptimistically] = useOptimistic(
    notes,
    (state, noteId: string) => state.filter((n) => n.id !== noteId),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(noteId: string) {
    setError(null);
    startTransition(async () => {
      removeOptimistically(noteId);
      try {
        const result = await toggleNoteAction(noteId, true);
        if (!result.ok) {
          setError(result.error ?? "Couldn't save that — try again.");
        }
      } catch (err) {
        console.error(err);
        setError("Couldn't reach the server — try again.");
      }
    });
  }

  return (
    <>
      <ul className="space-y-1.5">
        {optimisticNotes.map((note) => (
          <li key={note.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
              onChange={() => handleToggle(note.id)}
              aria-label={`Mark done: ${note.text}`}
            />
            <span>
              {note.who ? <span className="font-medium">{note.who}: </span> : null}
              {note.text}
            </span>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}
