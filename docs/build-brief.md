# Ten Minute Handover — build brief for Claude Code

A teaching-continuity app for one teacher with a few fixed classes and ten-minute
breaks. Paste the sections below into Claude Code in order. Section 0 is the spec;
sections 1–5 are the prompts.

---

## 0. The idea, in one paragraph

The problem is not that lesson planning is hard. It is that the plan and the
record live in different places and neither survives the walk back to the
classroom. So: **collapse planning into logging.** After each class the teacher
writes three short lines. The third line — *"open next class with…"* — is not a
note about the past, it is the plan for the future. It sits on that class's card
and is the first thing visible when the app opens. Nothing else needs to be
planned, because planning already happened ninety seconds after the last class
ended.

Three design constraints that everything follows from:

1. **Ninety seconds of typing, maximum.** Three textareas, tap-to-fill chips for
   repeated answers, everything else optional. If a field would take thought, it
   does not belong in the post-class flow.
2. **Phone first.** It is used standing up in a corridor. Big tap targets, no
   horizontal scroll, works at 375px. Desktop is the same layout, wider.
3. **The pre-class view shows four things and nothing else.** Opener, what they
   were shaky on, current syllabus unit, and open student notes. Everything else
   is one tap deeper.

**Timezone:** not specified in the original brief, and load-bearing enough that
it isn't safe to leave implicit. Eason teaches in Taiwan; the deploy target
(Vercel) defaults to UTC. Every "today" in this app — meeting-day sorting,
status labels, the log sheet's default date — is Asia/Taipei's calendar date,
computed explicitly (`Intl.DateTimeFormat(..., { timeZone: "Asia/Taipei" })`
in `src/lib/date.ts`), never the executing runtime's local timezone. During
Taipei's own early morning (00:00–08:00 Taipei = 16:00–24:00 UTC the
*previous* UTC day) a naive implementation disagrees with Taipei about what
day it is — every day, not an edge case; see `docs/decisions.md`'s 2026-09-22
corrective-pass entry for the bug this was written to fix.

---

## 1. Stack and scaffold (first prompt)

```
Build a personal web app called "Ten Minute Handover". It is a teaching
continuity tool for a single English teacher with a handful of fixed classes.
I will open it on my phone between classes, so it must be hosted and work
offline-tolerantly.

Stack:
- Next.js (App Router) + TypeScript + Tailwind
- SQLite via Turso (@libsql/client) with Drizzle ORM — or plain Postgres on Neon
  if that is simpler to set up. Pick one and justify it in one line.
- Single-user auth: one passcode in an env var, checked in middleware, stored in
  an httpOnly cookie for 90 days. No user table, no OAuth, no accounts.
- Deploy target: Vercel free tier.
- Ship a PWA manifest + service worker so I can add it to my iPhone home screen
  and it opens fullscreen. Cache the shell; data can be network-only for now.

Set up the project, the database schema below, and a working deploy. Do not
build UI yet — I want to confirm the schema and see it live at a URL first.

Schema:

classes
  id            text pk
  name          text            -- "Tuesday adults"
  level         text            -- free text: "B1", "Exam prep", whatever
  days          text[]/json     -- ["Tue","Thu"]
  startTime     text            -- "18:30", free text, not a real time type
  students      text[]/json     -- ["Mei","Tomo","Andrés"]
  archived      boolean default false
  createdAt     timestamp

units                           -- the syllabus, ordered
  id            text pk
  classId       text fk -> classes
  position      integer
  title         text
  done          boolean default false

sessions                        -- one row per class actually taught
  id            text pk
  classId       text fk -> classes
  date          date
  covered       text            -- what actually got done
  stuck         text            -- where they struggled
  nextOpener    text            -- THE PLAN for next time
  createdAt     timestamp

notes                           -- observations, caught in or after class
  id            text pk
  classId       text fk -> classes
  who           text nullable   -- student name, or null for whole class
  text          text
  done          boolean default false
  createdAt     timestamp
```

**Deviation:** the deploy target above says Vercel; the live deploy target is
now **Cloudflare Workers** instead, via `@opennextjs/cloudflare` — see
`docs/decisions.md` for why. The original prompt text above is left as
written (it is a verbatim record of what was actually asked), not edited to
match; everything else in it — stack, schema, PWA, single-passcode auth — is
unchanged and still accurate.

---

## 2. The two core screens (second prompt)

