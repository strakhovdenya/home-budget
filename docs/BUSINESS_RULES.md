# Normative financial business rules (source of truth)

Owner correction D32..D35 (2026-11-01) fixes actual-money allocations:A>=0,sum(A)=B>=0;free may be negative from full obligations/savings. [ADR0001](adr/0001-checkpoints-and-allocations.md) and [ADR0002](adr/0002-month-closing-and-corrections.md) are re-Accepted after owner-reported repeated independent review and resolution of all four findings. Original acceptance history is retained. HB-003/Q-HB1-01 is resolved by Accepted ADR0003/D36..D39;multi-source CARRY remains open;no runtime implementation is implied.

## Product principle and saved history — owner 2026-11-08

Home Budget shows available money from the last confirmed financial state with
its real bank-check date and lets the user reconstruct saved financial states.
Unknown movements and balances remain unknown. Complete user-accessible current
and past history is MVP scope, not inferred daily cash or a complete operation
ledger. [D46–D49](DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08) changes delivery/viewing scope, not D36 or
Accepted ADR0001–0003 selection mathematics.

## Vocabulary
- **Bank balance / checkpoint:** actual user-confirmed card balance on an observation date; recorded time is separate.
- **Budget period:** named financial month YYYY-MM owning part of the confirmed card balance, independent of bank activity date.
- **Budget allocation:** nonnegative share of actually observed cash in a complete vector summing to B>=0; not expected income or an operation.
- **Budget deficit:** max(0,-F) where F=A-R-S;negative free is valid and is not a negative cash allocation or automatically a new liability. Historical overspend is a separate optional reporting question.
- **Allocation revision:** immutable complete distribution anchored to a checkpoint; redistribution/transfer may reuse an unchanged checkpoint.
- **Obligation:** full remaining unpaid amount attributed to a funding period. Ordinary unpaid obligations are fully reserved;possible claims are included only when explicitly selected for full reservation. Partial payment is allowed,partial reservation is not.
- **Savings:** retained voluntary savings amount attributed to a period and deducted once from free funds. It is not necessarily covered by allocated cash;R+S may exceed A or B without creating money or automatically reducing savings.
- **Bank detail:** optional confirmed operation/evidence; never required to confirm a balance/distribution.
- **Unexplained net:** optional derived interval difference minus known operations, not a user allocation category or confirmed income/expense.

## BR-01: Balance authority and cadence
- Ordinary work requires only actual balance/date and a complete confirmed allocation by month. No purchases, income entries, categories or difference explanations are required.
- Irregular observations are valid. No last-calendar-day checkpoint is required to transfer funds or close a month.
- The latest chronological active checkpoint defines the observed bank balance, not entry order or optional operations. Backdated inserts/corrections retain newer bank facts and immutable prior revisions.
- Never interpolate missing observations, use a later balance as month-end balance, assume no intervening spending, or call a net change income/expense without evidence.
- Show the actual last checked date and explicit older-data label for age>0;continue displaying a complete valid state's safe estimate using current Berlin days. Gentle in-app reminder iff ageDays>=7 civil days (D37..D39),including DST;no elapsed-hour shortcut,forced check,background polling or push. Missing/invalid confirmed state is unavailable,not0.
- Transfer/redistribution alone must not advance the last-checked date or create a bank checkpoint: a Dec 1 transfer anchored to Nov 28 still displays Nov 28 as the last confirmed bank observation.
- A genuinely new actual bank check creates a new checkpoint/date even if the amount equals the previous observation. Equality of amounts does not select checkpoint reuse; an idempotent retry of the same check still creates no duplicate.

## BR-02: Atomic budget update; no double debit

