# Tooling configuration contract

HB-004 introduces the minimal Next.js App Router runtime. Financial rules, database and authentication are not implemented. No environment variables are needed; existing `.env.example` entries are placeholders for future tasks.

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
| `pnpm test` | Vitest run in Node, server-render bootstrap page and assert its heading/status |
| `pnpm build` | Next production build; lint runs separately |
| `pnpm start` | Serve the completed production build |

## Deliberately pending

- Import-boundary automation, external allowlist and transitive purity verification from `architecture.json` are not implemented by the lint presets. HB-004 has no cross-layer production imports or domain implementation; add these checks before populating the layers.
- Financial unit/scenario execution belongs to HB-008..HB-015. Markdown scenario specs are preserved; they are not executed by the bootstrap test.
- DB integration, `test:integration` and `db:migrate` await HB-006 and later persistence tasks.
- Playwright/browser E2E scripts await later UI/quality tasks. No placeholder green commands are provided.
- MUI/theme/next-intl and RU/DE/EN catalogs await HB-005. Bootstrap copy is static Russian; no finance UI exists.
- No PWA, service worker, offline cache, Tailwind, separate backend, production secrets or financial fixtures are introduced.

## Verification evidence

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

HB-004 is Review, pending independent review and explicit owner acceptance; not Done. No commit, push or PR was made.
