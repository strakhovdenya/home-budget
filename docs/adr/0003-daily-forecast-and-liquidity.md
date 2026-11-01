# ADR 0003 — Daily forecast and physical liquidity

**Status: Accepted** — owner confirms final independent review and approval of D36 mathematics and D37..D39 UX. HB-003 is Done as a specification/scenario task.

**Date:** 2026-11-01. **Final acceptance:** [owner confirmation and editorial fixes](../DECISIONS.md#hb-003-final-acceptance--2026-11-01). Prior Proposed revisions and verification are preserved in the dated scenario history and Git;no runtime success is implied. **Requirements:** HB-003, BR-01..BR-08/10/11, F-003/005/006/008/009.

References: [Accepted ADR0001](0001-checkpoints-and-allocations.md), [Accepted ADR0002](0002-month-closing-and-corrections.md), [business rules](../BUSINESS_RULES.md), [owner questions](../OPEN_QUESTIONS.md#hb-003-owner-decisions), [scenario specification](../../tests/scenarios/phase-01/hb-003-daily-forecast.md).

## Context and authority

The user checks one card irregularly and confirms a complete allocation of its observed balance. Purchases, income and explanations are optional. A daily guideline is a budget estimate, never a new bank observation or permission guaranteeing that the bank will approve spending.

D32..D35 fixes actual cash:A>=0,sum(A)=B>=0;ADRs0001/0002 are re-Accepted. [Owner D36](../DECISIONS.md#all-period-safe-main-daily-limit--2026-11-01) now selects a safe main current daily limit protecting all existing selected reserves/savings and other-month allocations irrespective of due dates. Ordinary budget guidance remains secondary. The exact max-based formula and D37..D39 UX below are now Accepted after owner-reported independent review. No historical-overspend/overdraft policy or runtime is added.

Only documentation and synthetic scenarios are delivered. No application, dependencies, persistence schema, migrations, UI or runtime financial core. Current layer/import boundaries remain unchanged.

## Established budget calculation

Select ONE coherent active state using ADR 0002's chronological observation, allocation anchor and full lifecycle/funding revisions. Never aggregate revisions or closed reports. For every represented period p:

```text
B = last actually observed card balance anchoring the active vector
A[p] = nonnegative confirmed actual-money allocation (absent row in COMPLETE vector means 0)
R[p] = sum of full outstanding UNPAID obligations funded by p with reserveFull=true
S[p] = sum of active voluntary savings funded by p
E[p] = R[p] + S[p]
F[p] = A[p] - E[p]
deficit[p] = max(0, -F[p])
A[p] >= 0; B >= 0; sum(A) = B
sum(F) = B - sum(R) - sum(S)
```

A is actually allocated cash;R is the full outstanding requirement included for a period and S is retained voluntary savings. R/S are not necessarily funded subsets of A:R+S may exceed A or B,making F negative without creating money. Each identity has one effective funding period and counts once. Ordinary unpaid obligations are fully reserved;possible/pending claims contribute their full outstanding only when explicitly selected. Never cap R or automatically reduce S. Paid/cancelled reserve is0;partial payment leaves the full selected remainder reserved. Negative F/L are valid;negative A rejects NEGATIVE_CASH_ALLOCATION even at an exact sum. Expected income is excluded;overdraft policy remains undecided.

For explicit Berlin date d, current period c=month(d), and target p:

```text
if p = c: n = daysInMonth(c) - dayOfMonth(d) + 1
if p > c: n = daysInMonth(p)
if p < c: no live daily forecast; use the separate historical-report API
q = max(0, F[p]) div n
r = max(0, F[p]) mod n
0 <= r < n; q*n + r = max(0, F[p])
```

`q` is ordinary_daily_guideline for current, future_daily_preview for future. Money and quotient/remainder arithmetic use bigint integer cents; n is a positive integer calendar count converted exactly to bigint for division. Clamp the numerator before division. Do not round to nearest, distribute r secretly, or discard cents from F. Last day has n=1. Recalculation after a later real check uses its new confirmed F; elapsed days alone do not debit A or prove unused spending. A later n can increase q with the same stale state; label the estimate accordingly.

Future money never increases current A/F/q. A purchase funded by existing cash and already reflected in A is not subtracted again. Future preview uses its whole month even after purchases funded by its existing cash. Example: December F=30000 gives 967/day, remainder23 over31 days. Current Nov28 F=3000 gives1000/day over3 days; F=-5000 gives q=0,deficit5000. These remain budget-only results;D36 requires a distinct safe main current limit,whose exact formula below is Accepted.

## Calendar and quality

The caller supplies a validated `asOfDate` in Europe/Berlin and an already selected active snapshot, not a system clock. If starting from an instant, convert it to Berlin outside the money calculation. Count Gregorian calendar dates, never elapsed milliseconds divided by86400000. Mar29 2026 is a23-hour day and Oct25 a25-hour day; each counts once. February has28 days in2026 and29 in2028. Nov30 23:30Z belongs to Dec1 in Berlin. Null observation time stays null; same-day order remains ADR0002's explicit confirmed order.

Report four separate concepts: observed facts with their real dates/revision refs; derived F/q/deficit; age/month-transition notices; and liquidity warnings. F is derived from confirmed state, not observed discretionary cash today. Even a same-day observation is an observation at that check, not a guarantee against subsequent activity.

Owner D37..D39:for any complete valid confirmed snapshot,continue displaying its safe daily estimate using the current Berlin asOfDate,even when the actual bank check is old. Show the true observation date,explicit older-data label and gentle Update balance action. ageDays=calendarOrdinal(asOfDate)-calendarOrdinal(observedDate);showReminder iff ageDays>=7. Age0 uses fresh provenance;every age>0 displays older-data provenance,including age6 without reminder. Nov20→Nov26/27/28 gives age6/7/8 and reminder false/true/true. Count Gregorian civil dates after Berlin conversion,not elapsed hours divided by24;DST never changes the threshold. No expiry/hiding or fallback to a larger budget guideline. No new observation,mandatory bank update,background polling or push system.

Without a checkpoint, return NO_OBSERVATION with no A/F/q/deficit or liquidity number, not zero. Known earmarks remain reportable separately. A partially loaded vector/lifecycle set returns INCOMPLETE_STATE, not missing-row zeros. Missing rows mean zero only inside a confirmed COMPLETE set. Contradictory scope, anchor, dates or sums are errors. An older observation with a complete valid vector still permits a labelled budget estimate and liquidity diagnostic based on that dated state; it never supplies current bank cash. Incomplete optional transaction detail is irrelevant to this calculation and does not block it.

If the observation or allocation effective date predates the first day of c, add MONTH_REVIEW_REQUIRED. A calendar change does not transfer money, release reserves, create a checkpoint or reset the old vector. Calculate only the confirmed current A (zero if absent in a complete vector); offer Update budget. A confirmed DEFER can retain past A/funding and an unfunded current month. If an earlier future allocation already funds c, it becomes the current budget estimate using remaining days, without automatic carry. The notice reports provenance, not a financial mutation or an automatic rejection.

## Pure TypeScript design contract

This is the accepted design signature,not a runtime implementation. Validated branded strings are constructed at an input boundary; no implementation is introduced. Storage/JSON adapters serialize bigint as decimal strings and check range on conversion. Id is scoped to this one authorized account; dates, money and full sets must be validated again server-side.

```ts
type Brand<T, N extends string> = T & { readonly __brand: N };
type Id = Brand<string, 'ScopedId'>;
type BerlinDate = Brand<string, 'BerlinDate'>; // valid YYYY-MM-DD
type Period = Brand<string, 'Period'>; // valid YYYY-MM, years 0001..9999
type Cents = bigint; // signed 64-bit range, checked intermediates/results
type NonNegativeCents = Brand<bigint, 'NonNegativeCents'>; // validated >=0
type NegativeCents = Brand<bigint, 'NegativeCents'>; // validated <0
type Allocation = Readonly<{ period: Period; amount: NonNegativeCents }>;
type Obligation = Readonly<{
  id: Id; revisionId: Id; fundingPeriod: Period;
  status: 'UNPAID' | 'PAID' | 'CANCELLED';
  isPossible: boolean; reserveFull: boolean;
  original: Cents; outstanding: Cents;
}>;
type Saving = Readonly<{
  id: Id; revisionId: Id; fundingPeriod: Period; amount: Cents;
}>; // current retained earmark state; released amount is not replayed
type ActiveSnapshot = Readonly<{
  kind: 'ACTIVE_COMPLETE'; accountId: Id; aggregateRevision: bigint;
  checkpoint: Readonly<{
    revisionId: Id; observedDate: BerlinDate; balance: NonNegativeCents;
  }>;
  allocationRevisionId: Id; anchorCheckpointRevisionId: Id;
  allocationEffectiveDate: BerlinDate;
  allocations: readonly Allocation[];
  obligations: readonly Obligation[]; savings: readonly Saving[];
}>;
type NegativeBankObservation = Readonly<{
  kind: 'NEGATIVE_BANK_OBSERVATION'; accountId: Id; aggregateRevision: bigint;
  checkpoint: Readonly<{
    revisionId: Id; observedDate: BerlinDate; balance: NegativeCents;
  }>;
  allocations?: never; allocationRevisionId?: never;
  anchorCheckpointRevisionId?: never; allocationEffectiveDate?: never;
}>; // observed fact only; no allocation contract or inferred credit
type StateInput =
  | Readonly<{ kind: 'NO_OBSERVATION'; knownObligations: readonly Obligation[];
      knownSavings: readonly Saving[] }>
  | Readonly<{ kind: 'INCOMPLETE_STATE'; missing: readonly string[] }>
  | ActiveSnapshot
  | NegativeBankObservation;
type ForecastInput = Readonly<{
  asOfDate: BerlinDate; targetPeriod: Period; state: StateInput;
}>;
type ForecastNotice = 'EARLIER_OBSERVATION' | 'REMINDER_DUE'
  | 'MONTH_REVIEW_REQUIRED' | 'CURRENT_UNFUNDED';
type BudgetResult = Readonly<{
  kind: 'BUDGET_ESTIMATE'; asOfDate: BerlinDate; targetPeriod: Period;
  mode: 'CURRENT' | 'FUTURE_PREVIEW'; days: number;
  allocated: Cents; reserved: Cents; savings: Cents; free: Cents;
  deficit: Cents; ordinaryGuideline: Cents; roundingRemainder: Cents;
  lastObservedBalance: Cents; lastObservedDate: BerlinDate; ageDays: number;
  provenance: Readonly<{ checkpointRevisionId: Id; allocationRevisionId: Id;
    aggregateRevision: bigint; allocationEffectiveDate: BerlinDate }>;
  notices: readonly ForecastNotice[]; showReminder: boolean;
  liquidityPresentation: 'SAFE_MAIN'; // budget result is secondary,not the main limit
}>;
type ForecastResult = BudgetResult
  | Readonly<{ kind: 'UNAVAILABLE'; reason: 'NO_OBSERVATION'
      | 'INCOMPLETE_STATE' | 'HISTORICAL_PERIOD' | 'OVERDRAFT_POLICY_REQUIRED' }>;
type ForecastErrorCode = 'INVALID_DATE' | 'INVALID_PERIOD' | 'SCOPE_MISMATCH'
  | 'ANCHOR_MISMATCH' | 'SUM_MISMATCH' | 'DUPLICATE_ID_OR_PERIOD'
  | 'INVALID_EARMARK' | 'STATE_AFTER_AS_OF' | 'MONEY_RANGE'
  | 'NEGATIVE_CASH_ALLOCATION' | 'INVALID_OBSERVATION_KIND' | 'INVALID_STATE_SHAPE';
type Outcome<T> = Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; code: ForecastErrorCode }>;
declare function forecastBudget(input: ForecastInput): Outcome<ForecastResult>;

type LiquidityWarning = 'OBLIGATIONS_UNDERFUNDED' | 'EARMARKS_UNDERFUNDED'
  | 'PROTECTION_UNDERFUNDED' | 'BUDGET_EXCEEDS_SAFE';
type LiquidityEstimate = Readonly<{
  kind: 'SAFE_ESTIMATE'; presentation: 'SAFE_MAIN';
  formula: 'ALL_PERIOD_MAX_V1'; asOfDate: BerlinDate;
  basisDate: BerlinDate; ageDays: number; days: number;
  provenance: BudgetResult['provenance']; notices: readonly ForecastNotice[];
  showReminder: boolean;
  budgetFree: Cents; budgetDeficit: Cents; budgetGuideline: Cents;
  totalReserved: Cents; totalSavings: Cents; protectedTotal: Cents;
  otherPeriodProtection: Cents; liquidityFreeSigned: Cents;
  safeAvailable: Cents; safeDailyLimit: Cents; safeRemainder: Cents;
  obligationShortfall: Cents; earmarkShortfall: Cents;
  protectionShortfall: Cents; budgetSafeGap: Cents;
  protectionByPeriod: readonly Readonly<{
    period: Period; allocated: Cents; reserved: Cents; savings: Cents;
    protectedAmount: Cents;
  }>[];
  warnings: readonly LiquidityWarning[];
}>;
type LiquidityResult = LiquidityEstimate | Readonly<{
  kind: 'LIQUIDITY_UNAVAILABLE'; reason: 'NO_OBSERVATION'
    | 'INCOMPLETE_STATE' | 'NOT_CURRENT_PERIOD' | 'OVERDRAFT_POLICY_REQUIRED';
}>;
declare function forecastCurrentLiquidity(input: ForecastInput): Outcome<LiquidityResult>;
```

Both functions validate input independently; the liquidity calculation must not accept an unrelated budget result. All collections/objects are readonly and remain unchanged. Id/revision provenance refers to an immutable coherent snapshot: application selection resolves effective positions/knowledge before invoking this API. Historical/report DTOs are not ActiveSnapshot and cannot be passed to forecastBudget. No database, ORM, React, framework, network, authorization lookup or Date.now inside these functions. Authorization and atomic mutation/idempotency remain application/repository responsibilities under ADR0002.

Possible/pending is a claim characteristic (`isPossible`),not a new lifecycle status. `reserveFull` records the explicit all-or-none reservation choice. Ordinary (`isPossible=false`) UNPAID requires true;possible UNPAID permits true or false. R contribution is outstanding iff status=UNPAID and reserveFull=true,otherwise0. PAID/CANCELLED requires false. Never accept a separate reserved amount or a fraction. Stable id and immutable revisionId preserve characteristic,selection,status,outstanding and funding through changes and historical selection;CARRY/FRESH_START never turns an unselected possible claim into a reserve automatically. Existing ordinary scenario obligations mean isPossible=false/reserveFull=true while UNPAID unless stated otherwise.

Validate branch shape,scope,date,range and sign before branch-specific calculations. ACTIVE_COMPLETE requires nonnegative checkpoint balance and its complete nonnegative vector summing to B. NEGATIVE_BANK_OBSERVATION requires B<0,observedDate<=asOfDate and no allocation fields;it does not require or invent a vector,allocation revision or effective date. Wrong branch/sign returns INVALID_OBSERVATION_KIND;allocation fields supplied in the negative branch return INVALID_STATE_SHAPE. For a valid negative observation return UNAVAILABLE/OVERDRAFT_POLICY_REQUIRED (liquidity:LIQUIDITY_UNAVAILABLE with the same reason) before any sum/forecast calculation,including future targets. The observation's actual balance/date/revision remain facts;no A,F,deficit,daily,safe limit or credit amount is produced. This separates unsupported allocation policy from invalid ordinary input;it does not implement overdraft budgeting.

Preconditions for ACTIVE_COMPLETE: validated dates/periods and account ownership;current period derived from asOfDate;observedDate<=allocationEffectiveDate<=asOfDate;coherent funding states no later than asOfDate;matching anchor;unique allocation periods/earmark identities;every A>=0 and exact sum to B>=0;original>0,outstanding>=0,PAID outstanding0,UNPAID outstanding>0,savings>=0,and reservation flags valid as above. CANCELLED may retain historical outstanding but contributes0. R+S need not be<=A or B. Negative-observation branch has only the independent observation preconditions above. Every intermediate/result is range-checked;overflow returns MONEY_RANGE. Money never converts to number;calendar counts are bounded integers with days>=1. Negative F/L are valid;negative A is an error. No real legacy data/migration exists.

Postconditions: F=A-R-S, deficit=max(0,-F), quotient/remainder identity holds, provenance matches the selected snapshot, future result depends only on its own A/R/S and full month count. Unavailable results have no counterfeit monetary totals. Missing observation and historical target are business states, not numerical failures. Invalid data returns an explicit error, not UNAVAILABLE or zero. Read calls create zero financial/audit/checkpoint/report writes.

## Accepted all-period protection formula

**Accepted D36 contract:** option B is the main display. Protect every existing selected full R and retained S across all periods without due-date filtering,and preserve other-month actual allocations. The max-based mathematics below is Accepted following owner-reported independent review. Warning-only budget guidance is not an alternative main display;it may appear secondarily.

Input is one coherent ACTIVE_COMPLETE snapshot and current Berlin period c,with P the union of allocation and obligation/savings funding periods. Missing rows are zero only in that complete state;all identities count once. Define E[p]=R[p]+S[p]. Use exact bigint cents,checked intermediates and n>=1 inclusive current days.

~~~text
H[p] = max(A[p], E[p]) for p != c
H = sum_{p != c} H[p]
T = E[c] + H
L = B - T
safeAvailable = max(0, L)
safeDailyLimit = safeAvailable div n
safeRemainder = safeAvailable mod n

budgetFree = F[c] = A[c] - E[c]
budgetGuideline = max(0, F[c]) div n
budgetDeficit = max(0, -F[c])
totalReserved = sum_p R[p]
totalSavings = sum_p S[p]
obligationShortfall = max(0, totalReserved - B)
earmarkShortfall = max(0, totalReserved + totalSavings - B)
protectionShortfall = max(0, T - B)
budgetSafeGap = max(0, F[c]) - safeAvailable

warnings contain each corresponding positive-shortfall/gap condition
~~~

All R/S remain full even if T>B;H/T are diagnostics,not new reserves,cash or writes. Other-period protectedAmount=H[p];current protectedAmount=E[c]. R includes ordinary unpaid and explicitly selected possible claims only. Unelected possible claims,PAID/CANCELLED and expected income contribute0 to R. No arbitrary time horizon or debt priority is introduced. Never add a previous deficit,operation detail or another vector revision to T.

### Why max protects without double counting

For p!=c,H[p]=A[p]+max(0,E[p]-A[p]):existing cash for that period stays protected,and only its unfunded earmark excess adds a requirement. Adding A[p]+E[p] would protect funded earmarks twice. Because sum(A)=B:

~~~text
U = sum_{p != c} max(0, E[p] - A[p])
T = E[c] + (B - A[c]) + U
L = F[c] - U

0 <= safeAvailable <= max(0,F[c]) <= A[c] <= B
L <= B - sum(E)
obligationShortfall <= earmarkShortfall <= protectionShortfall
safeDailyLimit <= budgetGuideline
safeDailyLimit*n + safeRemainder = safeAvailable; 0<=safeRemainder<n
~~~

If T<=B,spending at most safeAvailable leaves B-spend>=T>=sum(E),and protects each other-period cash allocation/full earmark requirement once. If T>B,the limit is0 and an explicit protection shortfall is displayed;this does not falsely promise that existing obligations can be covered. For fixed B/A,increasing any included R/S cannot increase safeAvailable. A completed old month participates exactly like another noncurrent month until an explicit transition. Current cash is not expanded by other-month free funds. The earlier min(max(0,F[c]),max(0,L)) gives the same result;the min is redundant because U>=0. A per-day min(budgetGuideline,safeAvailable) would be wrong:divide the total protected residual by n first.

This proof assumes the existing whole-card aggregate model and disjoint period funding identities,not physically separated accounts. It proves resource protection for this accepted snapshot formula,not payment timing or current actual liquidity after the observation. Future outflows/receipts are never guessed. The owner confirms independent review of the assumptions,formula and presentation. Later implementation must still execute the reviewed oracles and range tests;this acceptance is not proof of runtime correctness.

### Exact examples for the accepted formula

All amounts are integer EUR cents,asOfNov28 2026,n3;Dec/Jan are future periods. R/S assignments shown are complete synthetic states.

| Case | B | A Nov/Dec/Jan | E Nov/Dec/Jan | T | L | Budget q | Safe available | Main q / remainder | Obligation / earmark / protection shortage |
|---|---:|---|---|---:|---:|---:|---:|---|---|
| Owner example,December R20000 | 10000 | 10000/0/0 | 0/20000/0 | 20000 | -10000 | 3333 | 0 | 0 / 0 | 10000 / 10000 / 10000 |
| Funded overlap,R Nov30000/S Nov5000,R Dec2000/S Dec1000 | 50000 | 40000/10000/0 | 35000/3000/0 | 45000 | 5000 | 1666 | 5000 | 1666 / 2 | 0 / 0 / 0 |
| Future A5000,R Dec10000 | 20000 | 15000/5000/0 | 0/10000/0 | 10000 | 10000 | 5000 | 10000 | 3333 / 1 | 0 / 0 / 0 |
| Two months,R Dec20000/Jan25000 | 30000 | 15000/5000/10000 | 0/20000/25000 | 45000 | -15000 | 5000 | 0 | 0 / 0 | 15000 / 15000 / 15000 |
| Cash covers earmarks but other allocation remains protected,R Nov5000 | 10000 | 2000/8000/0 | 5000/0/0 | 13000 | -3000 | 0 | 0 | 0 / 0 | 0 / 0 / 3000 |
| Savings only,S Nov2000/Dec8000 | 20000 | 15000/5000/0 | 2000/8000/0 | 10000 | 10000 | 4333 | 10000 | 3333 / 1 | 0 / 0 / 0 |

The positive-future example protects10000,not15000:A5000 overlaps its E10000. The funded-overlap case protects future10000,not13000. Shortage columns describe overlapping comparisons and must never be summed. No warning or forecast reassigns an obligation to November or creates a November expense.

### Accepted user-facing warnings and quality

Main labels:«Безопасно доступно для свободных расходов» and «Дневной лимит по данным проверки DATE». Show budgetFree/budgetDeficit and optional «Бюджетный ориентир месяца» separately and less prominently;budgetGuideline never substitutes for the main limit.

- obligationShortfall>0:«На зарезервированные неоплаченные обязательства не хватает X € по данным проверки DATE». Owner example X100 €,available0,main daily0;the December due date/funding remain visible and unchanged.
- earmarkShortfall>0:«На обязательства и сохранённые накопления вместе не хватает Y €». Do not imply that savings are released or that this amount adds to the obligation shortage.
- protectionShortfall>0 with smaller/zero earmark shortage:«Чтобы сохранить деньги других месяцев и полные резервы,не хватает Z €». This is not necessarily an inability to cover obligations alone;show its meaning rather than calling it bank debt.
- budgetSafeGap>0:«Бюджетный ориентир выше безопасно доступной суммы:учтены резервы и деньги других месяцев». Show actual dated amounts without inferring spending.

D38 warnings are informational:visible,read-only,no acknowledgment button,no blocking overlay,no repeated confirmation at site open. Actual financial actions keep their separate mandatory consent/authorization,including BR-02's fresh balance affirmation for payment with unchanged bank amount;reading warnings never becomes such consent. Group positive obligation/earmark/protection shortages by equal numeric amount and combine their meanings on one line. If amounts differ,show qualified values as overlapping comparisons with «Эти суммы не складываются». BudgetSafeGap may add an explanatory sentence rather than repeat the same shortage amount;age/reminder can share a separate provenance notice. Never discard a distinct meaning merely because its amount matches another. This deterministic grouping is presentation guidance,not summation or liability priority. RU/DE/EN formatting remains later implementation;no components are created.

No observation/incomplete state:LIQUIDITY_UNAVAILABLE,never numeric0. Negative observation:OVERDRAFT_POLICY_REQUIRED without A/credit. Future target:NOT_CURRENT_PERIOD;future preview remains budget-only. D37 requires displaying the dated safe estimate for an older complete valid state with its real bank date,explicit older-data notice and gentle update action;D39 adds reminder exactly at age>=7. Never hide solely for age,use a budget fallback,interpolate bank cash or reset freshness on transfer-only. A month change uses only the confirmed current allocation/funding and does not execute CARRY/FRESH_START.

## Transitions and historical isolation

Projection consumes the committed result of an explicitly chosen update; it never executes CARRY/FRESH_START/DEFER. Ordinary approved CARRY keeps target money once and moves each full funding association once. Transfer-only retains bank date/count; a real same-amount check creates a new observation. No automatic A/B selection, calendar sweep or report close.

Jan5 2027 FRESH_START at new B8000,A={Jan:8000} yields n27,q296,r8 with E0. Old Nov4000/Dec6000 at B10000 stay historical,not extra January money. Same unpaid9000/saving2000 fundedJan yield F=-3000,q0,deficit3000. No invented December check or serial carry/close is required. Multiple-source CARRY still rejects OWNER_POLICY_REQUIRED pending Q-HB2-02;this never blocks explicit valid B. Negative A is invalid for any new vector,while negative source F does not block ordinary CARRY.

## Acceptance scope and remaining exclusions

Owner D36..D39 and final independent review settle all HB-003 questions:all-period safe-main mathematics,secondary budget guide,old-state estimate display,informational grouped warnings and Berlin civil age>=7 reminder. The three final editorial fixes are incorporated in HB3-010,C01..C08 heading/explanations,and F-003 received-funds input. No safe-main policy choice remains open.

Generalized multi-source CARRY,overdraft allocation,recurring-template MVP membership and a separate historical-overspend feature remain separately open and excluded. Negative real observations retain the unavailable forecast contract without assumed credit. ADR0001/0002 remain Accepted,HB-001/002 Done;HB-004 remains Planned and is not started.

## Verification and future implementation boundary

[Accepted-policy HB3 scenarios](../../tests/scenarios/phase-01/hb-003-daily-forecast.md) and [all-period HBL scenarios/evidence](../../tests/scenarios/phase-01/hb-003-safe-liquidity.md) retain prior drafts and dated checks separately from current oracles. Owner-reported final independent review and explicit approval make ADR0003 Accepted,HB-003 Done,and Q-HB1-01 resolved within scope. Formula/DTO/UX acceptance is specification evidence,not executed financial domain,DB or UI tests. Later implementation must test these exact oracles before claiming runtime correctness. No application,dependencies,migrations,commit,push or PR are introduced.
