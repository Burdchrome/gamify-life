Status: ready-for-agent
Type: spec
Effort: gamify-life-v2 (loop one)
Date: 2026-08-18
Source: grill-me session 2026-08-18 (decision summary), v1 spec + tickets +
ground-truth research in `.scratch/gamify-life/`, Supabase sandbox run
(validated 2026-08-18).

# gamify-life v2 — Loop One Spec

## Problem Statement

Josh built a working habit tracker (v1: Express + React + SQLite) but it
lives on his desktop's localhost. Habit logging happens on the couch, in
bed, at work — on a phone. An app you can't reach in those moments doesn't
get used, and v1 never got used. Separately, 
## Solution

Rebuild the tracker online: Next.js + Supabase (hosted Postgres + auth) +
Tailwind, deployed on Vercel at a real URL. Loop one delivers the smallest
real version: Josh, on his phone, signs in, sees today's habits, taps one
done. The Neon Street HUD design language ports in as Tailwind tokens from
day one so every screen looks intentional from the first deploy. The app is
architected as a proper multi-user app (per-user rows, RLS) even though
Josh is the only user — that architecture is itself portfolio signal.

## User Stories

1. As Josh on his phone, I want to open a real URL and see my tracker, so that logging happens where life happens, not at my desk.
2. As Josh, I want to sign in with email + password once and stay signed in on my phone, so that logging a habit never costs more than a few seconds.
3. As Josh, I want to see today's habits as a list on the today view, so that I know what's in front of me at a glance.
4. As Josh, I want to tap a habit to mark it complete, so that logging is a single gesture.
5. As Josh, I want the tap to reflect instantly (optimistic), so that the app feels responsive even on weak phone signal.
6. As Josh, I want to un-tap a habit I marked by mistake, so that a mis-tap isn't a data error.
7. As Josh, I want completions to persist across devices, so that what I log on my phone is there on my desktop.
8. As Josh, I want a habit's completion tied to the correct local calendar day, so that a 11:50pm log counts for today, not tomorrow-in-UTC.
9. As Josh, I want to create a habit with a name and weekly target, so that the tracker reflects my actual life without me editing a database.
10. As Josh, I want to rename a habit, change its target, or change its kind, so that habits evolve without losing history.
11. As Josh, I want to archive a habit rather than delete it, so that history survives when a habit retires.
12. As Josh, I want an empty state that tells me what to do when I have zero habits, so that day one isn't a blank screen.
13. As Josh, I want the app to look like the Neon Street HUD from the first screen, so that using it feels like my app, not a gray scaffold.
14. As Josh, I want touch targets sized for thumbs (44px+), so that phone use is comfortable (v1 critique lesson, carried forward).
15. As a signed-out visitor, I want to see only a sign-in screen, so that my personal data is never publicly visible.
16. As Josh the account owner, I want every row gated by per-user RLS, so that even with the public API key, only my session reads my data.
17. As Josh the orchestrator, I want an architecture brief + diagram maintained alongside the code, so that I can explain what I built at any point.
18. As Josh the learner, I want the repo readable (clear README, small commits, GitHub issues), so that the build itself becomes portfolio evidence.
19. As a future viewer of the portfolio, I want the deployed app to not break in front of me, so that the demo holds up unattended.
20. As Josh, I want end-to-end tests that sign in and complete a habit in a real browser, so that "it works" is proven by machine, not by my memory.

## Implementation Decisions

- **Stack:** Next.js (App Router) + Tailwind + Supabase (`@supabase/ssr`
  cookie-based auth), deployed on Vercel from a public GitHub repo (private
  through the build; flipped 2026-10-05). Repo is standalone — new front door, not a folder in
  the EA workspace.
- **Design tokens first:** Neon Street HUD palette/type from v1's DESIGN.md
  wired into the Tailwind theme before any screen is built. Deep polish
  (glows, animation, juice) is explicitly a later loop.
- **Auth:** Supabase email + password. One real account (Josh). No signup
  flow — accounts are created from the dashboard. Sessions persist.
- **Schema (fresh start, no v1 migration):**
  - `habits`: id, user_id, name, target_per_week, archived flag, created_at.
  - `completions`: id, user_id, habit_id, completed_on (a DATE), created_at;
    unique on (habit_id, completed_on) — one completion per habit per day.
- **Security is definition-of-done (standing promise, 2026-08-18):** every
  table ships grants + per-user RLS (`auth.uid() = user_id`) in the same
  migration. Never "open now, lock later." No `using (true)` policy and no
  anon write grant may survive into the deployed app. Secret keys live only
  in Vercel env vars; only the publishable key touches code.
- **Local-day correctness:** `completed_on` is computed from the device's
  local date at tap time, stored as a plain date. No UTC-midnight bugs.
- **Reads on the server, toggles on the client:** pages fetch via server
  components; the completion toggle is a client mutation with optimistic
  UI (v1 critique lesson carried forward).
- **Two screens only:** Today view and Manage view. Hash-free real routing
  (Next.js pages), sign-in screen when unauthenticated.
- **Process:** GitHub issues in the repo are the ticket tracker.
  Architecture brief + draw.io diagram maintained as the app grows.

## Testing Decisions

- **Primary seam — the browser (Playwright e2e):** drive the real app
  against the real hosted Supabase as a dedicated `test@` user whose rows
  are wiped per run. Core flows: sign in; see habits; tap complete;
  reload → still complete; un-tap; create/rename/archive habit; signed-out
  visitor sees only sign-in. No mocked Supabase — a mock would skip RLS,
  the exact thing under test.
- **Secondary — pure-logic unit tests:** local-date computation, weekly
  counting. Functions in, values out, no database.
- **A good test asserts what a user experiences** (what's on screen, what
  survives a reload), never implementation details (component internals,
  call counts).
- **Prior art:** v1's 28 API tests (seam philosophy) and v1's Playwright
  screenshot tooling (browser automation on this machine is proven).

## Out of Scope (this loop)

- Completion juice/animation (v1 ticket 09) — next loop, in this stack.
- Evening to-have planning (11), quick capture (12), gap recovery (13),
  heatmap/mirror (14), reflection (15) — carried on the v2 backlog,
  ordered by real use after loop one deploys.
- Offline/PWA service worker — re-evaluated only if real phone use hits a
  no-signal pain point (v1 ticket 16 is dead; Vercel replaces the tunnel).
- Push notifications, XP economy, GM autonomy (v1 tickets 01–07) —
  Layer-2, parked.
- Multi-user signup, demo account, going public — later loops.
- v1 data migration — v1's DB is test data; real habits are entered
  through the app on day one.

## Further Notes

- The Supabase project exists (`Gamify Life App`, us-east-2) and the
  write/read path is validated from this machine (sandbox, 2026-08-18).
  The sandbox `habits` table + open-access policy are throwaway — loop
  one's migration replaces them; the sandbox teardown is part of the work.
- Friction watch: config plumbing with no visible output (auth wiring, env
  vars). Counter-move: tokens land first so something neon is on screen
  before the glue work starts.
- Josh is the quality gate: each ticket ends with him seeing what changed
  and why before the next begins.
