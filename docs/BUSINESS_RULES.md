# Normative financial business rules (source of truth)

Owner clarification 2026-11-01 takes precedence over earlier source-ledger and automatic-carryover assumptions. See [D21..D25](DECISIONS.md). Technical [ADR 0001](adr/0001-checkpoints-and-allocations.md) is Accepted after owner-reported independent review; HB-002/HB-003 details remain open.

## Vocabulary
- **Bank balance / checkpoint:** actual user-confirmed card balance on an observation date; recorded time is separate.
- **Budget period:** named financial month YYYY-MM owning part of the confirmed card balance, independent of bank activity date.
- **Budget allocation:** a signed month balance in a complete user-confirmed distribution of the WHOLE bank balance; not an inferred receipt/expense.
- **Allocation revision:** immutable complete distribution anchored to a checkpoint; redistribution/transfer may reuse an unchanged checkpoint.
- **Obligation:** active unpaid outstanding is fully reserved until paid/cancelled/amended; partial payment is allowed, partial reservation is not.
- **Savings:** voluntary earmark within allocated card cash, excluded from free funds; persists with history.
- **Bank detail:** optional confirmed operation/evidence; never required to confirm a balance/distribution.
- **Unexplained net:** optional derived interval difference minus known operations, not a user allocation category or confirmed income/expense.

## BR-01: Balance authority and cadence
- Ordinary work requires only actual balance/date and a complete confirmed allocation by month. No purchases, income entries, categories or difference explanations are required.
- Irregular observations are valid. No last-calendar-day checkpoint is required to transfer funds or close a month.
- The latest chronological active checkpoint defines the observed bank balance, not entry order or optional operations. Backdated inserts/corrections retain newer bank facts and immutable prior revisions.
- Never interpolate missing observations, use a later balance as month-end balance, assume no intervening spending, or call a net change income/expense without evidence.
- Show actual last checked date and default gentle reminder after 7 days. Stale projections are estimates.
- Transfer/redistribution alone must not advance the last-checked date or create a bank checkpoint: a Dec 1 transfer anchored to Nov 28 still displays Nov 28 as the last confirmed bank observation.

## BR-02: Atomic budget update; no double debit
- Confirm fresh actual bank balance and its full month distribution in one logical update; obligation/savings changes may be included. Suggested amounts require user confirmation.
- Marking paid reduces the full reserve by the paid portion; it never automatically lowers bank balance. The fresh observation already includes any tracked-card debit.
- Paid with unchanged bank balance requires warning and explicit affirmation; without fresh confirmation do not claim trustworthy updated free funds.
- Redistribution/transfer alone against an already confirmed unchanged balance need not re-enter the same bank amount. If it changed, combine a new checkpoint with the new complete distribution. This does not waive payment affirmation rules.
- Cancellation releases active reserve, has distinct history and no cash movement. All changes are atomic/idempotent.

## BR-03: Full reserve only
- Reserve 100% of each active unpaid outstanding; negative free budget is valid and labelled deficit. No partial reserve fraction exists.
- Partial payment may reduce outstanding, with ALL remainder reserved. Fully paid outstanding may be zero; original amount is positive.
- Reserve edits are not bank transactions. Payment outside tracked card uses reason/history and fresh confirmed unchanged card balance; do not invent a card debit.
- Possible/pending claims, when reserved, also block their full outstanding.

## BR-04: Daily spending forecast
- Guidance covers all discretionary purchases. Normal eligible free is the confirmed CURRENT month allocation less its full obligation reserves and voluntary savings; older funds contribute only after confirmed transfer. Future allocations do not automatically raise current budget.
- In ordinary funded cases: floor integer cents of max(0, eligible free) divided by remaining Europe/Berlin calendar days, inclusive of today. Future preview uses every calendar day of that future month.
- Advances already reflected in confirmed month balances are not subtracted again. Today's bank spend is already reflected in a post-spend checkpoint; do not fabricate daily bank amounts.
- Negative free is displayed as deficit, with spending guideline zero.
- If planning funds exceed available physical liquidity (e.g. negative future budget), warning policy and final edge-case forecast formula remain OPEN for HB-003. No liquidity cap is approved here.

