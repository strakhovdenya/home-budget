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
Step 3: if balance moved, show net interval change, classify known income if any, distribute provisional movement across past/current/future periods; offer 0 current/all future, or split; do not call net difference actual income.
Step 4: review before/after figures: card, reserves, savings, eligible free, deficit, forecast, affected periods; warnings for unchanged balance with paid flag, unclassified changes, future funds, closed period edits.
Save all atomically, show success with checkpoint timeline entry. Same-day multiple updates allowed with stable sequencing.

## Obligations
Cards with label, full outstanding, originating financial month, likely due date optional, status unpaid/paid/cancelled, origin and history link. Actions edit amount / mark paid / cancel. On paid prompt for fresh confirmed balance; paid action NEVER changes card automatically. Potential obligation badge. Recurring templates suggest acceptance and editable amount on new period or end-of-month future-income allocation.

## Savings
Named earmarks, amounts, history; increase/release/delete with audit. Suggestions to release savings when deficit appears, never silent release.

## Months and reports
Month selection with Current / Awaiting close / Closed / Needs reconciliation.
Show as-of close snapshot vs today's lifecycle. Distinguish actual bank activity (calendar) from financing allocations (budget month). Do not merge or overcount previous free rollover.
Manual close flow with preview, last observed date warning, any unresolved net differences, and version number. Late updates require explicit review and versioning.

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
