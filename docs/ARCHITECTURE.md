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
app → features → domain; infrastructure implements domain ports invoked by application use cases; domain never depends on React, Next.js, MUI, database or network. Split shared into `src/shared/pure/**` (framework-free utilities), `src/shared/ui/**` (MUI/theme/components) and `src/shared/i18n/**` (locale integration). Domain may import only shared/pure; pure utilities must not transitively import UI, i18n integration, ORM or framework packages. Root shared barrels must not bypass this boundary. Enforce via import lint rules and architectural tests once code exists. See docs/architecture.json.

## Persistence
PostgreSQL with **Neon as the selected provider** + Drizzle migrations, serializable or appropriate row-lock transactional update for each financial mutation. Provisioning, current plan limits and exact package versions remain implementation work; provider selection is not pending. No local file-based SQLite on Vercel serverless. Snapshot-based reporting + append-only audit/financial-event stream, not an opaque full event sourcing framework. Read models may be cached but are regenerable.

## Financial write boundary
A budget update saves an actual checkpoint AND a user-confirmed COMPLETE allocation of that balance among financial months in one transaction; obligation/savings changes may be included. Validate `sum(month balances)=checkpoint balance`, integer cents, owner/account authorization, request id and expected revision. No operation, category, explanation or allocation of interval delta is required. Reject conflicts without partial writes.

Redistribution/confirmed transfer against an already confirmed unchanged balance saves a new complete allocation revision anchored to that observation; it does not fabricate a bank observation or require re-entry of the same amount. A changed balance and transfer may share one update. Payment still requires fresh balance affirmation and the unchanged-balance warning. Allocation changes are state changes, not inferred bank operations.

Calendar month opens automatically; next-open carryover is a proposal requiring one-button user confirmation (option A). Confirmed transfer retains existing target funds, obligation/savings identities and full earmarks once; old active cash is cleared, historical revisions remain. No new bank operation is posted.

## Core read models
- Latest confirmed bank balance by account (observed, not calculated from inferred net changes).
- One active complete allocation revision anchored to the bank observation, full reserves and savings, period free balances; historical revisions are selected separately, not summed.
- Daily forecast with observed timestamp, as-of date and stale indicator.
- Month closing versions with actual last-observed dates, historical allocation/earmark references, completeness flags and UNKNOWN end balance when no month-end observation exists. Closing never requires a final-day checkpoint. Later transfer does not erase old reports; HB-002 specifies cutoff/order/version details.

## Future statement import
Use private object storage (e.g. Vercel Blob private mode) and restricted download endpoint. PDF extraction, OCR and categorization are later, asynchronous processing with explicit approval; raw data never sent to analytics. Documents linked by account + statement period + upload timestamp.

Optional operation evidence and interval K/U are separate from the primary allocation state. PDF matching updates explanatory records, never automatically B or confirmed month balances. Repeated/overlapping evidence links to one operation; ambiguous matches stay pending without blocking normal budget updates.

## Auth / security
Google OAuth with explicit email allowlist (verified Google identity), server-side authorization for every read/write and document download; secure session cookie, CSRF where applicable, no public signup. Never trust client amounts or account ids. Protect rate limits, logs, and backups.

## Multi-account evolution
Every bank snapshot and movement linked to account_id now; budgeting currently scoped to the primary card, not a fake cash account. Later allow per-account balances, internal transfers and optional combined report without relabeling transfers as income.

## Dark Factory philosophy, Codex implementation
Adopt **human-owned specs**, phased issues, scenario acceptance criteria, separate quality/functional review, evidence-based release; **do not** install godark CLI, Claude agents, .claude, godark.yaml, Claude runtime or autonomous PR merge. Repository instructions are AGENTS.md; project skills under .agents/skills. Details: docs/AGENT_FACTORY.md and docs/CODEX_WORKFLOW.md.

## Decisions needing proof early

[Accepted ADR 0001](adr/0001-checkpoints-and-allocations.md) defines complete checkpoint-anchored allocation revisions, explicit transfer consent and optional independent reconciliation, following owner clarification and owner-reported independent review. No suspense user category or mandatory residual/source ledger remains. Scenario oracles: [HB-001](../tests/scenarios/phase-01/hb-001-checkpoints-and-allocations.md).

- How to match optional statement evidence to intervals without touching confirmed budget distributions; this must not gate ordinary updates.
- How to rerun period projections after backdated entry while keeping all confirmed newer checkpoints and closure versions intact.
- How to surface combined funds and cross-period origin without double counting.
- HB-003 must finalize the liquidity warning/forecast edge where planning money exceeds observed available cash; this architecture approves no cap formula.
These need deterministic scenario tests before app UI implementation.
