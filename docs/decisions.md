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
