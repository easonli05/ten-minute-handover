"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { getSessionForDateAction, logSessionAction, type LogSessionState } from "@/app/actions";
import type { TodayClass } from "@/db/queries";
import { todayISO } from "@/lib/date";
import { deriveInitialFormValues, fieldsFromExistingSession } from "@/lib/log-sheet-form";

const NETWORK_ERROR: LogSessionState = {
  error: "Couldn't reach the server — check your connection and try again. What you typed is still here.",
  success: false,
};

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
  const { class: cls, latestSession, loggedToday, unit } = data;
  const [state, setState] = useState<LogSessionState>(initialState);
  const [pending, startSubmit] = useTransition();

  const [date, setDate] = useState(() => todayISO());
  const initialFields = useState(() =>
    deriveInitialFormValues({ loggedToday, latestSession }),
  )[0];
  const [covered, setCovered] = useState(initialFields.covered);
  const [stuck, setStuck] = useState(initialFields.stuck);
  const [nextOpener, setNextOpener] = useState(initialFields.nextOpener);
  const [watchWho, setWatchWho] = useState(initialFields.watchWho);
  const [watchText, setWatchText] = useState(initialFields.watchText);
  const [isLoadingDate, startDateTransition] = useTransition();
  // Set when a date-lookup fails (network drop, not a server error) partway
  // through switching dates. The date field has already moved to `newDate`
  // by then, but the text boxes still hold whatever was on screen before —
  // which could be a different date's real lesson entirely. Without this,
  // hitting Save would silently write that leftover text under `newDate`,
  // overwriting whatever was actually logged there. So instead: leave the
  // text alone (nothing typed is lost), but refuse to save until either the
  // lookup is retried successfully or the date is changed again — "don't
  // lose what was typed" and "don't save it under the wrong date" both hold
  // at once this way. See docs/decisions.md.
  const [dateLookupError, setDateLookupError] = useState<string | null>(null);
  const stuckRef = useRef<HTMLTextAreaElement>(null);
  // Ignore a date-lookup response if a newer one has since been requested.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setDateLookupError(null);

    // The date the drawer opened with already has its data in hand — no
    // round trip needed, and it avoids a flash-to-blank while it resolves.
    // The attached watch-for note isn't part of that in-hand data (see
    // getSessionForDateAction), so it resets to blank here same as on
    // first mount — an accepted gap, not silent data loss, since a blank
    // watchText on save leaves any already-attached note untouched rather
    // than overwriting it.
    if (newDate === todayISO() && loggedToday && latestSession) {
      setCovered(latestSession.covered ?? "");
      setStuck(latestSession.stuck ?? "");
      setNextOpener(latestSession.nextOpener ?? "");
      setWatchWho("");
      setWatchText("");
      return;
    }

    const requestId = ++requestIdRef.current;
    startDateTransition(async () => {
      try {
        const existing = await getSessionForDateAction(cls.id, newDate);
        if (requestIdRef.current !== requestId) return; // a newer change won the race
        const fields = fieldsFromExistingSession(existing);
        setCovered(fields.covered);
        setStuck(fields.stuck);
        setNextOpener(fields.nextOpener);
        setWatchWho(fields.watchWho);
        setWatchText(fields.watchText);
      } catch (err) {
        if (requestIdRef.current !== requestId) return; // a newer change already won
        console.error(err);
        setDateLookupError(
          "Couldn't check what's already logged for this date — the text below may belong to a different date. Retry before saving.",
        );
      }
    });
  }

  function insertStuckChip(chip: string) {
    setStuck((current) => (current ? `${current}, ${chip}` : chip));
    stuckRef.current?.focus();
  }

  // Not <form action={logSessionAction}>: on a real network failure (not a
  // server-side error — the request never arriving at all, the exact "school
  // wifi drops" case the brief calls out) a form with a native `action`
  // falls back to an actual browser navigation once React's own fetch
  // rejects, which replaces this whole page with a browser-level error
  // screen and loses every typed field. preventDefault() up front rules
  // that out completely; the catch below turns "the request never landed"
  // into the same on-screen message a server-side failure gets.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Belt-and-braces alongside the disabled Save button below: never save
    // while it's unknown whether the text on screen actually belongs to
    // the selected date.
    if (dateLookupError) return;
    const formData = new FormData(event.currentTarget);
    startSubmit(async () => {
      try {
        setState(await logSessionAction(state, formData));
      } catch (err) {
        console.error(err);
        setState(NETWORK_ERROR);
      }
    });
  }

  const unitNumber = Math.min(unit.doneCount + 1, unit.total);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-surface sm:rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
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
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={isLoadingDate}
                required
                className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm disabled:opacity-60"
              />
              {isLoadingDate ? (
                <span className="mt-1 block text-xs text-muted">
                  Loading that date…
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium">What actually got done</span>
              <textarea
                name="covered"
                rows={2}
                value={covered}
                onChange={(e) => setCovered(e.target.value)}
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
                value={nextOpener}
                onChange={(e) => setNextOpener(e.target.value)}
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
                value={watchText}
                onChange={(e) => setWatchText(e.target.value)}
                placeholder="What to watch for"
                className="w-full rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm"
              />
            </fieldset>

            {dateLookupError ? (
              <p role="alert" className="text-sm text-danger">
                {dateLookupError}{" "}
                <button
                  type="button"
                  onClick={() => handleDateChange(date)}
                  className="font-medium underline"
                >
                  Retry
                </button>
              </p>
            ) : null}

            {state.error ? (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            ) : null}
          </div>

          <div className="sticky bottom-0 border-t border-surface-border bg-surface p-4">
            <button
              type="submit"
              disabled={pending || isLoadingDate || !!dateLookupError}
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
