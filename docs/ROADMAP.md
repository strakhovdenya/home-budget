# Roadmap — milestones and evidence gates

**Current scope — 2026-11-08:** [D46–D49](DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08) makes full saved
financial history mandatory MVP scope. Phase0/1 prose below describes the original
sequence; actual completion/evidence is in [TASKS](TASKS.md).

## Phase 0 — Product contracts (this commit)
- Normative rules, architecture, data model, UX, privacy policy, scenario specs, Codex workflow and agent skills.
- Exit: review unresolved items and prioritize finance invariants; no product implementation yet.

## Phase 1 — Foundation & finance engine (first Codex milestone)
- Next.js TS + MUI + localization shell; Neon PostgreSQL/Drizzle, migrations, Google auth allowlist, basic account.
- Pure cents/date/period projection; checkpoint-first core, obligation full reserve, update batch atomicity, daily forecast, invariant tests.
- Exit: test suites demonstrate no double debit, past/current/future allocation, full reserve/deficit and precise cents; auth and migrations verified.
- Detailed spec: docs/planning/phase-01-foundation.md.

## Phase 2 — Usable personal budgeting
- Bank-like responsive dashboard, update-budget wizard, obligation and savings management. HB-020 onboarding and recurring proposals are P0 MVP scope under D45.
- Auto-open calendar month; primary explicitly confirmed FRESH_START, secondary working CARRY/DEFER, no automatic mode; full earmarks persist once. Manual close supports incomplete bank data without a final-day checkpoint; immutable versions retain old allocations after transfer. Audit timeline and stale balance reminder.
- End-to-end tests on mobile and desktop; scenario signoff.

MVP common baseline: HB-019 Done → HB-019.1 Done (Owner Accepted 2026-11-08) → independent HB-019.2 and HB-020 →
HB-021. HB-019.2 provides all saved current/past checks and financial states,
separating as-known H/K, later corrections and immutable closing versions.
The [fingerprint technical stage](planning/finance-fingerprint-follow-up.md)
is required before final HB-021 evidence. All future implementation needs separate
permission. Phase3/4 extended analytics/import/PDF remain outside MVP.

## Phase 3 — Historical reports & import
- Calendar vs financial-month views, comparisons, category optional, CSV/JSON export, optional October history import (local authorized process, never commit raw bank data).
- Extended origin/carryover analytics and historical import tooling; existing corrections, closing versions and basic history remain M2 requirements.

## Phase 4 — Optional documents
- Private PDF storage, parse text/OCR, draft matching, user approval, categorization, checkpoint interval reconciliation.
- No auto write on import; explicit consent; redacted data; privacy review.

## Later / not committed
Multiple distinct bank accounts, combined reports, optional cash accounts, advanced analytics, bank sync (only if explicitly requested). No PWA.

## Delivery gates (all phases)
Task spec → deterministic tests → implementation → security/accessibility/performance check → independent review evidence → user approval before merge/release. Never mark milestone complete on unrun tests.
