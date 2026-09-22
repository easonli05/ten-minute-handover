"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { addNoteAction, type AddNoteState } from "@/app/actions";
import type { TodayClass } from "@/db/queries";

const initialState: AddNoteState = { error: null, success: false };
const NETWORK_ERROR: AddNoteState = {
  error: "Couldn't reach the server — check your connection and try again. What you typed is still here.",
  success: false,
};

export function NoteSheet({
  data,
  onClose,
}: {
  data: TodayClass;
  onClose: () => void;
}) {
  const { class: cls } = data;
  const [state, setState] = useState<AddNoteState>(initialState);
  const [pending, startSubmit] = useTransition();
  const [who, setWho] = useState("");

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  // See LogSheet's handleSubmit for why this isn't <form action={addNoteAction}>.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSubmit(async () => {
      try {
        setState(await addNoteAction(state, formData));
      } catch (err) {
        console.error(err);
        setState(NETWORK_ERROR);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-surface sm:rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <input type="hidden" name="classId" value={cls.id} />

          <div className="flex items-start justify-between gap-3 border-b border-surface-border p-5">
            <h2 className="text-lg font-semibold">Catch a note — {cls.name}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-surface-border px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 p-5">
            {cls.students.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {cls.students.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setWho(name)}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs " +
                      (who === name
                        ? "border-accent bg-accent-soft"
                        : "border-surface-border")
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : null}

            <input
              type="text"
              name="who"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="Student (optional)"
              className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />

            <textarea
              name="text"
              rows={3}
              autoFocus
              placeholder="What did you notice?"
              className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />

            {state.error ? (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            ) : null}
          </div>

          <div className="sticky bottom-0 border-t border-surface-border bg-surface p-4">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
