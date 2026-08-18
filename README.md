# Gamify Life

Josh's habit tracker, rebuilt online as a portfolio project: a Neon Street
HUD where daily habits are ops to complete. Sign in, see today's habits, tap
one done — from a phone, at a real URL.

**Why it exists:** the v1 tracker lived on a desktop's localhost and never got
used; habit logging happens on the couch and in bed, on a phone. This rebuild
is also the portfolio piece — a correctly built multi-user app (per-user rows,
RLS) that happens to have one user.

## Stack

- Next.js 16 (App Router) + TypeScript on Vercel
- Supabase — hosted Postgres + email/password auth (`@supabase/ssr` cookies)
- Tailwind CSS v4, CSS-first design tokens (Neon Street HUD language)
- Playwright e2e against the real backend + pure unit tests for date logic

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

## Test

```bash
npx playwright test e2e/dates.unit.spec.ts   # pure date-logic units (no backend)
npx playwright test                          # full e2e vs hosted Supabase
```

The full run needs the e2e credentials in `.env.local` (see `.env.example`)
and the migrations in `supabase/migrations/` applied to the project.

## Layout

- `app/` — pages (Today `/`, Manage `/manage`, `/login`), components, tokens
- `lib/` — Supabase client plumbing, pure date logic
- `supabase/migrations/` — schema + grants + RLS, one migration per table
- `e2e/` — Playwright specs, seeding setup/cleanup
- `docs/` — project context (see the doc map)
- `proxy.ts` — session refresh + signed-out redirect (Next 16 middleware rename)

## Doc map

- [docs/architecture.md](docs/architecture.md) — how the pieces fit and why it's safe (diagram inside)
- [docs/spec.md](docs/spec.md) — what loop one builds and why
- [docs/design-language.md](docs/design-language.md) — the Neon Street HUD visual language
- [docs/stack-research.md](docs/stack-research.md) — how this stack wants to be used (primary-source research the build cites)

Work is tracked in this repo's GitHub issues; each ticket's commit message
carries its verification evidence.
