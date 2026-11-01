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
An ordinary B>=0 budget update saves an actual checkpoint AND one complete confirmed nonnegative distribution atomically;obligation/savings changes may be included. Validate exact sum,integer cents,scope,request/revisions. No operations or net-change explanation required. The forecast input contract separately represents a real negative bank observation without A and returns OVERDRAFT_POLICY_REQUIRED;no negative-balance write workflow,credit or allocation policy is implemented. R/S are period requirements,not necessarily funded subsets of A,and can exceed A/B. Possible claims enter R only when explicitly fully selected;ordinary unpaid remains fully reserved. Reject invalid updates without partial writes.

Redistribution/confirmed transfer against an already confirmed unchanged balance saves a new complete allocation revision anchored to that observation; it does not fabricate a bank observation or require re-entry of the same amount. A changed balance and transfer may share one update. Payment still requires fresh balance affirmation and the unchanged-balance warning. Allocation changes are state changes, not inferred bank operations.

Calendar month opens automatically; next-open carryover is a proposal requiring one-button user confirmation (option A). Confirmed transfer retains existing target funds, obligation/savings identities and full earmarks once; old active cash is cleared, historical revisions remain. No new bank operation is posted.

Owner clarification D26..D28 makes a fresh actual bank check + complete distribution + carry/funding consent one primary atomic update. An equal-balance real check is still a new observation; explicit redistribution-only reuses the old anchor. Detect current period on website access without background financial work. Unconfirmed drafts do not change financial state; carry can be deferred within an ordinary valid update. Check affected carry dependencies, preserving unrelated valid allocations. Negative A anywhere rejects;negative F does not block ordinary carry. Multi-source proposal composition remains open. No changes to pure domain/import boundaries.

Owner D29..D31 adds an explicit,nondefault A CARRY / B FRESH_START choice. FRESH_START confirms a real current observation,one complete new vector and a separate immutable non-carry decision,resetting past active planning balances while preserving their history and all full obligation/savings states. Review funding of those old earmarks into the current period;never infer payment/cancellation/release from reset. One account transaction handles several missed months without per-month transfers/checks/closes. Only unresolved A proposal details retain policy gates;B remains available regardless of old signs/count. Selection,validation and atomic repository boundaries are unchanged;no new runtime layer.

## Core read models
- Latest confirmed bank balance by account (observed, not calculated from inferred net changes).
- One active complete allocation revision anchored to the bank observation, full reserves and savings, period free balances; historical revisions are selected separately, not summed.
- Daily projection with separate budget free/guideline and main safe estimate under D36,all-period protection diagnostics,observed date,as-of date and stale indicator;formula Accepted in ADR0003 after owner-reported final independent review;D37..D39 keeps old valid-state estimates visible,warning reads nonblocking,and reminder based on injected Berlin civil date (age>=7). No background/push/write side effects.
- Month closing versions with actual last-observed dates, historical allocation/earmark references, completeness flags and UNKNOWN end balance when no month-end observation exists. Closing never requires a final-day checkpoint. Later transfer does not erase old reports; HB-002 specifies cutoff/order/version details.

### HB-002 historical boundary after corrected-contract re-acceptance

[Accepted ADR 0002](adr/0002-month-closing-and-corrections.md) specifies `state(historical_through_date, evidence_recorded_cutoff_seq)`:resolve immutable corrections within the knowledge cut,then select historical checkpoint/vector and full obligation/savings states by confirmed effective positions. December transfer/payment positions are excluded from November even when closing in December. Reports pin exact source/ordering revisions and copied snapshot values;current pointers are not historical evidence. Historical/current anchor conflicts require explicit review,not automatic rebasing.

Domain functions receive dates,ordering manifests,revision facts and injected clock. Application preview/confirm use cases authorize and review changes. Infrastructure locks the account/report head and atomically stores immutable facts/snapshot,audit,idempotency result and mutable head pointers. Layers/import permissions are unchanged;the amended contract is also recorded in `architecture.json`. Older historical entry preserves newer confirmed states;corrected close versions require explicit approval and never rewrite v1. Complex A with several past source months must reject under Q-HB2-02 until separately approved,without blocking explicit FRESH_START. No algorithm for those A cases is accepted. Final forecast remains HB-003;runtime verification belongs to later implementation.

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
- Accepted ADR0003 completes HB-003:exact max-based D36 safe-main protection and D37..D39 warning/quality semantics are approved after owner-reported final independent review. Later implementation still needs executed scenario tests;no new layer or automatic financial action is introduced here.
These need deterministic scenario tests before app UI implementation.

D32..D35 corrects cash semantics without changing layers: A>=0,sum(A)=actual B>=0;F=A-R-S may be negative. Expected income and optional signed details cannot post cash. Prior ADR acceptance is historical;ADRs0001/0002 are re-accepted after owner-reported repeated independent review. There are no actual legacy financial records or migrations. Negative bank/overdraft and separate historical-overspend semantics remain owner questions.
