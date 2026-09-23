# Decisions

Append-only log, newest at the bottom. This is how tools that never talk to each
other stay consistent.

Format:

```
## YYYY-MM-DD — <tool / agent> — <short title>
**Decided:** what was settled.
**Why:** the reasoning a later agent would otherwise have to reconstruct.
**Affects:** files or areas this touches.
```

---

## 2026-09-21 — Claude (Cowork) — Planning and logging are the same action
**Decided:** There is no separate "plan next lesson" feature. The post-class log
has a field called *"open next class with…"* and whatever goes in it is rendered
as the plan on that class's card.
**Why:** The ten-minute break is the binding constraint. A separate planning step
would need time that does not exist, and would be skipped. Writing the opener
immediately after class also means it is written while the class is still in
working memory, which makes it more specific than a plan written cold.
**Affects:** Whole design. This is the load-bearing idea — if you remove it there
is no product left.

## 2026-09-21 — Claude (Cowork) — Three fields, in this order
**Decided:** Post-class capture is exactly: what actually got done / where they
got stuck / open next class with. In that order.
**Why:** The order is retrospective → diagnostic → prospective, which is how
memory actually unloads after teaching. Asking for the opener first produces
vaguer openers.
**Affects:** `docs/build-brief.md` section 2.

## 2026-09-21 — Claude (Cowork) — Tap-chips for "where they got stuck"
**Decided:** The `stuck` field offers tappable preset values (pronunciation, tense
choice, articles, listening speed, low confidence, vocabulary recall) alongside
free text.
**Why:** Two reasons. It saves typing under time pressure, and — more importantly
— it makes values repeat *exactly*, which is what lets the review screen count
recurring problems. Free text alone would never aggregate.
**Affects:** Log sheet, and the "keeps coming back" feature in `/review`.

## 2026-09-21 — Claude (Cowork) — Separate mid-class capture path
**Decided:** A "catch a note" flow, reachable in one tap from a persistent bottom
bar, writing to a `notes` table separate from `sessions`.
**Why:** Observations made *during* class ("Tomo keeps dropping third-person -s")
are lost by evening and are the highest-value thing the teacher currently forgets.
They have a different lifecycle from session records: they stay open across
several classes until ticked off.
**Affects:** `notes` table, Today screen, `/review`.

## 2026-09-21 — Claude (Cowork) — Single-user passcode auth, not accounts
**Decided:** One passcode in an env var, httpOnly cookie, no user table.
**Why:** One user. Every hour spent on auth is an hour not spent on the loop.
Revisit only if a second teacher ever wants in.
**Affects:** middleware, schema (deliberately has no users table).

## 2026-09-21 — Claude (Cowork) — Prototype is frozen
**Decided:** `prototype/teaching-loop.html` is a reference, not a starting point.
The real build starts from scratch per the brief.
**Why:** It was written in one pass to test the interaction, uses `localStorage`,
and has no tests. Building on it would inherit those choices silently. Its job is
to answer "which fields does Eason actually fill in?" before the real build
commits to them.
**Affects:** `prototype/`.

## 2026-09-22 — Claude Code — Repo was empty; docs and prototype ported in
**Decided:** The repo had no commits and no `prototype/teaching-loop.html`, even
though the working agreement above assumes both exist. Ported `AGENTS.md`,
`CLAUDE.md`, `README.md`, `docs/build-brief.md`, and this file in from the
project's source-of-truth copies before starting section 1. Did **not** fabricate
a replacement `prototype/teaching-loop.html` — its absence is a gap, not a
decision, and a fabricated prototype would misrepresent the "already validated"
history the decision above claims.
**Why:** `CLAUDE.md` and `AGENTS.md` are the first things an agent is told to
read, so they need to exist before the rule "read this before changing anything"
means anything. Inventing the prototype instead of flagging its absence would
have silently rewritten project history.
**Affects:** Whole repo (first commit). `prototype/` remains empty — flagged to
Eason, not solved by this agent.

## 2026-09-22 — Claude Code — Database: Neon/Postgres over Turso
**Decided:** Postgres on Neon, via `drizzle-orm/neon-http` and `@neondatabase/serverless`.
**Why:** Vercel has a first-party Neon integration (one click from the dashboard
provisions a database and injects `DATABASE_URL`), so there is no separate CLI or
account flow to script here, and Drizzle's Postgres support is its most mature
driver. Turso is equally valid but needs its own CLI/auth step this environment
cannot complete non-interactively.
**Affects:** `package.json` deps, `src/db/`, `drizzle.config.ts`, env vars.

## 2026-09-22 — Claude Code — PWA icons are a placeholder
**Decided:** `app/manifest.ts` points its icon at the default Next.js
`favicon.ico` instead of a designed app icon.
**Why:** Section 2 of the brief picks "a palette with a single strong accent,"
which hasn't happened yet — designing an icon now would mean redoing it once
that palette exists. The manifest, service worker, and `appleWebApp` metadata
are otherwise complete and installable; only the icon art is a stand-in.
**Affects:** `src/app/manifest.ts`. Revisit when section 2's palette is chosen.

## 2026-09-22 — Claude Code — Next.js 15+ breaking changes account for
**Decided:** Used `next dev`'s bundled docs (`node_modules/next/dist/docs/`)
before writing auth/PWA code, since this scaffold is Next.js 16.3.5 and prior
training data assumes older conventions. Two changes that mattered: (1)
`middleware.ts` is deprecated in favor of `src/proxy.ts` (same behavior,
renamed export) — used for the passcode check; (2) `cookies()` and a page's
`searchParams` are both async now — used `await` accordingly in
`api/login/route.ts` and `login/page.tsx`.
**Why:** Writing against stale API shape would silently produce code that
either fails to run (old middleware filename is ignored) or throws at runtime
(sync access to now-async APIs).
**Affects:** `src/proxy.ts`, `src/app/api/login/route.ts`, `src/app/login/page.tsx`.

## 2026-09-22 — Claude Code — Accent colour: teal
**Decided:** Single strong accent is teal (`#0f766e` light / `#2dd4bf` dark),
against a warm off-white / near-black neutral background — not pure white/black.
Tokens live as CSS variables in `globals.css`, wired through Tailwind's
`@theme inline` (`bg-accent`, `text-accent-foreground`, `bg-surface`, etc.).
**Why:** The brief asks for "a single strong accent and keep everything else
quiet." Teal reads calm rather than alarming (ruled out red/orange) and isn't
the generic SaaS-blue default. Off-white/near-black neutrals (not pure
`#fff`/`#000`) reduce glare for a screen read standing up under fluorescent
corridor lighting.
**Affects:** `src/app/globals.css`, every component built from here on.

