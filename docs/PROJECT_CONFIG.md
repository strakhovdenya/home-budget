# Tooling configuration contract

HB-004 introduced the Next.js App Router runtime and is accepted by the owner.
HB-005 adds MUI and next-intl and is accepted by the owner. HB-006 adds the
PostgreSQL/Drizzle storage foundation, accepted after independent review. Authentication and financial
application use cases are not implemented. The UI shell needs no database;
explicit persistence commands use the environment described in [DATABASE.md](DATABASE.md).

## Pinned versions

Registry stable versions and peer requirements checked on 2026-11-01. Direct dependencies use exact versions; `pnpm-lock.yaml` fixes the resolved dependency graph.

| Package | Version |
|---|---|
| Node.js used for verification | 22.23.0 |
| pnpm (`packageManager`) | 12.16.1 |
| next / @next/eslint-plugin-next | 16.4.3 |
| react / react-dom | 19.3.1 |
| typescript | 6.0.3 |
| eslint | 10.14.0 |
| @eslint/js | 10.0.1 |
| typescript-eslint | 8.72.1 |
| vitest | 5.0.5 |
| vite | 8.3.5 |
| @types/node | 22.20.5 |
| @types/react / @types/react-dom | 19.3.0 |

Use Node `^22.13.0 || ^24.0.0 || >=26.0.0`. TypeScript 7 is a newer stable major but lies outside typescript-eslint's current `>=4.8.4 <6.1.0` peer range; the latest compatible stable 6.0.x release is pinned. Vite is Vitest's required peer; there is no separate Vite application.

ESLint 9 is no longer supported. Instead of `eslint-config-next` (which currently includes React plugins requiring ESLint 9), this project combines supported ESLint 10, its JS recommended rules, typescript-eslint recommended rules, and the official Next plugin's recommended/core-web-vitals rules. React/a11y plugin coverage can be added with HB-005 once compatible; this is not the complete `eslint-config-next` preset.

