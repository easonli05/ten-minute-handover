"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  toggleArchiveAction,
  updateClassAction,
  type UpdateClassState,
} from "@/app/actions";
import type { ClassDetail } from "@/db/queries";

const initialState: UpdateClassState = { error: null, success: false };
const NETWORK_ERROR: UpdateClassState = {
  error: "Couldn't reach the server — check your connection and try again. What you typed is still here.",
  success: false,
};
const ARCHIVE_NETWORK_ERROR = "Couldn't reach the server — try again.";

export function ClassEditSection({ data }: { data: ClassDetail }) {
  const { class: cls } = data.today;
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<UpdateClassState>(initialState);
  const [pending, startSubmit] = useTransition();
  const [archivePending, startArchiveTransition] = useTransition();
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // See LogSheet's handleSubmit for why this isn't <form action={updateClassAction}>.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSubmit(async () => {
      try {
        const result = await updateClassAction(state, formData);
        setState(result);
        if (result.success) setEditing(false);
      } catch (err) {
        console.error(err);
        setState(NETWORK_ERROR);
      }
    });
  }

  function handleToggleArchive() {
    setArchiveError(null);
    startArchiveTransition(async () => {
      try {
        const result = await toggleArchiveAction(cls.id, !cls.archived);
        if (!result.ok) setArchiveError(result.error ?? ARCHIVE_NETWORK_ERROR);
      } catch (err) {
        console.error(err);
        setArchiveError(ARCHIVE_NETWORK_ERROR);
      }
    });
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
        onClick={handleToggleArchive}
        className="mt-4 w-full rounded-full border border-surface-border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {cls.archived ? "Unarchive" : "Archive class"}
      </button>
      {archiveError ? (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {archiveError}
        </p>
      ) : null}
    </section>
  );
}
