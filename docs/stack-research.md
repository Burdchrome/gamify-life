# Stack Research — gamify-life v2

**Researched:** 2026-08-18 · **Method:** primary sources only (nextjs.org, supabase.com/docs, tailwindcss.com, playwright.dev, vercel.com/docs, plus the official `vercel/next.js` `with-supabase` template source).

**Versions confirmed live today:**

| Thing | Version | Source |
|---|---|---|
| Next.js | **16.3.1** (16.2.11 is Active LTS) | [docs header](https://nextjs.org/docs/app/getting-started/installation), [July 2026 security release](https://nextjs.org/blog/july-2026-security-release) |
| React | 19.x (App Router uses React canary w/ all stable 19 features) | [Installation](https://nextjs.org/docs/app/getting-started/installation) |
| Tailwind CSS | **4.3** | [Theme docs](https://tailwindcss.com/docs/theme) |
| Supabase auth pkg | `@supabase/ssr` (+ `@supabase/supabase-js`) | [Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs) |
| Playwright | current; needs Node 22.x/24.x/26.x, Windows 11+ | [Intro](https://playwright.dev/docs/intro) |

Two things changed under our feet since the spec was written. Both are in **Flags** at the bottom. Read that section even if you skip the rest.

---

## 1. App Router project structure conventions

### What `create-next-app` gives you today

```bash
npx create-next-app@latest gamify-life
```

You get a three-way prompt, not the old checklist ([Installation](https://nextjs.org/docs/app/getting-started/installation)):

```txt
What is your project named? my-app
Would you like to use the recommended Next.js defaults?
    Yes, use recommended defaults - TypeScript, ESLint, Tailwind CSS, App Router, AGENTS.md
    No, reuse previous settings
    No, customize settings - Choose your own preferences
```

The recommended defaults are: **TypeScript on, ESLint, Tailwind CSS, App Router, Turbopack, import alias `@/*`**, plus an `AGENTS.md` (with a `CLAUDE.md` pointing at it) to keep coding agents writing current-version code.

**TypeScript is the default — yes.** Choosing "customize settings" is the only way to opt out.

Two Next.js 16 changes worth knowing:
- **Turbopack is the default bundler.** `next dev --webpack` opts out.
- **`next build` no longer runs the linter.** You run `npm run lint` (`eslint`) yourself. If you want lint enforced, that's a script/CI decision, not automatic.

### Where files go

Next.js is explicitly **unopinionated** here. From [Project structure](https://nextjs.org/docs/app/getting-started/project-structure):

> Next.js is **unopinionated** about how you organize and colocate your project files.

And on `components/` and `lib/` specifically:

> In our examples below, we're using `components` and `lib` folders as generalized placeholders, their naming has no special framework significance.

The three documented strategies are: everything outside `app/` (root-level `components/`, `lib/`), everything in top-level folders *inside* `app/`, or split by feature into route segments.

**Recommendation for us:** root-level `lib/` and `components/`, `app/` purely for routing. That's what the official Supabase template does (`lib/supabase/client.ts`, `lib/supabase/server.ts`), so following it keeps our code copy-pasteable against their docs. Two screens is not enough surface area to justify anything cleverer.

### The rules that actually bite

**A route is not public until it has a `page.tsx` or `route.ts`.** That's *why* you can safely drop helper files inside `app/` — folders alone create nothing.

**Route groups `(name)`** — folder wrapped in parens, omitted from the URL. Used to share a layout across a subset of routes, or to have more than one root layout.

**Private folders `_name`** — underscore prefix opts the folder *and all subfolders* out of routing entirely. Belt-and-braces for colocated utilities, and it dodges collisions with future Next.js file conventions.

**Special files**, rendered in this nesting order: `layout` → `template` → `error` → `loading` → `not-found` → `page`. So a `loading.tsx` next to a `page.tsx` gives you the Suspense skeleton for free.

**Likely shape for us:**

```
app/
  layout.tsx           # root layout — html/body, fonts, dark class
  page.tsx             # Today view
  manage/page.tsx      # Manage view
  auth/login/page.tsx
components/            # UI, incl. "use client" interactive bits
lib/
  supabase/
    client.ts          # browser client
    server.ts          # server client
    proxy.ts           # updateSession helper
  date.ts              # pure date math — unit-tested
proxy.ts               # root-level, Next.js entry point (see §2)
supabase/migrations/   # SQL migrations
```

### Server vs client components

Default is **server**. `"use client"` marks a boundary, not a file ([Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)):

> Once a file is marked with `"use client"`, **all of its imports and the components it directly renders are included in the client bundle**.

The advice is to push `"use client"` as deep as possible — mark the interactive leaf, not the layout. Server components pass data down as props (must be serializable), and a server component passed as `children` to a client component still renders on the server.

This matches our spec cleanly: **Today view fetches server-side; the checkbox/toggle is a small `"use client"` leaf that owns the optimistic state.**

One guardrail worth adopting: only `NEXT_PUBLIC_`-prefixed env vars reach the client bundle — everything else is replaced with an empty string. The `server-only` package turns accidental client imports of server code into a build-time error. It's optional, cheap, and exactly the kind of "make the mistake impossible" thing that suits how you work.

---

## 2. Supabase auth — the `@supabase/ssr` cookie pattern

> **This is the section that changed.** The file is now `proxy.ts`, not `middleware.ts`, and the env var is now `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `..._ANON_KEY`.

### Install + env

```bash
npm install @supabase/supabase-js @supabase/ssr
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Source: [Next.js Server-Side Auth guide](https://supabase.com/docs/guides/auth/server-side/nextjs).

### Publishable vs secret keys (the anon/service_role rename)

From [Understanding API keys](https://supabase.com/docs/guides/api/api-keys):

| New | Old | Where it's allowed |
|---|---|---|
| `sb_publishable_...` | `anon` | Safe to expose — "web page, mobile or desktop app, GitHub actions, CLIs, source code" |
| `sb_secret_...` | `service_role` | "only use in backend components of your app: servers, already secured APIs (admin panels), Edge Functions, microservices" |

Legacy JWT-based `anon` / `service_role` keys **still work**, but they "will be deprecated by the end of 2026." New project, mid-2026 — use the new keys and don't inherit a migration.

Nice safety feature: the secret key has a browser tripwire. "You cannot use a secret key in the browser (matches on the `User-Agent` header) and it will always reply with HTTP 401 Unauthorized." So a leak into client code fails loudly instead of silently working.

### The three client files

These are verbatim from the official [`vercel/next.js` `with-supabase` template](https://github.com/vercel/next.js/tree/canary/examples/with-supabase), which is the reference implementation the docs describe.

**`lib/supabase/client.ts`** — browser:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

**`lib/supabase/server.ts`** — server components, note it's **`async`** (because `cookies()` is now awaited):

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
```

**Why `getAll`/`setAll` and not `get`/`set`/`remove`:** the whole-batch shape is the current API. Auth tokens are chunked across multiple cookies, so the library needs to read and write them as a set.

**Why the `try/catch`:** server components physically cannot write cookies. The refresh has to happen somewhere that can — which is the proxy. That's the entire reason the next file exists.

### The proxy (formerly middleware)

Next.js 16 deprecated and renamed `middleware` ([proxy.js reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)):

> **Note**: The `middleware` file convention is deprecated and has been renamed to `proxy`.

Version history confirms: `v16.0.0` — "Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime."

Supabase's docs are already updated for this — they say "Since Next.js Server Components can't write cookies, you need a Proxy to refresh expired Auth tokens and store them," and the template ships `lib/supabase/proxy.ts`.

**`proxy.ts`** (project root, next to `app/`):

```ts
import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**`lib/supabase/proxy.ts`** — the load-bearing part:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}
```

Those two comments are in the official source, not editorial. **Don't insert code between `createServerClient` and `getClaims()`, and don't build a fresh response object without copying the cookies over.** Both produce random logouts, which is a miserable bug to chase.

Also note the matcher is a *negative* pattern. Without a matcher the proxy runs on every request including static assets — which, per the Next.js docs, "can unintentionally block CSS, JS, or images from loading."

### `getClaims()` vs `getUser()` vs `getSession()`

Current Supabase guidance ([Creating a client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)):

- **`getClaims()`** — "reads the access token from storage and verifies it," validating the JWT signature against the project's published public keys. **Recommended for protecting pages.**
- `getUser()` — a real network call. Correct, but adds latency.
- `getSession()` — raw tokens, not trustworthy for authorization on the server.

> **Critical warning:** "Never trust `supabase.auth.getSession()` inside server code such as Proxy. It isn't guaranteed to revalidate the Auth token."

The cookie is named `sb-<project_ref>-auth-token` by default. One caching caveat: apps using ISR or a CDN risk serving "another user's session" if a post-refresh response gets cached. Our app is per-user and dynamic, so this shouldn't bite — but it's a reason not to slap `revalidate` on the Today view.

### Signing in with email + password

Client-side, from the official template's `components/login-form.tsx`:

```tsx
"use client";
// ...
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  const supabase = createClient();
  setIsLoading(true);
  setError(null);

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    router.push("/protected");
  } catch (error: unknown) {
    setError(error instanceof Error ? error.message : "An error occurred");
  } finally {
    setIsLoading(false);
  }
};
```

Sign-out is the mirror image: `await supabase.auth.signOut()` then `router.push("/auth/login")`.

**Why client-side works here:** `createBrowserClient` writes the auth cookies directly, and the proxy picks them up on the next request. No server action needed for login.

### Protecting routes — belt *and* braces

Two layers, and you want both:

**1. The proxy** redirects unauthenticated requests before the page renders (above).

**2. The page itself** re-checks. From the template's `app/protected/page.tsx`:

```tsx
async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }
  // ...
}
```

The Next.js docs are blunt about why the second layer isn't paranoia:

> A matcher change or a refactor that moves a Server Function to a different route can silently remove Proxy coverage. Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone.

**And a third layer that matters most for us: RLS.** Because our spec puts mutations client-side, the browser is holding a publishable key and talking to Postgres directly. Proxy and page checks are UX — they decide what renders. **RLS is the only thing actually stopping a user from writing another user's rows.** That's not a reason to change the design; it's a reason the per-migration RLS rule in our definition-of-done is non-negotiable.

---

## 3. Tailwind theming and design tokens

### Version and install

**Tailwind CSS 4.3.** Install for Next.js ([framework guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs)):

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

```css
/* app/globals.css */
@import "tailwindcss";
```

That single `@import` replaces the old `@tailwind base / components / utilities` triple. If you pick the create-next-app defaults, this is already wired up.

### CSS-first config: `@theme`

**There is no `tailwind.config.js` in v4.** Configuration lives in CSS via the `@theme` directive. The docs explain the distinction ([Theme variables](https://tailwindcss.com/docs/theme)):

> Theme variables aren't _just_ CSS variables — they also instruct Tailwind to create new utility classes that you can use in your HTML.

So declaring a token *generates the utilities*. One declaration, and `bg-`, `text-`, `border-`, `fill-` all exist:

```css
@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

```html
<div class="bg-mint-500"></div>
<div class="text-mint-500"></div>
<div class="fill-mint-500"></div>
```

### Namespaces (which prefix makes which utility)

| Namespace | Generates |
|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `fill-*` |
| `--font-*` | `font-sans`, `font-script` |
| `--text-*` | `text-xl`, `text-2xl` |
| `--font-weight-*` | `font-bold` |
| `--spacing-*` | `px-4`, `max-h-16` |
| `--radius-*` | `rounded-sm`, `rounded-lg` |
| `--shadow-*` | `shadow-md` |
| `--breakpoint-*` | `sm:`, `md:` |

### A custom palette

Setting `--color-*: initial` first wipes Tailwind's defaults so only your palette exists — a good discipline for a portfolio app, since it makes stray `bg-slate-700` a build-visible mistake rather than an invisible inconsistency:

```css
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-purple: #3f3cbb;
  --color-midnight: #121063;
  --color-tahiti: #3ab7bf;
  --color-bermuda: #78dcca;
}
```

Fonts work the same way:

```css
@theme {
  --font-script: Great Vibes, cursive;
}
```

```html
<p class="font-script">This will use the Great Vibes font family.</p>
```

### Google Fonts — use `next/font`, not a `<link>`

From [Font Optimization](https://nextjs.org/docs/app/getting-started/fonts):

> You can automatically self-host any Google Font. Fonts are included as static assets and served from the same domain as your deployment, meaning no requests are sent to Google by the browser when the user visits your site.

Self-hosted, no layout shift, no third-party request. Basic usage in the root layout:

```tsx
// app/layout.tsx
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body>{children}</body>
    </html>
  )
}
```

Docs recommend **variable fonts**; if you use a non-variable font you must specify `weight: '400'` explicitly.

**Wiring the font into a Tailwind token** is the bit that connects §3's two halves. `next/font` can emit a CSS variable, and `@theme` can consume it — so the font becomes a real Tailwind utility rather than a one-off class. The shape is: give the font a `variable` option, put that variable's class on `<html>`, then point `--font-sans` at it inside `@theme`. Worth confirming against the [Font API reference](https://nextjs.org/docs/app/api-reference/components/font) at build time — I verified the `next/font` and `@theme` halves separately but did not find a single page showing the joined snippet.

### Dark-only

Default dark mode in v4 is **media-query based** (`prefers-color-scheme`). For a dark-only app that default is wrong — it hands control to the user's OS setting.

Two clean options ([Dark mode](https://tailwindcss.com/docs/dark-mode)):

1. **Simplest — don't use `dark:` at all.** Define your palette in `@theme` as the dark palette. There is no light mode to switch to, so there's nothing to vary. Recommended for us; it's less code and it can't drift out of sync.

2. If you ever want a light mode later, switch to class-based now and hardcode the class:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

```html
<html class="dark">
```

Option 1 unless you actually intend to build a toggle. Adding `dark:` prefixes to a dark-only app is complexity paid for a feature that doesn't exist.

---

## 4. Supabase migration workflow (hosted project)

Sources: [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations), [CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started), CLI reference for [`login`](https://supabase.com/docs/reference/cli/supabase-login) / [`link`](https://supabase.com/docs/reference/cli/supabase-link) / [`db push`](https://supabase.com/docs/reference/cli/supabase-db-push).

### Installing the CLI on Windows

Global npm install is **not** a supported method. Two documented options:

```powershell
# Scoop — global
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

```sh
# Or as a project dev dependency
npm install supabase --save-dev
npx supabase <command>
```

**Recommendation: the dev-dependency route.** The CLI version gets pinned in `package.json`, so the migration tooling is versioned alongside the migrations. One less thing that behaves differently on a different machine.

### The loop

```bash
supabase init                              # creates supabase/ + config.toml
supabase login                             # personal access token
supabase link                              # pick project from prompt
supabase migration new add_habits_table    # creates supabase/migrations/<timestamp>_add_habits_table.sql
# ...write SQL...
supabase db push                           # apply to the linked remote
```

Migration files live in **`supabase/migrations/`**, named `<timestamp>_description.sql`.

Useful flags on `db push`: `--dry-run` ("Print the migrations that would be applied, but don't actually apply them"), `--linked`, `--include-all`, `-p/--password`.

If you *do* click something in the dashboard, `supabase db diff -f migration_name` captures it as a migration file so history stays honest.

**The rule the docs put in bold:** "never change the remote database directly." Every schema change flows through a file. That's what keeps the local migration history and the remote tracking table in sync — and it's what makes the schema reviewable by you rather than invisible.

### Auth needed

- **`supabase login`** — a personal access token from https://supabase.com/dashboard/account/tokens. Stored in "native credentials storage," falling back to plaintext at `~/.supabase/access-token`. Can be bypassed with the **`SUPABASE_ACCESS_TOKEN`** env var (this is the CI path).
- **`supabase link`** takes `--project-ref <string>` and `-p, --password <string>` (the **database** password, distinct from the access token). Both are optional — it prompts interactively. **`SUPABASE_DB_PASSWORD`** supplies the password non-interactively.

### Docker: only if you run locally

`supabase start` runs the whole stack in containers, so it needs a container runtime (Docker Desktop, Rancher, Podman, OrbStack, colima).

**We don't need it.** Our spec targets the hosted project directly — `init` / `login` / `link` / `migration new` / `db push` are all file-and-network operations. Docker is a real install cost on a 16GB machine; skip it unless we later want offline dev.

### How grants + RLS are written

This is the most important thing in this section, and it validates our definition-of-done. Postgres runs **two independent checks** ([RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)):

1. **Grants** — can this role perform this operation *at all*?
2. **Policies** — which rows does it apply to?

> "Adding policies doesn't take those grants back. A table protected only by policies still hands `anon` an insert path if you never revoke the grant."

That's the trap: RLS alone is not enough. The documented pattern is revoke-then-grant:

```sql
revoke all on table public.reports from anon, authenticated;
grant select, insert, update, delete on table public.reports to authenticated;
```

Then enable RLS and write per-operation policies:

```sql
alter table "table_name" enable row level security;
```

```sql
create policy "User can see their own profile only."
on profiles for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Users can create a profile."
on profiles for insert
to authenticated
with check ( (select auth.uid()) = user_id );

create policy "Users can update their own profile."
on profiles for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

create policy "Users can delete a profile."
on profiles for delete
to authenticated
using ( (select auth.uid()) = user_id );
```

Three things to internalise:

- **`using` vs `with check`.** `using` filters rows you can *see/touch*; `with check` validates rows you're *writing*. UPDATE needs both, or a user could update a row into someone else's ownership.
- **UPDATE also requires a SELECT policy.** "To perform an `UPDATE` operation, a corresponding SELECT policy is required."
- **Wrap it: `(select auth.uid())`, not `auth.uid()`.** This lets Postgres cache the result per-statement instead of re-evaluating per row. The docs cite up to **99.97%** improvement. It's a free win and it should just be the house style.

Also recommended: index the column your policy filters on, and always use `to authenticated` rather than leaving the role open.

### Creating auth users — programmatic or dashboard?

**Both work.** Programmatic creation uses the Admin API ([`auth.admin.createUser`](https://supabase.com/docs/reference/javascript/auth-admin-createuser)):

```js
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@email.com',
  email_confirm: true
})
```

> "This function should only be called on a server. Never expose your `service_role` key in the browser."

Requires the **secret key** (`sb_secret_...`), so it lives in a local script or a server context — never in the app bundle.

### Email confirmation

**On by default for hosted projects.** From [Password-based auth](https://supabase.com/docs/guides/auth/passwords): "Email verification is enabled by default" on hosted; disabled for self-hosted/local. Configurable in the Auth Providers dashboard.

**Why this matters for us:** we have no signup flow, so nobody will ever click a confirmation link. Any user we create must be confirmed at creation time — `email_confirm: true` via the Admin API, or the dashboard's auto-confirm. A user created without it will exist and still fail `signInWithPassword`, which looks exactly like a wrong password. Worth knowing *before* you spend an hour on it.

---

## 5. Playwright e2e with Next.js

Sources: [Installation](https://playwright.dev/docs/intro), [Web server](https://playwright.dev/docs/test-webserver), [Authentication](https://playwright.dev/docs/auth), [Global setup & teardown](https://playwright.dev/docs/test-global-setup-teardown), [Parallelism](https://playwright.dev/docs/test-parallel).

### Setup

```bash
npm init playwright@latest
```

Prompts for TypeScript/JavaScript, tests folder name, optional GitHub Actions workflow, and browser install. Scaffolds `playwright.config.ts` and `tests/example.spec.ts`.

**Requirements:** Node.js "latest 22.x, 24.x or 26.x" — you're on Node 24. Windows: "Windows 11+, Windows Server 2019+ or WSL" — you're on Windows 11. Both fine, no WSL needed.

### Running the app under test

The `webServer` option starts your app before tests and shuts it down after:

```ts
webServer: {
  command: 'npm run start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  stdout: 'ignore',
  timeout: 120 * 1000,
}
```

`url` must return 2xx/3xx/400/401/402/403 when ready. `reuseExistingServer: !process.env.CI` is the important ergonomic bit — locally it attaches to your already-running `npm run dev` instead of spawning a second one; in CI it always starts fresh.

**`next dev` or `next build && next start`?** Both are valid. `dev` is faster to iterate against; `start` tests what actually ships. Suggest starting with `dev` (`command: 'npm run dev'`) for the tight loop, and switching to `build && start` once the suite is stable — the production build is where server/client boundary mistakes and env-var problems actually surface.

### Auth state reuse — sign in once

Don't log in in every test. Sign in once in a setup project, save the cookies, replay them.

```bash
mkdir -p playwright/.auth
echo $'\nplaywright/.auth' >> .gitignore
```

> "The browser state file may contain sensitive cookies and headers that could be used to impersonate you or your test account."

**Gitignore it.** Non-negotiable — it's a live session for the test user.

`tests/auth.setup.ts`:

```ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('https://github.com/login');
  await page.getByLabel('Username or email address').fill('username');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('https://github.com/');
  await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

(That's the docs' GitHub example — swap in our `/auth/login` page and read credentials from `process.env.TEST_EMAIL` / `TEST_PASSWORD`.)

Wire it up with `dependencies`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

The setup project runs first, authenticates once, saves state; every other project loads it via `storageState`.

### Per-run cleanup against a real backend

Playwright now explicitly prefers **project dependencies over `globalSetup`/`globalTeardown`**:

> "the recommended approach, as it integrates better with the Playwright test runner."

Because setup/teardown are real test projects, they show up in the HTML report, record traces, and can use fixtures — so when cleanup fails, you can actually see why. `globalSetup` gives you none of that. For someone whose quality lives in logs and reports rather than in reading code, that difference is the whole argument.

A `teardown` project runs after its dependents finish — that's our row cleanup:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'setup db',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup db',
    },
    {
      name: 'cleanup db',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup db'],
    },
  ]
});
```

You can chain both: a `setup db` project (seed + auth) with `teardown: 'cleanup db'`, and the browser project depending on it.

### Run tests sequentially — this one matters

Default Playwright runs **test files in parallel**. Our spec has one shared test user on one real hosted database. Parallel tests would fight over the same rows.

```ts
export default defineConfig({
  workers: 1,
});
```

Or `npx playwright test --workers=1`. Also leave `fullyParallel` off.

> "When tests share a single real backend account, parallelism causes race conditions."

The alternative — a test user per worker — is more machinery than two screens justify. Start at `workers: 1`; revisit only if the suite gets slow enough to annoy you.

**Cleanup strategy suggestion:** have the teardown delete rows for the test user's `user_id` via a secret-key client. Because RLS scopes everything to `user_id` anyway, "delete everything this user owns" is both simple and safe — it structurally cannot touch your real account's data.

### Headed vs headless on Windows

```bash
npx playwright test                      # headless (default)
npx playwright test --headed             # watch it run
npx playwright test --ui                 # UI mode — best for debugging
npx playwright test --project=chromium
npx playwright test --debug
npx playwright show-report
```

**Note for your setup:** Playwright drives its own bundled browsers (Chromium/Firefox/WebKit) — it does not use your installed Firefox. "Firefox only" is a personal-browsing preference and doesn't constrain the test matrix. Chromium alone is fine for a portfolio app; add the `firefox` project later if you want the cross-browser story.

Given the known screenshot/capture hang on this machine, prefer **`--ui` mode and the HTML report + traces** for debugging rather than screenshot-based verification.

---

## Flags — where current reality touches our spec decisions

Six things. Two are real changes; four are refinements.

### 🔴 1. `middleware.ts` is deprecated — it's `proxy.ts` now

Our spec says "middleware for token refresh." In Next.js 16 the file convention was **renamed**: the file is `proxy.ts`, the exported function is `proxy`, and the Supabase helper lives at `lib/supabase/proxy.ts` exporting `updateSession`.

Functionally identical — same cookie dance, same `getClaims()` call. But every blog post and most of your training-era knowledge says `middleware.ts`, so this will look wrong to anyone (or any model) working from memory.

Codemod exists if we ever inherit old code: `npx @next/codemod@canary middleware-to-proxy .`

**Also:** Proxy now defaults to the **Node.js runtime** (v16.0.0), so the old Edge-runtime constraints don't apply.

**Action:** use `proxy.ts`. Note it in `code-standards.md` so it doesn't get "corrected" back.

### 🔴 2. `anon` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Our spec says "anon key." Supabase renamed the key pair: `anon` → **publishable** (`sb_publishable_...`), `service_role` → **secret** (`sb_secret_...`).

Legacy keys still work but "will be deprecated by the end of 2026" — roughly four months out. Starting a new project on a key type that expires this year would be silly.

**Action:** env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Grab the new-format keys from the dashboard, not the legacy JWTs.

### 🟡 3. Tailwind v4 has no config file — tokens are CSS

Our spec assumed a palette declared "as tokens," which historically meant `tailwind.config.js` → `theme.extend.colors`. **That file doesn't exist in v4.** Tokens go in `app/globals.css` inside `@theme`, and declaring one auto-generates the utilities.

Not a conflict — arguably better for us, since the design system ends up as one readable CSS block instead of a JS object. But it changes where to look and what to write.

**Refinement to "dark-only":** don't use `dark:` prefixes at all. Just define the palette *as* the dark palette. Default v4 dark mode is `prefers-color-scheme`-driven, which would hand control to the user's OS — the opposite of what we want.

### 🟡 4. Don't scaffold from `create-next-app -e with-supabase`

The Supabase quickstart suggests `npx create-next-app@latest my-app -e with-supabase`. I checked that template's `package.json` on `canary`: it pins **`tailwindcss: ^3.4.1`**, uses the old `@tailwind base/components/utilities` directives, and `eslint-config-next: 15.3.1`. It also ships shadcn/ui, next-themes, a theme switcher, sign-up and forgot-password flows — all of which we'd delete.

The template's *Supabase* code is current and correct (that's where the `proxy.ts` above came from). Its *frontend* stack is a version behind.

**Action:** scaffold with plain `npx create-next-app@latest` (Tailwind v4 + Next 16 defaults), then hand-copy the three Supabase files from §2. Best of both, and we don't start by deleting a sign-up flow we explicitly don't want.

### 🟡 5. `getClaims()`, not `getUser()` / `getSession()`

Not in our spec either way, so this is a gap being filled rather than a conflict. Current Supabase guidance is `getClaims()` for route protection — local JWT verification, no network round-trip. `getSession()` is explicitly unsafe server-side.

**Action:** `getClaims()` everywhere. Check `data?.claims`, not `data?.user`.

### 🟡 6. Email confirmation is ON by default — confirm users at creation

Our spec: accounts created from the Supabase dashboard, no signup flow. Hosted projects have email verification **enabled by default**, and there's no signup flow to send anyone through.

An unconfirmed user fails `signInWithPassword` in a way that's indistinguishable from a bad password. This will eat an evening if it catches you cold.

**Action:** create both users (yours and the Playwright test user) with confirmation done — `email_confirm: true` via `auth.admin.createUser` with the secret key, or the dashboard's auto-confirm. This also means **programmatic user creation is fully available** if we'd rather script it than click.

### ✅ What holds up unchanged

- **App Router + server-component reads + client mutations** — matches the documented model exactly. `"use client"` on the interactive leaf, server components for data.
- **Grants + RLS in every migration** — the docs are *emphatic* that this is right, and specifically warn that policies alone leave a grant-shaped hole. One tightening: write `(select auth.uid())` not `auth.uid()` (up to 99.97% faster), and add `to authenticated` on every policy.
- **Playwright against the real hosted Supabase with per-run cleanup** — directly supported by the setup/teardown project pattern, which Playwright now prefers over `globalSetup`. Add `workers: 1`.
- **Vercel deployment** — no friction found.

**One thing to stay awake to:** with mutations client-side, RLS is the *only* real write authorization. The proxy redirect and the page-level `getClaims()` are UX, not security — anyone can talk to the Supabase REST endpoint directly with the publishable key. The spec is fine, but it means an RLS mistake is a data breach rather than a bug. Which is exactly why "RLS in every migration" being definition-of-done is the right call, and why the e2e suite should probably include one test that asserts a user *cannot* read another user's rows.

---

## Credentials the build will need

Current `.env.local` has `JOSH_EMAIL` / `JOSH_PASSWORD` / `TEST_EMAIL` / `TEST_PASSWORD` (values not read). Here's the full set.

### Supabase dashboard — collect once

- [ ] **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] **Publishable key** (`sb_publishable_...`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — safe in the browser and in the repo's `.env.example`
- [ ] **Secret key** (`sb_secret_...`) → local scripts + Playwright teardown only. **Never** `NEXT_PUBLIC_`. Never in the Vercel client bundle.
- [ ] **Project ref** — the `<project_ref>` in your project URL; used by `supabase link --project-ref`
- [ ] **Database password** — set at project creation. Needed by `supabase link` / `db push`. **Not** the same as the access token. If lost, reset it in dashboard → Database Settings.

### Supabase CLI

- [ ] **Personal access token** from https://supabase.com/dashboard/account/tokens — via `supabase login`, or `SUPABASE_ACCESS_TOKEN` env var
- [ ] `SUPABASE_DB_PASSWORD` — optional, avoids the interactive prompt on `db push`
- [ ] No Docker required (hosted-only workflow)

### Auth users — create two, both confirmed

- [ ] **Your account** — `JOSH_EMAIL` / `JOSH_PASSWORD`
- [ ] **Dedicated Playwright user** — `TEST_EMAIL` / `TEST_PASSWORD`, separate from yours so cleanup can safely delete everything it owns
- [ ] Both created with `email_confirm: true` (Admin API) or dashboard auto-confirm — see Flag 6

### Vercel

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, scoped to **Production** and **Preview**
- [ ] Do **not** add the secret key unless a server route genuinely needs it — our spec doesn't
- [ ] **Env changes need a new deployment.** Per [Vercel docs](https://vercel.com/docs/environment-variables): "Any change you make to environment variables are not applied to previous deployments, they only apply to new deployments." Setting a var does not fix a live broken deploy — you must redeploy.
- [ ] `vercel env pull` writes a local `.env` from the Development environment, if you'd rather not hand-copy
- [ ] Limits: 64 KB total per deployment — irrelevant here, noted for completeness

### Local files

- [ ] `.env.local` — gitignored (already is)
- [ ] `.env.example` — committed, keys with empty values, so the shape of the config is self-documenting
- [ ] `playwright/.auth/` — **must** be gitignored; contains a live test-user session
