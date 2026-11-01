# Home Budget — Implementation Plan

**Status:** planned; no application code yet  
**Execution:** Codex in VS Code, small feature branches and reviewable PRs  
**Scope policy:** PRD defines WHAT, business rules define finance semantics, this plan defines WHEN/HOW TO SHIP.

Related: [PRD](PRD.md) · [Business rules](BUSINESS_RULES.md) · [Architecture](ARCHITECTURE.md) · [Tasks](TASKS.md) · [Codex workflow](CODEX_WORKFLOW.md).

## Why this order

The biggest product risk is **incorrect money accounting**, not making a pretty dashboard. A polished UI with double debit, incorrect carryover or future-income leakage is unacceptable. Therefore prove the underlying math with tests and run migrations on a safe dev database before building broad UI.

## Milestone M0 — Requirements and critical architecture decisions

**Goal:** make finance calculations implementable, not ambiguous.

1. Read PRD + BR-* normative rules; reconcile any contradictions with documented approval.
2. Write ADR for period allocations / net checkpoint differences / bank movement reconciliation.
3. Write ADR for month closing, late changes and spending old free carryover.
4. Define deterministic projection of time-stamped events and account period balances.
5. Extend test scenarios for exact ledger conservation, race/idempotency and cents rounding.

**Exit gate:** architecture and scenarios answer all P0 ambiguity in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). No foundation coding until ledger invariants are clear.

## Milestone M1 — Verified technical foundation

**Goal:** authenticated, deployable skeleton and tested money core.

Deliver in small PRs:
1. Next.js App Router + TypeScript, MUI theme light/dark/system, responsive layout and RU/DE/EN dictionaries; **no PWA**.
2. Neon PostgreSQL + Drizzle schema/migrations, private env configuration, dev/CI test scripts.
3. Google OAuth only for allowlisted user, consistent authorization at every server operation.
4. Domain primitives: EUR integer cents, calendar period/date, stable ordering for backdated checkpoints.
5. Append-only finance events, one-card account model, period allocations, full outstanding obligation reserves, savings; atomic and idempotent updates.
6. Derived projections: card balance checkpoints, period funds, deficit, carryover, dynamic daily forecast.
7. Vitest unit + DB integration scenarios, foundational CI. Validate M0/M1 exit before UI.

**Exit gate:** named [F-001..F-018](../tests/scenarios/phase-01/core-rules.md) covered by tests where scope implemented, no auth bypass, migrations reproducible, finance invariant proof documented.

## Milestone M2 — First usable product (MVP)

**Goal:** user can run their budget without manual spreadsheet.

1. Overview: physical balance, last check, reserved, voluntary savings, available, deficit, daily guideline, period switch and warning if old balance.
2. Single "Update Budget" wizard: checkpoint date/amount + obligations/savings changes + optionally allocate net changes across months + single confirmation.
3. Obligations CRUD: full amount reserves, paid/cancelled, amount changes, partial payment of obligation (not partial reserve), event timeline.
4. Savings: create/increase/decrease/release; optional proposal to free savings when deficit.
5. Period allocations: current default; split between prior/current/future and future advances; preserve physical activity date separately.
6. Monthly open/close: next month auto-open, old 'awaiting close', manual close with original version and later corrections.
7. Recurring templates: suggestions requiring user confirmation, duplicate prevention.
8. Responsive, multilingual, accessibility and e2e budget paths.

**Exit gate:** user acceptance for the real routine: open once per week, enter new card balance, close paid liabilities, get accurate daily forecast; close last month without losing historical outcome.

## Milestone M3 — History, reports and safe onboarding

**Goal:** meaningful retrospection and safe import of older Markdown history.

1. Bank-date vs financing-period reporting and cross-period origins, trends based on actual checkpoints.
2. Closed snapshot versions, correction diffs, a timeline per savings goal and obligation.
3. Optional category tagging and cash movements; no forced per-purchase entry.
4. Guided historical October import from locally supplied private Markdown data; provenance and unresolved differences, no fake income.
5. Export to private JSON/CSV, import validation and backup restore design.

**Exit gate:** historical reports explain when obligations existed vs were later closed; bank-checkpoint diffs do not appear as invented categorized purchases.

## Milestone M4 — Optional PDF and reconciliation (deferred)

**Goal:** optional bank statement attachment and categorization, without contaminating trusted balances.

1. Private bank PDF storage, access rules, upload sizes, statement-month association and malware/input checks.
2. Text extraction/OCR strategy, statement row draft schema and parser reliability gates.
3. Candidate match with existing transactions and checkpoint intervals, review/approve/skip UX.
4. Unresolved interval reductions and category suggestions; **no second cash debit**.
5. Reports and correction versions if late statement reveals errors.

**Exit gate:** bank movement appears once; user confirms changes and can always view original closed month.

## Milestone M5 — Only if needed later

Multiple accounts with separate balance histories and optional consolidated account view. No second account or PWA in MVP.

## Global engineering/review gates

For **each task or PR**:
- Scope mapped to HB-* in [TASKS.md](TASKS.md) and BR-* in [BUSINESS_RULES.md](BUSINESS_RULES.md).
- Small PR touching one coherent behavior, with no unchecked addition of dependencies.
- Unit tests for finance core first, DB integration for persistence, Playwright for key flows when UI exists.
- Report exact executed test commands/results; independent review of money, authorization and history when relevant.
- No merge/release without reviewing DB migrations, destructive operations and privacy.
- No secrets, PDFs or real financial records in Git or test fixtures.
- Make no claim of running tests until code and test environment actually exist.

## First Codex prompt (planning only)

> Read AGENTS.md, docs/PRD.md, docs/BUSINESS_RULES.md, docs/IMPLEMENTATION_PLAN.md, docs/TASKS.md, docs/OPEN_QUESTIONS.md and tests/scenarios/phase-01/core-rules.md. Start with task HB-001. Propose an ADR and deterministic tests addressing how checkpoint net movements and period allocations coexist without double counting. Do not scaffold UI yet. Keep changes small, list unresolved choices and show the reviewable diff.

## Task ownership

**Local task ledger** in [TASKS.md](TASKS.md) is authoritative until GitHub Issues are deliberately created. When an issue is created, add its URL to the corresponding HB-* entry to avoid two independent task registries. Codex should work **one Ready task at a time** and not auto-mark tasks complete or auto-merge.
