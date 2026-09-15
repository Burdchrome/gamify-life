# Gamify-Life Standards — project-specific rules

*Rules true of this repo and nothing else. The general rulebook is
`code-standards.md` at the Executive Assistant workspace root
(`../Executive Assistant/code-standards.md` on this machine); it covers
everything this file doesn't mention. **On conflict, this file wins.** A rule
lives in exactly one of the two files, never both. /code-review's Standards
axis reads both.*

---

**Rule:** Every Supabase migration passes the two-lock model — explicit
grants AND row-level-security policies, both scoped to the authenticated
user. Neither lock alone ships.
Why: the pre-deploy audit (2026-08-21) made this standing; a migration with
only one lock is one config mistake away from cross-user reads.

**Rule:** The device clock is the ONLY interpreter of dates (issue #8).
Server code never derives "today" or week bounds; it ships padded raw-date
windows (`getCompletionsFetchFloor`/`getCompletionsFetchCeiling` in
`lib/dates.ts`) and the client filters precisely.
Why: the server renders in UTC and can sit on the wrong calendar day —
the dual-clock bug made evening taps uncheck themselves. The tz-skew suite
(`npm run test:e2e:tzskew`) is the permanent guard; any date-logic change
runs it.

**Rule:** e2e specs that act after an optimistic write DB-poll first
(`expectCompletionRow` in `e2e/helpers.ts`, or the same `expect.poll` shape)
before any reload or follow-up click.
Why: the card's UI flips before the request lands; a reload right after an
assertion kills the in-flight write and the spec flakes.

**Rule:** Data specs run alphabetically in one worker and share seeded
state (setup seeds HYDRATE + TRAIN; today.spec's zero-state test stays
last). A spec that creates rows deletes them before it ends, or documents
in a comment exactly what state it hands the next spec.
Why: the suite runs against the live backend — leaked rows fail specs that
run after, in ways that look unrelated.

**Rule:** New spec files must match the `chromium data` project's explicit
`testMatch` regex in `playwright.config.ts` — extend the regex in the same
change, or the spec silently never runs.
Why: a test that never executes reads as green.
