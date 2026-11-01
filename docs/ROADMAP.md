# Roadmap — milestones and evidence gates

## Phase 0 — Product contracts (this commit)
- Normative rules, architecture, data model, UX, privacy policy, scenario specs, Codex workflow and agent skills.
- Exit: review unresolved items and prioritize finance invariants; no product implementation yet.

## Phase 1 — Foundation & finance engine (first Codex milestone)
- Next.js TS + MUI + localization shell; PostgreSQL/Drizzle, migrations, Google auth allowlist, basic account.
- Pure cents/date/period projection; checkpoint-first core, obligation full reserve, update batch atomicity, daily forecast, invariant tests.
- Exit: test suites demonstrate no double debit, past/current/future allocation, full reserve/deficit and precise cents; auth and migrations verified.
- Detailed spec: docs/planning/phase-01-foundation.md.

## Phase 2 — Usable personal budgeting
- Bank-like responsive dashboard, update-budget wizard, obligation and savings management, regular-payment proposals.
- Month rollover and manual close with immutable versions; audit timeline; stale balance reminder.
- End-to-end tests on mobile and desktop; scenario signoff.

## Phase 3 — Historical reports & import
- Calendar vs financial-month views, comparisons, category optional, CSV/JSON export, optional October history import (local authorized process, never commit raw bank data).
- Robust past-dated corrections, origin/carryover report, versioned closure migration tests.

## Phase 4 — Optional documents
- Private PDF storage, parse text/OCR, draft matching, user approval, categorization, checkpoint interval reconciliation.
- No auto write on import; explicit consent; redacted data; privacy review.

## Later / not committed
Multiple distinct bank accounts, combined reports, optional cash accounts, advanced analytics, bank sync (only if explicitly requested). No PWA.

## Delivery gates (all phases)
Task spec → deterministic tests → implementation → security/accessibility/performance check → independent review evidence → user approval before merge/release. Never mark milestone complete on unrun tests.
