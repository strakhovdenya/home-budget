# Home Budget — Implementation Plan

**Status:** HB-001..HB-004 Done, as confirmed by the owner in the HB-005 request. ADRs0001/0002/0003 Accepted; D32..D39 and earlier acceptance history retained. HB-005 UI shell is Done; financial features are not implemented.
**Execution:** Codex in VS Code, small feature branches and reviewable PRs  
**Scope policy:** PRD defines WHAT, business rules define finance semantics, this plan defines WHEN/HOW TO SHIP.

Related: [PRD](PRD.md) · [Business rules](BUSINESS_RULES.md) · [Architecture](ARCHITECTURE.md) · [Tasks](TASKS.md) · [Codex workflow](CODEX_WORKFLOW.md).

## Why this order

The biggest product risk is **incorrect money accounting**, not making a pretty dashboard. A polished UI with double debit, incorrect carryover or future-income leakage is unacceptable. Therefore prove the underlying math with tests and run migrations on a safe dev database before building broad UI.

## Milestone M0 — Requirements and critical architecture decisions

**Goal:** make finance calculations implementable, not ambiguous.

1. Read PRD + BR-* normative rules; reconcile any contradictions with documented approval.
2. Write ADR for complete checkpoint-first balance distributions and optional independent bank reconciliation; no mandatory source/residual allocation ledger.
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
5. Append-only audit, one-card checkpoints and complete confirmed allocation revisions, full outstanding obligation reserves/savings; atomic/idempotent updates, same-bank redistribution and consented transfer.
6. Derived projections: card balance checkpoints, period funds, deficit, carryover, dynamic daily forecast.
7. Vitest unit + DB integration scenarios, foundational CI. Validate M0/M1 exit before UI.

**Exit gate:** named [F-001..F-018](../tests/scenarios/phase-01/core-rules.md) covered by tests where scope implemented, no auth bypass, migrations reproducible, finance invariant proof documented.

## Milestone M2 — First usable product (MVP)

**Goal:** user can run their budget without manual spreadsheet.

1. HB-020 first-run onboarding (owner-authorized scope addition, documentation only): after an admitted Google login with no owned account, offer "Create budget", require a name and explicit confirmation, then resume the existing HB-010/HB-017 actual-balance/full-month-allocation flow. Account creation is independently authorized, atomic, auditable and protected against retries/concurrent requests; it creates no synthetic financial facts. Empty/unconfigured means unknown, not zero. Failures and relogin must permit safe continuation without duplicate accounts or changes to existing users/accounts. Login provisioning itself remains users-only; no allowlist expansion or multi-account UI. No implementation is added to HB-019.
2. Overview: physical balance, last check, reserved, voluntary savings, available, deficit, daily guideline, period switch and warning if old balance.
3. Single "Update Budget" wizard: actual checkpoint date/amount + REQUIRED full balance distribution by month + optional obligation/savings changes + one confirmation. No operation entry, net-change allocation or explanation required.
4. Obligations CRUD: full amount reserves, paid/cancelled, amount changes, partial payment of obligation (not partial reserve), event timeline.
5. Savings: create/increase/decrease/release; optional proposal to free savings when deficit.
6. Complete period allocation state: sum equals checkpoint; user confirms suggested/current/past/future amounts, with each share nonnegative and expected income excluded, without suspense. State deltas are not inferred income/expenses; optional physical operation details stay separate.
7. Monthly open/close:detect current month on access;actual balance/full distribution and explicit CARRY or FRESH_START confirm atomically,neither mode auto-selected. After HB-019 acceptance, HB-019.1 makes user-chosen FRESH_START the primary new-month UX; CARRY and DEFER remain secondary explicit actions. Preserve full reserves/savings and historical versions;FRESH_START supports missed months without compulsory per-month transfers. Complex multi-source CARRY remains excluded under Q-HB2-02. Manual close supports unknown end balance without a final-day checkpoint;re-accepted corrected ADR0002 defines historical/correction contracts. D36 requires the same safe main current limit protecting all selected reserves/savings across periods and other-month allocations;D37..D39 retain dated old-state estimates,nonblocking informational warnings and Berlin calendar-age>=7 reminder. No formulas, historical semantics, or pending HB-019 acceptance are changed by this UX planning decision.
8. HB-020 recurring templates (retained; now approved P0 scope in D45): suggestions requiring explicit accept/edit/skip, one obligation per accepted template+period, old debt separate from the new month bill; no automatic acceptance/debit. Q-HB1-03 is resolved. The first-run onboarding scope in item 1 remains unchanged.
9. Responsive, multilingual, accessibility and e2e budget paths. HB-019.1 precedes HB-020 and improves routine updating and the explicit new-month choice without changing financial math. HB-020 must include PostgreSQL/auth/browser first-run proofs from its [scenario contract](../tests/scenarios/phase-01/hb-020-first-run-and-recurring-templates.md); HB-021 supplies broader QA and does not substitute for those acceptance checks.

**HB-019.1 sequencing/constraint (owner D40–D45):** when a new-month
transition transfers the funding of an existing obligation or savings identity,
payment or any lifecycle edit to that same identity must be a separate later,
individually confirmed budget update. Existing SAME_IDENTITY_COMPOUND_NOT_SUPPORTED
remains the atomic refusal; no silent two-step write or weakened H/K constraints.
Within the current month a normal actual check requires no rollover choice unless
old-period allocations or funding still require explicit disposition. New-month
FRESH_START is a named user choice, not a background or implicit default.

HB-020 implementation planning must specify bounded name validation, command identity,
durable duplicate/race admission, atomic creation/audit and unknown-COMMIT recovery
before coding; no persistence mechanism or migration is selected by this scope update.
Keep account creation separate from the first confirmed financial update so a valid
empty account can resume setup safely. A storage/auth error must not be interpreted
as proof that no account exists. First-run onboarding here is distinct from M3's
optional historical-data import. All HB-020 scenarios are Planned/NOT EXECUTED;
this documentation work does not amend HB-019 code, tests or its frozen report.

**Exit gate:** user acceptance for the real routine: open once per week, enter new card balance, close paid liabilities, get accurate daily forecast; close last month without losing historical outcome.

**Shared MVP definition (owner D45, 2026-11-04):** P0 includes HB-019.1 and HB-020 before HB-021. HB-020 combines previously agreed first-run owned-account onboarding and now-approved recurring templates. Sequence: finish/review/accept HB-019; independently review and separately authorize HB-019.1; independently review and authorize HB-020; then full HB-021 browser E2E/a11y. M3/M4 are outside MVP; a proposed HB-027 Vercel/deployment task has not been created. This is scope/documentation approval, not authorization for implementation, commit, push, PR, merge or deploy.

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
