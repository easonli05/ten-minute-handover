"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleUnitAction, updateSyllabusAction, type SyllabusState } from "@/app/actions";
import type { ClassDetail } from "@/db/queries";

const NETWORK_ERROR = "Couldn't reach the server — check your connection and try again. What you typed is still here.";

export function SyllabusSection({ data }: { data: ClassDetail }) {
  const { units, today } = data;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => units.map((u) => u.title).join("\n"));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startToggle] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Progress bar, current-unit highlight, and strikethrough all update the
  // instant a checkbox is tapped — no spinner between the tap and seeing it
  // register — and quietly revert if the save actually failed.
  const [optimisticUnits, setOptimisticDone] = useOptimistic(
    units,
    (state, toggled: { id: string; done: boolean }) =>
      state.map((u) => (u.id === toggled.id ? { ...u, done: toggled.done } : u)),
  );

  const doneCount = optimisticUnits.filter((u) => u.done).length;
  const total = optimisticUnits.length;
  const currentId = optimisticUnits.find((u) => !u.done)?.id ?? null;

  function startEditing() {
    setText(units.map((u) => u.title).join("\n"));
    setSaveError(null);
    setEditing(true);
  }

  function save() {
    setSaveError(null);
    startTransition(async () => {
      let result: SyllabusState;
      try {
        result = await updateSyllabusAction(today.class.id, text);
      } catch (err) {
        console.error(err);
        result = { error: NETWORK_ERROR, success: false };
      }
      if (result.success) {
        setEditing(false);
      } else {
        setSaveError(result.error);
      }
    });
  }

  function toggle(unitId: string, done: boolean) {
    setToggleError(null);
    startToggle(async () => {
      setOptimisticDone({ id: unitId, done });
      try {
        const result = await toggleUnitAction(unitId, done);
        if (!result.ok) setToggleError(result.error ?? "Couldn't save that — try again.");
      } catch (err) {
        console.error(err);
        setToggleError("Couldn't save that — try again.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Syllabus</h2>
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium"
          >
            Edit
          </button>
        ) : null}
      </div>

      {total > 0 ? (
        <>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {doneCount} of {total} done
          </p>
        </>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.max(4, text.split("\n").length + 1)}
            placeholder={"One unit per line, in order"}
            className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted">
            Rewrite the whole list to reorder. A line matching an existing
            unit&apos;s exact title keeps its progress; changed wording counts
            as a new unit.
          </p>
          {saveError ? (
            <p role="alert" className="text-sm text-danger">
              {saveError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-surface-border px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : total === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No units yet — tap Edit to add a syllabus.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5">
            {optimisticUnits.map((unit) => (
              <li
                key={unit.id}
                className={
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm " +
                  (unit.id === currentId ? "bg-accent-soft" : "")
                }
              >
                <input
                  type="checkbox"
                  checked={unit.done}
                  className="size-4 shrink-0 accent-[var(--accent)]"
                  onChange={(e) => toggle(unit.id, e.target.checked)}
                />
                <span className={unit.done ? "text-muted line-through" : ""}>
                  {unit.title}
                </span>
              </li>
            ))}
          </ul>
          {toggleError ? (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {toggleError}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
