# UX specification — bank-like responsive web app

## Current product contract — 2026-11-08

Home Budget shows available money from the last confirmed state with the real
bank-check date and makes all saved financial states accessible. Unknown balances
and movements remain unknown. [D46–D49](DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08); HB-019.1 owns HBUX-001–036,
HB-019.2 owns complete history HBH-001–007; HB-022 adds analytics after MVP.

## Look & feel
Modern European bank aesthetic rather than dense admin dashboard. MUI custom theme, accessible typography (Geist/Inter candidate), subtle surfaces, warm neutral backgrounds, emerald 'free', amber reserved, red deficit; colors always paired with labels/icons. Light/dark/system. RU default, full DE/EN. Not PWA.

## Main screen
Header: financial period switcher (e.g. November / December), optional 'period preview' badge, account display, locale/theme menu.
Hero: **safe available discretionary funds** and **main daily limit** under owner D36,with actual bank observation date. Show ordinary current-month budget free/guideline secondarily;it cannot replace the safe main limit. Exact max-based formula is Accepted in ADR0003.
Summary: obligations total, optional savings total, future-month allocations, deficit state, next obligations.
Primary action: **Update budget** pinned access, separate add item affordance.
History entry: all saved checks/states are reachable through HB-019.2, not only recent entries; recurring suggestions remain explicit. Extended checkpoint charts belong to HB-022. Never imply daily bank observations.
For a selected PAST/FUTURE month, prioritize that month’s labelled A/R/S/F and basis; dated latest-card cash is secondary with a visible non-attribution explanation. Closed months lead with the selected accepted report (latest by default, explicit old selection respected); active old allocation is separate. Future A is already confirmed cash, not expected income or future bank balance.

## Update budget flow (central interaction)

### First run — D55 (planned, not implemented)

