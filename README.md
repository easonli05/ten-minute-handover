# Ten Minute Handover

A teaching-continuity app for one English teacher with a few fixed classes and
ten-minute breaks between them.

**The idea in one sentence:** collapse lesson planning into lesson logging, so the
last thing you write after a class — *"open next class with…"* — is the plan
waiting for you when you walk back in.

Status: **spec written, not yet built.** A working prototype exists (see below)
to validate the interaction before the real build starts.

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

`prototype/teaching-loop.html` is a complete, self-contained version of the
interaction — open it in a browser and it works, storing data in `localStorage`.
It exists to answer one question before the real build: **which fields actually
get filled in during a real ten-minute break, and which get skipped?**

It is a reference, not a foundation. The real app is specified in the build brief
and starts from scratch.

## Build

Not started. `docs/build-brief.md` section 1 is the first step.