Official references: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [Next ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint), [Next Vitest guidance](https://nextjs.org/docs/app/guides/testing/vitest), [Vitest requirements](https://vitest.dev/guide/), [pnpm installation](https://pnpm.io/installation). Registry `npm view` confirmed exact stable tags and peer ranges before installation.

## Executable commands

Install pnpm 12.16.1, then run `pnpm install --frozen-lockfile`. In Windows PowerShell use `pnpm.cmd` when execution policy blocks the `.ps1` shim; Git Bash uses `pnpm`. Scripts avoid shell-specific environment assignments and Unix commands.

| Command | Actual scope |
|---|---|
| `pnpm dev` | Next development server at localhost:3000 |
| `pnpm lint` | ESLint flat config, JS/TypeScript + official Next rules, zero warnings |
| `pnpm typecheck` | Generate route types, then strict `tsc --noEmit`; works before a build |
| `pnpm test` | Vitest Node/jsdom: shell, SSR/hydration, preferences, catalogs and import boundaries |
| `pnpm build` | Next production build; lint runs separately |
| `pnpm start` | Serve the completed production build |

## Deliberately pending

- Import-boundary automation now runs in `tests/architecture.test.ts`, using `architecture.json` and an explicit external allowlist for populated layers. It checks static imports/exports, type imports, literal dynamic imports/require, and rejects unclassified paths/nonliteral dynamic imports. Checking every source edge also prevents transitive escapes through shared/pure. Domain and infrastructure have no external allowlist entries yet; extend them explicitly when those tasks begin.
- Financial unit/scenario execution belongs to HB-008..HB-015. Markdown scenario specs are preserved; they are not executed by the bootstrap test.
- HB-006 provides `test:integration`, `db:generate` and `db:migrate`; see the runbook and evidence below.
- Playwright/browser E2E scripts await later UI/quality tasks. No placeholder green commands are provided.
- MUI/theme/next-intl and RU/DE/EN catalogs are implemented in HB-005. Financial sections remain explicit placeholders.
- No PWA, service worker, offline cache, Tailwind, separate backend, production secrets or financial fixtures are introduced.

## HB-004 historical verification evidence

Executed locally on 2026-11-01 with Node 22.23.0 / pnpm 12.16.1:

| Check | Result |
|---|---|
| `pnpm.cmd install --frozen-lockfile --offline` | Passed; lockfile up to date, no resolution changes |
| `pnpm.cmd lint` | Passed, zero warnings |
| `pnpm.cmd typecheck` | Passed; route type generation and strict tsc |
| `pnpm.cmd test` | Passed: 1 file, 1 real server-render test |
| `pnpm.cmd build` | Passed, Turbopack production build, `/` statically prerendered |
| `pnpm.cmd dev --hostname 127.0.0.1` | Ready; port 3000 occupied by another process, Next selected :3002 |
| HTTP GET `http://127.0.0.1:3002` | 200; Home Budget heading, both status sentences, `lang=ru`, viewport present |
| `pnpm.cmd start --hostname 127.0.0.1 --port 3003` | Ready; HTTP GET 200 with expected heading and viewport |
| `git diff --check` | Passed |

Next's default agent-instruction generator appended to AGENTS.md on first dev startup. The original content was restored and `next.config.ts` now sets the supported `agentRules: false` option; subsequent restart left instructions intact. Both verification servers were stopped after checks.

Source review found no real data, credentials, network/data adapters or service worker. Source uses only app-layer Next/React imports and CSS; other layers remain empty. Existing scenarios, ADRs and project skills were preserved; `.vscode/extensions.json` was not edited.

Limitations: the in-app browser's Node REPL tool was unavailable, so no visual mobile/desktop or browser-console QA is claimed; responsive CSS was inspected and served HTML checked. `python scripts/check_agent_docs.py` could not run because Python (including py/python3 launchers) is absent; the existing CI workflow remains unchanged. PowerShell commands were executed using `.cmd` shims; Git Bash was not available as a verified runtime. Initial npm access and pnpm's external store lock required sandbox escalation; final authorized install succeeded. Git emits a permission warning for the user's global ignore file, but diff/status commands succeed.

At the time of that evidence HB-004 was Review. The owner subsequently confirmed
HB-001..HB-004 completed and accepted in the HB-005 request. No new HB-004
runtime claims are implied.

## HB-005 integration and verification

Pinned additions: `@mui/material` and `@mui/material-nextjs` 9.5.0,
`@emotion/react` / `@emotion/cache` 11.14.0, `@emotion/styled` 11.14.1,
`next-intl` 4.14.9. Tests: `@testing-library/react` 16.3.3,
`@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.8,
`jsdom` 30.1.3. Registry versions were checked before installation; no competing
UI stack or browser-test framework was added.

The root layout uses `@mui/material-nextjs/v16-appRouter` for streaming styles,
one CSS-variable ThemeProvider, and InitColorSchemeScript with the matching
`data-mui-color-scheme` selector and `home-budget-mode` storage key. The default
is System. MUI owns live OS changes and browser storage synchronization.
Use CSS variables for color-dependent UI so SSR markup stays stable.

next-intl request configuration lives at `src/shared/i18n/request.ts`, wired by
its Next plugin. The server validates the `home-budget-locale` cookie, defaults
to RU, and supplies the same locale/messages to HTML and the client provider.
The language Server Action writes an HttpOnly, SameSite=Lax, path=/ cookie for
one year (Secure in production); route refresh retains the current screen.
There are no locale URL prefixes or browser-language redirects. All routes are
rendered on demand because locale is request-specific.

`pnpm-workspace.yaml` explicitly denies fallback postinstall scripts for
`@swc/core` and `@parcel/watcher`; registry platform binaries are optional
dependencies. Frozen offline install succeeds without running these scripts.
On this managed Windows environment SWC cannot access the user's native cache
inside the sandbox. Type generation, build, dev and start were therefore run
with approved access outside the sandbox. No global cache or permission settings
were modified.

For HTTP smoke checks against a running server:

```sh
node scripts/check-shell-http.mjs http://127.0.0.1:3000
```

This checks server HTML/status/locale, not browser interaction or layout.
Exact executed evidence and pending browser checks:
[HB-005 verification report](planning/hb-005-verification.md).

Official integration references: [MUI Next.js](https://mui.com/material-ui/integrations/nextjs/),
[MUI color schemes](https://mui.com/material-ui/customization/dark-mode/),
[next-intl App Router](https://next-intl.dev/docs/getting-started/app-router),
[pnpm build policy](https://pnpm.io/settings/build#allowbuilds).

## HB-006 persistence integration

New exact versions: drizzle-orm 0.45.4, pg 8.23.1, server-only 0.0.1;
development tools drizzle-kit 0.31.11, @types/pg 8.23.1, tsx 4.23.15.
No existing foundational dependency was upgraded. The generated/custom SQL chain
is separate from application startup and deployment.

Commands: `pnpm db:generate`, guarded `pnpm db:migrate`, explicit
`pnpm test:integration`. Regular `pnpm test` needs no database and does not
silently skip integration tests. The Node-only server adapter uses pg with
interactive Drizzle transactions and scoped account row locks.
The infrastructure import allowlist now explicitly permits pg, drizzle-orm,
server-only and node:crypto; the seven layer boundaries remain unchanged.

Environment requirements, 19 physical tables, custom SQL ownership, database
versus application enforcement and outstanding use-case gates:
[database runbook](DATABASE.md). Exact executed checks and limitations:
[HB-006 evidence](planning/hb-006-verification.md).
