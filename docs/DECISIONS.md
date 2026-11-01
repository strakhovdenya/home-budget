# Product decision log — current correction and archived chronology

**Current rule:** D32..D35 below supersedes signed actual-cash interpretations in the archived D10/D22/D28..D31 text. Earlier decisions and acceptance records are preserved as chronology,not current permission for negative A.

## Archived original interview and clarifications

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

## Actual-money allocation correction — 2026-11-01

The owner reviewed the allocation-error analysis,approved its correction in substance,and explicitly authorized editing all affected documents including previously Accepted ADR0001/0002. These statements supersede the erroneous earlier signed-A interpretation;Git history is not rewritten.

- D32: ordinary one-card B>=0 is distributed as A[p]>=0,sum(A)=B. Negative new A rejects even if its sum matches. F=A-R-S may be negative;deficit=max(0,-F)>=0 and daily=floor(max(0,F)/inclusiveDays). Full reserves persist and savings never release automatically. D10's negative-budget wording means free deficit,not negative distributed cash;D22's signed-A extension is replaced.
- D33: only actually observed money may be allocated to any financial month. Expected receipts do not enter B/A. A later real checkpoint may include received money without requiring an income operation. D07 split financing remains possible using existing money;optional signed operation details never repost cash.
- D34: ordinary CARRY moves nonnegative allocated cash and full R/S with consent,even if source F<0. FRESH_START confirms fresh actual B and full nonnegative A after missed months,preserving all history,obligations and savings. D28's untouched-negative-A exception and D30's signed initial example are replaced in active specifications;their original text is archival. No mode is auto-selected;simultaneous multi-source CARRY remains open.
- D35: no app/user financial records exist,so no migration,tables or legacy-conversion machinery is needed. Earlier negative-A examples survive only as archived interpretation or rejection fixtures. Historical reports/revisions remain immutable;no net difference or old negative A proves historical overspend. A separate historical-overspend feature,overdraft scope and cross-period earmark liquidity presentation require further decisions if needed. No automatic credit/debt mechanism is accepted.

Original HB-001/HB-002 completion and owner-reported review evidence are retained above and in Git. Their tasks are reopened to Review only for the allocation amendment;ADRs0001/0002 are Amendment Review until renewed independent review and owner confirmation. This is owner approval of the corrected requirement,not re-acceptance of amended contracts. ADR0003 remains Proposed,HB-003 Review. No runtime tests,commit,push or PR are authorized/claimed by this entry.

## Corrected ADR 0001 and 0002 re-acceptance — 2026-11-01

The owner confirms repeated independent review of the D32..D35 amendment and that all four subsequent findings are resolved. The corrected financial model is approved: [ADR0001](adr/0001-checkpoints-and-allocations.md) and [ADR0002](adr/0002-month-closing-and-corrections.md) are Accepted again;HB-001 and HB-002 are Done as documentation/scenario tasks. Review completion is owner-reported;this entry does not claim an additional local independent review or runtime tests.

Acceptance applies to B>=0,A[p]>=0,sum(A)=B,F=A-R-S,deficit=max(0,-F);full selected obligation reserves and retained savings may exceed A/B without creating cash or automatic reduction. Possible claims are included only when explicitly fully selected;unselected possible claims contribute0. Expected income never enters B/A before an actual bank check;income operations remain optional. CARRY/FRESH_START consent,full funding/history and no repeated debit are preserved. The four fixes clarify R/S semantics,possible-claim reservation flags,chronological February fixtures,and the separate negative-observation DTO without an invented allocation vector.

The original signed-allocation interpretation was erroneous and is superseded,not retrospectively validated. Earlier acceptance,reopening and document/arithmetic evidence remain preserved as chronology and in Git. Current evidence: [correction regressions and review-fix checks](../tests/scenarios/phase-01/hb-003-allocation-correction.md).

ADR0003 remains Proposed,HB-003 Review,Q-HB1-01 Open;no liquidity policy selected. Multi-source CARRY,overdraft allocation and a separate historical-overspend feature remain unapproved. HB-004 is not started. No app,dependencies,migrations,commit,push or PR are introduced by this status update.

## All-period safe main daily limit — 2026-11-01

- D36 (owner product decision for Q-HB1-01): choose option B. The main current daily limit must protect all existing fully selected unpaid obligations and retained voluntary savings across every financial period,regardless of due date,and must not reuse money allocated to other months. The ordinary current-month budget guideline may be secondary,but cannot replace the main safe estimate. B10000,A={Nov:10000,Dec:0},reserved December unpaid20000 gives obligation shortfall10000,safely available0,main daily0.
- Protection does not move funding periods,change due dates,status,reservation selections or savings,and does not invent bank debits or November expenses. Financing period,due date and actual bank debit date remain separate. Possible claims enter R only under the existing full-reservation selection rule. Expected income remains excluded;no income/expense operation is mandatory.
- Exact mathematics is proposed for review in [ADR0003](adr/0003-daily-forecast-and-liquidity.md):protect max(A[p],R[p]+S[p]) for each other period plus current R/S,and floor the nonnegative residual over inclusive remaining days. The proof,numerical fixtures,shortage labels and pure DTO require independent review;this decision selects product behavior,not final acceptance of that formula or ADR0003.