```
Now build the two screens that matter. Everything else can wait.

SCREEN A — "Today" (the home route, /)
A vertical stack of class cards, classes meeting today sorted first.

Each card shows, in this order:
  - Class name, level, meeting days, and "taught 3 days ago" / "taught today"
  - A status pill: the start time if it meets today, "Logged" if already logged
    today, "Cold" if not taught in over 10 days
  - OPEN WITH — the nextOpener from the most recent session. This is the visually
    loudest thing on the card. If there is none, say so plainly:
    "Nothing carried over — log a class to fill this in."
  - STILL SHAKY — the stuck field from the most recent session
  - UNIT — the first not-done unit, with "3 of 8" alongside
  - WATCH FOR — open notes for this class, each with a checkbox that marks it
    done inline without leaving the page
  - Two buttons: "Log this class" (primary) and "Note"

SCREEN B — the log sheet (a modal/drawer, not a route change)
Opens from "Log this class". Contains:
  - A banner at the top: "You planned to open with: <last nextOpener>" — so I can
    see whether I actually did it
  - Date, defaulting to today
  - "What actually got done" (textarea) — placeholder makes clear this is what
    really happened, not what was planned
  - "Where they got stuck" (textarea) + a row of tap-to-insert chips:
    pronunciation, tense choice, articles, listening speed, low confidence,
    vocabulary recall
  - "Open next class with…" (textarea, visually emphasised) — label it as the
    whole point: one concrete first ten minutes
  - Optional "Watch for next time": a name field (with the class's students as
    tappable chips) and a free-text field
  - If the class has an unfinished unit: a checkbox "Finished Unit N — <title>"
    that marks it done and advances the marker
  - Save, which writes a session row (+ a note row if filled) and closes

Rules:
  - Logging the same class twice on one day edits the existing row, it does not
    create a second one.
  - Refuse to save only if all three main fields are empty.
  - Show "90 seconds" somewhere in the sheet header. It is a promise, not a timer.

Design: phone-first, 375px must be comfortable. Real typographic hierarchy, not
a wall of uniform cards. Pick a palette with a single strong accent and keep
everything else quiet. Support light and dark. No emoji.
```

---

## 3. Catching things mid-class (third prompt)

```
Add the fastest possible capture path, because the observations I lose are the
ones I have during class, not after it.

- A persistent bottom bar on the Today screen with two buttons: "Catch a note"
  and "Log a class".
- "Catch a note" opens a minimal sheet: class (pre-filled if only one is plausible),
  optional student name as tappable chips, one textarea, save. Three taps total
  when a student chip is used.
- Saved notes appear under WATCH FOR on that class's card and stay there until
  ticked off.
- Make the whole flow work with the phone keyboard open — the save button must
  not be hidden behind it.
```

---

## 4. Class detail and the weekly review (fourth prompt)

```
Add two secondary screens.

/class/[id] — class detail
  - The same card from the Today screen at the top
  - Syllabus: ordered units with a progress bar, each tappable to toggle done,
    current unit highlighted. Editing the syllabus is a textarea, one unit per
    line — reorder by rewriting, not drag and drop.
  - Class log: reverse-chronological sessions, each showing covered / stuck /
    what it led to. This is the "where are we actually up to" answer.
  - Edit and archive class.

/review — weekly review, designed to be read in ten minutes on a Sunday
  - Pacing: each class with units-done vs total, days since last taught, and a
    progress bar. This is what tells me I am behind on one class and ahead on
    another.
  - Still open: every unticked note across all classes, grouped by class.
  - "Keeps coming back": any `stuck` value that has appeared more than once,
    with a count. This is the highest-value thing in the app — it turns
    scattered frustrations into "these four students all need a lesson on
    articles". Do simple normalisation (lowercase, trim) rather than anything
    clever; the chips in the log sheet already make values repeat exactly.
```

---

## 5. Make it survive real use (fifth prompt)

```
Harden it for daily use:

- Optimistic UI on every write. I am on school wifi; a spinner between me and
  saving a note means I will stop using this.
- If a write fails, keep the text in the form and say what happened. Never
  silently lose typed text.
- Seed script with one clearly-labelled example class so a fresh deploy is not
  an empty screen.
- A /api/export route returning all data as JSON, and an import that accepts it.
  I want to be able to leave.
- Tests for the three things that would quietly ruin it: same-day logging edits
  rather than duplicates; the Today card always shows the most recent session's
  nextOpener; toggling a unit done advances the current-unit marker correctly.
- A README with the env vars, the Turso/Neon setup commands, and the deploy step.
```

**Done** (2026-09-22). The seed script (pulled forward in the corrective
pass) is `scripts/seed.ts` / `npm run db:seed`. Optimistic UI is
`useOptimistic` on the two checkbox interactions (notes, syllabus units) —
see `docs/decisions.md` for why the multi-field forms stayed
pending-state-on-save instead. Write-failure handling: every mutating
action in `src/app/actions.ts` catches its own DB errors and returns a
message instead of throwing, and every form field was already
React-controlled state that survives a failed save untouched. Export/import
are `GET /api/export` and `POST /api/import` (replace-semantics, documented
in the README, no in-app UI — see `docs/decisions.md` for why). All three
named tests exist: same-day-edit (`src/db/session-upsert.test.ts`, from the
corrective pass), and nextOpener-shows-latest / unit-advance as pure-logic
tests in `src/lib/today-class.test.ts` plus DB-ordering confirmation in
`src/db/session-upsert.test.ts`.

---

## Phase two, once you have used it for a month

Do not build these now. They are only worth it if the daily loop sticks.

- **A "what changed" digest.** Once a week, a summary of which classes moved and
  which stalled — delivered by email, so you do not have to remember to open
  the review screen.
- **Voice capture.** Speak the three lines instead of typing them; a transcription
  API fills the fields for confirmation. This is the only thing that gets the
  ninety seconds down to thirty.
- **Recurring-issue prompts.** When the same `stuck` value appears three times,
  offer to generate a short remedial activity for it.
- **Scheduled task.** Have Claude Code set up a scheduled task that, every Sunday
  evening, reads your data and drafts next week's rough shape — which classes
  need a catch-up lesson, which are ready to move on.

---

## One note on scope

Resist adding attendance, grades, or materials storage. Every one of those turns
this from a ninety-second habit into an administrative system, and administrative
systems are exactly the thing that ten-minute breaks kill. If it does not appear
on the card you read before walking in, it does not belong in the app.
