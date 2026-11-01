# Architecture — specification-first, Codex execution, Dark Factory-inspired

## Shape
Single Next.js App Router TypeScript deployment on Vercel. Layered modular monolith; no separate backend for v1, no service worker/PWA. Product language: RU default, DE/EN. MUI theme with light/dark/system. Client UI invokes authenticated Server Actions / route handlers. Domain logic is pure TypeScript; DB adapters do not leak into finance formulas.

    src/app/                route layouts, server entry points
    src/features/           feature UI/application use cases
    src/domain/             money, periods, balances, obligations, savings, forecasts, closing
    src/infrastructure/     Drizzle repositories, Google OAuth, PDF blob adapter (future)
    src/shared/             types, i18n, UI foundation, logging, date utils
    drizzle/                migrations
    tests/scenarios/        spec scenarios; later executable integration/e2e tests

## Dependency direction
app → features → domain; infrastructure implements domain ports invoked by application use cases; domain never depends on React, Next.js, MUI, database or network. Shared utilities are permitted only when pure. Enforce via import lint rules and architectural tests once code exists. See docs/architecture.json.

## Persistence
PostgreSQL (Neon target after setup) + Drizzle migrations, serializable or appropriate row-lock transactional update for each financial mutation. No local file-based SQLite on Vercel serverless. Snapshot-based reporting + append-only audit/financial-event stream, not an opaque full event sourcing framework. Read models may be cached but are regenerable.

## Financial write boundary
A 'budget update' (checkpoint plus obligation/savings/allocation changes) is a single application transaction with request id, expected revision and audit metadata. Validate money invariant and account authorization server-side. On conflict, return a safe retry workflow, never partial update.

## Core read models
- Latest confirmed bank balance by account (observed, not calculated from inferred net changes).
- Active reserves and savings; period-specific allocations/free balances.
- Daily forecast with observed timestamp, as-of date and stale indicator.
- Month closing version list; paid/cancelled lifecycle separate from as-of snapshot.

## Future statement import
Use private object storage (e.g. Vercel Blob private mode) and restricted download endpoint. PDF extraction, OCR and categorization are later, asynchronous processing with explicit approval; raw data never sent to analytics. Documents linked by account + statement period + upload timestamp.

## Auth / security
Google OAuth with explicit email allowlist (verified Google identity), server-side authorization for every read/write and document download; secure session cookie, CSRF where applicable, no public signup. Never trust client amounts or account ids. Protect rate limits, logs, and backups.

## Multi-account evolution
Every bank snapshot and movement linked to account_id now; budgeting currently scoped to the primary card, not a fake cash account. Later allow per-account balances, internal transfers and optional combined report without relabeling transfers as income.

## Dark Factory philosophy, Codex implementation
Adopt **human-owned specs**, phased issues, scenario acceptance criteria, separate quality/functional review, evidence-based release; **do not** install godark CLI, Claude agents, .claude, godark.yaml, Claude runtime or autonomous PR merge. Repository instructions are AGENTS.md; project skills under .agents/skills. Details: docs/AGENT_FACTORY.md and docs/CODEX_WORKFLOW.md.

## Decisions needing proof early
- How to represent checkpoint-derived unclassified net movement and subsequent decomposition into true statement items without violating balanced period allocations.
- How to rerun period projections after backdated entry while keeping all confirmed newer checkpoints and closure versions intact.
- How to surface combined funds and cross-period origin without double counting.
These need deterministic scenario tests before app UI implementation.
