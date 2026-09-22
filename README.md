# Ten Minute Handover

A teaching-continuity app for one English teacher with a few fixed classes and
ten-minute breaks between them.

**The idea in one sentence:** collapse lesson planning into lesson logging, so the
last thing you write after a class — *"open next class with…"* — is the plan
waiting for you when you walk back in.

Status: **all five sections of the build brief are done** — scaffold, schema,
passcode auth, the Today screen + log sheet, the persistent "catch a note"
bottom bar, class detail (`/class/[id]`), the weekly review (`/review`),
optimistic UI, resilient error handling, and export/import are built and
working (see [Build](#build) below). **No live deployment exists yet** — see
[Deploy](#deploy-vercel) for exactly what's left, and who has to do it.

---

## If you are an AI agent, read this first

This repository is shared between several AI tools working on the same project at
different times. Before doing anything:

1. Read [`AGENTS.md`](AGENTS.md) — the working agreement: what this project is,
   what is in scope, and the rules for changing things.
2. Read [`docs/build-brief.md`](docs/build-brief.md) — the full spec, including
   the database schema and the phased build prompts.
3. Read [`docs/decisions.md`](docs/decisions.md) — what has already been decided
   and why, plus what previous agents changed. **Append to this file when you
   make a decision that a later agent would otherwise have to guess at.**

That third file is the point of this repo. It is how tools that never talk to
each other stay consistent.

---

## What is here

| Path | What it is |
|---|---|
| `AGENTS.md` | Working agreement for any AI agent touching this project |
| `CLAUDE.md` | Pointer to `AGENTS.md`, for Claude Code |
| `docs/build-brief.md` | The spec: stack, schema, screens, phased prompts |
| `docs/decisions.md` | Running log of decisions and changes, newest last |
| `prototype/teaching-loop.html` | Single-file working prototype, no build step |

## The prototype

`docs/decisions.md` describes `prototype/teaching-loop.html` as a frozen,
self-contained reference for the interaction (`localStorage`-backed, no build
step). That file was never checked into this repo — its absence is logged as a
gap in `docs/decisions.md`, not silently fixed. If you have the original, add it
without modifying it; do not write a new one from scratch (see `AGENTS.md`).

The real app is specified in the build brief and starts from scratch either way.

## Build

`docs/build-brief.md` sections 1–5 are all done: stack + schema + auth, the
Today screen + log sheet, the persistent bottom bar for catching a note or
logging a class from anywhere, class detail (`/class/[id]` — syllabus with a
rewrite-to-reorder editor, session history, edit/archive), the weekly review
(`/review` — pacing, open notes, recurring "stuck" values), and hardening
(optimistic checkbox toggles, error-resilient forms, `/api/export` +
`/api/import`, and tests for the three things the brief specifically calls
out as what would quietly ruin this app).

### Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Postgres on [Neon](https://neon.tech) via `drizzle-orm/neon-http` — see
  `docs/decisions.md` for why Neon over Turso
- Single-passcode auth: `src/proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) checks an httpOnly cookie against `APP_PASSCODE`, set for 90
  days by `/api/login`
- PWA manifest (`src/app/manifest.ts`) + a shell-caching service worker
  (`public/sw.js`) so it installs to an iPhone home screen. The service worker
  only ever caches the static shell (icons, manifest, an offline fallback
  page) — every page that can show class data is fetched from the network on
  every visit and never cached, so it can't go stale. Offline shows an
  explicit "no connection" page (`public/offline.html`), not a stale copy.
- All teaching dates (today, meeting-day sorting, status labels, the log
  sheet's default date) are computed in **Asia/Taipei**, explicitly, via
  `Intl.DateTimeFormat(..., { timeZone: "Asia/Taipei" })` in `src/lib/date.ts`
  — not the runtime's local timezone. A UTC server (Vercel's default) and a
  Taiwan phone must agree on what day it is before 08:00 Taipei time (00:00
  UTC), and neither is guaranteed to be running in Taipei's own timezone.
- Optimistic UI on every checkbox (ticking a note or a syllabus unit done
  updates the screen instantly and only reverts if the save genuinely
  failed) via React 19's `useOptimistic`. Every write action catches its own
  database errors and returns a message instead of throwing, so a dropped
  connection on school wifi shows "couldn't save, try again" with your
  typed text still in the form — never a crashed sheet and lost work.

### Getting started on a fresh install

There is still no class-*creation* UI — section 4 added editing an existing
class (name/level/days/start time/students, plus archive) at
`/class/[id]`, but not adding a new one. None of the five sections asked
for a creation screen; the brief deliberately keeps the app to exactly
what's on the pre-class card (see `AGENTS.md`'s "no attendance, grades, or
materials storage" rule). After `npm run db:push`, run:

```bash
npm run db:seed
```

This inserts one clearly-labelled example class ("Example class — edit or
delete me") with a 3-unit syllabus, so the Today screen isn't empty. Edit its
name, level, days, start time, students, and syllabus at `/class/[id]` once
it exists. To add a genuinely *new* class (or delete one outright) for now,
use `npm run db:studio` (Drizzle's browser-based table editor) or
[`/api/import`](#export--import-your-data) with a hand-written JSON payload
— there's no class-creation screen, and the build brief's five sections
never asked for one (see `AGENTS.md`'s pre-class-card scope rule).

### Env vars

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — a Neon Postgres connection string
- `APP_PASSCODE` — any long random string; this is the one passcode that
  unlocks the app

Both must be set for `npm run build` to succeed, not just for `dev`/`start` —
the Today screen's data layer is imported at build time even though its route
is dynamic, so a missing or malformed `DATABASE_URL` fails the build with a
clear error rather than surfacing later at runtime.

### Local setup

```bash
npm install
npm run db:push      # push the schema in src/db/schema.ts to your database
npm run dev           # http://localhost:3000, will redirect to /login
```

`npm run db:generate` writes a SQL migration to `drizzle/` instead of pushing
directly, if you'd rather review it first.

### Testing

```bash
npm test
```

Runs [Vitest](https://vitest.dev). Pure-logic tests (`src/lib/*.test.ts`) run
always. The database integration test (`src/db/session-upsert.test.ts`) needs
a real Postgres to talk to — it's skipped automatically when `DATABASE_URL`
isn't set, and runs when it is:

```bash
DATABASE_URL=postgres://postgres:<password>@localhost:5432/<db> npm test
```

It uses a plain `pg` connection (works against local Postgres, CI Postgres,
or Neon's own connection string), creates and deletes its own throwaway class
row, and never touches your real data.

### Export / import your data

"I want to be able to leave" — the brief's own words. Both routes require
the same passcode cookie the app itself uses, so authenticate in a browser
first and reuse that cookie, or pass the passcode directly:

```bash
# Export everything (all classes, units, sessions, notes) as JSON:
curl -b "tmh_passcode=<your APP_PASSCODE>" https://your-deploy.example.com/api/export \
  -o backup.json

# Import a backup. This REPLACES all data — it's a restore, not a merge.
curl -b "tmh_passcode=<your APP_PASSCODE>" -X POST \
  -H "Content-Type: application/json" \
  --data @backup.json \
  https://your-deploy.example.com/api/import
```

There's no in-app button for either — this is a power-user escape hatch, not
a phone-first screen, so it stays out of what's on the pre-class card. See
`docs/decisions.md` for why import replaces rather than merges.

### Deploy (Vercel)

**No live deployment exists yet.** Nobody has run these steps against a real
Vercel/Neon account in this environment — building, linting, and testing have
all been verified locally (see `docs/decisions.md`), but "it builds" is not
"it's deployed." Steps to actually deploy:

1. Push this repo to GitHub and import it in Vercel.
2. Add the [Neon integration](https://vercel.com/integrations/neon) from the
   Vercel dashboard — it provisions a database and injects `DATABASE_URL`
   automatically — or set `DATABASE_URL` manually under Project Settings →
   Environment Variables.
3. Set `APP_PASSCODE` under the same Environment Variables screen.
4. Deploy. Run `npm run db:push` and `npm run db:seed` locally (pointed at the
   same `DATABASE_URL`) once, to create the tables and the example class.
