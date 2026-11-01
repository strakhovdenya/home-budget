# Phase 01 — foundation and finance engine (planning contract)

## Goal
Deliver a safe authenticated local/preview Next.js app shell and deterministic finance core with no double debit or future-period leakage.

## Tasks (split into reviewable changes)
1. Scaffold Next.js TypeScript + MUI App Router, locale catalogs RU/DE/EN, theme modes; no PWA.
2. Configure Drizzle PostgreSQL schema for users, accounts, periods, checkpoints, budget update batch, obligation/savings events, allocation, closings; migrations and FK/unique checks.
3. Google OAuth allowlist, server checks on all reads/writes, protected dashboard skeleton.
4. Pure finance core: EUR cents, Europe/Berlin dates, authoritative checkpoints with COMPLETE month allocations summing to balance, full earmarks, nonnegative cash allocations and signed free deficits and confirmed transfer proposals. No mandatory operation/residual ledger or user suspense; HB-003 approves liquidity-edge forecast.
5. Atomic update flow and projections; user confirmation of fresh balance with payment changes; optimistic concurrency and idempotency.
6. Tests and security review, developer documentation, clear local dev setup. Implement in smaller PRs if needed.

## Non-negotiable acceptance criteria
- Balance user says 900.00 remains 900.00 when an obligation marked paid; reserve falls 54.00, free changes only by formula.
- A 1200.00 receipt in late November allocated entirely to December cannot raise November daily forecast.
- An obligation of 200.00 with only 150.00 on card produces deficit -50.00; no partial reserve available.
- Backdated checkpoint and closure revision never delete existing checkpoint or overwrite original monthly snapshot.
- All operations in a budget update commit atomically and are protected by auth; no double allocation on retries.
- Ordinary update works with only actual balance and full user-confirmed distribution; allocation deltas are not income/expenses. New month auto-opens but cash transfer needs one-button confirmation; same obligations/savings and existing target cash count once.
- Closing without a final-day observation retains unknown end balance, actual last historical observation/date and allocation/earmark state; later transfer cannot erase original report. HB-002 specifies detailed contract.

## Verification recipes
Read tests/scenarios/README.md and execute scenario cases defined in tests/scenarios/phase-01/core-rules.md. Later add Vitest/Playwright implementation; report exact commands/results, do not claim acceptance without evidence.

## Out of scope
PDF OCR/import, multiple account UI, PWA, granular transaction categorization automation, speculative bank integration.
