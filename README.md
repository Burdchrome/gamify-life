# Gamify Life

Josh's habit tracker, rebuilt online as a portfolio project.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4 with CSS-first design tokens
- Google fonts through `next/font`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Layout

- `app/` — the Next.js app: pages, layout, global styles/design tokens
- `lib/supabase/` — Supabase client plumbing (browser, server, proxy session refresh)
- `e2e/` — Playwright end-to-end tests (real hosted Supabase, no mocks)
- `docs/` — project context (see the doc map)

## Environment

Copy `.env.example` to `.env.local` and fill in the Supabase URL + publishable
key (plus `TEST_EMAIL`/`TEST_PASSWORD` to run e2e).

## Doc Map

- [docs/spec.md](docs/spec.md) — what loop one builds and why
- [docs/design-language.md](docs/design-language.md) — the Neon Street HUD visual language the UI follows
- [docs/stack-research.md](docs/stack-research.md) — how this stack wants to be used (primary-source research the build cites)
