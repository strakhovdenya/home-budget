# Phase 01: finance acceptance scenarios (synthetic)

Owner clarification 2026-11-01: all checkpoint cases include COMPLETE confirmed month balances summing to bank balance (single-month cases assign all cash to that month). Operations mentioned below are optional explanatory data, never required user entry; no mandatory source/residual allocation or suspense. Only user-confirmed transfers make older cash eligible in the new month. Revised detailed oracles: [HB1-001..020](hb-001-checkpoints-and-allocations.md); HB-003 still owns the physical-liquidity forecast edge.

## F-001 — paid obligation does not double-debit
Given checkpoint €1000.00 and full unpaid reserve €200.00, free €800.00.
When user enters new checkpoint €900.00 and confirms €54.00 obligation as paid in same batch.
Then card €900.00, reserves €146.00, free €754.00. Not €846 card or €700 free.

## F-002 — paid with unchanged checkpoint must warn
Given card €500.00, reserves €200.00.
When user confirms same €500.00 and marks €54.00 paid.
Then warn and require explicit confirmation; after accepted card remains €500.00, reserves €146.00, free €354.00; record affirmation and do not infer a bank debit.

## F-003 — future income isolated
Given November eligible free €30.00 on November 28 and December new incoming money €1200.00; allocate 0 November / €1200 December; December reserves €900.
Then November available €30.00, November forecast €10.00/day for 3 days, December preview €300/31 floored to €9.67/day.

## F-004 — advance split expense
Given November free €20, December free €300, and one physical purchase €35 on November 29.
When financing allocation splits €20 November and €15 December.
Then November free €0, December free €285, one physical cash movement €35 (not two).

## F-005 — future advance before income
Given November free €5, no received December income.
When physical purchase €20 charged €5 November and €15 December.
Then December carries advance -€15, not fabricated income; future receipt must not double-debit €15.

## F-006 — full obligation reservation and deficit
Given bank €150 and new unpaid obligation €200.
Then reserve full €200, free -€50, spending forecast €0 and deficit label €50. No partial reserve workflow.

## F-007 — cancel vs pay
Given card €500, reserve €100.
When obligation cancelled rather than paid in a fresh budget update.
Then card €500, reserve €0, free increases €100, status CANCELLED; history displays cancellation, not payment.

## F-008 — savings reserve and release
Given card €400, other full reserves €200, savings €50.
Then free €150. When user releases €20 savings with confirmed unchanged bank, free €170 and savings €30; no debit.

## F-009 — carry and historical close
Given October closes bank €600, reserves €500, free €100.
When November begins, propose transfer; before confirmation old cash is not automatically eligible in November. After user confirms transfer, cash €600 and the same full reserve €500 are funded in November, free €100 (plus separately confirmed new-month money). Later payment/transfer does not edit October original closing snapshot. No final-day checkpoint is required; if actual end balance was unobserved, label that unknown instead of calling last-known €600 the confirmed end balance.

## F-010 — backdated point preserves latest known bank
Given Nov 5 checkpoint €500 and Nov 10 checkpoint €450 recorded.
When on Nov 12 insert observation of Nov 7 €480.
Then latest bank €450 (Nov 10), inserted point appears in history, affected interval is reprojected, no deletion of Nov 10.

## F-011 — checkpoint diff not assumed income
Given bank checkpoint €400 then €1500, known income €1200 and known expenses €100 during interval.
Then user may confirm the complete new distribution November €300 / December €1200, sum €1500, without entering either operation. If optional gross detail is supplied, +€1200 and -€100 explain net +€1100; do not label net as gross income or apply detail again to the confirmed vector.

## F-012 — PDF reconciliation is non-posting
Given two confirmed checkpoints €1000 then €900, underlying unknown net -€100.
When future statement import proposes two expenses €60 and €40 and user confirms matches.
Then cash still €900; unresolved interval difference becomes €0 and categories gain €60/€40. No further €100 bank debit.

## F-013 — month-end revision
Given November close v1 with reserves €100, after closing a backdated correction changes a November amount.
Then v1 still viewable; v2 correction explains delta, later checkpoint balances unchanged, historical lifecycle separate.

## F-014 — no category required
Given a manually entered purchase or checkpoint change.
When saved without category.
Then operation accepted as unclassified; optional future categorization does not affect bank amount or forecast.

## F-015 — split cash origin not duplicated
Given one known €1000 incoming transfer in November assigned €50 November and €950 December.
Then the confirmed new WHOLE-balance distribution includes only €50 extra November / €950 extra December, preserving any prior allocations and exact bank total. Optional receipt funding details sum €1000; they do not add another €1000 to bank or active distribution. Current eligible free rises only €50; no receipt entry is required for the checkpoint update.

## F-016 — recurrence proposal not duplicate
Given enabled template €54 per month, confirmed November obligation created from it.
When user revisits the proposal in November.
Then same obligation is not recreated. Original October unpaid amount carries separately from newly accepted November template item.

## F-017 — partial payment allowed, remainder fully reserved
Given outstanding €200 and reserve €200.
When user confirms €50 partial payment with fresh balance already including the outflow.
Then outstanding and reserve both €150; no partial reserve slider; bank not auto-debited by status action.

## F-018 — reconciliation between intervals after late changes
Given a checkpoint interval with unclassified net activity. When an intermediate checkpoint is added later, its two new intervals must reconcile to the same combined net as before and latest observed balance is unchanged.
