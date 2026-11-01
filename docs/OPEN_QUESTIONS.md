# Remaining implementation-level questions (not blockers for planning)

Owner clarification 2026-11-01 resolves the primary product model; see [D21..D25](DECISIONS.md) and [Accepted ADR 0001](adr/0001-checkpoints-and-allocations.md). Do not reopen settled decisions as implementation assumptions.

## Resolved by owner clarification

- Ordinary input is actual balance/date plus the COMPLETE user-confirmed month distribution. No required purchases, income, categories, net-delta assignment or explanations; no user suspense.
- Primary equality is sum(month balances)=confirmed balance. Differences in month states are not inferred bank operations. Optional K/U reconciliation is separate.
- Calendar opens automatically; cash carryover is proposed at next open and applied only after one-button confirmation (option A). Obligations and savings persist with full earmarks/identity; no duplicated target cash or bank movement. Unchanged confirmed balance need not be re-entered for transfer alone.
- No final-day observation required. Close may retain unknown actual end balance with incomplete bank data, last historical observation/date, known allocation/earmark states and immutable versions. A later transfer never erases old history.
- Neon is selected PostgreSQL provider. Fully paid outstanding may be zero. Domain/UI separation and prior HB-004/HB-015/HB-016 review gates remain in place.

## HB-001 approval register — unresolved, no business rule changed

This heading retains existing cross-document links. Product clarifications above ARE owner decisions; ADR 0001 is Accepted after owner-reported independent review. Only these decisions remain open:

| ID | Decision / contract needed | Options or scope, no automatic acceptance | Gate |
|---|---|---|---|
| Q-HB1-01 | Forecast/warning where planning budget exceeds physical liquidity | HB-003 must compare budget-based daily guideline plus separate liquidity warning versus a liquidity-aware capped guideline with planning displayed separately. Exact available-liquidity computation and warning behavior need approval; no preferred formula/cap is selected by ADR 0001. | HB-003 before edge-case implementation |
| Q-HB1-03 | MVP membership of recurring templates | Existing conflict remains: PRD/HB-020 P1 versus original M2 inclusion. A: P0 through HB-021 baseline with templates post-MVP; B: include templates, promote HB-020 and add HB-021 dependency. D13 behavior remains agreed. | Owner M2 scope signoff |
| Q-HB2-01 | Historical ordering and closing contract | HB-002 specifies observation/effective/recorded cutoffs, ambiguous same-day checkpoints, selecting historical allocations/earmarks when closing after transfer, late evidence/backdated corrections and reviewed version creation. Unknown end balance and original-version retention are already decided, not options. | HB-002 before persistence/core implementation |
| Q-HB2-02 | General transfer proposal beyond approved ordinary example | For multiple old months or negative source/target budgets, specify proposal composition, funding associations and conflicts with an existing proposal; coordinate HB-003 liquidity behavior. One-button consent and no duplicate cash/earmarks are fixed. Do not invent a negative-budget rollover policy. | HB-002/HB-003 before generalized transfers |

Q-HB1-02 (suspense and residual-source allocation policy) is RETIRED, not pending: full distribution without user suspense resolves it; PDF evidence cannot silently rewrite allocations. The former recommended `min(G,L)` cap is withdrawn; Q-HB1-01 stays open.

Other future setup work is not a current product ambiguity: verify current Auth.js identity/session handling and Neon provisioning/plan limits during implementation; keep Europe/Berlin semantics, revisit timezone change only if multi-user support is requested; templates require accept/edit/skip and deduplication already. Any NEW owner product decision must be recorded in [DECISIONS.md](DECISIONS.md) with scenario coverage before implementation.
