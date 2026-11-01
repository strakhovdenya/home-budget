# UX specification — bank-like responsive web app

## Look & feel
Modern European bank aesthetic rather than dense admin dashboard. MUI custom theme, accessible typography (Geist/Inter candidate), subtle surfaces, warm neutral backgrounds, emerald 'free', amber reserved, red deficit; colors always paired with labels/icons. Light/dark/system. RU default, full DE/EN. Not PWA.

## Main screen
Header: financial period switcher (e.g. November / December), optional 'period preview' badge, account display, locale/theme menu.
Hero: **free to spend** and **daily guideline** highly legible; bank balance and last confirmed date clear but secondary.
Summary: obligations total, optional savings total, future-month allocations, deficit state, next obligations.
Primary action: **Update budget** pinned access, separate add item affordance.
Bottom: balance/checkpoint trend with dots for actual observations, never implied daily bank balances; budget history and upcoming recurring suggestions.

## Update budget flow (central interaction)
Step 1: manually enter actual card balance and **observation date** (today default, earlier allowed); display last known point, require explicit confirmation.
Step 2: checklist of existing obligations paid/cancelled, amount edits, new obligations, savings changes; note these **do not modify card balance**.
Step 3: distribute the WHOLE entered card balance among financial months. Show editable month balances and exact total; every amount requires confirmation, including suggested values. Sum must equal card balance; negative advance months allowed, no suspense category. Do not ask to distribute the interval delta, enter purchases/income/categories or explain it. Example 800 -> 770 with month balances November 750 / December 20 saves directly; -50/+20 is not inferred expense/income.
Step 4: review card, full allocation vector, reserves, savings, free/deficit and ordinary forecast; warning/affirmation for paid with unchanged balance. Unknown optional bank detail is not a blocking warning. Closed-period corrections require explicit version review. Liquidity-edge warning and forecast remain HB-003 decisions, not a hidden cap.
Save all atomically, show actual observation and allocation history. Redistribution alone may reuse an already confirmed unchanged bank observation; create only a new allocation revision. Same-day sequencing is specified by HB-002. Optional operation detail belongs in a separate later path, never a prerequisite to save.

For an ordinary visit after a month boundary, include an explicit choice in this same flow: actual bank check/input → choose A **Carry old budget balances** or B **Start fresh** (neither preselected) → review complete distribution and all obligation/savings funding → one primary confirmation. Do not require a preliminary old-balance confirmation or separate carry procedure. A real new check at the same amount creates a new observation with its actual date; only an explicit redistribution-only mode reuses the old check. Showing/editing the proposal without saving changes no financial data.

## Obligations
Cards with label, full outstanding, originating financial month, likely due date optional, status unpaid/paid/cancelled, origin and history link. Actions edit amount / mark paid / cancel. On paid prompt for fresh confirmed balance; paid action NEVER changes card automatically. Potential obligation badge. Recurring templates suggest acceptance and editable amount on new period or end-of-month future-income allocation.

## Savings
Named earmarks, amounts, history; increase/release/delete with audit. Suggestions to release savings when deficit appears, never silent release.

## Months and reports
Month selection with Current / Awaiting close / Closed / Needs reconciliation.
Show as-of close snapshot vs today's lifecycle. Distinguish actual bank activity (calendar) from financing allocations (budget month). Do not merge or overcount previous free rollover.
On website open, detect the current Europe/Berlin month and make the period available. Offer **Update budget** with explicit A/B choice and fresh observed balance/date;neither transition is preselected. Example when A CARRY is chosen:Nov28 bank900 EUR,Nov400/Dec500,Nov reserve300;on Dec2 enter actual840 and confirm Nov0/Dec840,same reserve300 fundedDec,free540. One action saves checkpoint,full vector,consent and funding history. No intermediate vector or bank movement;-60 is not attributed to either month's expenses. No background checkpoint,carry or automatic report closing is scheduled.
For B **Start fresh**, list the past months and signed balances the user explicitly chooses not to carry. Example last Nov20 2026 check100 EUR,Nov -50/Dec150,no December visit;on Jan5 2027 enter80 and confirm Nov0/Dec0/Jan80 once. Display that the old -50 stays in history. Keep December's last-known allocation/date and unknown Dec31 bank balance; create no intervening checks. Enumerate all existing unpaid obligations/savings, their unchanged amounts and proposed current funding; show full reserves and any resulting deficit. B clears planning balances only; it cannot silently mark debts paid/cancelled or release savings. Explicit separate changes require their own visible review/events. Future allocations are preserved unless explicitly edited in the complete vector.
B remains available across several missed months regardless of signs/count of old balances, without one carry per month or closing each month first. A's detailed multi-source/signed carry proposal remains a separate review question; do not block B on that policy or silently switch A to B. Explicit **Defer transition** remains available for an ordinary update without either choice;it preserves funding and requires a complete vector summing to the checked B. Unconfirmed drafts leave all financial state unchanged. No option is selected automatically, including when the user returns after a long absence.
Explicit transfer-only remains a technical alternative: after a Dec1 carry without a bank check, "last checked" stays Nov28 and there is no new bank dot. In the primary actual-check flow, even a repeated 900 EUR creates a real Dec2 check/date. Show internal carry separately in the budget timeline. Allocation changes are budget history, never actual spending/confirmed income without operation evidence. Missing detail is labelled incomplete, not zero spending.
Manual close works without a final-day observation or PDF. Preview historical allocations/reserves/savings, real last-observed date and report version. If end balance unknown, label it unknown and bank data incomplete; never copy Nov20/Dec2 bank amount to Nov30 or demand a missing point. Current zero old-month allocation after transfer does not erase historical report state. Optional unexplained net is informational, not a close blocker. Late corrections require explicit review and versioning (HB-002).

[Accepted ADR0002](adr/0002-month-closing-and-corrections.md) is the implementation contract. A complex CARRY request involving several past months or affected negative budgets must stop with no financial changes until Q-HB2-02 is decided;show explicit FRESH_START as an available choice,never select it automatically. An untouched unrelated negative month alone must not cause that restriction. Preserve the ordinary single-source carry path and optional explicit DEFER.

## Analytics & future PDF
Optional category, 'Uncategorized' acceptable; bank statement upload to month, candidate matching/approval; explain how checkpoint movements have already been counted. No automatic double subtraction.

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
