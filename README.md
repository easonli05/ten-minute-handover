# Ten Minute Handover

A teaching-continuity app for one English teacher with a few fixed classes and
ten-minute breaks between them.

**The idea in one sentence:** collapse lesson planning into lesson logging, so the
last thing you write after a class — *"open next class with…"* — is the plan
waiting for you when you walk back in.

Status: **section 1 of the build brief done** — Next.js scaffold, schema, and
passcode auth are in place; no UI yet (see [Build](#build) below).

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

`docs/build-brief.md` section 1 (stack + schema + auth) is done. Sections 2–5
(the actual screens) are not started.

### Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Postgres on [Neon](https://neon.tech) via `drizzle-orm/neon-http` — see
  `docs/decisions.md` for why Neon over Turso
- Single-passcode auth: `src/proxy.ts` (Next.js 16's replacement for
  `middleware.ts`) checks an httpOnly cookie against `APP_PASSCODE`, set for 90
  days by `/api/login`
- PWA manifest (`src/app/manifest.ts`) + a shell-caching service worker
  (`public/sw.js`) so it installs to an iPhone home screen; data fetches stay
  network-only

### Env vars

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — a Neon Postgres connection string
- `APP_PASSCODE` — any long random string; this is the one passcode that
  unlocks the app

### Local setup

```bash
npm install
npm run db:push      # push the schema in src/db/schema.ts to your database
npm run dev           # http://localhost:3000, will redirect to /login
```

`npm run db:generate` writes a SQL migration to `drizzle/` instead of pushing
directly, if you'd rather review it first.

### Deploy (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. Add the [Neon integration](https://vercel.com/integrations/neon) from the
   Vercel dashboard — it provisions a database and injects `DATABASE_URL`
   automatically — or set `DATABASE_URL` manually under Project Settings →
   Environment Variables.
3. Set `APP_PASSCODE` under the same Environment Variables screen.
4. Deploy. Run `npm run db:push` locally (pointed at the same `DATABASE_URL`)
   once to create the tables.