## 2026-09-22 — Claude Code — Section 2: sessions gets a real unique constraint
**Decided:** Added `uniqueIndex("sessions_class_id_date_unique")` on
`(classId, date)` (not in the brief's original schema) and used
`onConflictDoUpdate` in `logSessionAction` targeting that pair.
**Why:** The brief's rule — "logging the same class twice on one day edits the
existing row" — has no atomic implementation without a DB-level constraint;
a check-then-insert from the app is a race condition. This is the smallest
change that makes the rule actually true rather than "usually true."
**Affects:** `src/db/schema.ts` (migration `0001`), `src/app/actions.ts`.

## 2026-09-22 — Claude Code — Card's "Note" button is a minimal stand-in for section 3
**Decided:** Screen A's per-card "Note" button (listed in section 2) opens a
small sheet scoped to that one class — student chip, optional name, one
textarea, save — writing straight to the `notes` table. It is not the
persistent bottom-bar "catch a note" flow section 3 specifies.
**Why:** Section 2 lists the button but the fast, reachable-from-anywhere
capture path is explicitly section 3's job. Building a real version now would
either duplicate work once section 3 lands or make section 3 redundant.
**Affects:** `src/components/NoteSheet.tsx`. Resolved 2026-09-22 (section 3):
reused as-is — the bottom bar's "Catch a note" opens this same component
once it has resolved which class, rather than a second implementation.

## 2026-09-22 — Claude Code — How section 2 was verified
**Decided:** Before committing, started a local Postgres 16 (already present
on this box), applied both migrations directly with `psql`, and — via a
transient `drizzle-orm/node-postgres` swap of `src/db/index.ts` (reverted
before commit; `pg`/`playwright` installed with `--no-save`, never touching
`package.json`) — ran the app for real: logged in, submitted the log sheet
twice same-day and confirmed one row with the latest values, toggled a unit
done and confirmed the card's current unit advanced, caught a note and ticked
it done, and screenshotted both colour schemes. This is exactly the kind of
check section 5 formalises as tests later; doing it by hand now caught that
`neon()` validates the connection-string *format* at module load, so
`DATABASE_URL` must be a well-formed Postgres URL at **build** time too, not
just runtime — documented in the README rather than left to surprise the next
deploy.
**Why:** section 5 explicitly calls same-day-edit, "today card shows latest
nextOpener," and unit-advance the three things that would quietly ruin this
app. Trusting that the code compiles was not enough to believe those three
things actually hold.
**Affects:** Confidence only — no shipped file. Verification scripts lived in
an untracked `scripts/` dir and were deleted after use, never staged.

## 2026-09-22 — Claude Code — Corrective pass: Codex source review of commit 45e8978

**Decided:** Codex reviewed commit 45e8978 (source-inspection only, did not run
the app) and found three real bugs, all confirmed by reading the code before
fixing:

1. **Same-day edit could erase fields.** `LogSheet` opened with blank
   textareas regardless of whether today was already logged, and
   `logSessionAction`'s `onConflictDoUpdate` overwrites all three fields with
   whatever was submitted. Reopening today's log and touching only the
   opener would null out `covered`/`stuck`. Fixed by loading the existing
   session into the form: on open, if today is already logged, prefill from
   `latestSession` (already in hand from the Today-screen query, no extra
   round trip); on a date change, fetch that date's session via a new
   `getSessionForDateAction` and prefill from it, or blank the fields if
   none exists. The overwrite-on-save semantics were **not** changed — once
   the form shows the truth, submitting it back is correct by construction,
   and a user who deliberately clears prefilled text still gets that clear
   saved (a field never silently reverts to an old value the UI didn't
   show). The "which values should the form open with" decision is a pure,
   tested function (`src/lib/log-sheet-form.ts`) so it doesn't depend on
   React rendering to verify.
2. **Service worker could show stale class data.** `sw.js` cached every GET
   outside `/api`, including the server-rendered `/` (and `/login`) pages,
   cache-first with background refresh — so a reopened app could show
   yesterday's "open with" while the real update sat in the cache, unseen,
   until the *next* reload. Fixed: navigations (`request.mode ===
   "navigate"`) are now always network-only, since every page that can show
   class data is one of them; only genuinely static assets (Next's
   content-hashed build output, icons, manifest) stay cache-first. Offline
   now shows an explicit `public/offline.html` instead of either a network
   error or (the bug) a silently stale page. Bumped the cache name to
   `tmh-shell-v2` so the `activate` handler's cleanup (which deletes every
   cache except the current name) purges the old version's cached data
   pages on upgrade, rather than leaving them orphaned in a cache nothing
   references anymore but the browser hasn't evicted.
3. **"Today" used the runtime's local timezone.** `src/lib/date.ts` called
   `new Date().toLocaleDateString("en-CA")` / `.getDay()` with no explicit
   timezone — correct only if server and phone happen to share one. Eason
   teaches in Taiwan; Vercel's default runtime is UTC. During Taipei's own
   early morning — 00:00–08:00 Taipei, which is 16:00–24:00 UTC the
   *previous* UTC day, not a rare late-night edge case but every single
   day — a UTC server's `getTodayData()` and a Taipei phone's date-input
   default could disagree about the date, corrupting meeting-day sorting
   ("does this class meet today") and the log sheet's default date
   alongside it. Fixed by
   anchoring every date computation to `timeZone: "Asia/Taipei"` explicitly
   via `Intl.DateTimeFormat`, and rewrote the day-difference math
   (`formatTaught`/`isCold`) to parse "YYYY-MM-DD" parts and compare with
   `Date.UTC` directly rather than letting `new Date(string)` apply
   whatever timezone the calling runtime happens to have. This makes the
   day-math itself timezone-independent, not just timezone-correct on the
   server: it now gives the same answer wherever it runs.

**Why:** Confirmed each finding against the actual code (not just the
report) before touching anything, per usual practice — all three held up.
Fix 1's root cause is that the form never knew what was already saved; fixing
that (not the overwrite semantics) is the smaller, more correct change.
Fix 2's root cause is treating a server-rendered data page like a static
asset; the two need opposite caching strategies, and conflating them is what
"cache the shell" always meant to avoid. Fix 3's root cause is assuming the
process's default timezone is meaningful for a specific teacher in a specific
place; it never was, on server or client.
**Affects:** `src/lib/date.ts`, `src/lib/log-sheet-form.ts` (new),
`src/app/actions.ts` (new `getSessionForDateAction`), `src/components/LogSheet.tsx`,
`public/sw.js`, `public/offline.html` (new).

## 2026-09-22 — Claude Code — Corrective pass: test infrastructure added

**Decided:** Added `vitest` (+ `drizzle-orm/node-postgres`'s `pg` driver as a
second, test-and-tooling-only DB client — `src/db/pg-client.ts`) as real,
committed devDependencies, not the transient `--no-save` installs used for
manual verification in the section-2 pass. Bumped `@types/node` from `^20` to
`^22` because vitest 5 requires it and the runtime here is already Node 22 —
the old pin was stricter than the actual environment, not a deliberate
constraint.
**Why:** The task explicitly asked for regression tests for these fixes, and
section 5 of the brief already calls out automated tests as necessary before
this app is trustworthy for daily use — pulling the infrastructure forward
serves both. `pg` specifically (rather than trying to test against the app's
own `neon-http` client) is necessary because `neon-http` only speaks to a
real Neon endpoint over HTTP; it cannot reach a local or CI Postgres, so
there was no way to write a DB-backed test against the shipped client. `pg`
already had to exist conceptually since `drizzle-kit push`/`generate` use the
Postgres wire protocol regardless of what the app runtime uses — this just
makes that dependency explicit and reusable for tests and the seed script
instead of leaving it implicit in drizzle-kit's own dependency tree.
**Affects:** `package.json`, `vitest.config.mts`, `src/db/pg-client.ts`,
`src/lib/date.test.ts`, `src/lib/log-sheet-form.test.ts`,
`src/db/session-upsert.test.ts`.

## 2026-09-22 — Claude Code — Seed script pulled forward from section 5

**Decided:** Added `npm run db:seed` (`scripts/seed.ts`) now, inserting one
fixed-id, clearly-labelled example class with a 3-unit syllabus — idempotent,
safe to run more than once.
**Why:** The corrective-review asked how a fresh install can be used at all
without a class-creation UI, "without expanding into unrelated features."
Building that UI now would be exactly that expansion (it's section-4-or-later
work — see the pre-class-view-only rule in `AGENTS.md`). The brief's own
section 5 already specifies this exact seed script for this exact reason
("a fresh deploy is not an empty screen"); pulling forward one already-speced
line item is not new scope, it's the smallest thing that answers the
question honestly. Manual class creation for now is documented in the README
as going through `npm run db:studio` or direct SQL.
**Affects:** `scripts/seed.ts`, `package.json`, README's "Getting started on
a fresh install" section.

## 2026-09-22 — Claude Code — No live deployment exists

