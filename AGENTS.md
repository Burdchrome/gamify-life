<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent configuration

Engineering-flow skills (implement / triage / wayfinder / code-review) read
their repo config from `docs/agents/`:

- `docs/agents/issue-tracker.md` — issues live on GitHub; `gh` conventions.
- `docs/agents/triage-labels.md` — the five triage labels.
- `docs/agents/standards.md` — project-specific rules (two-lock migrations,
  device-clock dates, e2e discipline). The general rulebook is
  `code-standards.md` at the Executive Assistant workspace root.
- `docs/agents/domain.md` — which domain docs to read before exploring.