After admitted Google OAuth, show the actual balance, its observation date and
the required complete month allocation; one explicit review/confirmation saves
them. No “Create budget” screen, account-name field or public technical-account
step. Missing owned EUR account/internal stable name is created atomically with
the first real checkpoint/vector/audit/receipt, not on login or by a hidden
preliminary commit. Before confirmation funds are UNKNOWN; explicit actual B=0
with complete A is distinct. Existing empty account resumes actual confirmation,
existing initialized budget proceeds normally; storage/ambiguous-account errors
do not invite recreation. Pending/UNKNOWN retains original command and offers
safe result checking/replay, never an assumed success or automatic second check.
After cancel/reload, rediscover persisted state; no promise of unsaved input
recovery or invented zero. Auth, localizations, keyboard/focus and browser proofs
remain mandatory. [D55](DECISIONS.md#hb-020-product-alignment--owner-2026-11-11).

### Ordinary updates

Step 1: manually enter actual card balance and **observation date** (today default, earlier allowed); display last known point, require explicit confirmation.
Step 2: checklist of existing obligations paid/cancelled, amount edits, new obligations, savings changes; note these **do not modify card balance**.
Step 3: distribute the WHOLE entered card balance among financial months. Show editable month balances and exact total; every amount requires confirmation, including suggested values. Sum must equal card balance; every month amount must be nonnegative; reject negative A even when the total matches, no suspense category. Do not ask to distribute the interval delta, enter purchases/income/categories or explain it. Example 800 -> 770 with month balances November 750 / December 20 saves directly; -50/+20 is not inferred expense/income.
Step 4: review card, full allocation vector, reserves, savings, free/deficit and ordinary forecast; warning/affirmation for paid with unchanged balance. Unknown optional bank detail is not a blocking warning. Closed-period corrections require explicit version review. D36 chooses an explicit safe main limit with all-period protection;the formula/specification is Accepted after owner-reported final independent review;D37..D39 fixes data-age/warning behavior.
Save all atomically, show actual observation and allocation history. Redistribution alone may reuse an already confirmed unchanged bank observation; create only a new allocation revision. Same-day sequencing is specified by HB-002. Optional operation detail belongs in a separate later path, never a prerequisite to save.

Within the current Berlin month, ordinary actual-check updates need no transition
selection unless old allocations/funding remain unresolved. After a month boundary,
the primary named **Start month with actual balance** action deliberately chooses
FRESH_START: real bank check/input → full vector and past non-carry/funding/future-edit
review → explicit confirmation. CARRY and DEFER remain separate working secondary
actions; neither primary placement nor page opening preselects a mode. Do not require a preliminary old-balance confirmation or separate carry procedure. A real new check at the same amount creates a new observation with its actual date; only an explicit redistribution-only mode reuses the old check. Showing/editing the proposal without saving changes no financial data.

## Obligations

[D57](DECISIONS.md#hb-020-contextual-month--owner-2026-11-12) refines only new template acceptance: show one contextual month P in the proposal and confirmation, with editable amount and no editable origin/funding month fields. Both initial periods equal P. The existing /obligations page defaults to the current Berlin month; refreshing an offer must retain its loaded P. A separate context, when supplied by a caller, is not a funding-transfer instruction. Old debt transfers require their existing separate reviewed consent.

Cards show label, full outstanding, origin/funding month, optional due date, unpaid/paid/cancelled and history. Possible claims have explicit full-reserve selection, never partial reservation. Edit/pay/cancel retain identity; payment requires existing bank-state confirmations and never auto-debits B.

Under [D56](DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11), an enabled template offers a new calendar-month instance even with old unpaid debt. Reading writes nothing. Explicit ACCEPT creates exactly one ordinary full-reserve obligation after reviewed integer-cent amount editing. Explicit DECLINE ("Не добавлять за этот месяц") durably suppresses only owner/account+templateId+originPeriod, with typed audit/receipt but no obligation, payment, bank operation or change to B/A/C/V,R/S/F or bank-check date. Both outcomes are final and mutually exclusive per key; retries/races resolve one proved winner. Next enabled month is offered independently of prior DECLINE. Disable stops future offers, preserving debts/decisions/history; local close without DECLINE writes nothing and may reappear. Old debt retains identity, full remainder/reserve, origin/current funding and history, with no automatic move/debit. Already paid before access and included in B may be DECLINED without false payment history; an existing obligation uses its normal Paid/Partial/Cancelled lifecycle and required financial confirmations. Config edits, funding changes, disable/re-enable or later payment/cancellation never reset a decided key.

Use distinct controls: **Добавить** (review/edit then ACCEPT), **Не добавлять за этот месяц** (durable DECLINE), **Отключить шаблон** (config disable), local close/later, and existing obligation **Оплачено / Частично / Отменено**. Show pending/error/UNKNOWN and original-result checking; conflict displays the proved winner, never silently switches intent. Reload/relogin preserves suppression only for the decided key. No schedule/income trigger; template dueDate=null, ordinary optional dueDate retained.

## Savings
Named earmarks, amounts, history; increase/release/delete with audit. Suggestions to release savings when deficit appears, never silent release.

## Months and reports
Month selection with Current / Awaiting close / Closed / Needs reconciliation.
Show as-of close snapshot vs today's lifecycle. Distinguish actual bank activity (calendar) from financing allocations (budget month). Do not merge or overcount previous free rollover.
On website open, detect the current Europe/Berlin month and make the period available. Offer **Update budget** and the primary explicitly chosen FRESH_START route with actual balance/date/full funding review; working CARRY/DEFER are secondary explicit alternatives. No transition is preselected. Example when A CARRY is chosen:Nov28 bank900 EUR,Nov400/Dec500,Nov reserve300;on Dec2 enter actual840 and confirm Nov0/Dec840,same reserve300 fundedDec,free540. One action saves checkpoint,full vector,consent and funding history. No intermediate vector or bank movement;-60 is not attributed to either month's expenses. No background checkpoint,carry or automatic report closing is scheduled.
For B **Start fresh**, list the past months and nonnegative cash allocations the user explicitly chooses not to carry. Example last Nov20 2026 check100 EUR,Nov40/Dec60,no December visit;on Jan5 2027 enter80 and confirm Nov0/Dec0/Jan80 once. Keep old allocations and any historical free deficit in history;do not debit that deficit again. Keep December's last-known allocation/date and unknown Dec31 bank balance; create no intervening checks. Enumerate all existing unpaid obligations/savings, their unchanged amounts and proposed current funding; show full reserves and any resulting deficit. B clears planning balances only; it cannot silently mark debts paid/cancelled or release savings. Explicit separate changes require their own visible review/events. Future allocations are preserved unless explicitly edited in the complete vector.
B remains available across several missed months regardless of historical negative free/count of missed months, without one carry per month or closing each month first. A's detailed multi-source carry proposal remains a separate review question; do not block B on that policy or silently switch A to B. Explicit **Defer transition** remains available for an ordinary update without either choice;it preserves funding and requires a complete vector summing to the checked B. Unconfirmed drafts leave all financial state unchanged. No option is selected automatically, including when the user returns after a long absence.
Explicit transfer-only remains a technical alternative: after a Dec1 carry without a bank check, "last checked" stays Nov28 and there is no new bank dot. In the primary actual-check flow, even a repeated 900 EUR creates a real Dec2 check/date. Show internal carry separately in the budget timeline. Allocation changes are budget history, never actual spending/confirmed income without operation evidence. Missing detail is labelled incomplete, not zero spending.
Manual close works without a final-day observation or PDF. Preview historical allocations/reserves/savings, real last-observed date and report version. If end balance unknown, label it unknown and bank data incomplete; never copy Nov20/Dec2 bank amount to Nov30 or demand a missing point. Current zero old-month allocation after transfer does not erase historical report state. Optional unexplained net is informational, not a close blocker. Late corrections require explicit review and versioning (HB-002).

[Accepted ADR0002](adr/0002-month-closing-and-corrections.md) preserves the month/history contract. Simultaneous multi-source CARRY rejects OWNER_POLICY_REQUIRED until Q-HB2-02 is decided;explicit FRESH_START remains available and is never auto-selected. Negative new A rejects validation everywhere;negative F from full reserves does not block ordinary single-source CARRY.

## Complete saved-state history (HB-019.2, required MVP)

All saved checks, full financial states and retained original/corrected revisions
are reachable in current/past months without closing first. Label three bases:
**as known then** (H/pinned original K), **with later corrections** (same H/declared
later K), and **as closed** (selected immutable version and its own H/K). Captions
explain observed/effective/recorded dates and confirmed ordering; a budget funding
month is not a bank date. No live past daily forecast or invented movements.
UNKNOWN differs from a real observed zero. Changing a perspective does not create
a report, update money or silently refresh a pinned cut. Complete bounded paging
must not truncate older states or combine pages from different K. Per owner
[D50–D53,2026-11-09](DECISIONS.md#hb-0192-mvp-boundary--owner-2026-11-09), use20-row
server Previous/Next with pinned K_index/lastSeq and an in-memory page stack.
Re-entry/explicit refresh starts a new cut; no signed/encrypted cursors, TTL or
server history sessions. Each read re-authorizes/validates its full basis and
the UI rejects a different-basis response before combining pages.
Label state “Through [day], as known at [cut]”, separately from original event
facts/confirmed same-day order and immutable report versions. No new position-state
picker or “after this event” claim for a day view. Exact intra-day reconstruction
is post-MVP HB-027, not a condition for this accessible MVP viewer. Show current
card context separately with its date.
RU/DE/EN, keyboard/AT,320px/desktop/200% zoom and no-write proof are mandatory;
[HBH scenarios](../tests/scenarios/phase-01/hb-019-2-financial-history.md) own these
requirements. HBUX remains presentation/update proof, not full-history coverage.

D44/Q-HB17-01 still rejects funding transfer plus lifecycle edit of the same
identity. Explain transition first, separate later confirmed lifecycle update;
never execute two hidden commits or fabricate a check/position to bypass refusal.

## Analytics & future PDF
Optional category, 'Uncategorized' acceptable; bank statement upload to month, candidate matching/approval; explain how checkpoint movements have already been counted. No automatic double subtraction.

## HB-003 forecast proposal for review

[Accepted ADR0003](adr/0003-daily-forecast-and-liquidity.md) keeps separate observed bank facts/date, derived budget free/guideline/deficit, data-age notices and candidate liquidity diagnostics. An earlier bank observation is always labelled with its actual date, even before the gentle reminder threshold. No checkpoint means unknown forecast, not zero; a confirmed zero-funded current month is a distinct known zero. A new month uses only its confirmed allocation until a chosen update; no implicit old-money credit or reset.

The owner selected option B under D36:main current daily guidance protects all selected unpaid reserves and retained savings,including other months and any due date,and does not reuse other-month allocations. Show «Безопасно доступно для свободных расходов» and «Дневной лимит по данным проверки DATE» prominently;ordinary «Бюджетный ориентир месяца» is secondary. The max(A,R+S) formula is Accepted after owner-reported final independent review;selection is no longer an open product choice. Future preview stays a separate budget estimate,not future safe bank cash.

## Responsive details
Mobile-first: one-column hero, compact account/reserve tiles, fixed bottom navigation if useful, minimum 44px touch targets. Desktop: flexible responsive grid and secondary side navigation. Semantics, screen reader labels, contrast, keyboard navigation, loading/empty/error states. No forced notifications or daily expense entry.

## Wireframe inventory
1. Sign-in / access denied
2. Dashboard / period switcher
3. Guided Update Budget
4. Obligations / recurrence proposal
5. Savings / history
6. Months / closing / closing revisions
7. Timeline of checkpoints
8. Operations (optional detailed entry)
9. Settings / language/theme
10. Documents and reconciliation (later)

For B100 EUR,Nov100/Dec0,December unpaid reserved200,show «На зарезервированные неоплаченные обязательства не хватает100 €»,safe available0/main daily0. Retain December funding/due date and unknown actual debit date;do not create a November expense. Separate obligations-only,obligations-plus-savings and full-protection shortage explanations;these overlapping amounts are not summed. A protection shortage with no obligations-only shortage says «Чтобы сохранить деньги других месяцев и полные резервы,не хватает X €». Preserve savings,possible-claim selection and all identities;review actions never auto-pay/release/reallocate. D37 keeps older complete-state safe limits visible with actual bank date,explicit old-data label and gentle Update balance action;use today's Berlin remaining days,never today's invented bank cash. Missing data has no numeric limit and budget guidance is never a main fallback. D38 warnings are informational with no «Понятно»,modal/view blocker or repeated confirmation on opening;real financial actions still need their normal confirmation. Group equal obligation/earmark/protection shortage amounts once with combined labels;different qualified amounts are parallel comparisons,not additive. Show budget-gap explanation without repeating the same amount;combine older-data/reminder provenance. D39 reminder appears iff civil age>=7,not a push or forced update.