**Decided:** README now says explicitly that no live Vercel/Neon deployment
exists, rather than implying one might. Section 1 of the brief asked for "a
working deploy," which this agent has never had the account access in this
environment to actually do — only `npm run build` against a well-formed but
fake `DATABASE_URL` has been verified, which proves the build succeeds, not
that a deployment exists.
**Why:** The corrective review asked to reconcile the brief's request for a
working deployment against what's actually true. Leaving the README's
phrasing loose ("hosted and work offline-tolerantly" per the brief, without
stating plainly that it isn't hosted yet) would let a later reader assume
more than what happened.
**Affects:** README's status line and "Deploy (Vercel)" section.

## 2026-09-22 — Claude Code — Second bug found during live verification: offline.html was itself behind auth

**Decided:** While verifying fix 2 (the service worker rewrite) in a real
browser, found that `/offline.html` was not excluded from `src/proxy.ts`'s
auth matcher. The service worker's `install` step fetches `/offline.html` to
precache it; that fetch is same-origin so it carries cookies, but on a
genuinely fresh profile (or any request without a valid passcode cookie) the
proxy redirected it to `/login?from=%2Foffline.html` — and `fetch()`'s
default `redirect: "follow"` behavior meant the *redirected* response (the
login page) got stored in the cache under the `/offline.html` key. The
symptom would have been exactly the kind of bug this corrective pass exists
to fix: going offline would show a stale snapshot of the login page instead
of the intended "no connection" message. Fixed two ways: (1) added
`offline.html` to the proxy matcher's exclusion list, alongside the other
always-public shell files; (2) rewrote the service worker's install step to
fetch with `redirect: "manual"` and throw if any shell URL comes back as a
redirect or non-200, so a future regression of this kind fails the SW
install loudly instead of silently caching the wrong content.
**Why:** This surfaced only because the corrective-pass instructions asked
for the offline path to be verified in a real browser rather than reasoned
about from the code — reading `proxy.ts` and `sw.js` separately, each looked
correct; the bug was in their interaction. Worth recording explicitly since
it's exactly the class of bug ("looks right in isolation, wrong in
combination") that a source-only review can't catch.
**Affects:** `src/proxy.ts`, `public/sw.js`.

## 2026-09-22 — Claude Code — Playwright note: testing SW-intercepted navigation offline

**Decided:** `context.setOffline(true)` did not reliably trigger the service
worker's offline fallback for a top-level navigation in headless Chromium
here — the navigation failed before the SW's fetch handler ran, in a way
that doesn't reflect how a real device's airplane mode behaves with an
active SW. What worked: `context.route(url, route => route.abort(...))`,
but only when matched by URL alone — once the SW's `respondWith()`
intercepts the navigation, the request Playwright can still see and abort is
the *SW's own internal* `fetch(request)` call, which reports
`isNavigationRequest() === false` even though it's fetching the navigated
URL. Matching on `isNavigationRequest()` (the seemingly-obvious approach)
silently never fires.
**Why:** Purely a testing-tool note, not an app decision — logged so a later
agent verifying offline behavior doesn't lose the same time rediscovering it.
**Affects:** Nothing shipped; verification method only.

## 2026-09-22 — Claude Code — Section 3: how the bottom bar picks "which class"

**Decided:** The brief only spells out class-resolution for "Catch a note"
("class, pre-filled if only one is plausible"). Applied the same rule to
"Log a class" for consistency, via one shared pure function
(`pickObviousClass` in `src/lib/class-picker.ts`): if there is exactly one
non-archived class, use it; else if exactly one class meets today, use it;
else it's ambiguous. On ambiguous, a minimal `ClassPickerSheet` (one tap:
the class name) appears before the note/log sheet, rather than guessing.
Kept the per-card "Log this class"/"Note" buttons from section 2 as-is —
they remain the direct, unambiguous path when you're already looking at a
specific card; the bottom bar is the reachable-from-anywhere path section 3
asks for. Both open the same `LogSheet`/`NoteSheet` components.
**Why:** "Pre-filled if only one is plausible" implies a heuristic exists,
but the brief never defines it precisely or says what happens otherwise.
Guessing wrong would be worse than one extra tap — a note attributed to the
wrong class is data corruption, not an inconvenience. "Meets today" (not,
say, "most recently taught" or "next by start time") was chosen because
`startTime` is explicitly free text in the schema, not a real time type, so
there's no reliable way to rank multiple same-day classes by proximity to
now; "meets today" is the one signal the schema actually supports.
**Affects:** `src/lib/class-picker.ts` (new), `src/components/BottomBar.tsx`
(new), `src/components/ClassPickerSheet.tsx` (new), `src/components/TodayScreen.tsx`.

## 2026-09-22 — Claude Code — Section 4: weekly review built now, resolving an open question

**Decided:** `AGENTS.md`'s open questions listed "whether the weekly review
is worth building before the daily loop has been used for a month. Probably
not." Built it anyway this pass, on Eason's explicit instruction to continue
section 4 (which bundles `/class/[id]` and `/review` together in the
brief). Removing the resolved line from `AGENTS.md`'s open questions below —
also removed the Turso-vs-Postgres line there while touching that list,
since it was resolved (see the 2026-09-22 Neon decision above) but never
struck off.
**Why:** "Probably not" was a default absent other instruction, not a
standing rule — an explicit "continue section four" is exactly the kind of
instruction that overrides a soft default. Logging this rather than silently
building it, since a later agent reading the open-questions list would
otherwise wonder why it was ignored.
**Affects:** `AGENTS.md` (open question removed), `src/app/review/`.

## 2026-09-22 — Claude Code — Section 4: syllabus edits preserve progress by exact-title match

**Decided:** "Reorder by rewriting" (the brief's words) is implemented as:
parse the textarea into lines, and for each line, if its text exactly
matches an existing unit's title, that unit is kept (same id, same `done`,
new `position`) — otherwise it's treated as a brand-new unit (`done: false`).
Existing units whose exact title doesn't appear anywhere in the new text are
deleted. Pure diffing logic lives in `src/lib/syllabus.ts` (tested), applied
sequentially (not in a transaction — see the note below) by
`updateSyllabusAction`.
**Why:** The brief specifies the interaction (rewrite the whole list) but
not the data semantics underneath it. The alternative — matching by line
*position* instead of exact text — would silently reassign `done` flags to
the wrong units the moment a line is inserted or removed above others,
which is worse than the chosen behavior's one sharp edge (rewording a line
resets that unit's progress, since it now reads as new). Rewording being
rare relative to reordering/adding/removing, and progress loss being
visible immediately (the unit shows unchecked), made this the safer
default over trying to fuzzy-match reworded titles.
**Affects:** `src/lib/syllabus.ts` (new), `src/app/actions.ts`
(`updateSyllabusAction`), `src/components/SyllabusSection.tsx`.

## 2026-09-22 — Claude Code — Section 4: multi-step writes stay un-transacted

**Decided:** `updateSyllabusAction`'s delete/update/insert sequence (and
`logSessionAction`'s session-upsert + unit-finish + note-insert sequence
from section 2) run as separate sequential statements, not inside a
`db.transaction()`.
**Why:** The app's driver (`drizzle-orm/neon-http`, chosen in an earlier
decision above) talks to Neon over HTTP, one statement per round trip;
multi-statement transactions aren't a good fit for that driver the way
they are for a persistent wire-protocol connection. For a single-user app
with no concurrent writers, the actual risk a transaction would guard
against — two different requests interleaving mid-write — doesn't arise in
practice. Worth writing down so nobody "fixes" this by adding a transaction
that either doesn't work with this driver or adds complexity for a race
condition that structurally can't happen here.
**Affects:** `src/app/actions.ts`.

## 2026-09-22 — Claude Code — Section 4: "keeps coming back" counts across all classes, not per class

**Decided:** `countRecurringStuck` (in `src/lib/recurring-stuck.ts`) pools
every session's `stuck` value from every non-archived class before
normalising and counting — it is one global list on `/review`, not one list
per class.
**Why:** The brief's own example — "these four students all need a lesson
on articles" — describes a pattern showing up *across* the roster, which a
per-class breakdown would fragment into several single-digit counts instead
of surfacing the cross-class signal that makes this "the highest-value
thing in the app" (the brief's words). A student-attribution or per-class
breakdown was left out for the same reason section 2 didn't build it: the
chips already exist to make values repeat exactly, and anything past a
flat count-and-sort is the "something clever" the brief explicitly says to
avoid.
**Affects:** `src/lib/recurring-stuck.ts` (new), `src/db/queries.ts`
(`getReviewData`), `src/components/ReviewScreen.tsx`.

## 2026-09-22 — Claude Code — Section 4: what "edit class" and "archive" mean

**Decided:** "Edit" (brief: "Edit and archive class") opens a form for every
field the class has — name, level, days, start time, students — since the
brief never specifies a subset and there's no class-creation screen yet to
have already covered some of them. `days` and `students` are edited as
comma-separated free text (matching how they're already free-form
string arrays in the schema, and how `level`/`startTime` are already
free text), not chip-pickers or structured inputs. "Archive" is a
reversible toggle (`toggleArchiveAction`, flips `archived` back and forth),
not a delete — consistent with `notes.done` and the rest of the schema's
soft-state pattern, and because an accidental archive shouldn't need a
database console to undo.
**Why:** These are gaps the brief left for an agent to fill sensibly rather
than genuine ambiguities to flag; recorded so a later agent building the
still-missing class-*creation* screen reuses the same field set and input
style rather than inventing a second convention.
**Affects:** `src/components/ClassEditSection.tsx` (new), `src/app/actions.ts`
(`updateClassAction`, `toggleArchiveAction`).

## 2026-09-22 — Claude Code — Section 5: what "optimistic UI on every write" means here

**Decided:** Built true optimistic UI (React 19's `useOptimistic`, instant
update, silent revert on failure) for the two checkbox interactions —
ticking a note or a syllabus unit done — via a new shared
`src/components/NoteChecklist.tsx` (used by both `ClassCard` and
`ReviewScreen`) and `SyllabusSection`'s own optimistic unit list. Did
**not** make the multi-field forms (log sheet, catch-a-note, class edit,
syllabus rewrite) optimistic in the same sense — they still show a
"Saving…" pending state and only close on confirmed success.
**Why:** The brief's own justification — "I am on school wifi; a spinner
between me and saving a note means I will stop using this" — describes
exactly the tap-and-move-on interactions a checkbox is, not a multi-field
form you're actively composing. Optimistically closing the log sheet before
the write is confirmed would mean walking back into class having *seen*
"saved" for something that then silently failed in the background — worse
than a brief pending state, and in direct tension with the very next brief
line ("if a write fails, keep the text in the form and say what happened").
The checkbox taps have no form to keep open and nothing to lose by reverting
visibly; the forms do.
**Affects:** `src/components/NoteChecklist.tsx` (new), `src/components/ClassCard.tsx`,
`src/components/ReviewScreen.tsx`, `src/components/SyllabusSection.tsx`,
`src/app/actions.ts` (`toggleNoteAction`/`toggleUnitAction`/`toggleArchiveAction`
now return `{ok, error?}` instead of `void`, so callers can revert).

