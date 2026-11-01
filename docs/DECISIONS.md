# Product decision log (from interview)

- D01: web app on Vercel, **not PWA**, responsive mobile and desktop.
- D02: user-entered actual card balance is main fact; intermittent updates are normal; optional individual transactions.
- D03: marking an obligation paid changes status/full reserve, NOT card balance; require fresh user-confirmed bank balance and warn if unchanged.
- D04: reserve the entire unpaid obligation; partial reserves explicitly **rejected**; partial payment may reduce outstanding.
- D05: savings are voluntary and adjustable, automatically roll forward; suggest release on deficit, never release automatically.
- D06: dynamic per-day guideline covers all discretionary purchases together; categories optional for later statistics.
- D07: original interview described splitting receipts/expenditures across months; **clarified by D21/D22**: primary input is complete remaining balance distribution, optional operation funding is separate; bank date remains separate.
- D08: future-period income must not inflate current-month daily forecast; next-month preview divides by all days in next calendar month.
- D09: original automatic contribution of previous free cash is **superseded by owner D23**: automatic month opening, proposed cash transfer requiring one-button confirmation; retain historical origin.
- D10: current-month budget can be negative; additional income/cash recharge/future allocation or savings release can cover deficit.
- D11: automatic start of month, manual review/close; close stores immutable original and revisions on later correction.
- D12: all financial changes and balances have history; late entry allowed; later observed balances are not overwritten.
- D13: regular payment templates propose creation upon start of new financial period or future-month income; user accepts/edits/skips.
- D14: PDF bank statements OPTIONAL, can be uploaded after close; proposal-based statement reconciliation without double debit.
- D15: v1 one bank card; later additional independent accounts/aggregate may be added. No cash ledger now.
- D16: one allowlisted user via Google OAuth; no public signup.
- D17: bank-like minimal UI built with MUI; light/dark/system; Russian/German/English.
- D18: change obligation amount with simple edit plus immutable event; separate paid vs cancelled, on cancellation release reserve to current free.
- D19: gentle stale checkpoint reminder after around 7 days, no mandatory daily tracking.
- D20: Codex in VS Code, Dark Factory-inspired **spec-first workflow**, not Claude-specific factory runtime.

## Owner clarification — 2026-11-01 (ADR was Proposed at this stage)

- D21: everyday workflow requires only actual card balance/date and a complete user-confirmed distribution of that balance among financial months. No purchases, expense totals, receipts, categories or explanation of net difference required. Sum(month balances)=bank balance in integer cents; no user suspense. Suggested values must be confirmed.
- D22: bank net change, allocation-state change and optional bank operations are separate facts. Negative budgets may represent advances while preserving the total. Optional split operation details/PDF evidence never repost a debit or silently replace confirmed distributions; K/U may exist internally only.
- D23: new month opens automatically; next-open proposal transfers remaining old-month cash ONLY after one-button confirmation (option A). Retain existing new-month funds once and preserve unpaid obligation/savings identities, full reserves, amounts and history. Transfer is internal; already confirmed unchanged bank need not be entered again; changed balance and full distribution can be confirmed together. D03 paid affirmation/warning remains in force.
- D24: no last-calendar-day checkpoint is required for closing/transfer. Close with either confirmed end balance or incomplete bank data: actual end balance unknown, last historical checkpoint/date, known allocation/obligation/savings states and completeness flag. No guessed month-end point, inferred zero spending or automatic month assignment of interval net. Original report survives later transfer/correction; reviewed new versions allowed. HB-002 details the contract.
- D25: normal daily forecast uses agreed current budget less obligations/savings, with future allocations isolated and no double subtraction. The physical-liquidity warning/final forecast formula for planning funds exceeding available cash remains OPEN for HB-003; no cap approved. These clarifications alone did not decide HB-020 MVP membership or accept ADR 0001; the later acceptance is recorded below.

Coverage: [HB1-001..020](../tests/scenarios/phase-01/hb-001-checkpoints-and-allocations.md); accepted technical decision: [ADR 0001](adr/0001-checkpoints-and-allocations.md). No application test execution is implied by a decision log entry.

## HB-001 acceptance — 2026-11-01

Owner reports independent review of ADR 0001 revision 2 and all 20 scenarios completed and approves the checkpoint-first model. Final clarifications retain Nov 28 as the last bank observation after a Dec 1 transfer without a new check, and prohibit reporting allocation deltas as actual spending/confirmed income without operation evidence. These clarify existing separation of observations, budget states and optional operations; no new liquidity policy is selected. Following local document/arithmetic verification, ADR 0001 is Accepted and HB-001 is Done as a specification task. Detailed historical contracts remain HB-002; forecast/liquidity edge remains HB-003.

No user personal details or confidential source document values are copied into this repository.
