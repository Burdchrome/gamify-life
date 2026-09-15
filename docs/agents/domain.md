# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, if it exists (glossary — created lazily by `/domain-modeling`).
- **`docs/architecture.md`** — the architecture brief: system shape, the
  dual-clock rule (device clock is the only interpreter of dates, issue #8),
  and the habit-kind taxonomy (task / daily / weekly, issues #9/#13).
- **`docs/spec.md`** — what v2 was chartered to do.
- **`docs/design-language.md`** — the visual system (RUNNER:// terminal look).
- Workspace-wide architectural decisions live in the Executive Assistant
  workspace ADR log at `../Executive Assistant/decisions/` (sibling folder on
  this machine) — check it when a structural call comes up. This repo has no
  `docs/adr/` yet; create it lazily when a repo-scoped decision lands.

If any of these don't exist, **proceed silently**. `/domain-modeling` creates them lazily when terms or decisions actually get resolved.

## Layout

Single-context: Next.js App Router app at the repo root — `app/` (routes,
server components, client components), `lib/` (pure date/status logic +
Supabase clients), `supabase/` (migrations), `e2e/` (Playwright suite,
runs against the live Supabase backend).

## Use the glossary's vocabulary

When output names a domain concept (issue title, refactor proposal, test name), use the term as defined in `CONTEXT.md` once it exists. Until then, the architecture brief's terms win (op, protocol, completion, backdate, resting).

## Flag ADR conflicts

If your output contradicts an existing ADR or the architecture brief's pinned rules, surface it explicitly rather than silently overriding.
