# Ten Minute Handover

A teaching-continuity app for one English teacher with a few fixed classes and
ten-minute breaks between them.

**The idea in one sentence:** collapse lesson planning into lesson logging, so the
last thing you write after a class — *"open next class with…"* — is the plan
waiting for you when you walk back in.

Status: **sections 1–3 of the build brief done** — scaffold, schema, passcode
auth, the Today screen + log sheet, and the persistent "catch a note" bottom
bar are built and working (see [Build](#build) below). **No live deployment
exists yet** — see [Deploy](#deploy-vercel). Sections 4–5 (class detail /
weekly review, hardening) are not started.

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

`docs/build-brief.md` sections 1–3 are done: stack + schema + auth, the Today
screen + log sheet, and the persistent bottom bar for catching a note or
logging a class from anywhere (not just from a specific card). Sections 4–5
(class detail, weekly review, hardening) are not started.

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

### Getting started on a fresh install

There is no class-creation UI yet (that's out of scope through section 3, and
the brief deliberately keeps the app to exactly what's on the pre-class
card — see `AGENTS.md`'s "no attendance, grades, or materials storage" rule).
After `npm run db:push`, run:

```bash
npm run db:seed
```

This inserts one clearly-labelled example class ("Example class — edit or
delete me") with a 3-unit syllabus, so the Today screen isn't empty. Edit or
add real classes directly in the database for now (`npm run db:studio` opens
Drizzle's browser-based table editor) — a proper class-creation screen is
section-4-or-later work per the brief.

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