## 2026-09-22 — Claude Code — Section 5: write failures return a message, never throw

**Decided:** Every server action's database calls are now wrapped in
try/catch. A thrown error is logged server-side and turned into a returned
`{error: "...", success: false}` (form actions) or `{ok: false, error}`
(checkbox toggles) instead of propagating as an unhandled exception.
**Why:** Before this, a genuine write failure (not a validation error —
an actual DB/network exception) would have propagated past `useActionState`
into React's nearest error boundary, unmounting the log sheet and losing
whatever was typed. The brief is explicit that this must never happen
("never silently lose typed text"). Since every field in the log sheet and
catch-a-note sheet is already React-controlled state (not reset until
`onClose()` fires on confirmed success), catching the error and returning
it was the only piece missing — the text was already safe, it just needed
a path that didn't crash the component tree to say so.
**Affects:** `src/app/actions.ts` (every mutating action).

## 2026-09-22 — Claude Code — Section 5: export replaces, doesn't merge; format and auth

**Decided:** `GET /api/export` returns `{exportedAt, classes, units,
sessions, notes}` — a flat dump of all four tables, timestamps as ISO
strings. `POST /api/import` accepts the same shape and **replaces every
row** (delete children → classes, then insert classes → children, both in
FK-safe order) rather than merging or upserting. Both routes require the
same passcode cookie as the rest of the app (enforced by `src/proxy.ts`'s
matcher, which doesn't exclude `/api/export` or `/api/import`, plus
`assertAuthenticated()` inside each handler as defense in depth, matching
every other action). No in-app UI triggers either — they're `curl`-level
tools, documented in the README with example commands.
**Why:** The brief's justification is "I want to be able to leave" — a
personal backup/restore/migrate-away escape hatch, not a mainstream feature,
so it doesn't need (or deserve) a phone-first screen per `AGENTS.md`'s scope
rule. Replace-not-merge was chosen because merge semantics need conflict
rules the brief never specified (what happens when both sides have a
session for the same class+date?), while replace has one unambiguous
meaning: this file is now the truth. Validation
(`src/lib/export-format.ts`, tested) is deliberately shallow — checks shape
and required fields, not a full schema validator — because the database's
own constraints (NOT NULL, foreign keys, the sessions unique index) catch
anything this misses; it exists to turn "the whole import silently 500s
after partially deleting your data" into a clear 400 with a specific
message *before* anything is touched.
**Affects:** `src/app/api/export/route.ts` (new), `src/app/api/import/route.ts`
(new), `src/lib/export-format.ts` (new).

## 2026-09-22 — Claude Code — Section 5: the two remaining named tests, and why they're pure-function tests

**Decided:** Extracted `toTodayClass` (previously private to `queries.ts`)
into `src/lib/today-class.ts`, matching the established pattern for
DB-import-free pure logic. `src/lib/today-class.test.ts` covers "the Today
card always shows the most recent session's nextOpener" and "toggling a
unit done advances the current-unit marker" as unit tests against
hand-built input arrays — no database needed. Two further tests in
`src/db/session-upsert.test.ts` (DB-gated, per the existing pattern) confirm
the piece the pure tests can't: that the actual SQL query
(`orderBy(desc(date), desc(createdAt))` for sessions, `orderBy(asc(position))`
for units) really does hand `toTodayClass` its rows in the order that logic
assumes.
**Why:** `queries.ts` imports `src/db/index.ts`, which throws at module
load if `DATABASE_URL` isn't set — so nothing in `queries.ts`, pure or not,
can be imported by a test in an environment with no database configured
(exactly the reasoning behind pulling `countRecurringStuck`,
`pickObviousClass`, and `deriveInitialFormValues` out in earlier passes).
Splitting the *selection logic* (pure, cheap, thoroughly testable) from the
*ordering guarantee* (needs a real database to mean anything) tests both
halves of the actual risk instead of picking one and hoping the other holds.
This completes all three tests build-brief.md section 5 names by number;
the third (same-day edits) was already covered in the corrective pass.
**Affects:** `src/lib/today-class.ts` (new), `src/lib/today-class.test.ts`
(new), `src/db/queries.ts` (now re-exports rather than defines
`toTodayClass`/`TodayClass`), `src/db/session-upsert.test.ts`.

## 2026-09-22 — Claude Code — Real bug found live-testing section 5's own write-failure requirement

**Decided:** Found, while verifying "if a write fails, keep the text in the
form and say what happened," that a *client-side network failure* (the
actual request never reaching the server — dropped wifi, not a server
error) crashed the whole app to a browser-level "This page couldn't load /
Reload / Back" screen, losing everything typed. Root cause: `<form
action={someServerAction}>` driven by `useActionState` is a real, navigable
HTML form; when React's JS-based interception of the submission fails at
the network layer, the form's native submission behavior isn't fully
suppressed, and the browser falls back to an actual top-level navigation
attempt against that action — which then fails as a real navigation, not a
catchable promise rejection. The server-side try/catch from a few decisions
above (task "write failures return a message, never throw") only covers
failures *after* a request reaches the server; it cannot touch a request
that never arrives.

Fixed by dropping `useActionState`'s form-action wiring in `LogSheet`,
`NoteSheet`, and `ClassEditSection`, and replacing it with
`onSubmit={handler}` where the handler calls `event.preventDefault()`
**synchronously, first** (ruling out any native-navigation fallback,
unconditionally) and then invokes the server action manually inside a
`try`/`catch` within a transition, setting local state for both outcomes.
Also added the same try/catch to every other client-invoked server-action
call site that didn't already have one (`SyllabusSection`'s save and unit
toggle, `NoteChecklist`'s note toggle, `ClassEditSection`'s archive toggle,
`LogSheet`'s date-change lookup) — none of those go through a `<form
action>` so they weren't at risk of the *navigation* failure mode, but an
uncaught rejection from an async `startTransition` callback is its own
hazard and the fix was the same shape either way. Along the way, also
noticed `SyllabusSection`'s save handler discarded `updateSyllabusAction`'s
returned error entirely and closed the editor unconditionally — fixed to
show the error and stay open on failure, matching every other form.

**Why:** This is the exact case build-brief.md section 5 exists to catch —
"I am on school wifi" describes *packets not arriving*, not the server
rejecting a well-formed request, and only live testing with an actually
aborted request (not a mocked server error) surfaces the difference. Worth
recording in detail because the failure mode is non-obvious: `<form
action={fn}>` "just works" for the happy path and for server-thrown errors,
which is exactly why the client-side navigation-fallback gap is easy to
ship without noticing — every earlier manual check in this project used
`context.setOffline()` or a working request, never a request that fails
mid-flight while a real `<form>` element is involved.
**Affects:** `src/components/LogSheet.tsx`, `src/components/NoteSheet.tsx`,
`src/components/ClassEditSection.tsx`, `src/components/SyllabusSection.tsx`,
`src/components/NoteChecklist.tsx`.

## 2026-09-22 — Claude Code — Deploy target changed: Vercel → Cloudflare Workers

**Decided:** Deploy via `@opennextjs/cloudflare` to Cloudflare Workers,
replacing the brief's original Vercel pick. Added `wrangler.jsonc` and
`open-next.config.ts`, both committed, plus `wrangler` and
`@opennextjs/cloudflare` as devDependencies and two scripts —
`npm run cf:preview` (build + `wrangler dev`, local only) and
`npm run cf:deploy` (build + `wrangler deploy`, needs a real Cloudflare
account). Requested directly by Eason ("deploy it to cloudflare instead"),
so treated as authorizing whatever deploy tooling that requires, per
`AGENTS.md`'s "ask before adding a dependency" rule.

**Why it fits without other changes:** the app already used
`drizzle-orm/neon-http`, which talks to Neon over plain HTTPS `fetch` rather
than a raw TCP/wire-protocol connection (see the 2026-09-22 "Neon over
Turso" entry above) — the same property that made this driver awkward for
local/CI testing (a separate `pg`-based path exists only for that) is what
makes it run unmodified in a Workers isolate, which has no TCP sockets.
No `src/db/` code changed.

**What was actually verified in this sandbox** (no Cloudflare or Neon
account access here, same constraint as the earlier Vercel attempt):
- `npx opennextjs-cloudflare build` completes cleanly against this exact
  Next.js 16.3.5 / Turbopack setup — no code changes were needed to make
  Turbopack's output convert; some setup guides describe a build failure and
  a workaround of forcing webpack, but that did not reproduce here with this
  package version (`@opennextjs/cloudflare` 1.20.6). If a future upgrade
  reintroduces it, the fix is `next build --webpack` or `turbo: false` in
  `next.config.ts`.
- `npx wrangler dev` then served the built Worker on localhost and was
  exercised with real HTTP requests: unauthenticated `/` correctly
  307-redirects to `/login`; POSTing the right passcode to `/api/login` sets
  the `tmh_passcode` cookie and redirects home; an authenticated request to
  `/` then reaches the DB-backed page and fails with a clean Next.js 500 (not
  a Workers-level crash) — expected, because the `DATABASE_URL` available
  locally is a plain Postgres (`postgres://postgres:...@localhost:5432/tmh`,
  used elsewhere in this project for the `pg`-based test/seed path), and
  `drizzle-orm/neon-http` correctly refuses to speak Postgres wire protocol
  to it. This confirms the request pipeline (Workers runtime, cookies,
  static assets, PWA manifest, React SSR, error boundary) works; it does not
  confirm a real Neon connection over Workers, which needs an account this
  environment doesn't have.
