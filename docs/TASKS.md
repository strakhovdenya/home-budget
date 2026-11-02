# Home Budget — Task Backlog (Codex-ready)

**Source:** [PRD](PRD.md) → [business rules](BUSINESS_RULES.md) → [implementation plan](IMPLEMENTATION_PLAN.md) → these tasks.
**Status:** HB-001..HB-004 Done, as confirmed by the owner in the HB-005 request. ADRs0001/0002/0003 Accepted; historical evidence retained. HB-005 Done: responsive MUI shell and RU/DE/EN preferences. Financial features remain unimplemented.
**Conventions:** `HB-NNN` stable ID; `Ready` = can start after prerequisites, `Planned` = not yet ready, `Blocked` = needs decision, `In progress`, `Review`, `Done`.
**Work policy:** one task / coherent PR at a time. Codex must not silently mark tasks complete. GitHub Issues optional later; add each issue URL beside the stable ID rather than duplicating tasks.

### Priority legend
P0 = indispensable for a correct first usable version; P1 = useful post-MVP; P2 = deferred functionality.

MVP common baseline is P0 tasks through HB-021. Inclusion of P1 HB-020 is pending owner decision [Q-HB1-03](OPEN_QUESTIONS.md#hb-001-approval-register--unresolved-no-business-rule-changed); do not silently promote it or treat milestone placement as approval. M3/M4 remain later.

## M0 — Close domain gaps before implementation

### HB-001 · Formalize checkpoint-first full balance distributions
**Status:** Done · **Priority:** P0 · **Dependencies:** none · **Area:** domain/architecture
**Inputs:** [BR-01, BR-05, BR-09, BR-11](BUSINESS_RULES.md), [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md), F-003/004/005/011/012/015.
**Deliverables:** ADR in `docs/adr/0001-checkpoints-and-allocations.md`; update data model if needed; new acceptance scenarios.
**Review artifacts:** [Accepted corrected ADR0001](adr/0001-checkpoints-and-allocations.md),[owner re-acceptance](DECISIONS.md#corrected-adr-0001-and-0002-re-acceptance--2026-11-01). Owner confirms repeated independent review of D32..D35 and resolution of all four findings. Done as documentation/scenarios;original acceptance/evidence retained below. Local documentary proof is recorded in the correction-regression document;no runtime success claimed.
**Acceptance:**
- Confirm actual balance and complete month distribution with exact sum, no required operations/categories/explanations or user suspense; allocation deltas are not inferred income/expenses.
- Preserve nonnegative actual-money allocations and optional split operation details without reposting cash or deriving primary allocations from them.
- Automatic month opening is separate from one-button confirmed transfer; same-bank redistribution/transfer preserves full earmarks and history without a fake checkpoint.
- Optional PDF/gross-flow reconciliation explains bank changes without altering confirmed balance/distribution or requiring detail for ordinary work.
- Deterministic synthetic cases cover incomplete-data closing without a last-day checkpoint; HB-002 owns history/closing detail, HB-003 final forecast/liquidity edge.

**Archived original completion evidence (2026-11-01;not amended-revision evidence):** owner-reported independent review and approval; 77 integer arithmetic checks passed (27 complete vectors, 32 equality/reserve/delta checks, 18 exact quotients); JSON/layer declarations, 20 scenario IDs, local links/anchors and whitespace verified. No app/runtime tests claimed. Acceptance trace: full state/no invented statistics — HB1-001/011/012/020; advances/splits — HB1-003/004/009; confirmed transfer/unchanged observation/earmarks — HB1-010/014/015; optional reconciliation — HB1-005/006/007/019; incomplete historical close — HB1-016/017/018. Local commit reference: branch `docs/hb-001-financial-model`, subject `docs(hb-001): accept checkpoint-first financial model`; final commit hash is reported to the owner. No GitHub issue/PR or push.

### HB-002 · Specify immutable month versions and backdated corrections
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-001 · **Area:** domain/architecture
**Deliverables:** `docs/adr/0002-month-closing-and-corrections.md`, scenario updates.
**Review artifacts:** [Accepted corrected ADR0002](adr/0002-month-closing-and-corrections.md),[owner re-acceptance](DECISIONS.md#corrected-adr-0001-and-0002-re-acceptance--2026-11-01). Owner confirms repeated independent review of D32..D35 and resolution of all four findings. Done as documentation/scenarios;original acceptance/evidence retained below. Local documentary proof is recorded in the correction-regression document;no runtime success claimed.
**Acceptance:** specify complete contract for closing both with month-end observation and with unknown end balance; preserve actual last historical observation/date, known allocation and earmark states, completeness/cutoff metadata and original versions. Closing after a December transfer must retain November history; no final-day checkpoint requirement or invented bank data. Define effective/recorded/same-day order, backdated corrections, transfer lineage/proposal retries and historical versus current lifecycle.
**Owner UX clarification:** D26..D28 and HB2-031..038 make fresh actual balance + complete vector + consented carry/funding one ordinary atomic update;same-amount real check is new. No background financial work;explicit deferral and technical redistribution-only remain. Negative F does not invalidate ordinary carry;negative A is invalid.
**Fresh-start decision:** D29..D31 and HB2-039..046 define explicit A/B selection with neither default. B clears past planning allocations in one real-check update even after missed months;historical free deficits remain historical,unpaid reserves and savings persist fully with reviewed current funding. No compulsory per-month carry/close chain;excluded complex A policy cannot block B.
**Cases:** F-009/F-010/F-013/F-018.

**Archived original completion evidence (2026-11-01;not amended-revision evidence):** owner-reported independent review and scoped approval;98 exact BigInt arithmetic assertions (41 complete vectors,39 reserve/savings/free checks,18 delta/evidence identities),46 sequential scenario specifications,Berlin DST/month boundaries/leap-year checks,local links/anchors,architecture JSON/layers and whitespace verified. Python unavailable;equivalent bootstrap checks ran through Node,not the Python script. Exact final evidence is in the scenario document. Acceptance trace:closing/completeness HB2-001..005/026/036/040;immutable versions/late corrections HB2-006..009/013/019/022/027/030;ordering HB2-012/021/023;atomicity/retries HB2-014/015/024/028/031..035/045;full earmarks/fresh start HB2-010/011/037..044/046. Scoped exclusion oracles HB2-016/017/025/038. Local commit subject:`docs(hb-002): accept immutable month closing and corrections`,branch`docs/hb-002-month-history`;final hash reported to owner. No push/PR or runtime implementation.

### HB-003 · Formalize daily forecast and carryover algorithm
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-001, HB-002 · **Area:** finance rules
**Deliverables:** examples, pure function input/output contract, edge-case specs.
**Owner correction review:** D32..D35 authorizes correcting all affected documents now,including ADR0001/0002. The [analysis archive](planning/hb-003-allocation-correction-proposal.md) explains provenance;[correction regressions](../tests/scenarios/phase-01/hb-003-allocation-correction.md) record current proof. No legacy financial data/migrations exist;historical-overspend mechanism and overdraft scope remain undecided.
**Review artifacts:** [Accepted ADR0003](adr/0003-daily-forecast-and-liquidity.md),[HB3 cases](../tests/scenarios/phase-01/hb-003-daily-forecast.md),[HBL cases and final evidence](../tests/scenarios/phase-01/hb-003-safe-liquidity.md). Owner confirms final independent review and acceptance of D36..D39 after the three editorial corrections. Q-HB1-01 resolved within scope;no runtime tests or implementation implied. HB-004 remains Planned/not started.
**Acceptance:** A>=0/full R/S once,signed F/nonnegative deficit and exact inclusive budget floor remain. Main safe limit must protect selected reserves/savings in every period regardless of due date,and preserve other-month allocations. Budget guideline is secondary only. Verify the preserved max(A,R+S) formula,grouped informational shortage labels,selected possible claims,visible dated old-state results,unavailable unknown states and exact Berlin age>=7 reminder in the Accepted specification;no automatic financial actions.
**Cases:** F-003/F-005/F-006/F-009.

**Completion evidence (2026-11-01):** owner-reported final independent review and explicit acceptance;local final status/arithmetic/reference checks recorded in HBL evidence. Trace:F-003 received real funds;HB3-010 rejects negative A and asserts accepted safe1666/r2;C01..C08 accepted all-period formula;HBL-018 alternative transitions;HBL-019..028 D37..D39/calendar/unknown-state coverage. Earlier checks and corrections remain archived. No commit,push or PR.

## M1 — Platform, authentication, persistence, pure finance

### HB-004 · Bootstrap Next.js TypeScript project
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-001, HB-002, HB-003 (reviewed M0 exit gate) · **Area:** platform
**Deliverables:** Next.js App Router, package lockfile, lint/typecheck/test/build scripts, setup docs.
**Acceptance:** local dev + build commands run; TypeScript strict; no PWA, no service worker; project retains docs/ and .agents/skill files.

**Owner acceptance update:** the HB-005 request explicitly confirms HB-001..HB-004 completed and accepted. The following paragraph records the earlier verification-stage state; its pending-review sentence is historical.

**Local evidence (2026-11-01):** `pnpm.cmd lint`, `pnpm.cmd typecheck`, `pnpm.cmd test` (1 real server-render test), `pnpm.cmd build` passed; `pnpm.cmd install --frozen-lockfile --offline` passed. Dev server on 127.0.0.1:3002 (3000 occupied) and production server on :3003 returned HTTP 200 with the expected heading. `git diff --check` passed. Full evidence, version compatibility and pending checks: [PROJECT_CONFIG.md](PROJECT_CONFIG.md). Browser visual QA and Python docs check were unavailable locally. Independent review and explicit owner acceptance remain required; not Done. No commit, push or PR.

### HB-005 · Build MUI responsive shell and translations
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-004 · **Area:** UI
**Deliverables:** MUI custom theme, light/dark/system, RU/DE/EN localization, responsive placeholders.
**Acceptance:** keyboard/touch usable for phone and desktop; translated labels in all languages; theme persisted; no extra Tailwind/shadcn stack.

**Review artifacts:** [Scope and scenarios](planning/hb-005-ui-shell.md), [actual verification and limitations](planning/hb-005-verification.md). Five routes, MUI SSR integration, Light/Dark/System, RU/DE/EN and browser preferences implemented. Independent review and owner acceptance remain pending; not Done. No commit, push or PR.

### HB-006 · Define and migrate database schema (Neon + Drizzle)
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-001, HB-002, HB-004 · **Area:** persistence
**Deliverables:** schema, migration scripts, synthetic fixtures, DB integration tests.
**Acceptance:** account_id and ownership on financial records; complete allocation revision+month uniqueness and atomic sum validation; idempotency/expected revision; immutable audit/month close references with unknown end-balance support; local migration reproducible; synthetic data only.
**Accepted scope:** 19 storage tables, versioned generated/custom SQL, private account-locked batch primitive and real PostgreSQL tests. [Implementation, evidence and remaining use-case gates](planning/hb-006-verification.md). Independent review completed, both findings fixed, owner acceptance confirmed on 2026-11-02. HB-007 authorization and later financial preview/selection/confirmation use cases remain unimplemented.

### HB-007 · Google OAuth with single-user allowlist
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-004, HB-006 · **Area:** security
**Deliverables:** protected routes, server-side identity/ownership checks, env example.
**Acceptance:** Google account not allowlisted denied; cannot read/write via direct endpoint bypass; session secure; secrets never committed.
**Evidence:** [HB-007 verification and Skill usage evidence](planning/hb-007-verification.md); independent review and live OAuth acceptance pending.

### HB-008 · Money, dates and financial-period types
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-003, HB-004 · **Area:** domain
**Deliverables:** pure cents arithmetic, Berlin date/period utilities.
**Acceptance:** no floating point money; cents totals exact; period boundary in Europe/Berlin; leap year/end-of-month verified with unit tests.

**Review artifacts:** [approved scope and implemented API](planning/hb-008-money-dates.md), [executed verification and acceptance](planning/hb-008-verification.md). Pure signed-int64 bigint primitives, exact string/JSON codecs, Gregorian dates for years 0001..9999, Berlin instant conversion and financial periods implemented. Independent review completed with Critical/High/Medium/Low: 0/0/0/0; approved without corrections. Owner explicitly accepted HB-008 on 2026-11-02. Reviewer additionally reports 27212 primitive checks in each of TZ=UTC and TZ=America/Los_Angeles; earlier lint/typecheck/Vitest/build evidence belongs to Codex, not a reviewer rerun. No database/auth/dependency changes, commit, push or PR.

### HB-009 · Event/audit storage and idempotent updates
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-006, HB-008 · **Area:** domain/persistence
**Deliverables:** event writers, optimistic version and transaction-safe batch interface.
**Acceptance:** repeat request doesn't duplicate action; concurrent writes reject/retry safely; partial writes never persist; audit retains before/after and effective/recorded dates.

**Review artifacts:** [implementation contract](planning/hb-009-audit-idempotency.md), [executed evidence and skill usage](planning/hb-009-verification.md), [HB9 scenarios](../tests/scenarios/phase-01/hb-009-audit-idempotency.md). Existing account-locked commitBatch extended with immutable normalized commands, mandatory audit, validated replay receipts and explicit transaction outcomes. No public event endpoint or HB-010+ commands. Independent re-review completed; owner accepted HB-009 on 2026-11-02; open findings 0/0/0/0. No new migrations, dependency changes, Neon access, commit, push or PR.

### HB-010 · Bank checkpoints and reconciliation intervals
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-001, HB-006, HB-008, HB-009 · **Area:** finance
**Deliverables:** enter/check/backdate actual balances with complete confirmed allocation revision; latest real observation; optional known/unexplained net read model independent of normal update validation.
**Acceptance:** every checkpoint has full allocation sum equal balance; late input preserves newer observation and active state through explicit revision handling; no transaction/explanation required, no inferred income, no synthetic final-day checkpoint. Interval K/U is explanatory only.
**Cases:** F-010/F-011/F-018.

**Review artifacts:** [implementation contract](planning/hb-010-bank-checkpoints.md),
[executed verification and skill usage](planning/hb-010-verification.md),
[HB10 scenarios](../tests/scenarios/phase-01/hb-010-bank-checkpoints.md).
Private HB-007/HB-009 confirmation/read composition, complete checkpoint companions,
H/K ordering/corrections, protected chronological head, affected-report pending flags
and D with explicitly unavailable production K/U. One approved forward migration;
no operation/lifecycle/transfer/forecast/UI workflow. Independent implementation
review completed; owner accepted HB-010 on 2026-11-02; open findings 0/0/0/0.

### HB-011 · Obligations: full reserve and lifecycle
**Status:** Done · **Priority:** P0 · **Dependencies:** HB-006, HB-009, HB-010 · **Area:** finance
**Deliverables:** create/amend/paid/cancelled, optional partial settlement, potential claims.
**Acceptance:** reserve 100% unpaid remainder; no partial reserve UI/API; marking paid never debits card; cancelled separately releases reserve; previous states visible.
**Cases:** F-001/F-002/F-006/F-007/F-017.

**Review artifacts:** [implementation contract](planning/hb-011-obligations.md), [executed verification](planning/hb-011-verification.md), [HB11 scenarios](../tests/scenarios/phase-01/hb-011-obligations.md). Immutable full lifecycle/metadata, H/K, audited payment evidence, atomic actual checkpoint payments and one forward SQL migration. Independent implementation review completed; Medium resolved in R2; owner accepted HB-011 on 2026-11-02; open findings 0/0/0/0. Commit, push and PR follow acceptance.

### HB-012 · Savings events and release
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-009, HB-010 · **Area:** finance
**Deliverables:** voluntary earmark/release history and carryover.
**Acceptance:** savings subtract from free but not bank balance; changes don't auto-debit; deficit offers release but never does it silently.
**Cases:** F-008.

### HB-013 · Period allocations, deficits, advances, rollover
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001, HB-003, HB-009..HB-012 · **Area:** finance
**Deliverables:** complete user-confirmed allocation vectors, same-bank redistribution, purchases funded by existing cash across periods, one-button confirmed transfer with full reserve/savings funding history; optional financing-detail proposals separate from cash state.
**Acceptance:** each A>=0 and sum(month balances)=anchoring actual B>=0, future money isolated; no required delta allocation/suspense; transfer requires consent, target cash/earmarks count once and old active cash clears. No automatic application of operation details or invented income/expense from state deltas; all A>=0 and sum(A)=B>=0;negative F remains valid.
**Cases:** F-003/F-004/F-005/F-009/F-015.

### HB-014 · Daily forecast and full budget projection API
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-003, HB-010..HB-013 · **Area:** finance
**Deliverables:** pure read models for account,period budget free/reserved/savings,secondary budget guideline,main safe daily estimate under reviewed HB-003 formula,and actual observation freshness.
**Acceptance:** dates inclusive, cents floor, negative free gives daily zero, no invented observed daily bank amounts; period switch safe.
**Cases:** F-003/F-006/F-008/F-009.

### HB-015 · Finance domain tests and CI gate
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-004, HB-006..HB-014 · **Area:** quality
**Deliverables:** Vitest unit, DB integration, CI guard for business invariants.
**Execution:** this task consolidates coverage and CI evidence, not the first writing of tests. HB-004 establishes the runner; HB-006..HB-014 add/run their relevant tests alongside each implementation. No UI use of finance projections before the HB-015 gate.
**Acceptance:** scenario IDs mapped to executed tests; authentication and concurrency covered; exact command output recorded; no claims of success without running.

## M2 — End-to-end first usable version

### HB-016 · Dashboard and period switch
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-005, HB-007, HB-014, HB-015 · **Area:** UI
**Deliverables:** prominent actual balance, free, reserved, savings, daily forecast, date of last observation, deficit/period indicators.
**Acceptance:** usable responsive phone/desktop; no future receipts in current monthly forecast; stale balance warning after ~7 days; text labels accompany colors.

### HB-017 · Single atomic 'Update budget' flow
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-010..HB-014, HB-016 · **Area:** UI/application
**Deliverables:** observation date/balance form, paid/cancelled + reserve/savings edits, split allocations, review/submit.
**Acceptance:** one save for actual checkpoint plus full balance distribution, optional earmark changes, no required operations/net explanation; paid with same balance warns and requires fresh affirmation. Redistribution/transfer alone reuses confirmed unchanged balance; no auto debit or synthetic observation; show consent and revision timeline.

### HB-018 · Obligations and savings management screens
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-011, HB-012, HB-016, HB-017 · **Area:** UI
**Deliverables:** obligation list/details and history, savings goals/history.
**Acceptance:** edit/close/cancel with full history; savings release may be suggested during deficit but needs click; no partial reserves.

### HB-019 · Manual month closing, versions and rollover
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-002, HB-013, HB-014, HB-017 · **Area:** finance/UI
**Deliverables:** auto-start next calendar period, await-manual-close state, immutable closing snapshot, correction versions.
**Acceptance:** calendar opens automatically, cash transfer only after one-button confirmation; preserve full reserves/savings and existing target cash once. Support manual close with unknown actual end balance and real last observation/date, known historical allocations/earmarks, completeness flag and immutable versions; no PDF or final-day checkpoint required. Old history survives later transfer/payment; coordinate HB-002 contract.
**Cases:** F-009/F-013.

### HB-020 · Recurring payment templates (confirm, don't auto-create)
**Status:** Planned · **Priority:** P1 · **Dependencies:** HB-011, HB-017 · **Area:** finance/UI
**Deliverables:** configurable monthly templates and suggestions for future period/new income.
**Acceptance:** accept/edit/skip; one obligation per accepted template+period; old debt and new month bill distinct.
**Cases:** F-016.

### HB-021 · Core browser E2E, a11y and responsive QA
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-016..HB-019 · **Area:** quality
**Deliverables:** Playwright flows for mobile/desktop, multi-locale, auth boundaries, changing balance and closing a month.
**Acceptance:** tests actually execute and pass; bug fixes reviewed; no data/privacy exposure.

## M3 — Reporting and historical onboarding

### HB-022 · Bank-calendar versus financing-month reports
**Status:** Planned · **Priority:** P1 · **Dependencies:** HB-019 · **Area:** reporting
**Deliverables:** month comparison, funding origin and checkpoint trend, as-closed vs present lifecycle.
**Acceptance:** does not count rolled-over free funds as new income; no fabricated daily balances.

### HB-023 · Safe historical October import
**Status:** Planned · **Priority:** P1 · **Dependencies:** HB-010, HB-019, HB-022 · **Area:** import
**Deliverables:** private, reviewed Markdown input-to-events mapping and import validation.
**Acceptance:** imports only known checkpoint values and source-backed obligations; unresolved differences not called income; no real data in Git. See IMPORT_OCTOBER.md.

### HB-024 · Optional categories and private export
**Status:** Planned · **Priority:** P1 · **Dependencies:** HB-017, HB-022 · **Area:** reporting
**Deliverables:** optional uncategorized operations, category corrections, JSON/CSV user export.
**Acceptance:** new category never changes cash amount/period; export respects auth and contains explicit provenance.

## M4 — PDF bank statements (later, gated)

### HB-025 · Secure PDF upload and document links
**Status:** Planned · **Priority:** P2 · **Dependencies:** M2, private object-storage/security review · **Area:** documents
**Deliverables:** private upload, per-user access validation, document linked to statement month.
**Acceptance:** PDF optional; upload date can differ from statement period; no public URLs or Git storage.

### HB-026 · Statement parsing and supervised reconciliation
**Status:** Planned · **Priority:** P2 · **Dependencies:** HB-025, HB-010, HB-022 · **Area:** documents/finance
**Deliverables:** parser candidates, match/approve/ignore workflow, category suggestions.
**Acceptance:** imported proposal not automatically posted; matched details explain checkpoint differences without debiting card again; closed report changes only through new version.
**Cases:** F-012/F-014.

## Backlog review workflow

- To start: choose the **first Ready** task. Agent reads AGENTS.md + related BR/ADR/scenarios. Agent proposes scoped changes and tests before coding.
- Before changing status to Done: reviewer confirms acceptance and records *actual* test evidence and commit/PR link.
- Record GitHub Issues only after explicit creation, with format `HB-001 → #<issue>`; do **not** assume Issues exist.
- A task dependent on unresolved ADR stays Planned / Blocked, not started by assumption.
- Don't create one giant PR for M1/M2; one coherent task or compatible small pair per PR.
