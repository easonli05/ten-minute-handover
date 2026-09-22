"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleNoteAction } from "@/app/actions";
import type { TodayClass } from "@/db/queries";
import { formatTaught, isCold } from "@/lib/date";

export function ClassCard({
  data,
  onLog,
  onNote,
}: {
  data: TodayClass;
  onLog: () => void;
  onNote: () => void;
}) {
  const { class: cls, latestSession, loggedToday, meetsToday, unit, openNotes } =
    data;
  const [, startTransition] = useTransition();

  const pill = loggedToday
    ? { label: "Logged", tone: "accent" as const }
    : meetsToday && cls.startTime
      ? { label: cls.startTime, tone: "neutral" as const }
      : isCold(latestSession?.date ?? null)
        ? { label: "Cold", tone: "muted" as const }
        : null;

  return (
    <article className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            <Link href={`/class/${cls.id}`} className="hover:underline">
              {cls.name}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {[cls.level, cls.days.join(", ")].filter(Boolean).join(" · ")}
            {" · "}
            {formatTaught(latestSession?.date ?? null)}
          </p>
        </div>
        {pill ? (
          <span
            className={
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " +
              (pill.tone === "accent"
                ? "bg-accent-soft text-accent"
                : pill.tone === "neutral"
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-border text-muted")
            }
          >
            {pill.label}
          </span>
        ) : null}
      </header>

      <div className="mt-4 rounded-xl bg-accent-soft p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Open with
        </p>
        <p className="mt-1 text-base font-medium leading-snug">
          {latestSession?.nextOpener || "Nothing carried over — log a class to fill this in."}
        </p>
      </div>

      {latestSession?.stuck ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Still shaky
          </p>
          <p className="mt-1 text-sm leading-snug">{latestSession.stuck}</p>
        </div>
      ) : null}

      {unit.total > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Unit
          </p>
          <p className="mt-1 text-sm leading-snug">
            {unit.current ? unit.current.title : "All units done"}
            <span className="text-muted">
              {" "}
              — {Math.min(unit.doneCount + 1, unit.total)} of {unit.total}
            </span>
          </p>
        </div>
      ) : null}

      {openNotes.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Watch for
          </p>
          <ul className="mt-1 space-y-1.5">
            {openNotes.map((note) => (
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
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onLog}
          className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground active:opacity-80"
        >
          Log this class
        </button>
        <button
          type="button"
          onClick={onNote}
          className="rounded-full border border-surface-border px-4 py-2.5 text-sm font-semibold active:opacity-70"
        >
          Note
        </button>
      </div>
    </article>
  );
}
