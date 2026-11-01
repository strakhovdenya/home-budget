# Normative financial business rules (source of truth)

## Vocabulary
- **Account / bank balance**: one physically observed card balance at a timestamp/date (EUR cents).
- **Checkpoint**: user-verified actual balance on a chosen historical or today's date. Carries provenance/time of entry and observation date.
- **Budget period**: named calendar month (YYYY-MM) that owns spendable allocation, not necessarily the month when bank transfer happened.
- **Obligation**: payment or possible future repayment; whole *outstanding* amount blocks spendable funds until paid/cancelled/amended.
- **Savings**: voluntary earmark; still in the bank, excluded from spendable funds, carries forward.
- **Budget allocation**: assigns an amount of known/inferred bank movement to one or more periods. It does not create new bank money.
- **Unexplained movement**: balance difference not yet fully described by confirmed transactions. It is provisional and can later be reconciled with statement items.
- **Actual bank activity month** vs **financing month**: always display separately in reports.

## BR-01: Balance authority and cadence
- User may enter balances irregularly (daily/weekly). Never require individual transactions.
- The most recent chronological checkpoint defines the observed bank balance; more recent entries supersede older observations in time, not by entry order.
- Every checkpoint is immutable in history. Back-dated inserts/corrections create revisions, retain later checkpoints and recalculate affected forecasts/snapshots with audit.
- Show 'last checked on' and low-key reminder after 7 days by default. Forecast based on old data is an estimate, not a live bank feed.

## BR-02: Atomic budget update; no double debit
- User enters a **freshly confirmed bank balance** and, in the same logical action, changes paid status, obligation amounts, savings and allocation.
- Marking obligation **paid** removes the entire paid portion from active reserves but does **not** automatically lower the bank balance. The fresh checkpoint already reflects bank debits when from card.
- Warn and require explicit confirmation if paid status is chosen but confirmed bank balance is unchanged; unchanged may be valid.
- If status changes without a fresh confirmed balance, do not silently recalculate free as trustworthy; prompt for a fresh confirmation first.
- Cancellation removes a reserve but is distinct from payment and documented separately.

## BR-03: Full reserve only
- New unpaid obligation reserves 100% of outstanding amount. Negative free budget is permitted and labelled 'deficit'.
- Partial reservation is **not supported**. Partial **payment** may reduce outstanding balance; *all* remainder stays reserved.
- Reserve creation/change is not a bank transaction. For paid in cash from outside tracked account, user simply closes the obligation with a confirmed unchanged card balance, preserving the reason/status in history.
- Potential claims (e.g. pending benefit repayment) are marked possible/pending; they still block full amount if user chooses to reserve them.

## BR-04: Daily spending forecast
- Daily amount is guidance for **all discretionary purchases**, not food-only category envelope.
- Within current calendar month: floor-to-cents(max(0, eligible free money) / count of remaining calendar days inclusive of today).
- Eligible free = amount available to spend from current and earlier rolled-over free balances **minus** active full obligation reserves, savings and advance spending allocated to this period. Funds earmarked strictly to future periods are excluded.
- Current-day spend is included in latest balance checkpoint if already occurred; day counts including today, even late in day. Never interpolate unobserved daily bank amounts.
- Before next month starts, its preview uses entire number of calendar days in that upcoming month even if advance purchases have occurred.
- If free < 0: display deficit as negative separately; forecast 0, not negative spending limit. After any update recompute.

## BR-05: Period accounting and carryover
- At bank receipt, actual activity date and financial period allocation(s) are independent. Multiple allocations must sum to source amount, including 0 for current month.
- Checkpoint difference is NET movement, **not necessarily income**. If known income and purchases overlap in interval, user may describe both; avoid incorrectly labeling net delta as income.
- Funds may be allocated to past/current/future budgets; purchases may draw partially from multiple periods, even as an advance from a future period before income arrives (negative month allocation).
- Future-month allocations do not raise current-month daily forecast. When new month begins, carry the unused free funds from older periods into current free automatically; retain origin tags for historical reports.
- Carrying debt does not produce a second obligation or a second cash transaction.
- Deficit can be covered by later cash/income allocated to that period or by releasing voluntary savings; not a new 'expense'.
- When allocating a checkpoint interval net difference, treat it as provisional categorically unclassified movement until matched with ledger events/statement.

