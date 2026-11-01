# Home Budget

Private, documentation-first personal budget planning web app.

**Status:** HB-001..HB-004 accepted by the owner. HB-005 adds the responsive MUI shell and RU/DE/EN preferences; implementation is in Review, awaiting independent review and owner acceptance. Financial features are not implemented.

## Run locally (Windows / Git Bash)

Use Node.js 22.13+ on the 22.x line (verified with 22.23.0), or a supported 24.x/26+ release, and pnpm 12.16.1.

```sh
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. Stop with Ctrl+C. No environment variables or database are needed for the UI shell.

Routes: `/` (overview), `/obligations`, `/savings`, `/months`, `/settings`.
The header and Settings offer language and Light/Dark/System selectors. Russian
is the default. Language is stored in the one-year `home-budget-locale` cookie;
appearance in browser localStorage (`home-budget-mode`). System follows live OS
changes. Financial sections are explicitly marked as in development, without
sample balances or inactive financial action buttons.

In PowerShell, if execution policy blocks `pnpm.ps1`, use `npm.cmd` / `pnpm.cmd` for these commands. Git Bash uses `npm` / `pnpm` as shown. No execution-policy change is required.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`start` serves the production build. `test` runs Vitest DOM/SSR-hydration tests,
locale-cookie/catalog tests and an import-boundary check. Versions, command scope
and verification evidence: [PROJECT_CONFIG.md](docs/PROJECT_CONFIG.md).

## Application structure

```text
src/
  app/              routes, SSR layout, globals.css
  features/shell/   navigation and placeholder screens
  domain/           future pure finance core
  infrastructure/   future adapters
  shared/
    pure/           future framework-free utilities
    ui/             MUI theme, provider, preferences
    i18n/           next-intl request config, cookie action, RU/DE/EN catalogs
tests/
  shell.test.tsx, i18n.test.ts, architecture.test.ts
  scenarios/        existing financial specifications
```

Domain, infrastructure and shared/pure remain empty. Database, auth and finance are later tasks.

## Key principles
- User-entered **bank balance checkpoints are authoritative** for card balance; no requirement to log each purchase.
- Obligations reserve their **full outstanding amount**; marking as paid does **not** debit the card again.
- Independent bank dates and **budget periods**; funds can be assigned across past/current/future periods.
- Savings, carryover, daily forecast, monthly closing snapshots, and complete history.
- Future PDF import assists categorization/reconciliation, never double-books already reflected balance changes.
- One card in v1, expandable account model; **web only, no PWA**.

## Stack decisions
Implemented: Next.js App Router, React, strict TypeScript, pnpm, ESLint, Vitest,
MUI light/dark/system and next-intl RU/DE/EN. Planned: Google OAuth single
allowlisted user, Vercel, selected Neon PostgreSQL + Drizzle, EUR cents and
Europe/Berlin dates.

## Start reading: what → how → tasks
1. **Product:** [PRD](docs/PRD.md) and supporting [product feature inventory](docs/PRODUCT.md).
2. **Normative finance rules:** [Business Rules](docs/BUSINESS_RULES.md) and [Decision Log](docs/DECISIONS.md).
3. **Design:** [Architecture](docs/ARCHITECTURE.md), [Data Model](docs/DATA_MODEL.md), [UX](docs/UX.md).
4. **Execution:** [Implementation Plan](docs/IMPLEMENTATION_PLAN.md), [Task Backlog](docs/TASKS.md), [Roadmap](docs/ROADMAP.md), and [Acceptance Scenarios](tests/scenarios/README.md).
5. **Codex:** [AGENTS.md](AGENTS.md), [Codex Workflow](docs/CODEX_WORKFLOW.md), [VS Code Setup](docs/VS_CODE_CODEX.md).

### Current Codex task
**HB-005** from [TASKS.md](docs/TASKS.md) is ready for independent review.
See the [scope and acceptance plan](docs/planning/hb-005-ui-shell.md) and
[verification report](docs/planning/hb-005-verification.md). Owner approval is required before Done.

The .agents/skills/ tree contains original **Codex adaptations of Dark Factory's nine foundational planning workflows**, not the Claude-only Dark Factory runtime.

## Status / safety
The running UI preview contains no financial data, server persistence or authentication. Only browser preferences are stored. Implement later features in bounded phases using Codex. No secrets or real bank data in Git, even while private: this repository may become public later. The task ledger is local Markdown for now; GitHub Issues can be created later and linked by HB-* ID.
