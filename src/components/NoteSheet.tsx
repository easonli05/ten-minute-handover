"use client";

import { useActionState, useEffect, useState } from "react";
import { addNoteAction, type AddNoteState } from "@/app/actions";
import type { TodayClass } from "@/db/queries";

const initialState: AddNoteState = { error: null, success: false };

export function NoteSheet({
  data,
  onClose,
}: {
  data: TodayClass;
  onClose: () => void;
}) {
  const { class: cls } = data;
  const [state, formAction, pending] = useActionState(
    addNoteAction,
    initialState,
  );
  const [who, setWho] = useState("");

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-surface sm:rounded-2xl">
        <form action={formAction} className="flex flex-col">
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
