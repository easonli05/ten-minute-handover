# Working agreement

For any AI agent working on this project — Claude Code, Cursor, Copilot, a chat
assistant given this repo, or anything else.

## The one-paragraph brief

Eason teaches English to a few fixed classes with ten-minute breaks between them.
The problem is not that planning is hard, it is that the plan and the record live
in different places and neither survives the walk back to the classroom. So the
app collapses planning into logging: after each class he writes three short lines,
and the third — *"open next class with…"* — becomes the plan shown on that class's
card next time. There is no separate planning step.

## Constraints that are not up for negotiation

These came from the person who will actually use this. Do not optimise them away.

1. **Ninety seconds of typing, maximum, after a class.** Three textareas,
   tap-to-fill chips for repeated answers, everything else optional. If a field
   would require thought, it does not belong in the post-class flow.
2. **Phone first.** Used standing up in a corridor. Comfortable at 375px, big tap
   targets, no horizontal scroll, save buttons never hidden behind the keyboard.
3. **The pre-class view shows four things.** Opener, what they were shaky on,
   current syllabus unit, open student notes. Everything else is one tap deeper.
4. **No attendance, grades, or materials storage.** Each of those turns a
   ninety-second habit into an administrative system, and administrative systems
   are what ten-minute breaks kill. If it does not appear on the card read before
   walking in, it does not belong in the app.

## Rules for agents

- **Read `docs/decisions.md` before changing anything.** It records why things are
  the way they are. A decision logged there was made deliberately; reversing one
  is allowed, but say so in the log rather than quietly doing it.
- **Append to `docs/decisions.md` when you decide something non-obvious.** Stack
  choices, schema changes, anything you resolved that the brief left open, and
  anything you tried that did not work. One short entry, newest at the bottom,
  with the date and which tool you are.
- **The spec is `docs/build-brief.md`.** If you deviate from it, update the brief
  in the same commit — a stale spec is worse than none, because the next agent
  will trust it.
- **Do not rewrite `prototype/teaching-loop.html`.** It is a frozen reference of
  the intended interaction. If the real app should behave differently, change the
  brief, not the prototype.
- **Commit messages say why, not what.** The diff already says what.
- **Ask before adding a dependency** that is not already in the brief.

## Open questions

Things genuinely undecided. If you resolve one, log it.

- Turso/SQLite vs Neon/Postgres — either is fine, pick one and commit to it.
- Whether the weekly review is worth building before the daily loop has been used
  for a month. Probably not.
- Voice capture for the three post-class fields. Would cut ninety seconds to
  thirty, but only worth building if the typed version already sticks.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
