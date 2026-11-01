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

## Obligations
Cards with label, full outstanding, originating financial month, likely due date optional, status unpaid/paid/cancelled, origin and history link. Actions edit amount / mark paid / cancel. On paid prompt for fresh confirmed balance; paid action NEVER changes card automatically. Potential obligation badge. Recurring templates suggest acceptance and editable amount on new period or end-of-month future-income allocation.

## Savings
Named earmarks, amounts, history; increase/release/delete with audit. Suggestions to release savings when deficit appears, never silent release.

## Months and reports
Month selection with Current / Awaiting close / Closed / Needs reconciliation.
Show as-of close snapshot vs today's lifecycle. Distinguish actual bank activity (calendar) from financing allocations (budget month). Do not merge or overcount previous free rollover.
On new calendar month auto-open, show a carryover PROPOSAL at next open. One-button confirmation (option A) moves old active cash into new month; until then no silent move. Preserve unpaid obligation/savings identities, full earmarks and existing new-month cash exactly once. Show before/after; at unchanged confirmed bank balance no re-entry needed. Changed balance can be updated in the same full-distribution confirmation. Transfer is a budget action, not a bank transaction; no duplicate on retry.
After Dec 1 transfer without a new bank check, "last checked" still shows Nov 28 and the bank trend has no Dec 1 observation dot; show transfer separately in the budget timeline. Statistics may show allocation changes as budget changes, but never label them actual spending/confirmed income without operation evidence. Missing detail is labelled incomplete, not zero spending.
Manual close works without a final-day observation or PDF. Preview historical allocations/reserves/savings, real last-observed date and report version. If end balance unknown, label it unknown and bank data incomplete; never copy Nov20/Dec2 bank amount to Nov30 or demand a missing point. Current zero old-month allocation after transfer does not erase historical report state. Optional unexplained net is informational, not a close blocker. Late corrections require explicit review and versioning (HB-002).

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