## BR-06: Status and due date
- Obligation statuses: pending/unpaid, paid, cancelled. Keep creation period, funding period, due date optional, confirmation date, and later actual bank transaction date optional.
- The date user **noticed/confirmed paid** is recorded; actual bank debit date is optional and may be refined after PDF statement import.
- Editing amount changes active full reserve and frees/blocks the difference without bank movement; keep old amount in audit history.
- Cancelling obligation releases full reserved remainder into free funds automatically, without changing bank balance.
- A recurring template only **proposes** a new obligation for a period; user accepts/edits/skips; prevent duplicate accepted suggestions.

## BR-07: Savings
- Voluntary savings are earmarked on the card and excluded from daily eligible money.
- They persist automatically each month, retain origin and changes. Release, withdrawal and transfers are explicit decisions.
- A cash withdrawal from the card shows in the freshly updated actual balance; releasing savings in the same update prevents double reduction.
- Releasing savings changes allocation but not physical bank balance.

## BR-08: Closing and corrections
- New calendar month opens automatically. Previous is 'awaiting manual close' until user reviews; no PDF required.
- Close creates **versioned snapshot**: bank balance as-of, last observed date, free, deficit, obligation reserve list, savings, cash activity known, unclassified differences, period allocations, daily forecast history, source flags.
- Never rewrite a closed month's old snapshot silently. Later backdated corrections create revised snapshot version, preserve original and explain downstream impacts.
- A later payment of an October obligation must not make October look like it was paid in October if it was outstanding on close.
- Report tab 'as closed' vs 'current lifecycle of those obligations'. Distinguish observed vs inferred amounts.

## BR-09: PDF reconciliation (later)
- PDF statement is assigned to its actual bank statement calendar month, which may differ from upload date and financing period.
- Extracted items are proposals until user approval. Match by account, amount, date window, description, transaction reference and reconcile intervals between checkpoints.
- When statement explains a provisional difference, **reclassify** instead of re-subtracting from checkpoint-authoritative balance. Never double count already entered manual transactions.
- Statement/category changes have history; no implicit update of closed snapshots without versioned correction.

## BR-10: Data quality and privacy
- All monetary values integer EUR cents; sign direction explicit, never binary float.
- Every mutating update is transactional and idempotent (client request id); no duplicate accept for recurring template or statement import.
- Sensitive bank information, real documents and production exports must not enter repository or client logs.
- Recompute from events/projections as needed; audit actor, effective date and recorded_at.

## BR-11: Invariants (must be tested)
1. One checkpoint = one observed bank balance; paid flag cannot itself debit that balance.
2. Sum allocations of a source movement equals that movement (or unassigned suspense remainder); no creation/destruction of cash.
3. Future-period funds must not raise current-period daily allowance.
4. Reserves equal full current unpaid outstanding, never arbitrary fraction.
5. A money movement matched from PDF does not modify an already-authoritative checkpoint's cash balance.
6. Every closed month snapshot version and every previous financial event remain inspectable.
7. Cross-period split of a single physical payment creates one bank movement, multiple period allocation rows, and one logical transaction.
8. Funding deficits cannot silently manufacture bank money.
9. Display sum of period views must not double-count rolled-over free funds.
10. Historical confirmation date must not be misrepresented as unknown actual bank debit date.

## Pending domain decisions
See docs/OPEN_QUESTIONS.md for implementation-level edge cases that need an explicit ADR before coding, not made-up business behavior.
