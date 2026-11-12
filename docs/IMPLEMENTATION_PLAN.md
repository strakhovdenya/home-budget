# Home Budget — Implementation Plan

**Current status (2026-11-08):** HB-001..HB-019 and HB-019.1 Done; HB-019.2/HB-020/HB-021 Planned. HB-019.1 has owner-reported independent repeat APPROVED 0/0/0/0 and Owner Acceptance, with the retained browser/AT limits and HB19-Q07 OPEN / NOT REPRODUCED in [TASKS](TASKS.md#hb-0191--budget-update-ux-and-month-transition-clarity). [D46–D49](DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08) adds full saved history to MVP; future task implementation is not authorized. Current publication permits one HB-019.1 feature commit/push/PR and CI, without merge/deploy/production changes.

**Historical HB-005-stage status:** HB-001..HB-004 Done, as confirmed by the owner in the HB-005 request. ADRs0001/0002/0003 Accepted; D32..D39 and earlier acceptance history retained. HB-005 UI shell is Done; financial features are not implemented.
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

1. HB-020 first run under [D55](DECISIONS.md#hb-020-product-alignment--owner-2026-11-11) (documentation only): admitted Google user enters actual B/date and complete A, then confirms once. No public name/create-budget step. Missing single technical owned EUR account with stable internal name, first real checkpoint/vector/audit/receipt commit atomically, never on login or by preliminary hidden save. Before confirmation funds are UNKNOWN; explicit B=0 is valid. Failed/invalid confirmation leaves no new account or financial facts; original-command retry/status, cross-instance races, rollback/UNKNOWN and reload discovery must preserve existing users/accounts/history. Existing empty accounts resume real confirmation without recreation. Reuse HB-010/HB-017 financial validation, but their current public APIs do not already provide missing-account composition; prove the private transaction-local path before implementation.
2. Overview: physical balance, last check, reserved, voluntary savings, available, deficit, daily guideline, period switch and warning if old balance.
3. Single "Update Budget" wizard: actual checkpoint date/amount + REQUIRED full balance distribution by month + optional obligation/savings changes + one confirmation. No operation entry, net-change allocation or explanation required.
4. Obligations CRUD: full amount reserves, paid/cancelled, amount changes, partial payment of obligation (not partial reserve), event timeline.
5. Savings: create/increase/decrease/release; optional proposal to free savings when deficit.
6. Complete period allocation state: sum equals checkpoint; user confirms suggested/current/past/future amounts, with each share nonnegative and expected income excluded, without suspense. State deltas are not inferred income/expenses; optional physical operation details stay separate.
7. Monthly open/close:detect current month on access;actual balance/full distribution and explicit CARRY or FRESH_START confirm atomically,neither mode auto-selected. After HB-019 acceptance, HB-019.1 makes user-chosen FRESH_START the primary new-month UX; CARRY and DEFER remain secondary explicit actions. Preserve full reserves/savings and historical versions;FRESH_START supports missed months without compulsory per-month transfers. Complex multi-source CARRY remains excluded under Q-HB2-02. Manual close supports unknown end balance without a final-day checkpoint;re-accepted corrected ADR0002 defines historical/correction contracts. D36 requires the same safe main current limit protecting all selected reserves/savings across periods and other-month allocations;D37..D39 retain dated old-state estimates,nonblocking informational warnings and Berlin calendar-age>=7 reminder. No formulas, historical semantics, or pending HB-019 acceptance are changed by this UX planning decision.
8. HB-020 monthly templates remain P0 (D45), D55 first-run plus D56 recurring correction, documentation only. Under [D56](DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11), an enabled template offers a new calendar-month instance even with old unpaid debt. Reading writes nothing. Explicit ACCEPT creates exactly one ordinary full-reserve obligation after reviewed integer-cent amount editing. Explicit DECLINE ("Не добавлять за этот месяц") durably suppresses only owner/account+templateId+originPeriod, with typed audit/receipt but no obligation, payment, bank operation or change to B/A/C/V,R/S/F or bank-check date. Both outcomes are final and mutually exclusive per key; retries/races resolve one proved winner. Next enabled month is offered independently of prior DECLINE. Disable stops future offers, preserving debts/decisions/history; local close without DECLINE writes nothing and may reappear. Old debt retains identity, full remainder/reserve, origin/current funding and history, with no automatic move/debit. Already paid before access and included in B may be DECLINED without false payment history; an existing obligation uses its normal Paid/Partial/Cancelled lifecycle and required financial confirmations. Config edits, funding changes, disable/re-enable or later payment/cancellation never reset a decided key. Template dueDate=null, ordinary optional dueDate unchanged. No income trigger/payment schedule. Storage A/B must prove both-outcome exclusion before selection; B migration separately authorized. Q-HB20-NEW-INSTANCE resolved; Q-HB1-03 P0 scope unchanged.
9. HB-019.2 complete current/past saved-state history: all retained checks/states, stable bounded navigation, as-known H/K versus later-corrected H/new K and selected immutable closing versions; UNKNOWN and observed zero remain distinct. Basic history is mandatory MVP; extended analytics stays HB-022.
10. Responsive, multilingual, accessibility and e2e budget paths. HB-019.1 precedes HB-020 and improves routine updating and the explicit new-month choice without changing financial math. HB-020 must include PostgreSQL/auth/browser first-run proofs from its [scenario contract](../tests/scenarios/phase-01/hb-020-first-run-and-recurring-templates.md); HB-021 supplies broader QA and does not substitute for those acceptance checks.

**HB-019.1 sequencing/constraint (owner D40–D45):** when a new-month
transition transfers the funding of an existing obligation or savings identity,
payment or any lifecycle edit to that same identity must be a separate later,
individually confirmed budget update. Existing SAME_IDENTITY_COMPOUND_NOT_SUPPORTED
remains the atomic refusal; no silent two-step write or weakened H/K constraints.
Within the current month a normal actual check requires no rollover choice unless
old-period allocations or funding still require explicit disposition. New-month
FRESH_START is a named user choice, not a background or implicit default.

HB-020's independently owner-reported approved [R1 plan](planning/hb-020-first-run-and-recurring-templates.md)
specifies one atomic first real confirmation, original command/receipt/status,
duplicate/race admission, rollback and unknown-COMMIT recovery. No named separate
account stage is required. Account initialization and first C/V must share one
transaction/confirmation; existing empty accounts remain resumable through real
confirmation. Storage/auth failure never proves absence. Atomic composition,
the exact {changes} transaction-local obligation adapter, storage A/B and original
history proof remain technical review gates, not selected migrations or new
product questions. All HB20 scenarios stay NOT EXECUTED; browser proofs belong
to HB-020 itself. Normative hashes become stale from this alignment and require
separately authorized later maintenance/fresh checks; no checker/CI/binding/
receipt/evidence edit or runtime test now. Historical-data import stays M3.

**Exit gate:** user acceptance for the real routine: open once per week, enter new card balance, close paid liabilities, get accurate daily forecast; close last month without losing historical outcome.

**Historical MVP definition (owner D45, 2026-11-04; extended by D47 below):** P0 includes HB-019.1 and HB-020 before HB-021. HB-020 combines previously agreed first-run owned-account onboarding and now-approved recurring templates. Sequence: finish/review/accept HB-019; independently review and separately authorize HB-019.1; independently review and authorize HB-020; then full HB-021 browser E2E/a11y. M3/M4 are outside MVP; a proposed HB-027 Vercel/deployment task has not been created. This is scope/documentation approval, not authorization for implementation, commit, push, PR, merge or deploy.

**Current MVP extension (owner D46–D49, 2026-11-08):** HB-019 Done → HB-019.1 →
independent HB-019.2 and HB-020 → HB-021. HBUX-001–036 remain HB-019.1;
HBH-001–007 belong to HB-019.2; HB20 cases remain HB-020. HB-021 integrates their
proof, not a second set of financial requirements. The separate
[fingerprint stage](planning/finance-fingerprint-follow-up.md) must close the SQL
input/evidence-freshness gap before final HB-021 evidence. No mechanism or receipt
changes now; prior implementation PASS remains historical. Basic versions,
corrections and all-state history are M2; only additional analytics/import/export
remain M3. Technical design review and implementation permission remain separate.

## Milestone M3 — History, reports and safe onboarding

**Goal:** meaningful retrospection and safe import of older Markdown history.

1. Bank-date vs financing-period reporting and cross-period origins, trends based on actual checkpoints.
2. Extended cross-period comparison and analytical views of lifecycle/funding. Closing versions, correction integrity and basic complete history are M2, not deferred here.
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