## BR-05: Complete period distribution and confirmed transfer
- For EVERY confirmed checkpoint: sum of its month allocations equals its balance exactly, in integer cents. No suspense/unassigned user category. Negative month balances are allowed for advances while preserving the sum.
- User confirms the whole new distribution, not the interval delta. A=80000 Nov becoming B=77000 with Nov=75000/Dec=2000 is valid without operations; -5000/+2000 month changes are not inferred expense/income.
- Statistics must distinguish allocation-state changes from confirmed bank activity. Without operation evidence, never display a month's allocation delta as actual spending or confirmed income; show known operation totals with incomplete-detail provenance, not an invented total or a claim of zero spending.
- Past/current/future periods may hold allocations. Optional operation financing may be split across months, but cannot be added again to an already confirmed state.
- New calendar month opens automatically. On next open, PROPOSE transfer from completed month; one-button user confirmation (option A) is required before funds move or become part of new-month free. No automatic cash carryover.
- Transfer is internal: total bank/allocation cash unchanged; existing new-month allocations count once; old active allocation becomes zero for the confirmed full transfer. Retain historical origin and before/after revisions.
- Unpaid obligations persist with identity and full reserve, and voluntary savings persist; funding associations follow the confirmed transfer without duplication or release. Their continued existence is not conditional on a new obligation being created.
- No final-day observation is required. With a changed balance, confirm the new full distribution and transfer together without inventing how net spending divides across months.

## BR-06: Status and due date
- Keep unpaid/paid/cancelled status, creation period, current funding period, optional due/bank dates, confirmation date and history.
- Confirmation date is not a guessed bank debit date; optional later PDF evidence may refine the latter.
- Amend outstanding with immutable history and full reserve adjustment, no bank movement. Cancellation releases reserve without payment; funding-period treatment in unusual cases must be explicit, not inferred from net cash.
- Recurring templates only propose accept/edit/skip; prevent duplicate accepted template+period items. MVP membership is still Q-HB1-03, not decided by these semantics.

## BR-07: Savings
- Savings are earmarks WITHIN allocated bank money, subtracted from eligible funds once, never extra cash/debits.
- Persist across months with identity, origin and amount; moving their funding association does not recreate/release them. Release/withdrawal are explicit decisions.
- Bank withdrawal is reflected only by fresh observed balance; savings release in that update avoids double reduction. Release itself changes free funds, not bank balance.

## BR-08: Closing and corrections
- Auto-open new month; previous awaits manual close. Neither PDF nor final-day checkpoint is required.
- Support close with a confirmed month-end observation AND close with incomplete bank data. In the latter, actual end balance is UNKNOWN (not last observed value or zero).
- Snapshot retains last available historical checkpoint and its actual date, known historical allocation revision/effective date, historical obligation/savings states, completeness/uncertainty flags, recorded evidence cutoff and closure version. Do not relabel later observations as earlier ones or infer complete cash activity.
- December transfer clears old active cash allocation but does not erase November's report/allocation history. Distinguish as-closed view from later lifecycle.
- Later backdated observations, corrections or statement detail may create reviewed new report versions. Original versions remain accessible. HB-002 owns full ordering, cutoff and correction contract.

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
2. Every confirmed COMPLETE allocation set sums to its checkpoint balance; no user suspense. Select one active revision, never sum revisions.
3. Allocation delta is not income/expense; optional evidence does not rewrite user allocation.
4. Future allocations do not automatically increase current budget; no unconfirmed carryover. Liquidity edge stays HB-003.
5. Reserve equals full unpaid outstanding; partial payment leaves full remainder; obligation/savings earmarks counted once.
6. Transfer-only sum(delta month balances)=0; bank unchanged, old source allocation cleared for full transfer, same earmark identities retained.
7. Optional physical movement appears once even with multiple funding details/PDF sources; never added again to confirmed cash.
8. Negative month budget creates no bank money; sum(month free)=bank-sum(reserves)-sum(savings).
9. Original allocation history, financial events and every close version survive later transfers/corrections.
10. Missing end balance stays unknown; actual observation, recording, funding period, transfer confirmation and closing cutoff remain distinct.
11. Optional K+U=D reconciles evidence without blocking ordinary updates or demanding transaction entry.

## Pending domain decisions
[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) contains only remaining decisions, not superseded mandatory-source/suspense assumptions. HB-002 specifies history/closing detail; HB-003 finalizes forecast.
