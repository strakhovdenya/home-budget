# Home Budget — Task Backlog (Codex-ready)

**Source:** [PRD](PRD.md) → [business rules](BUSINESS_RULES.md) → [implementation plan](IMPLEMENTATION_PLAN.md) → these tasks.  
**Status:** planning only; **no tasks implemented yet**.  
**Conventions:** `HB-NNN` stable ID; `Ready` = can start after prerequisites, `Planned` = not yet ready, `Blocked` = needs decision, `In progress`, `Review`, `Done`.  
**Work policy:** one task / coherent PR at a time. Codex must not silently mark tasks complete. GitHub Issues optional later; add each issue URL beside the stable ID rather than duplicating tasks.

### Priority legend
P0 = indispensable for a correct first usable version; P1 = useful post-MVP; P2 = deferred functionality.

## M0 — Close domain gaps before implementation

### HB-001 · Formalize checkpoint net changes and financing allocations
**Status:** Ready · **Priority:** P0 · **Dependencies:** none · **Area:** domain/architecture  
**Inputs:** [BR-01, BR-05, BR-09, BR-11](BUSINESS_RULES.md), [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md), F-003/004/005/011/012/015.
**Deliverables:** ADR in `docs/adr/0001-checkpoints-and-allocations.md`; update data model if needed; new acceptance scenarios.
**Acceptance:**
- Distinguish physical confirmed balance, net unexplained movement, actual income/outgoings and internal period allocations without inventing bank cash.
- One physical movement may be funded by several months, including an advance; conservation and no double booking are formalized.
- A known gross receipt > net checkpoint increase is supported when spending happened between checks.
- Later PDF import can explain previous provisional differences without subtracting from bank balance again.
- At least three edge-case scenario tests can be implemented deterministically; document any unresolved choice.

### HB-002 · Specify immutable month versions and backdated corrections
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001 · **Area:** domain/architecture  
**Deliverables:** `docs/adr/0002-month-closing-and-corrections.md`, scenario updates.
**Acceptance:** original close survives corrections; backdated point does not erase later bank observation; late payment vs historical outstanding are separate; changes to old-period carryover are explicit; full event ordering recorded.
**Cases:** F-009/F-010/F-013/F-018.

### HB-003 · Formalize daily forecast and carryover algorithm
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001, HB-002 · **Area:** finance rules  
**Deliverables:** examples, pure function input/output contract, edge-case specs.
**Acceptance:** inclusive remaining-day count, future-period exclusion, prev-month rollover with origin trace, negative available shows 0 forecast and deficit, floor to exact cents; future-month preview uses full month days.
**Cases:** F-003/F-005/F-006/F-009.

## M1 — Platform, authentication, persistence, pure finance

### HB-004 · Bootstrap Next.js TypeScript project
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001 review at least · **Area:** platform  
**Deliverables:** Next.js App Router, package lockfile, lint/typecheck/test/build scripts, setup docs.
**Acceptance:** local dev + build commands run; TypeScript strict; no PWA, no service worker; project retains docs/ and .agents/skill files.

### HB-005 · Build MUI responsive shell and translations
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-004 · **Area:** UI  
**Deliverables:** MUI custom theme, light/dark/system, RU/DE/EN localization, responsive placeholders.
**Acceptance:** keyboard/touch usable for phone and desktop; translated labels in all languages; theme persisted; no extra Tailwind/shadcn stack.

### HB-006 · Define and migrate database schema (Neon + Drizzle)
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001, HB-002, HB-004 · **Area:** persistence  
**Deliverables:** schema, migration scripts, synthetic fixtures, DB integration tests.
**Acceptance:** account_id on bank financial records; unique period and idempotency keys; audit/month closure history non-destructive; local migration reproducible; no actual bank data.

### HB-007 · Google OAuth with single-user allowlist
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-004, HB-006 · **Area:** security  
**Deliverables:** protected routes, server-side identity/ownership checks, env example.
**Acceptance:** Google account not allowlisted denied; cannot read/write via direct endpoint bypass; session secure; secrets never committed.

### HB-008 · Money, dates and financial-period types
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-003, HB-004 · **Area:** domain  
**Deliverables:** pure cents arithmetic, Berlin date/period utilities.
**Acceptance:** no floating point money; cents totals exact; period boundary in Europe/Berlin; leap year/end-of-month verified with unit tests.

