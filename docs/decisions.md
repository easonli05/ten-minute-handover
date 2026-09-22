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
**Affects:** `src/components/NoteSheet.tsx`. Expect this component to be
superseded (or reused) when section 3 builds the bottom bar.

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
