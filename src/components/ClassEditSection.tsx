"use client";

import { useActionState, useState, useTransition } from "react";
import {
  toggleArchiveAction,
  updateClassAction,
  type UpdateClassState,
} from "@/app/actions";
import type { ClassDetail } from "@/db/queries";

const initialState: UpdateClassState = { error: null, success: false };

export function ClassEditSection({ data }: { data: ClassDetail }) {
  const { class: cls } = data.today;
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateClassAction,
    initialState,
  );
  const [archivePending, startArchiveTransition] = useTransition();

  // Adjusted during render, not in an effect (React's documented pattern
  // for "reset state when something changes" — see
  // https://react.dev/learn/you-might-not-need-an-effect). Tracks the last
  // `state` object useActionState handed back; useActionState returns a
  // fresh object on every dispatch, so this fires exactly once per
  // successful save. Keying on `.success` alone instead would misfire the
  // next time "Edit" is reopened, since that stale `true` never changes
  // back — closing the form again before the teacher can touch it.
  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (state.success) setEditing(false);
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Class details</h2>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium"
          >
            Edit
          </button>
        ) : null}
      </div>

      {cls.archived ? (
        <p className="mt-2 rounded-lg bg-surface-border px-3 py-2 text-xs font-medium text-muted">
          Archived — hidden from Today.
        </p>
      ) : null}

      {editing ? (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="classId" value={cls.id} />
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input
              type="text"
              name="name"
              defaultValue={cls.name}
              required
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Level</span>
            <input
              type="text"
              name="level"
              defaultValue={cls.level ?? ""}
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Days (comma-separated, e.g. Tue, Thu)</span>
            <input
              type="text"
              name="days"
              defaultValue={cls.days.join(", ")}
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Start time</span>
            <input
              type="text"
              name="startTime"
              defaultValue={cls.startTime ?? ""}
              placeholder="18:30"
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Students (comma-separated)</span>
            <input
              type="text"
              name="students"
              defaultValue={cls.students.join(", ")}
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
            />
          </label>

          {state.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
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
        </form>
      ) : null}

      <button
        type="button"
        disabled={archivePending}
        onClick={() =>
          startArchiveTransition(() => {
            toggleArchiveAction(cls.id, !cls.archived);
          })
        }
        className="mt-4 w-full rounded-full border border-surface-border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {cls.archived ? "Unarchive" : "Archive class"}
      </button>
    </section>
  );
}
