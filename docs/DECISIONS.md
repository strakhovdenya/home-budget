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

## HB-002 proposal prepared — 2026-11-01 (not an accepted decision)

[ADR 0002](adr/0002-month-closing-and-corrections.md) and [HB2-001..030](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md) propose deterministic historical/knowledge cuts, explicit same-day order, immutable close versions and transfer concurrency/lineage. HB-002 is in Review; independent review and owner acceptance are pending. D21..D25 and Accepted ADR 0001 remain unchanged. [Q-HB2-02a/b/c](OPEN_QUESTIONS.md#hb-002-review-questions) present multiple-source/signed-carry options without selecting policy; no new forecast formula, implementation or owner decision is claimed.

## HB-002 owner UX clarification — 2026-11-01

- D26: ordinary month transition is one actual-check budget update: enter current card balance/date, review carry and complete distribution, confirm once. Save real checkpoint, full vector, transfer consent and existing obligation/savings funding history atomically. Example Nov28 B=90000,Nov=40000/Dec=50000,R[Nov]=30000 → Dec2 actual B=84000,Nov=0/Dec=84000,R[Dec]=30000,F[Dec]=54000. No artificial intermediate state or attribution of -6000 as a month's expense. D23 consent remains, now embedded in the primary update UX.
- D27: equal observed amounts still represent a new actual bank check/date; choose observation mode by what the user did, not amount comparison. Explicit redistribution/transfer-only may reuse a confirmed checkpoint and remains a technical alternative. Detect current period on website open; no background financial mutations. Unconfirmed visits do not change money. Carry can be deferred while a valid complete ordinary update is confirmed.
- D28: an untouched negative unrelated month alone does not invalidate carry. B=89000,Nov=40000/Dec=50000/Jan=-1000 → Nov=0/Dec=90000/Jan=-1000 is arithmetically valid; preserve that month's amount and earmarks. Review actual source/target/funding dependencies, not a global negative-month ban. Simultaneous multiple-source UX and negative source/target carry policy remain open; no HB-003 liquidity formula chosen.

These are explicit owner requirement clarifications, not acceptance of ADR 0002. The transfer-only emphasis in Accepted ADR 0001's month-opening section is addressed by a minimal proposed addendum in [ADR 0002](adr/0002-month-closing-and-corrections.md#owner-clarification-one-ordinary-budget-update); ADR 0001 is not edited. [HB2-031..038](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md) cover this clarification. ADR 0002 stays Proposed, HB-002 stays Review; independent review pending.

## HB-002 fresh-start owner decision — 2026-11-01

- D29: past negative month allocation is a planning deficit, not a real unpaid obligation. At the first visit after a month change offer A CARRY or B FRESH_START with explicit user choice and neither default. B records consent NOT to carry past signed budget balances, a real fresh checkpoint and one complete active distribution; the old allocation revisions and deficits remain historical. B is not income/expense, a bank movement or forgiveness/payment of a liability.
- D30: B works in one atomic update after any number of missed months, without mandatory intermediate carries/checkpoints/closes. Synthetic example Nov20 2026 actual B=10000,A={Nov:-5000,Dec:15000};no December visit;Jan5 2027 actual B=8000,A={Nov:0,Dec:0,Jan:8000}. Keep both real observations, Nov deficit and December's last known allocation effective Nov20;Dec31 actual balance stays unknown. D=-2000 is not attributed as income/expense. No +5000 compensation or -15000 write-off is posted.
- D31: all existing unpaid obligations retain identity/origin/full outstanding reserve; all savings retain identity/amount unless separately explicitly changed/released. In B review/confirm their funding from affected old periods into the current period, with immutable history and no duplicate or disappearance. Full reserves persist even if fresh money is insufficient. The former negative/multiple-old-month carry gates do not apply to B; invalid data/authorization/revision conflicts still do. Detailed signed/multi-source proposal semantics under A remain for review; neither mode is automatically chosen.

Coverage: [HB2-039..046](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md). This is explicit product approval of the fresh-start option, not acceptance of the entire ADR. Accepted ADR 0001 remains unchanged: its complete-vector model and technical carry examples coexist with this additional explicit non-carry decision. ADR 0002 remains Proposed, HB-002 Review; no new forecast formula or runtime implementation.

## HB-002 acceptance — 2026-11-01

The owner reports independent review of ADR0002 and all46 HB2-001..046 scenarios completed and explicitly approves the scoped architectural contract. After successful final local document/arithmetic checks,[ADR0002](adr/0002-month-closing-and-corrections.md) is Accepted and HB-002 is Done as a specification task. Earlier Proposed/Review entries above are chronological preparation records,superseded as current status by this acceptance.

Accepted:fresh actual card check and full confirmed distribution in one atomic update;no background monetary transfer;closing without a last-day check;unknown actual end balance remains null;immutable original reports;late corrections publish a new version only after confirmation. Past planning deficits are not unpaid liabilities. Explicit B FRESH_START works after one or several missed months,retaining all real unpaid obligations at full remaining reserve and all savings unless separately explicitly amended. A/B is never auto-selected. An unrelated untouched negative month alone cannot block otherwise permitted carry. Allocation differences are not confirmed income/expenses.

**Scope exclusion Q-HB2-02:**complex A CARRY with several past months or affected negative budgets is NOT approved. Future implementation must reject that unsupported A request with OWNER_POLICY_REQUIRED and zero financial writes until a separate owner decision and scenario approval. Do not invent its algorithm,require a per-missed-month transition chain or choose B automatically. Explicit FRESH_START remains available and must preserve full earmarks/history. Q-HB2-01 is resolved by this accepted contract;Q-HB2-02 remains open and is not a completion blocker for the scoped HB-002.

Evidence:[46 reviewed scenarios,acceptance trace and local checks](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md). Independent review completion is owner-reported;local checks are not an additional independent/runtime review. Accepted ADR0001 is unchanged. Python is unavailable;Node equivalents do not claim execution of `scripts/check_agent_docs.py`. No app/dependencies/migrations introduced. HB-003 must still decide physical-liquidity warnings/final forecast without assuming a cap;Q-HB1-03 recurring-template MVP scope also remains open. One local HB-002 documentation commit is authorized;no push/PR.
