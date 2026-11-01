# Home Budget

Private, documentation-first personal budget planning web app.

**Status:** HB-001..HB-003 specifications accepted. HB-004 introduces a minimal Next.js start page and verification tools; independent review and owner acceptance are pending. Financial features are not implemented.

## Run locally (Windows / Git Bash)

Use Node.js 22.13+ on the 22.x line (verified with 22.23.0), or a supported 24.x/26+ release, and pnpm 12.16.1.

```sh
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. Stop with Ctrl+C. No environment variables or database are needed for HB-004.

In PowerShell, if execution policy blocks `pnpm.ps1`, use `npm.cmd` / `pnpm.cmd` for these commands. Git Bash uses `npm` / `pnpm` as shown. No execution-policy change is required.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`start` serves the production build. `test` runs a real server-render test of the start page. Versions, command scope and verification evidence: [PROJECT_CONFIG.md](docs/PROJECT_CONFIG.md).

## Application structure

```text
src/
  app/              layout.tsx, page.tsx, globals.css
  features/         future application use cases
  domain/           future pure finance core
  infrastructure/   future adapters
  shared/
    pure/           future framework-free utilities
    ui/             future UI foundation
    i18n/           future locale integration
tests/
  bootstrap.test.tsx
  scenarios/        existing financial specifications
```

Empty layers contain only `.gitkeep`. MUI and RU/DE/EN localization belong to HB-005; the bootstrap uses static Russian copy and plain CSS. Database, auth and finance are later tasks.

## Key principles
- User-entered **bank balance checkpoints are authoritative** for card balance; no requirement to log each purchase.
- Obligations reserve their **full outstanding amount**; marking as paid does **not** debit the card again.
- Independent bank dates and **budget periods**; funds can be assigned across past/current/future periods.
- Savings, carryover, daily forecast, monthly closing snapshots, and complete history.
- Future PDF import assists categorization/reconciliation, never double-books already reflected balance changes.
- One card in v1, expandable account model; **web only, no PWA**.

## Stack decisions
Implemented: Next.js App Router, React, strict TypeScript, pnpm, ESLint and Vitest. Planned: MUI light/dark/system, next-intl (RU/DE/EN), Google OAuth single allowlisted user, Vercel, selected Neon PostgreSQL + Drizzle, EUR cents and Europe/Berlin dates.

## Start reading: what → how → tasks
1. **Product:** [PRD](docs/PRD.md) and supporting [product feature inventory](docs/PRODUCT.md).
2. **Normative finance rules:** [Business Rules](docs/BUSINESS_RULES.md) and [Decision Log](docs/DECISIONS.md).
3. **Design:** [Architecture](docs/ARCHITECTURE.md), [Data Model](docs/DATA_MODEL.md), [UX](docs/UX.md).
4. **Execution:** [Implementation Plan](docs/IMPLEMENTATION_PLAN.md), [Task Backlog](docs/TASKS.md), [Roadmap](docs/ROADMAP.md), and [Acceptance Scenarios](tests/scenarios/README.md).
5. **Codex:** [AGENTS.md](AGENTS.md), [Codex Workflow](docs/CODEX_WORKFLOW.md), [VS Code Setup](docs/VS_CODE_CODEX.md).

### Current Codex task
**HB-004** from [TASKS.md](docs/TASKS.md) bootstraps the platform after acceptance of ADR 0001/0002/0003. Independent review and owner approval are required before Done.

The .agents/skills/ tree contains original **Codex adaptations of Dark Factory's nine foundational planning workflows**, not the Claude-only Dark Factory runtime.

## Status / safety
The running bootstrap contains no financial data, persistence or authentication. Implement later features in bounded phases using Codex. No secrets or real bank data in Git, even while private: this repository may become public later. The task ledger is local Markdown for now; GitHub Issues can be created later and linked by HB-* ID.
