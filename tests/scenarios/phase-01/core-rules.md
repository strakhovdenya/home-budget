# Phase 01: finance acceptance scenarios (synthetic)

Owner correction D32..D35: every new complete actual-money vector has A>=0,sum(A)=B>=0. F=A-R-S can be negative with full reserves/savings. Expected income never contributes;optional signed operations are non-posting. Corrected ADR0001/0002 contracts are re-Accepted after owner-reported repeated independent review;original verification remains historical in HB1/HB2 documents. D36 selects safe-main all-period protection;HB-003 exact formula and D37..D39 are Accepted after owner-reported independent review. Existing daily figures below are budget guidelines,not substitutes for the safe main limit.

## F-001 — paid obligation does not double-debit
Given checkpoint €1000.00 and full unpaid reserve €200.00, free €800.00.
When user enters new checkpoint €900.00 and confirms €54.00 obligation as paid in same batch.
Then card €900.00, reserves €146.00, free €754.00. Not €846 card or €700 free.

## F-002 — paid with unchanged checkpoint must warn
Given card €500.00, reserves €200.00.
When user confirms same €500.00 and marks €54.00 paid.
Then warn and require explicit confirmation; after accepted card remains €500.00, reserves €146.00, free €354.00; record affirmation and do not infer a bank debit.

## F-003 — already received future-month money stays isolated

GIVEN Nov28 actual prior card30 EUR,A={Nov:30},R=S=0.
WHEN1200 EUR has actually arrived on the card and the user confirms the real new bank balance1230 EUR with the complete A={Nov:30,Dec:1200},R[Dec]=900 EUR,S0. These December funds already exist in that confirmed balance;no expected/unreceived income is allocated and no separate income operation is required.
THEN sum(A)=1230 EUR,Nov budget/safe available30 EUR,main/current guideline10 EUR per day over3 inclusive days;Dec budget free300 EUR,full-month preview floor(30000 cents/31)=967 cents (9.67 EUR/day),remainder23 cents. Future cash/reserve is protected once;it does not raise Nov guidance or create a second bank posting.

## F-004 — purchase funded by two already-funded months

GIVEN actual card50 EUR,A={Nov:20,Dec:30},R=S=0.
WHEN one35 EUR purchase is reflected in a new actual card15 EUR and confirmed A={Nov:0,Dec:15};optional detail splits20/15.
THEN one bank reduction35 EUR,no negative allocation,no repeated debit;future income is not required or used.

## F-005 — unreceived income cannot finance cash allocations

GIVEN actual card100 EUR,A={Nov:100},R=S=0,expected future receipt50 EUR not yet observed.
WHEN a new draft A={Nov:150,Dec:-50} is submitted.
THEN reject NEGATIVE_CASH_ALLOCATION despite matching total100 EUR;no forecast/cap repairs it. Expected income does not change B/A. A real later checkpoint may include received money without a separate income operation.

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
Given enabled monthly5400-cent template and accepted unpaid M5400 bill.
When Berlin month becomes P, offer P read-only despite old debt; no writes.
D57: P is the viewed YYYY-MM context (default current Berlin month), not two
independent selections. Initial ACCEPT must save originPeriod=fundingPeriod=P;
unequal or invalid periods are rejected with exact no-write. EffectiveDate is
the actual confirmation day, not a fabricated date in P. Old funding moves only
under a separate explicit D43/D44 FRESH_START/CARRY, never this ACCEPT.
Explicit ACCEPT P creates one distinct full-reserve obligation; old identity,
full remainder/reserve, origin/current funding and history stay unchanged.
Explicit DECLINE P instead durably suppresses P with one typed audit/receipt,
no obligation/payment or B/A/C/V,R/S/F change. Repeat DECLINE is idempotent;
ACCEPT/DECLINE race produces one terminal winner, never both. The stable owned
template+origin key cannot reset on config/funding changes, re-enable or payment/
cancellation. Next enabled month is independently offered after prior DECLINE.
Disable stops future offers preserving facts; local close writes nothing and
may reappear. Already paid before access and included in B may be DECLINED
without false payment history or double debit; existing obligations instead use
normal lifecycle confirmations. No automatic debt/funding replacement.
See [D56](../../../docs/DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11) and [T01–T03](hb-020-first-run-and-recurring-templates.md#hb20-t01-explicit-template-acceptance-is-inert-until-confirmed-and-unique).
Q-HB20-NEW-INSTANCE is resolved by D56. All assertions **NOT EXECUTED**.

## F-017 — partial payment allowed, remainder fully reserved
Given outstanding €200 and reserve €200.
When user confirms €50 partial payment with fresh balance already including the outflow.
Then outstanding and reserve both €150; no partial reserve slider; bank not auto-debited by status action.

## F-018 — reconciliation between intervals after late changes
Given a checkpoint interval with unclassified net activity. When an intermediate checkpoint is added later, its two new intervals must reconcile to the same combined net as before and latest observed balance is unchanged.