- First run under [D55](DECISIONS.md#hb-020-product-alignment--owner-2026-11-11) confirms actual B/observation date and complete A in one explicit action. A missing single owned EUR technical account is created atomically with the first real checkpoint/vector/audit/receipt, never on login or a hidden preliminary commit; no name/create-account screen. Before confirmation B/A/F are UNKNOWN, not0; explicit observed B=0 with complete A is valid. Invalid/failed confirmation creates neither account nor partial financial facts. Existing empty accounts use actual confirmation without recreation; existing confirmed data remains unchanged. Original-key replay/status and cross-instance race/UNKNOWN/rollback guarantees apply to the whole confirmation, not merely the account INSERT.
- Confirm fresh actual bank balance and its full month distribution in one logical update; obligation/savings changes may be included. Suggested amounts require user confirmation.
- Marking paid reduces the full reserve by the paid portion; it never automatically lowers bank balance. The fresh observation already includes any tracked-card debit.
- Paid with unchanged bank balance requires warning and explicit affirmation; without fresh confirmation do not claim trustworthy updated free funds.
- Redistribution/transfer alone against an already confirmed unchanged balance need not re-enter the same bank amount. If it changed, combine a new checkpoint with the new complete distribution. This does not waive payment affirmation rules.
- Cancellation releases active reserve, has distinct history and no cash movement. All changes are atomic/idempotent.

## BR-03: Full reserve only
- Reserve 100% of each active unpaid outstanding; negative free budget is valid and labelled deficit. No partial reserve fraction exists.
- Partial payment may reduce outstanding, with ALL remainder reserved. Fully paid outstanding may be zero; original amount is positive.
- Reserve edits are not bank transactions. Payment outside tracked card uses reason/history and fresh confirmed unchanged card balance; do not invent a card debit.
- Possible/pending describes isPossible=true,not another lifecycle status. Keep UNPAID/PAID/CANCELLED plus reserveFull:boolean. Ordinary UNPAID requires reserveFull=true. Possible UNPAID may explicitly have reserveFull=false (R contribution0) or true (full outstanding). PAID/CANCELLED requires reserveFull=false and contributes0. No independent reserved-amount or partial-reserve field exists. Selecting/unselecting reservation is explicit,audited and retains identity/full historical state;no automatic inclusion of unelected possible claims or bank debit.
- R is the sum of included full unpaid amounts;S is the retained voluntary savings amount. R+S may exceed period A or total B,producing negative F rather than new cash. Never cap R at available cash or automatically reduce S.

## BR-04: Daily spending forecast
- Guidance covers all discretionary purchases. Normal eligible free is the confirmed CURRENT month allocation less its full obligation reserves and voluntary savings; older funds contribute only after confirmed transfer. Future allocations do not automatically raise current budget.
- In ordinary funded cases: floor integer cents of max(0, eligible free) divided by remaining Europe/Berlin calendar days, inclusive of today. Future preview uses every calendar day of that future month.
- Purchases already reflected in the confirmed balance/vector are not subtracted again. Signed optional financing detail is explanatory only; expected income never increases B/A/free.
- Negative free is displayed as deficit, with spending guideline zero.
- Owner D36 selects option B:the main current daily limit protects all existing selected full unpaid reserves and retained savings across every period,regardless of due date,and cannot reuse other-month allocations. The ordinary current budget guideline is secondary. Negative A remains invalid;protection never changes funding period,due date,status,selection,savings or bank cash.

### D36 accepted safe-main formula

D36 mathematics and D37..D39 UX are Accepted in ADR0003 after owner-reported final independent review. Contract:E[p]=R[p]+S[p],T=E[current]+sum(max(A[p],E[p])) for every other allocation/funding period,L=B-T,safeAvailable=max(0,L),mainDaily=safeAvailable div inclusiveDays. Equivalent L=F[current]-sum(max(0,E[p]-A[p])) over other periods shows no double reservation. R includes elected possible claims only;all retained S remains protected. No expected income,time horizon or due-date exclusion. B10000/Nov10000/Dec0/R Dec20000 gives shortage10000,safeAvailable0,mainDaily0.

Keep budget deficit=max(0,-F[current]),obligation shortage=max(0,sum(R)-B),earmark shortage=max(0,sum(R+S)-B) and protection shortage=max(0,T-B) distinct;do not add these overlapping comparisons or label any as a new debt/expense. Missing/incomplete/negative-bank states have no safe numeric result. D37 requires continued display of older complete-state estimates with actual date and older-data label;never hide solely for age or replace safe main with budget guidance. D38 warnings are informational,without acknowledgment,view blocking or repeated confirmation;group equal shortage amounts with their meanings and never add overlapping comparisons. Actual financial mutations still require confirmation. D39 reminder is exactly ageDays>=7 Berlin civil dates. Formula/specification is Accepted;this is not runtime implementation evidence.

## BR-05: Complete period distribution and confirmed transfer
- For EVERY new confirmed ordinary checkpoint: each A[p]>=0 and sum(A)=actual B>=0 in integer cents. No suspense/unassigned category. Reject NEGATIVE_CASH_ALLOCATION even when the total matches. Actual negative bank observations/overdrafts remain a separate open scope question;never infer available credit.
- User confirms the whole new distribution, not the interval delta. A=80000 Nov becoming B=77000 with Nov=75000/Dec=2000 is valid without operations; -5000/+2000 month changes are not inferred expense/income.
- Statistics must distinguish allocation-state changes from confirmed bank activity. Without operation evidence, never display a month's allocation delta as actual spending or confirmed income; show known operation totals with incomplete-detail provenance, not an invented total or a claim of zero spending.
- Past/current/future periods may hold allocations. Optional operation financing may be split across months, but cannot be added again to an already confirmed state.
- New calendar month opens automatically. Per D41–D42, present explicit FRESH_START as the primary user route, with working secondary CARRY/DEFER. Nothing is preselected or executed on access. CARRY moves completed-month cash only after explicit reviewed confirmation; no automatic cash carryover.
- Transfer is internal: total bank/allocation cash unchanged; existing new-month allocations count once; old active allocation becomes zero for the confirmed full transfer. Retain historical origin and before/after revisions.
- Unpaid obligations persist with identity and full reserve, and voluntary savings persist; funding associations follow the confirmed transfer without duplication or release. Their continued existence is not conditional on a new obligation being created.
- No final-day observation is required. With a changed balance, confirm the new full distribution and transfer together without inventing how net spending divides across months.
- Owner clarification D26: the ordinary month-transition visit combines a fresh actual balance observation, carry proposal, complete allocation and existing obligation/savings funding changes in one confirmed atomic update. No preliminary old-balance affirmation or mandatory standalone carry. Explicit redistribution-only remains possible without a new check.
- Detect/open the current Berlin period on website access; no background carry, bank observation or report closing. Opening/abandoning an unconfirmed draft has no financial effect. User may defer carry and still confirm a valid complete ordinary update; old funding does not move automatically. With changed B, unchanged old amounts are only permissible if the full-vector sum still equals B.
- Validate nonnegativity for the entire new vector and sum equality,plus affected transfer/funding dependencies. At B89000,Nov40000/Dec48000/Jan1000 may carry to Nov0/Dec88000/Jan1000;preserve January once. Negative source free does not block ordinary CARRY;negative A anywhere rejects. Simultaneous multi-source CARRY remains a separate policy gate.
- D29..D35: explicitly offer A CARRY or B FRESH_START with neither preselected. B confirms fresh actual B and one complete nonnegative vector,sets past active allocations to0 with non-carry consent,preserves all prior revisions and does not debit historical free deficits again. No income/expense/debt forgiveness or bank movement is inferred.
- B works after several missed months in one update without serial carries,observations or closes. Example Nov20 2026 B10000,A={Nov:4000,Dec:6000};no December check;Jan5 2027 actual B8000,A={Nov:0,Dec:0,Jan:8000}. Store mode,not-carried period IDs/prior amounts,before/after revisions and consent. Historical Dec allocation6000 remains known effectiveNov20;Dec31 actual bank balance remains unknown.
- Fresh start never pays/cancels/amends an obligation or releases savings implicitly. Preserve each active unpaid identity and full outstanding reserve and each saving's identity/amount; explicitly review funding of affected old-period earmarks in the current month, count them once. If R+S>B,retain full earmarks and show deficit. Amount/status/release changes require separate explicit normal events. Missing identities, invalid sums, stale dependencies and unauthorized writes remain blockers; historical negative free or number of missed months alone do not block B. Current/future edits are part of the full reviewed vector, never an automatic sweep of unrelated future money.

### D40–D45: owner-approved user workflow clarification (2026-11-04)

The financial rules above remain unchanged; the ordinary UX must map the user's
**explicit confirmed action** to a supported existing transition intent.

- Same-month routine: actual bank check + full valid A + optional supported
  lifecycle changes in one atomic update; do not demand a month-transition mode
  solely because an observation is fresh. Unresolved earlier-month cash/funding
  still requires an explicit reviewed transition or deferral.
- On a new-month visit, the primary *user-chosen* "Начать месяц с актуального
  остатка" action invokes FRESH_START with a real observed balance, full reviewed
  vector, old-period A cleared, historical revisions untouched and reviewed move
  of each active old funding identity to the current period. No mode preselection
  on mere page access, no automatic financial mutation or presumed receipts.
- Secondary explicit "Перенести прежнее распределение" invokes existing CARRY;
  it may use an actual check or the last confirmed unchanged check, depending on
  reviewed observation mode. CARRY carries one supported completed source fully,
  including funding identities; simultaneous multi-source CARRY is still gated.
  Secondary "Оставить распределение без переноса" invokes DEFER, leaving old
  funding in place and requiring an exactly balanced final A if the bank changed.
- An obligation's origin/due month differs from its **current funding period**:
  unpaid November debt may be paid in December and reserved there in full after
  approved funding transfer. Existing savings persist; new savings are voluntary.
  No assumed November leftover, no automatic saving creation, no double debit,
  no month-end bank value inferred from a December check or allocation decision.
- **Approved MVP sequencing limitation:** if a transition transfers an identity's
  funding, a lifecycle edit/payment/release of **that same identity** cannot be
  co-confirmed in one update. Reject with SAME_IDENTITY_COMPOUND_NOT_SUPPORTED
  without writes; preserve draft and explain the next step. First explicitly
  confirm the transition, then separately confirm a later budget/lifecycle
  update with any required actual check and payment affirmation. Never silently
  chain or fabricate historical positions. Different identities retain the
  existing atomic-composition allowance.
- A normal UI may display "December available", "reserve for November bill"
  and "laptop savings" as parts of the **same** confirmed B. Underlying storage
  remains A (all physical cash), R and S (protections), F=A-R-S; don't sum
  R/S as extra cash or create a second current month cash bucket.

See [D40–D45](DECISIONS.md#hb-0191-budget-update-ux-and-hb-020-first-run-scope--2026-11-04).
## BR-06: Status and due date
- Under [D57](DECISIONS.md#hb-020-contextual-month--owner-2026-11-12), a template proposal has one context P (viewed YYYY-MM, default current Berlin month). Initial ACCEPT must save originPeriod=fundingPeriod=P and fully reserve its unpaid amount in P. No independent month choices or automatic old-debt transfer. Its effective day remains the actual confirmation day. General obligation origin/funding concepts and separately confirmed D43/D44 transfers are unchanged.
- Keep unpaid/paid/cancelled status, creation period, current funding period, optional due/bank dates, confirmation date and history.
- Confirmation date is not a guessed bank debit date; optional later PDF evidence may refine the latter.
- Amend outstanding with immutable history and full reserve adjustment, no bank movement. Cancellation releases reserve without payment; funding-period treatment in unusual cases must be explicit, not inferred from net cash.
- Under [D56](DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11), an enabled template offers a new calendar-month instance even with old unpaid debt. Reading writes nothing. Explicit ACCEPT creates exactly one ordinary full-reserve obligation after reviewed integer-cent amount editing. Explicit DECLINE ("Не добавлять за этот месяц") durably suppresses only owner/account+templateId+originPeriod, with typed audit/receipt but no obligation, payment, bank operation or change to B/A/C/V,R/S/F or bank-check date. Both outcomes are final and mutually exclusive per key; retries/races resolve one proved winner. Next enabled month is offered independently of prior DECLINE. Disable stops future offers, preserving debts/decisions/history; local close without DECLINE writes nothing and may reappear. Old debt retains identity, full remainder/reserve, origin/current funding and history, with no automatic move/debit. Already paid before access and included in B may be DECLINED without false payment history; an existing obligation uses its normal Paid/Partial/Cancelled lifecycle and required financial confirmations. Config edits, funding changes, disable/re-enable or later payment/cancellation never reset a decided key. No income/receipt trigger or payment-day schedule. Template-created dueDate=null; ordinary optional dueDate, D43/D44 and D45 P0 scope remain.

## BR-07: Savings
- Savings are retained voluntary amounts deducted once from allocated cash to derive F;they are not additional cash/debits or a guarantee of funding. R+S can exceed A/B;preserve full S until an explicit savings decision.
- Persist across months with identity, origin and amount; moving their funding association does not recreate/release them. Release/withdrawal are explicit decisions.
- Bank withdrawal is reflected only by fresh observed balance; savings release in that update avoids double reduction. Release itself changes free funds, not bank balance.

## BR-08: Closing and corrections
- Auto-open new month; previous awaits manual close. Neither PDF nor final-day checkpoint is required.
- Support close with a confirmed month-end observation AND close with incomplete bank data. In the latter, actual end balance is UNKNOWN (not last observed value or zero).
- Snapshot retains last available historical checkpoint and its actual date, known historical allocation revision/effective date, historical obligation/savings states, completeness/uncertainty flags, recorded evidence cutoff and closure version. Do not relabel later observations as earlier ones or infer complete cash activity.
- December transfer clears old active cash allocation but does not erase November's report/allocation history. Distinguish as-closed view from later lifecycle.
- Later backdated observations, corrections or statement detail may create reviewed new report versions. Original versions remain accessible. HB-002 owns full ordering, cutoff and correction contract.

### Saved history perspectives (D46–D48)

All saved checks and financial states in current/past months must be reachable
through HB-019.2, including retained original revisions. The three labelled bases
are state(H,K) as known then, the same H with later corrections at a declared
later K, and an immutable selected close version with its pinned H/K. Resolve
corrections before historical selection per ADR0002; no new ordering algorithm.
Keep actual observation/effective/recorded dates, full vectors and historical
funding/lifecycle states. Navigation is read-only; no inferred spend/income,
missing-date interpolation, latest-B substitution, live past forecast or automatic
report v2. UNKNOWN and an actual observed zero remain different. Report versions
and intra-month history are both required and never substitutes for each other.

**Dated MVP precision clarification — owner2026-11-09, D50–D53:** complete retained
evidence includes all same-day source IDs/timestamps and confirmed ordering.
New HB-019.2 state selection uses the existing **day H / proven original or later
K**, alongside the existing immutable-report reader; it does not promise a new
exact before/after state at every same-day position. UI must label this precision,
never substitute day state for “after this event”. Exact intra-day reconstruction
is HB-027 after release and does not block HB-021/MVP. No financial selector,
formula, existing ordering behavior or selectionContractVersion change.
See [dated owner clarification](DECISIONS.md#hb-0192-mvp-boundary--owner-2026-11-09)
and [HBH scope/test mapping](../tests/scenarios/phase-01/hb-019-2-financial-history.md).
All financial invariants above remain mandatory; unprovable required daily state
is an explicit blocker for owner decision, not an accepted partial result.

## BR-09: Optional PDF reconciliation (later)
- Everyday budget confirmation never depends on transaction completeness or K/U. Bank date, statement month, upload date and financing month are distinct.
- Extracted rows are proposals; approval matches existing optional operations before creating distinct explanatory records, using account/reference/amount/date/description with review for ambiguity.
- Optional interval model: D=B1-B0, K=distinct confirmed operations in interval, U=D-K. U is derived signed unexplained NET, not a balance allocation. U=0 does not prove all gross movements known.
- Statement explanation/category change never reposts a debit or silently alters any confirmed bank/month distribution. A user-approved budget correction is separate and audited.
- Retain evidence/history, deduplicate repeated and overlapping statements, preserve closed original versions.

## BR-10: Data quality and privacy
- Integer EUR cents, explicit signs, checked ranges, no floating money math; Europe/Berlin calendar dates. Audit actor/effective date/recorded time and consent.
- All writes transactional, authorized and idempotent by request id; stale conflicts reject without partial writes. Reject same id/different payload.
- No real financial data, identifiers, PDFs, secrets or production exports in repository/logs; synthetic fixtures only.

## BR-11: Invariants (must be tested)
1. One checkpoint is one bank observation; latest active chronological observation is authoritative. Paid/detail/transfer cannot debit it.
2. Every new COMPLETE allocation set has A[p]>=0 and sums to its checkpoint B>=0; no user suspense. Select one active revision, never sum revisions.
3. Allocation delta is not income/expense; optional evidence does not rewrite user allocation.
4. Future allocations do not automatically increase current budget; no unconfirmed carryover. Accepted ADR0003 defines safe-main liquidity under D36..D39.
5. Reserve equals the full outstanding of UNPAID reserveFull=true identities;ordinary unpaid requires full reservation,elected possible claims count fully,unelected possible claims count0. Partial payment leaves the full reserved remainder;R/S count once and may exceed A/B.
6. Transfer-only sum(delta month balances)=0; bank unchanged, old source allocation cleared for full transfer, same earmark identities retained.
7. Optional physical movement appears once even with multiple funding details/PDF sources; never added again to confirmed cash.
8. 0<=A[p]<=B and max(0,F[p])<=A[p];F may be negative because R/S remain full. sum(F)=B-sum(R)-sum(S). Expected income and optional operation detail never create additional cash.
9. Original allocation history, financial events and every close version survive later transfers/corrections.
10. Missing end balance stays unknown; actual observation, recording, funding period, transfer confirmation and closing cutoff remain distinct.
11. Optional K+U=D reconciles evidence without blocking ordinary updates or demanding transaction entry.

## Pending domain decisions
[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) contains remaining decisions and resolved dispositions,not superseded mandatory-source/suspense assumptions. Accepted ADR0002 specifies history/closing;Accepted ADR0003 completes safe-main forecasting and D37..D39 UX. Q-HB1-01 is resolved within HB-003.

Multiple-source A CARRY remains excluded until Q-HB2-02 is approved;reject with OWNER_POLICY_REQUIRED and zero financial writes. Negative new A is instead invalid input. Explicit FRESH_START remains available;negative source F alone cannot block ordinary CARRY. No real financial records exist yet;no legacy migration is needed. Historical report/revision immutability and optional non-posting evidence remain unchanged.
