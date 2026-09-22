"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logSessionAction, type LogSessionState } from "@/app/actions";
import type { TodayClass } from "@/db/queries";
import { todayISO } from "@/lib/date";

const STUCK_CHIPS = [
  "pronunciation",
  "tense choice",
  "articles",
  "listening speed",
  "low confidence",
  "vocabulary recall",
];

const initialState: LogSessionState = { error: null, success: false };

export function LogSheet({
  data,
  onClose,
}: {
  data: TodayClass;
  onClose: () => void;
}) {
  const { class: cls, latestSession, unit } = data;
  const [state, formAction, pending] = useActionState(
    logSessionAction,
    initialState,
  );
  const [stuck, setStuck] = useState("");
  const [watchWho, setWatchWho] = useState("");
  const stuckRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  function insertStuckChip(chip: string) {
    setStuck((current) => (current ? `${current}, ${chip}` : chip));
    stuckRef.current?.focus();
  }

  const unitNumber = Math.min(unit.doneCount + 1, unit.total);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-surface sm:rounded-2xl">
        <form action={formAction} className="flex flex-1 flex-col">
          <input type="hidden" name="classId" value={cls.id} />

          <div className="border-b border-surface-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{cls.name}</h2>
                <p className="text-xs text-muted">90 seconds, tops.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-surface-border px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>
            {latestSession?.nextOpener ? (
              <p className="mt-3 rounded-lg bg-accent-soft p-3 text-sm">
                You planned to open with:{" "}
                <span className="font-medium">{latestSession.nextOpener}</span>
              </p>
            ) : null}
          </div>

          <div className="flex-1 space-y-5 p-5">
            <label className="block">
              <span className="text-sm font-medium">Date</span>
              <input
                type="date"
                name="date"
                defaultValue={todayISO()}
                required
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">What actually got done</span>
              <textarea
                name="covered"
                rows={2}
                placeholder="What really happened — not what you planned"
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Where they got stuck</span>
              <textarea
                ref={stuckRef}
                name="stuck"
                rows={2}
                value={stuck}
                onChange={(e) => setStuck(e.target.value)}
                placeholder="Tap a chip, or write your own"
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STUCK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => insertStuckChip(chip)}
                    className="rounded-full border border-surface-border px-2.5 py-1 text-xs active:bg-accent-soft"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-accent">
                Open next class with…
              </span>
              <textarea
                name="nextOpener"
                rows={2}
                placeholder="One concrete first ten minutes"
                className="mt-1 w-full rounded-lg border-2 border-accent bg-transparent px-3 py-2 text-sm"
              />
            </label>

            {unit.current ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="finishUnitId"
                  value={unit.current.id}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span>
                  Finished Unit {unitNumber} — {unit.current.title}
                </span>
              </label>
            ) : null}

            <fieldset className="rounded-lg border border-surface-border p-3">
              <legend className="px-1 text-sm font-medium">
                Watch for next time (optional)
              </legend>
              {cls.students.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {cls.students.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setWatchWho(name)}
                      className={
                        "rounded-full border px-2.5 py-1 text-xs " +
                        (watchWho === name
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
                name="watchWho"
                value={watchWho}
                onChange={(e) => setWatchWho(e.target.value)}
                placeholder="Name (optional)"
                className="mb-2 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
              <textarea
                name="watchText"
                rows={2}
                placeholder="What to watch for"
                className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </fieldset>

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