ADR0001/0002 remain Accepted,HB-001/002 Done. ADR0003 stays Proposed,HB-003 Review;Q-HB1-01 presentation choice is resolved to B while formula verification remains open. Multi-source CARRY,overdraft allocation and a historical-overspend feature are not approved;HB-004 not started. Earlier statements that no liquidity presentation was selected are historical stages superseded by D36. No implementation,commit,push or PR.

## HB-003 stale data and informational warnings — 2026-11-01

- D37 (owner choice A):a coherent last confirmed financial state continues to produce the displayed safe daily estimate even when old. Use current Europe/Berlin asOfDate for remaining days;show the real last bank-check date,an explicit older-data label and a gentle Update balance action. Never claim today's observed cash or invent checkpoints/operations. No valid confirmed state means unavailable,not a fabricated0. Calendar opening alone never executes CARRY/FRESH_START;current month uses only its confirmed allocation and explicit transitions.
- D38 (owner choice A):shortage,underfunding and bank-data-age warnings are visible information. No acknowledgment button,view blocker or repeated confirmation on site open. Warnings never mutate bank/allocation/reserve/savings state. Group overlapping comparisons without adding or repeating identical shortage amounts. Explicit confirmation/authorization for actual financial actions remains mandatory,including updates,allocation/lifecycle edits and CARRY/FRESH_START.
- D39 (owner choice A):ageDays is the number of Berlin calendar dates between observedDate and current asOfDate;showReminder iff ageDays>=7. Nov20→Nov26 age6:no reminder;Nov27 age7:show;Nov28 age8:keep showing. Count civil dates across DST,not elapsed milliseconds divided by24 hours. This is a gentle in-app reminder,not a required bank check,background bank polling,money action or push-notification system.

D36 safe-main formula remains unchanged. HBL-018 is corrected to independent CARRY/FRESH_START alternatives from the same base,with distinct consent/requests and retained obligation/savings identity. These UX decisions close the remaining owner product questions within HB-003;final independent review and explicit acceptance are still pending. ADR0003 remains Proposed,HB-003 Review;ADR0001/0002 Accepted,HB-001/002 Done. HB-004 is not started;multi-source CARRY,overdraft allocation and historical-overspend features remain outside approval. No implementation,commit,push or PR.

## HB-003 final acceptance — 2026-11-01

The owner confirms final independent review and explicitly accepts [ADR0003](adr/0003-daily-forecast-and-liquidity.md),including the safe-main mathematical model D36 and UX D37..D39. Three final editorial fixes are incorporated:HB3-010 asserts the selected cross-period safe formula,C01..C08 are accepted-policy scenarios,and F-003 explicitly uses already received December funds inside a real confirmed full balance. Review completion is owner-reported;no additional local independent review or runtime test execution is implied.

ADR0003 is Accepted,HB-003 Done,Q-HB1-01 resolved within this specification scope. The contract is B>=0,A[p]>=0,sum(A)=B,E=R+S,protected=E[current]+sum(max(A[p],E[p])) over other periods,L=B-protected,safeAvailable=max(0,L),mainDailyLimit=safeAvailable div inclusive Berlin remaining days. Full selected unpaid obligations and retained savings can exceed A/B;possible claims count only when explicitly fully selected. Budget F/deficit/guideline stays separate,no expected income or duplicate bank debit enters the state.

Accepted UX:display old valid-state estimates with true dates and old-data label;warnings are informational/grouped without acknowledgment or view blocking;reminder iff Berlin civil age>=7. Unknown/incomplete/negative-bank states have no fabricated numerical limit. HBL-018 uses alternative CARRY/FRESH_START branches from one original revision,never sequential double transition. History/identities/explicit financial consent are preserved.

Original drafts,erroneous signed-allocation interpretation,corrections D32..D35,prior acceptance/reopening and all dated verification remain archived and in Git;this final acceptance does not retroactively validate earlier mistakes. Current reviewed cases and exact local evidence:[HB3](../tests/scenarios/phase-01/hb-003-daily-forecast.md),[HBL](../tests/scenarios/phase-01/hb-003-safe-liquidity.md).

ADR0001/0002 remain Accepted,HB-001/002 Done,HB-004 Planned and not started. Q-HB1-03 recurring-template MVP membership,Q-HB2-02 multi-source CARRY,Q-HB3-02 overdraft allocation and Q-HB3-03 historical overspend remain open;none is approved by HB-003 completion. No application,migrations,dependencies,commit,push or PR.