- One real, unavoidable compatibility note: OpenNext's build printed `WARN
  Node.js middleware support is experimental in cloudflare, and not
  officially maintained by OpenNext maintainers.` This isn't a bug in
  `src/proxy.ts` — Next.js 16 made Proxy (middleware's replacement) default
  to the Node.js runtime unconditionally, and explicitly documents that
  setting a `runtime` config to opt back into the Edge runtime "will throw
  an error" (`node_modules/next/dist/docs/.../proxy.md`). So there is no
  Edge-runtime option to fall back to; the experimental-but-working path
  above is the only one available. Worth re-checking this warning on future
  `@opennextjs/cloudflare` upgrades in case it becomes fully supported.
- `npm run lint`, `npx tsc --noEmit`, and `npm test` (49 passed / 4 skipped,
  same as before this change) all stayed clean with the new dependencies.

**Still true, unchanged from the Vercel attempt:** no live deployment exists.
Actually deploying needs `npx wrangler login` and a real Neon
`DATABASE_URL`, neither of which this environment can provide — see
README's "Deploy (Cloudflare Workers)" section for the exact remaining
steps.
**Affects:** `package.json` (deps + `cf:preview`/`cf:deploy` scripts),
`wrangler.jsonc` (new), `open-next.config.ts` (new), `.gitignore`
(`.open-next`/`.wrangler`), `README.md`'s Deploy section,
`docs/build-brief.md`'s deploy-target line.

## 2026-09-23 — Claude Code — Correction: neon-http *can* write atomically, via db.batch()

**Decided:** Correcting the 2026-09-22 "Section 4: multi-step writes stay
un-transacted" entry above. That entry's actual claim — `db.transaction()`
doesn't work on `drizzle-orm/neon-http` — is still true (it throws "No
transactions support in neon-http driver" at runtime; confirmed again by
reading `node_modules/drizzle-orm/neon-http/session.js`). But the
conclusion drawn from it — that multi-statement writes on this driver stay
sequential and un-atomic — was wrong, and the reasoning ("the actual risk a
transaction would guard against — two different requests interleaving
mid-write — doesn't arise in practice for a single-user app") answered the
wrong question. It's true no two *requests* interleave here. It was never
about that: a *single* request's own multi-statement write can itself fail
partway through, and every one of these three multi-statement actions
(`logSessionAction`, `updateSyllabusAction`, `/api/import`) already ran
several dependent writes as separate sequential statements with no
transaction wrapping them. Codex's pressure test on `e550072` reproduced
exactly that: a lesson save that finished a unit and updated the session
but silently dropped the attached note when the write failed partway
through; a syllabus rewrite that deleted a completed unit and then failed
before inserting its replacement; a malformed import that deleted all
existing data and then failed before finishing the reinsert.

`drizzle-orm/neon-http` does support `db.batch([...queries])` — it sends an
array of not-yet-executed queries to Neon as one HTTP request, which Neon's
own driver runs as a single all-or-nothing Postgres transaction
(`client.transaction(builtQueries, ...)` inside neon-http's own `batch()`
implementation). That's the atomicity primitive that was missing, and it
was available the whole time — the earlier entry just didn't go looking for
it once `db.transaction()` turned out not to work.

Added `src/db/atomic.ts`'s `runAtomically(db, build)`, which uses
`db.batch()` when available (neon-http, production) and falls back to a
real `db.transaction()` when it isn't (node-postgres, tests and the seed
script — this driver has the opposite gap: no `batch()`, but does support
real interactive transactions). `build(handle)` returns an array of
queries built against whichever handle it's given, unexecuted — Drizzle
query builders only run when awaited or batched, which is what lets the
same calling code work atomically under both drivers, tests included. All
three actions above now go through it.

One sharp edge discovered writing the regression test for this
(`src/db/atomic.test.ts`): batched queries are all *built* before any of
them execute, so one statement's result can't feed into another within the
same batch (unlike a sequential `await`, or a real interactive
transaction). `logSessionAction` needed the session's row id before it
could build the batch (to link its attached note — see the next entry) —
solved with one plain `select` before the batch, resolving to the existing
row's id or minting a new one, which is exactly what the upsert will end
up using either way. This is also why the (now corrected) reasoning above
mattered: this constraint is real and worth knowing about, it just doesn't
mean "give up on atomicity," it means "resolve anything you need to
reference across statements before building the batch."

**Why this matters beyond these three fixes:** the original entry's error
was trusting a plausible-sounding but unverified claim about what the
driver *couldn't* do, instead of checking the driver's own source. Any
future agent reaching for "should this be atomic" should check
`node_modules/drizzle-orm/neon-http/session.js` directly rather than
trusting this file's account of it — including this one.
**Affects:** `src/db/atomic.ts` (new), `src/db/atomic.test.ts` (new),
`src/app/actions.ts` (`logSessionAction`, `updateSyllabusAction`),
`src/app/api/import/route.ts`.

## 2026-09-23 — Claude Code — notes.sessionId: the log sheet's attached note now upserts instead of always inserting

**Decided:** Added a nullable `sessionId` column to `notes` (FK to
`sessions.id`, cascade delete) with a *partial* unique index
(`notes_session_id_unique`, `where session_id is not null`) enforcing at
most one attached note per session. `logSessionAction`'s optional "watch
for next time" note now upserts against that index
(`onConflictDoUpdate({ target: notes.sessionId, targetWhere: ... })`)
instead of always inserting a new row. A "Catch a note" entry (the
separate bottom-bar capture path, `addNoteAction`) is unaffected —
`sessionId` stays null there, and freestanding notes keep accumulating
exactly as before; nothing about their own done/not-done lifecycle changed.

Also extended `getSessionForDateAction` to look up and return the attached
note's `who`/`text` (new `ExistingSessionFields.watchWho`/`watchText`), and
wired `LogSheet.tsx`'s watch-for fields to be controlled state prefilled
the same way `covered`/`stuck`/`nextOpener` already were, instead of an
always-blank uncontrolled textarea.

**Why:** Codex's finding was "retrying the same lesson duplicated its
attached watch-for note," but the actual root cause is broader than
retries: the note had no relationship to the session at all, so *any*
resubmission of an already-logged day that included watch-for text created
a second note, retry or not — reopening today's already-logged class,
adding more detail to the watch-for field, and saving again would have
silently done this on a completely successful first save too. Giving the
note a real identity tied to its session (rather than trying to detect
"is this a retry" some other way) fixes both at once, and is the same
upsert idiom the session row itself already uses (`onConflictDoUpdate` on
`(classId, date)`) — applied one level down, to the one piece of that save
that didn't have it yet. Deliberately does **not** delete an already-
attached note when watchText is resubmitted blank — notes have their own
lifecycle (ticked off via the checklist, not through this field; see the
2026-09-21 "Separate mid-class capture path" entry), and this field was
never meant to be that control. Prefilling `watchWho`/`watchText` on
reopen (previously they never prefilled at all, even before this fix) is
what makes the upsert semantics legible rather than surprising — without
it, resaving a day would either duplicate the note (the bug) or silently
leave an existing one untouched with no way to tell it was already there.

**Known, accepted gap:** the *fast path* in `handleDateChange` (returning
to today when it's already logged) still doesn't prefill the watch-for
fields — the Today-screen query it reuses doesn't carry the attached note,
only `getSessionForDateAction`'s round trip does, and that fast path exists
specifically to avoid a round trip. Returning to today with the fields
blank and saving leaves an already-attached note untouched (blank
`watchText` never deletes), so this is a UI completeness gap, not a data
risk. Worth fixing if it turns out to matter in practice.

**Verified live** (temporary `drizzle-orm/node-postgres` swap of
`src/db/index.ts` against the local test Postgres, reverted before commit,
same technique as every earlier verification pass — see the 2026-09-22
"How section 2 was verified" entry): via a real running dev server and a
transient Playwright session (`npm install --no-save playwright`,
uninstalled after, never touched `package.json`) — saved a class with a
watch-for note, confirmed one note row with the right `sessionId`;
reopened the log sheet, changed the date away and back to trigger the real
`getSessionForDateAction` round trip, confirmed `watchWho`/`watchText`
prefilled correctly from the database; resubmitted unchanged (simulating a
retry) and confirmed still exactly one note; edited the text and resaved,
confirmed the same note updated in place rather than a second one
appearing. `src/db/atomic.test.ts` covers the same upsert shape against the
node-postgres test driver as a fast, DB-gated regression test.
**Not verified:** the real neon-http `db.batch()` path against an actual
Neon endpoint — no Neon account in this environment, same limitation as
every deploy-related entry above. Asked Codex to independently re-run
their original pressure-test reproduction against this fix.
**Affects:** `src/db/schema.ts` (migration `0002`), `src/app/actions.ts`
(`getSessionForDateAction`, `logSessionAction`), `src/lib/log-sheet-form.ts`,
`src/lib/log-sheet-form.test.ts`, `src/components/LogSheet.tsx`,
`src/lib/export-format.ts` (`ExportedNote.sessionId`).

## 2026-09-23 — Claude Code — LogSheet: a failed date lookup now blocks Save instead of silently risking the wrong date

**Decided:** `LogSheet.tsx`'s date-change handler used to catch a failed
`getSessionForDateAction` lookup with only `console.error` — the date field
had already moved to the new date, but the text fields kept whatever was
on screen before, with nothing telling the teacher those two things might
now belong to different dates. Hitting Save in that state silently wrote
the leftover text under the new date, which is exactly what Codex's
finding reproduced: "a failed date lookup silently retained today's form
values under an older date; saving then overwrote the older lesson."
Fixed with a new `dateLookupError` state: on failure, the text is left
alone (still "nothing typed is at risk," which is what the original
comment here was actually trying to protect), but Save is disabled and an
inline error with a Retry button appears; `handleSubmit` also bails out
directly on `dateLookupError` as defense in depth alongside the disabled
button.

**Why:** The original code's comment reasoned about the wrong risk —
"nothing typed is at risk" is true and was never the problem; the problem
is *where* it gets saved. Blocking Save until the lookup either succeeds or
the date is changed again is the smallest fix that makes both properties
hold at once: nothing typed is lost, and nothing gets written under a date
whose actual contents are still unknown.
**Verified live**, same session as the entry above: intercepted the
date-lookup's network request with Playwright and forced it to fail,
confirmed Save became disabled and the Retry affordance appeared, then
un-intercepted and clicked Retry, confirmed Save re-enabled — and confirmed
via `/api/export` that nothing was ever saved under the date that had
failed its lookup.
**Affects:** `src/components/LogSheet.tsx`.

## 2026-09-23 — Claude Code — Service worker: Next's client-side RSC fetches are now network-only too

**Decided:** `sw.js`'s fetch handler treated any request that wasn't a
full-page navigation (`request.mode === "navigate"`) or under `/api/` as
safe to cache-first, on the assumption those were the only two shapes a
data-bearing request could take. Next.js App Router client-side navigation
and prefetching don't do a full navigation, though — they fetch the target
page as an RSC payload, carrying the same class data a full reload would,
with `request.mode` of `"cors"`/`"same-origin"`, never `"navigate"`. That
fetch fell through to the generic cache-first branch and got treated like
a static asset — Codex's finding: "the service worker returned stale data
for a simulated Next.js client-navigation/RSC request, despite full-page
navigation bypassing the cache." Fixed by (1) explicitly detecting these
requests via the headers Next always sets on them (`rsc`,
`next-router-state-tree`, `next-router-prefetch`, `next-url` — confirmed
against `node_modules/next/dist/client/components/app-router-headers.js`
for this exact Next 16.3.5 install rather than assumed from memory) and
passing them straight to the network, and (2) flipping the fallback
handler from a denylist to an allowlist: only `/_next/static/*` and the
explicit shell files (`SHELL_URLS`) are cache-first now; anything
unrecognized falls through to the network uncached rather than being
assumed safe. Bumped `SHELL_CACHE` to `tmh-shell-v3` (per this file's
existing convention) to purge anything cached under the old, wrong
assumption.
**Why the allowlist flip, not just the header check:** the header check
fixes the specific reported case; the denylist-to-allowlist flip is a
defense-in-depth answer to the underlying premise the original code got
wrong — assuming an unrecognized request shape is safe to cache is exactly
the assumption that made the RSC case fall through unnoticed. A future
request shape this file hasn't accounted for now fails safe (uncached,
correct-but-slower) instead of failing unsafe (cached, possibly stale).
**Verified live**, same session as the entries above: registered the real
service worker in a Playwright-driven browser, cleared its cache, issued a
`fetch("/", { headers: { RSC: "1" } })` from page context (the same header
Next's own router fetch carries), changed real class data through the app
between two such fetches, and confirmed the second one reflected the
change rather than returning identical (cached) bytes; confirmed the cache
never gained an entry for that URL; confirmed a real `/_next/static/`
script still does get cached, so the allowlist flip didn't break the
caching this file exists for.
**Affects:** `public/sw.js`.

## 2026-09-23 — Claude Code — Import validation: referential integrity and type checks added

**Decided:** `validateExportPayload` was deliberately shallow (checks
shape + required-field presence, not full types or cross-references) —
reasonable on its own, but combined with the import route's writes not
being atomic (fixed above, same pass), it meant a payload with the right
shape but a dangling reference (a unit/session/note's `classId` pointing at
no class in the payload, or two notes sharing a `sessionId`) sailed past
validation, got most of the way through the delete-then-reinsert sequence,
and then failed at the database's own constraints *after* existing data
was already gone — Codex's finding: "a malformed import passed validation,
deleted existing data, then failed." Added: type checks for `days`/
`students` (string arrays), `archived`/`done` (booleans), `position`
(number); duplicate-id detection within each table; and referential checks
that every `classId` (all four tables) and `sessionId` (notes) actually
resolves to a row present in the *same payload*, plus that at most one
note claims a given non-null `sessionId`.

**Why this is additional to, not instead of, the atomicity fix:** the
import route's writes are now atomic regardless (see the correction entry
above) — a payload that gets past this and still fails a real constraint
no longer loses anything, it just gets a rollback and a 500. This
validation exists so the *common* malformed-import case gets a clear,
specific 400 before ever touching the database, rather than relying on the
safety net for something preventable. Still deliberately not a full schema
validator (no date-format validation, for instance) — same reasoning as
the original entry: the database's own constraints catch what's left,
now safely.
**Verified live**, same session as the entries above: against the real
running `/api/import` route and the local test Postgres, sent an import
with two sessions sharing the same `(classId, date)` — passes this
validation (nothing here replicates the sessions table's own unique
constraint, which felt like exactly the kind of DB-specific detail this
file's "not a full schema validator" philosophy says to leave to the
database) — confirmed it failed with the new rolled-back-cleanly error
message, and confirmed via `/api/export` immediately after that all
pre-existing data (3 classes, 7 units, 5 sessions, 2 notes) was completely
unchanged. Also confirmed a plain export-then-reimport of that same data
round-trips successfully (the strengthened validation doesn't reject
well-formed real exports).
**Affects:** `src/lib/export-format.ts`, `src/lib/export-format.test.ts`.

## 2026-09-23 — Claude Code — F1 follow-up: Codex's exact repro payloads, and a missing createdAt check

**Decided:** Codex posted (GitHub issue #1) the two exact payloads their
pressure test used for F1, with more precision than my own reproduction:
(a) `{classes:[{id:'bad',name:'Missing timestamp'}],units:[],sessions:[],
notes:[]}`, and (b) a well-formed note referencing a `classId` absent from
the payload. (b) was already caught by the referential-integrity check
added in the fix batch above. (a) exposed a real gap: my validator checked
`days`/`students`/`archived` but never checked `createdAt` was present at
all — a class (or session, or note) missing it would have passed
validation, then hit `new Date(undefined)` (silently produces an Invalid
Date, doesn't throw) when the import route builds its insert, only failing
once that value reached the database. Given `/api/import` is now atomic
either way (previous entry), this no longer *loses data* — but it would
still surface as an opaque DB-layer failure instead of a clear validation
message, exactly the gap this file's validation exists to close. Added a
`createdAt` string-type check to all three tables that have the field
(classes, sessions, notes).
**Verified:** both of Codex's exact payloads, sent to the real running
`/api/import` route against the local test Postgres, now return a 400
before any write is attempted; pre-existing data (3 classes / 6 units / 6
sessions / 4 notes at the time of this check) was unchanged after each.
Added both exact payloads as regression tests in
`src/lib/export-format.test.ts`.
**Affects:** `src/lib/export-format.ts`, `src/lib/export-format.test.ts`.

## 2026-09-23 — Claude Code — F7: login's `from` redirect was an open redirect

**Decided:** Codex found (GitHub issue #1, confirmed via real local HTTP,
not just source review) that `POST /api/login`'s `from` field accepted
`//example.invalid/after-login` and redirected there after a successful
login — `from.startsWith("/")` is true for a protocol-relative URL too,
and `new URL(redirectTo, request.url)` resolves `//host/path` to that
*other* host, keeping only the scheme from the base. Fixed with
`src/lib/safe-redirect.ts`'s `safeRedirectPath(from, origin)`: resolves
`from` against the app's own origin using the platform's URL parser and
only accepts the result if its `.origin` still matches — rejecting
anything that resolves elsewhere, however it's spelled, rather than
pattern-matching known bypass strings.
**Why resolve-and-compare instead of stricter string checks:** Codex's
report also flagged backslash variants (`/\example.invalid/...`) as a
likely second bypass, since the WHATWG URL spec normalizes backslashes to
forward slashes for http(s) *before* parsing — so a stricter
`from.startsWith("/") && !from.startsWith("//")` check would still miss
that one. Enumerating denylist patterns is exactly the shape of mistake
`sw.js`'s F6 fix (same issue thread) moved away from for the same reason:
the next bypass shape is always one the list doesn't have yet. Resolving
against the real origin and checking `.origin` equality asks the actual
question ("does this end up somewhere else") using the browser's own URL
semantics, so it's correct for any bypass encoding without needing to
know about it in advance.
**Verified live**, real running `/api/login` route against the local test
Postgres: Codex's exact repro (`from=//example.invalid/after-login`) now
redirects to `/`; the backslash variant does too; a legitimate same-origin
`from` (`/class/example-class`) still redirects correctly; no `from` at
all still defaults to `/`.
**Affects:** `src/lib/safe-redirect.ts` (new), `src/lib/safe-redirect.test.ts`
(new), `src/app/api/login/route.ts`.

## 2026-09-23 — Claude Code — Correction: F5's "accepted gap" was the ordinary reopen flow, not an edge case

**Decided:** Codex's independent retest of `0b1033f` found that the
previous F5 fix's "accepted, documented gap" (watch-for fields don't
prefill when returning to an already-logged today) was scoped too
narrowly. `deriveInitialFormValues` runs on **every mount**, and it never
had the attached note to begin with — so the gap wasn't just "switching
dates away from and back to today," it was the plain, ordinary case of
opening the log sheet for a class already logged today with a note
attached. The field looked empty; typing a new observation into it and
saving replaced the original via the upsert, which is real, silent data
loss — worse than the original entry characterized it ("not a data-loss
risk... blank never deletes"), since that's only true if the field is
*left* blank, not if the user engages with an apparently-empty field.

Fixed at the root instead of patching the client further: `TodayClass`
(via `loadClassParts` in `src/db/queries.ts`) now carries
`latestSessionNote` — the most recent session's attached note, looked up
by `sessionId`, independent of the `openNotes` done-filter (a ticked-off
attached note still needs to be visible here; this field isn't about
what's still "open," it's about what's already on file). `LogSheet.tsx`
now has this synchronously on mount, same as the other three fields, so no
new loading state or round trip was needed — the "fast path avoids a
round trip for today" design that caused the original gap stays intact,
it just has correct data to work with now. The "return to today"
date-change branch was fixed the same way.
**Why this needed a schema-adjacent fix, not just a client patch:** an
async on-mount fetch (call `getSessionForDateAction` on open too, not just
on date change) would have worked, but adds a loading/error state to get
right for a value that's already computed once per class on every
Today-screen load anyway — carrying it through `TodayClass` is one extra
per-class query (already doing N+1 here, per the existing comment) against
a whole new client-side race to reason about.
**Verified live**, real dev server against local Postgres + a transient
Playwright session (same technique as prior passes): logged today's class
with a watch-for note; full page reload (not just closing the modal —
this is what makes it the ordinary flow, not carried-over client state);
reopened the log sheet; confirmed both watch-for fields were already
filled with the original values; edited only the `covered` field and
resaved; confirmed the original note text survived unchanged (one note,
not lost, not duplicated).
**Affects:** `src/db/queries.ts` (`loadClassParts`, `getTodayData`,
`getClassDetail`), `src/lib/today-class.ts` (`TodayClass.latestSessionNote`),
`src/lib/log-sheet-form.ts`, `src/lib/log-sheet-form.test.ts`,
`src/components/LogSheet.tsx`, `src/lib/class-picker.test.ts` (stub updated
for the new required field).

## 2026-09-23 — Claude Code — F8: overlapping first-time saves could false-fail on a foreign-key race

**Decided:** Codex found a real race in the F2 atomicity fix itself:
`logSessionAction` resolved the session's id with a plain `SELECT` before
building the atomic batch (needed because a batch can't feed one
statement's result into another — see the "Correction" entry above). Under
two overlapping requests saving the *first* session for the same
class+date, both `SELECT`s can see "no row yet" and each mints its own
id. The slower request's session upsert then loses the `(classId, date)`
conflict — Postgres keeps the faster request's row and id — but the
slower request's note insert still targets the id *it* minted, which was
never actually persisted, violating the `notes_session_id_sessions_id_fk`
foreign key. The atomic batch correctly rolls back (no corruption), but
the slower request's user sees a false "couldn't save" for an entirely
valid concurrent save.

Fixed by not guessing the id at all: the session upsert now uses
`.returning({ id: sessions.id })` directly, in its own statement (an
`INSERT ... ON CONFLICT ... RETURNING` is already atomic on its own, and
already idempotent to retry, the same as the rest of the session-upsert
semantics), and that returned id — the actually-persisted row's, whichever
request won the conflict — is what the subsequent batch (unit-finish,
note-upsert) uses. This removes the separate pre-read entirely rather than
adding another one; both concurrent requests now correctly resolve to the
same row.
**Why not a correlated subquery instead** (resolving the note's
`session_id` via `SELECT id FROM sessions WHERE ...` inside the same
batched insert, so the whole thing stays one atomic write): considered it,
but it pushes real complexity into a raw SQL fragment mixed with Drizzle's
typed query builder for uncertain benefit — splitting into "one atomic
upsert-with-returning" followed by "one atomic batch using its result" is
easier to read and verify, and the only thing it gives up is atomicity
between the session's own field values and the unit+note pair, which
matters less: the session fields are idempotent/non-destructive to retry
(unlike the unit+note pair, which is exactly what F2 was about — "unit
finished but note not saved" can no longer happen, since those two are
still batched together).
**Verified**: `src/db/atomic.test.ts` now has a `Promise.all` of two
concurrent first-time saves for the same fresh class+date, each with a
different attached note, confirming both succeed and resolve to the same
session id with exactly one note — mirroring Codex's own PGlite
reproduction technique (`Promise.all` of two action-equivalent calls
against a real, disposable database) as closely as this project's testing
architecture allows (see the "no real Neon endpoint" limitation, still
unchanged, noted throughout this file).
**Affects:** `src/app/actions.ts` (`logSessionAction`), `src/db/atomic.test.ts`.

## 2026-09-23 — Claude Code — Correction: the F8 fix above reopened F2; both now fixed together

**Decided:** The F8 entry immediately above claimed splitting the session
upsert out of the atomic batch (to get its id via `.returning()` before
building the rest) "gives up [atomicity] between the session's own field
values and the unit+note pair," and judged that acceptable because session
fields are idempotent to retry. Codex independently retested and proved
that reasoning wrong with a live repro against the actual action: install
a trigger that forces the note insert to fail, call `logSessionAction`
with changed `covered`/`nextOpener` on a class+date that already had a
real saved session — the action correctly reports failure, but the
session's fields had *already committed* by then (that statement wasn't
in the batch that failed), silently overwriting the real, previously-saved
lesson content. "Idempotent to retry" was answering a question nobody
asked; the actual property that matters is "a failed save must never
change what's already on file," and splitting the write into two
sequential steps broke exactly that, for exactly the case F2 exists to
prevent.

Fixed by keeping the session upsert, unit-finish, and note-upsert in one
atomic batch again — restoring what the original F2 fix had — while still
fixing F8's race, using the correlated-subquery approach this file
previously considered and passed over for complexity reasons: the note's
`sessionId` is now `sql`(select ${sessions.id} from ${sessions} where
${sessions.classId} = ${classId} and ${sessions.date} = ${date})`` — a
value resolved by Postgres *at execution time, inside the same
transaction*, against whichever row the session upsert statement (earlier
in the same batch) actually just committed. This needs no JS-side id at
all, guessed or returned: it's correct under a race for the same reason
the rest of a single transaction's statements see each other's effects,
which this project already relied on once before (the very first version
of the F2 batch, referencing a session id inserted by an earlier statement
in the same batch — see the "Correction: neon-http *can* write atomically"
entry above). The complexity concern that ruled this out originally was
overstated: it's one `sql` template per reference, not a hand-rolled
INSERT...SELECT.

**Why this is right, not just passing the specific test**: reasoning
about a fix's tradeoffs by category ("this only affects idempotent
fields") is exactly the kind of unverified claim the very first
correction in this file (2026-09-23, "neon-http *can* write atomically")
already flagged as the wrong way to reach for this class of guarantee —
the same lesson applied twice in one day. The fix here removes the
tradeoff instead of arguing it's acceptable.
**Verified**: `src/db/atomic.test.ts` has a new test reproducing Codex's
exact scenario (a real prior session with known `covered`/`nextOpener`, an
unfinished unit, a forced note-insert failure via a deliberate FK
violation independent of the sessionId-subquery mechanism) confirming the
session's fields *and* the unit's `done` state are both unchanged after
the failed batch — alongside the existing F5 (upsert-not-duplicate) and F8
(overlapping-saves) tests, all passing together now. Also verified live:
installed an actual Postgres `BEFORE INSERT` trigger on `notes` that
raises an exception (mirroring Codex's exact repro technique), drove the
real running app through a real browser to attempt exactly Codex's
scenario, and confirmed via `/api/export` that the session's `covered`/
`nextOpener` and the class's already-attached note were both unchanged
after the reported failure. A plain, non-forced save was also re-verified
end-to-end (session + note both save correctly with the new
subquery-based `sessionId`) to confirm the happy path wasn't broken by
this change.
**Affects:** `src/app/actions.ts` (`logSessionAction`), `src/db/atomic.test.ts`.

## 2026-09-23: ESLint ignores must list Cloudflare/OpenNext build output explicitly

**Decided:** `eslint.config.mjs` uses `globalIgnores([...])` to restate
`eslint-config-next`'s default ignore list (`.next/**`, `out/**`,
`build/**`, `next-env.d.ts`) — per that config API, a `globalIgnores` call
*replaces* the preset's own ignores rather than adding to them, so
anything not repeated here is linted. Codex reported (GitHub issue #1,
verification of ae6a71d) that a plain `npm run lint` fails with ~540
errors once `.open-next/` exists on disk from a Cloudflare build (`npm run
cf:preview` / `cf:deploy`, added in the "Switch deploy target from Vercel
to Cloudflare Workers" work) — ESLint was linting OpenNext's generated,
non-source bundle output (`worker.js`, `server-functions/default/*.mjs`,
etc.) as if it were project code. Confirmed by reproducing locally:
`npx opennextjs-cloudflare build` regenerates `.open-next/`, and
`npm run lint` failed with 540 errors/16531 warnings against it before
this fix, passed with zero output after.

Fixed by adding `.open-next/**` and `.wrangler/**` (the other
Cloudflare/OpenNext build-output directory, both already in `.gitignore`)
to the restated ignore list, alongside the existing four entries — not by
switching to an "extend, don't replace" pattern, since that would be a
larger change than the one-line gap Codex actually found, and the existing
four entries are already correct for this project's build outputs.

**Why this is right, not just passing the specific test**: this is a
tooling/lint-reproducibility issue, not a runtime or data-safety one — it
never touched what the app does, only what a contributor's plain `npm run
lint` reports after building for Cloudflare. Codex explicitly flagged it
as "a tooling issue, not a demonstrated runtime blocker." No behavior
change; verified the fix doesn't hide anything else by running the same
build-then-lint reproduction with and without the fix and confirming the
error set is entirely `.open-next/` generated-code findings (unused vars,
`@ts-ignore`, `require()` imports in bundled bootstrap code) with nothing
from `src/`.

**Verified**: reproduced Codex's exact failure (`npx opennextjs-cloudflare
build` then `npm run lint` without the fix → 540 errors, all inside
`.open-next/`), then confirmed the fix resolves it (same build output,
`npm run lint` with the fix → clean, no output). Also ran the full check
suite after cleaning up the build artifacts: `npm run lint` (clean),
`npx tsc --noEmit` (clean), `npm test` with `DATABASE_URL` set against
local Postgres (84 passed, 0 skipped, including the DB-backed
`atomic.test.ts` suite), `npm run build` (succeeds). `.open-next/` and
`.wrangler/` removed from disk afterward — not committed, matching
`.gitignore`.
**Affects:** `eslint.config.mjs`.

## 2026-09-23: F9 — Cloudflare asset URL canonicalization broke offline-shell install

**Decided:** Codex found (GitHub issue #1, real Wrangler runtime against
`35b6d74`) that `GET /offline.html` returns a 307 to `/offline` under
Cloudflare Workers' static asset serving, and that `public/sw.js`'s
`install` handler — which deliberately uses `redirect: "manual"` and
throws on anything that isn't a direct 200, specifically so a shell asset
silently landing behind a redirect (as happened once before with
`offline.html` sitting behind auth, see the 2026-09-21 entry) fails the
install loudly instead of quietly precaching the wrong response — throws
`Shell asset /offline.html did not return 200 (307)` and never installs
under Cloudflare at all. This is Cloudflare-specific: the plain Next.js
dev/production server (and everything both of us had verified `sw.js`
against so far) serves `/offline.html` directly with no redirect.

Root cause: Cloudflare Workers' asset-serving layer has its own
`html_handling` option (`wrangler`'s config schema —
`node_modules/wrangler/config-schema.json`), independent of anything
Next.js or this project's own code controls, defaulting to canonicalizing
`.html` URLs to their extensionless form via a redirect (the same
"auto-trailing-slash"-style behavior Cloudflare Pages has always had for
static HTML). `wrangler.jsonc`'s `assets` block never set it, so it ran
on the default.

Fixed by setting `"html_handling": "none"` in `wrangler.jsonc`'s `assets`
block — serves an `.html` request at its literal URL, matching what
`public/sw.js`'s `SHELL_URLS` already assumes and what the plain Next
server already does, with no other behavior change needed on either side.
Checked this doesn't affect anything else this app serves as a static
asset: `public/` only contains `offline.html` and `sw.js` (`manifest.webmanifest`
and `favicon.ico` are Next-generated app routes, not files in `public/`,
so `html_handling` — which only canonicalizes `.html` URLs — doesn't touch
them), so the setting is exactly scoped to the one file it needed to fix.

**Why this is right, not just passing the specific test**: this is a
platform-serving-layer default fighting an intentional safety choice
already made in `sw.js` (fail loud on a redirected shell asset rather than
silently cache the wrong thing) — the fix removes the platform behavior
that was fighting it, rather than loosening the `sw.js` guard to tolerate
a redirect, which would have reintroduced exactly the silent-wrong-cache
risk that guard exists to prevent.

**Verified**: reproduced Codex's exact failure first — fresh
`npx opennextjs-cloudflare build`, `npx wrangler dev --local`, real HTTP
`GET /offline.html` → 307 to `/offline`, confirmed with `curl --max-redirs 0`.
Applied the fix, rebuilt, restarted the same local Workers runtime:
`/offline.html` → clean 200, no redirect. Confirmed the other three
`SHELL_URLS` entries (`/manifest.webmanifest`, `/favicon.ico`, `/sw.js`)
and a real app route (`/login`) were unaffected (200 before and after).
Also ran the actual `public/sw.js` `install` handler in a small VM
harness with its real `fetch` pointed at the running local Workers
runtime (mirroring Codex's reproduction technique) — failed with the
exact error Codex reported before the fix, succeeded cleanly after.
Then the full check suite: `npm run lint` (clean), `npx tsc --noEmit`
(clean), `npm test` with `DATABASE_URL` set against local Postgres (84
passed, 0 skipped), `npm run build` (succeeds). Build artifacts
(`.open-next/`, `.wrangler/`, `.next/`) removed from disk afterward.
**Affects:** `wrangler.jsonc`.