### HB-009 · Event/audit storage and idempotent updates
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-006, HB-008 · **Area:** domain/persistence  
**Deliverables:** event writers, optimistic version and transaction-safe batch interface.
**Acceptance:** repeat request doesn't duplicate action; concurrent writes reject/retry safely; partial writes never persist; audit retains before/after and effective/recorded dates.

### HB-010 · Bank checkpoints and reconciliation intervals
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001, HB-006, HB-008, HB-009 · **Area:** finance  
**Deliverables:** enter/check/backdate bank balances; projection of latest real observation; known/unresolved interval net.
**Acceptance:** later confirmed bank value remains authoritative after late insert; checkpoint delta isn't called income; not required to record each purchase.
**Cases:** F-010/F-011/F-018.

### HB-011 · Obligations: full reserve and lifecycle
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-006, HB-009, HB-010 · **Area:** finance  
**Deliverables:** create/amend/paid/cancelled, optional partial settlement, potential claims.
**Acceptance:** reserve 100% unpaid remainder; no partial reserve UI/API; marking paid never debits card; cancelled separately releases reserve; previous states visible.
**Cases:** F-001/F-002/F-006/F-007/F-017.

### HB-012 · Savings events and release
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-009, HB-010 · **Area:** finance  
**Deliverables:** voluntary earmark/release history and carryover.
**Acceptance:** savings subtract from free but not bank balance; changes don't auto-debit; deficit offers release but never does it silently.
**Cases:** F-008.

### HB-013 · Period allocations, deficits, advances, rollover
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-001, HB-003, HB-009..HB-012 · **Area:** finance  
**Deliverables:** split receipt/outgoings across period allocations, future advance/negative period, carryover projections.
**Acceptance:** future income excluded from current forecast; split movement counted once; previous free included in next; negative shown as deficit; all allocations reconcile.
**Cases:** F-003/F-004/F-005/F-009/F-015.

### HB-014 · Daily forecast and full budget projection API
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-003, HB-010..HB-013 · **Area:** finance  
**Deliverables:** pure read models for account, period free/reserved/savings, daily guideline and freshness timestamp.
**Acceptance:** dates inclusive, cents floor, negative forecast zero, no invented observed daily bank amounts; period switch safe.
**Cases:** F-003/F-006/F-008/F-009.

### HB-015 · Finance domain tests and CI gate
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-006..HB-014 · **Area:** quality  
**Deliverables:** Vitest unit, DB integration, CI guard for business invariants.
**Acceptance:** scenario IDs mapped to executed tests; authentication and concurrency covered; exact command output recorded; no claims of success without running.

## M2 — End-to-end first usable version

### HB-016 · Dashboard and period switch
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-005, HB-007, HB-014 · **Area:** UI  
**Deliverables:** prominent actual balance, free, reserved, savings, daily forecast, date of last observation, deficit/period indicators.
**Acceptance:** usable responsive phone/desktop; no future receipts in current monthly forecast; stale balance warning after ~7 days; text labels accompany colors.

### HB-017 · Single atomic 'Update budget' flow
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-010..HB-014, HB-016 · **Area:** UI/application  
**Deliverables:** observation date/balance form, paid/cancelled + reserve/savings edits, split allocations, review/submit.
**Acceptance:** one save, old bank amount not assumed confirmed; 'paid but same bank balance' warns; no auto debit; changes visible on dashboard and timeline.

### HB-018 · Obligations and savings management screens
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-011, HB-012, HB-016, HB-017 · **Area:** UI  
**Deliverables:** obligation list/details and history, savings goals/history.
**Acceptance:** edit/close/cancel with full history; savings release may be suggested during deficit but needs click; no partial reserves.

### HB-019 · Manual month closing, versions and rollover
**Status:** Planned · **Priority:** P0 · **Dependencies:** HB-002, HB-013, HB-014, HB-017 · **Area:** finance/UI  
**Deliverables:** auto-start next calendar period, await-manual-close state, immutable closing snapshot, correction versions.
**Acceptance:** old-month as-closed reserve remains after future payment; next budget inherits free/savings/open obligations; no PDF required to close.
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
