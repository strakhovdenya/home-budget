# HB-019.1 — Budget update UX and month-transition clarity

**Status:** Planned — owner-approved product direction D40–D45, **independent plan review and separate implementation authorization pending**.
**Owner direction:** 2026-11-04. **Depends on:** HB-013, HB-017, HB-018; implementation only after HB-019 reviewed, accepted and documentation finalized.
**Sources:** [BR-01/02/03/04/05/06/07/08](../BUSINESS_RULES.md), [D29–D45](../DECISIONS.md), Accepted [ADR0001](../adr/0001-checkpoints-and-allocations.md), [ADR0002](../adr/0002-month-closing-and-corrections.md), [ADR0003](../adr/0003-daily-forecast-and-liquidity.md), [HB-013](hb-013-period-allocations.md), [HB-017](hb-017-update-budget.md), [HB-019](hb-019-month-closing-versions-rollover.md), [task](../TASKS.md#hb-0191--budget-update-ux-and-month-transition-clarity), [scenarios](../../tests/scenarios/phase-01/hb-019-1-budget-update-ux.md).

## 1. Objective and accepted user experience

The single primary user task is "Обновить бюджет": confirm an actual card
balance when a real bank check occurs, distribute the entire actual B, explicitly
review active obligations/savings and receive a safe daily guideline. No
transaction-entry requirement or explanation of checkpoint differences.

Same-month ordinary updates do not display transition selection **unless** there
are unresolved allocations or funded earmarks in a previous month. The new-month
primary action is clearly named "Начать месяц с актуального остатка": the user
intentionally selects FRESH_START, checks real B, reviews the complete A vector,
explicitly agrees to clear past A and migrate the funding of every active old
identity while keeping original periods and histories. This is not an automatic
mode on page open, not a default radio choice or inference from amounts/dates.

Separately accessible secondary actions:

| Explicit user action | Existing transition contract | Bank observation | Funding effect |
|---|---|---|---|
| "Начать месяц с актуального остатка" | FRESH_START | ACTUAL_CHECK required | Past A cleared; all active old funding moves once; retained future A unless explicit edit consent |
| "Перенести прежнее распределение" | CARRY | ACTUAL_CHECK or REUSE_CONFIRMED | One supported source's A and funding fully move once; existing target and other periods preserved |
| "Оставить распределение без переноса" | DEFER | Actual check when user checked card; reuse only where contract permits | No funding transfer; full A must equal confirmed B |
| "Обновить бюджет" in same month with no unresolved past | ORDINARY | ACTUAL_CHECK | Existing funding unchanged unless explicitly independently edited |
| "Перераспределить подтверждённые деньги" | ALLOCATION_ONLY (existing) | REUSE_CONFIRMED | Full vector; exact unchanged-funding acknowledgements when affected |

Review screen states before/after B, last real bank date, touched allocations
and protected R/S/F, source identity/origin vs funding month, deficit and D36
safe daily result using server-approved computation. Warnings are informational.
Do not call an allocation move income, expense, month-end cash or a bank debit.

### 1.1 Dashboard: card observation vs selected-month budget

**Owner scope addition (2026-11-04), planning only.** The latest confirmed card
observation and the budget of the selected month are different concepts. A large
1000 EUR card value observed on 2026-11-04 must not visually appear to be an
October 2026 balance. This changes presentation priority, not financial meaning,
the existing selected-state contract or the HB-019 closing screen.

Determine CURRENT/PAST/FUTURE from the selected month and the **server-provided
Europe/Berlin calendar date**, not the device clock or observation month.

| Selected month | Primary content | Other visible information |
|---|---|---|
| Current | Last confirmed card balance, with its real observation date and existing freshness notices; retain the separately labelled D36 safe guideline | Selected current-month A/R/S/F remain visible and distinct from card cash |
| Past | Closed month: selected accepted historical version (latest by default), with its A/R/S/F and unknown values. Unclosed month: clearly labelled available selected-period budget and basis, without invented month-end cash | Latest confirmed card balance, its actual check date and explicit explanation that it is not the selected month's balance; any active allocation for a closed past month is distinct subordinate context |
| Future | Clearly named selected-month budget/planning view: already confirmed allocation A, full R, S and F; any existing daily preview is labelled a future budget estimate | Latest confirmed card balance and real check date, explicitly not a future-month balance or forecast of future bank cash |

Five acceptance criteria for this presentation slice:

1. **Hierarchy and provenance.** For past/future selection, the month heading and
   A/R/S/F precede and visually outweigh the latest-card block on desktop and
   mobile. Its smaller secondary block remains readable, always includes the
   check date and a visible non-attribution explanation. Current selection keeps
   the card balance as the primary balance metric, without weakening D36 guidance.
   No meaning depends solely on colour, font size, hover or a collapsed tooltip.
2. **Separate data bases.** Label the existing budget basis faithfully: an active
   confirmed distribution for a selected period is not an as-closed historical
   snapshot. A carried/cleared old active A=0 must not overwrite a retained report;
   when displaying an existing historical version, identify its version and H/K
   provenance through the existing history contract. For a closed month, the
   selected accepted history leads (latest by default, explicit old selection
   respected); any active old-period allocation is secondary and labelled with
   its current anchor. This must not claim a historical report is unavailable
   when it exists. This work does not synthesize missing reports or introduce a
   new historical reader. Missing/unavailable state is shown explicitly; never
   substitute latest-card cash for a missing month budget. Zero is valid only
   where the existing complete-state contract proves it.
3. **Historical end balance.** Show a separate month-end card amount only when the
   existing authoritative historical contract supplies a real final-calendar-day
   observation for that month at the selected knowledge/version boundary. Preserve
   its actual date and available time/precision; do not claim a midnight check.
   Respect confirmed same-day ordering/corrections. Without this evidence show
   **"Остаток на конец месяца неизвестен"**, even if another historical or current
   observation is known. A real observed zero is 0, not unknown. A late correction
   cannot silently change a selected immutable report version. No interpolation,
   checkpoint-difference inference or substitution of the latest B is permitted.
4. **Future view.** Only already confirmed money may appear in A/F; expected income
   neither increases the selected budget nor current guidance. Do not show a
   future observed/end balance. Explain that future card cash is unknown. No
   automatic carry, checkpoint, saving, history edit or other financial write on
   selection/navigation, including crossing midnight/month boundaries.
5. **Responsive and accessible copy.** Supply equivalent genuine UTF-8 RU/DE/EN
   labels for selected budget, dated latest observation, non-attribution,
   historical unknown and future uncertainty. Proposed unknown copy: RU as above;
   DE "Kontostand am Monatsende unbekannt"; EN "Month-end card balance unknown".
   At 320px, desktop and 200% zoom preserve labels/dates/explanations without
   clipping or horizontal page scrolling. Semantic headings/reading order put
   the selected budget first for past/future; keyboard month navigation and
   screen-reader announcements identify the selected month and data basis.

Proof slice: HBUX-026–032 (seven planned cases). BR-01/03/04/05/08/10/11 and
ADR0002's observed-date/end-balance/H/K rules, plus ADR0003's current/future
estimate and PAST-no-live-forecast rules remain authoritative. This adds no
normative finance decision, schema requirement or implementation authorization.

## 2. Owner example (synthetic EUR cents)

Nov20: observed B=100000, Nov A=100000. Dec04: actually observed B=80000.
The user's **hypothesis** "40000 left from November, 40000 arrived in December"
is not verified by those checkpoints, and cannot imply Nov30 actual B.

The user chooses FRESH_START, reviews A[Nov]=0,A[Dec]=80000; an existing
Nov-origin unpaid bill of 20000 keeps identity/outstanding/origin while its
current funding moves to Dec. User may voluntarily create two **new** savings:
"Laptop" 15000 and "Buffer" 15000. Then R[Dec]=20000,S[Dec]=30000,
F[Dec]=30000. No second cash bucket or double subtraction; other months stay
zero in this fixture. If those savings preexisted, preserve their exact identities
and amounts, do not recreate them. Do not derive a "Nov leftover" fact.

On Dec10, a new actually observed B=60000 and a separately confirmed PAID
Nov-origin obligation of 20000 yields R[Dec]=0, retained S[Dec]=30000,
F[Dec]=30000; no second 20000 debit from the payment flag. An ordinary bank-only
update with the same 60000 and an **unpaid** obligation preserves R in full.

## 3. Approved restricted same-identity path (Q-HB17-01 option A)

For a FRESH_START/CARRY involving an active old funding identity, the same
atomic command may **not** also edit/pay/partially settle/cancel that obligation
or amend/increase/release that saving. Keep existing disjoint-only composition
and typed `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED` with full transaction rollback,
retained memory draft and a clear explanation. User journey:

1. Review/confirm the new-month transition plus old funding, without an edit to
   any moving identity; one atomic finance update with actual check where required.
2. Afterwards, open "Обновить бюджет" again; independently confirm new actual
   bank check/affirmation and paid/partial/other lifecycle event; the second
   update is separate, not chained automatically or silently. No fake dates or
   hidden interim commits. A repeated observation is only recorded if truly
   confirmed by the user; no fabricated bank check to bypass validation.

If the user drafted payment of the same identity before transition review,
explain the conflict, keep the draft where current memory rules allow, and offer
an explicit two-action user journey. Do not promise cross-reload draft persistence.
Other identity edits may compose atomically according to the existing HB-017
contract, not by loosening event-order guards.

## 4. Technical scope (no source edits authorized yet)

Review Dashboard `src/features/dashboard/{dashboard-screen.tsx,presentation.ts}`
and existing selected-period/history data boundaries for section 1.1; plan changes
to ordering, emphasis, labels and provenance without client finance calculations
or a new financial selection policy. The current card block is prominent for all
modes; a disclaimer alone does not satisfy the required hierarchy.

Review `src/features/budget-updates/{update-budget-screen,presentation}.tsx/ts`
exactly as present; refactor choice copy, navigation and preview only after
mapping current messages, domain transition parsers, aggregate atomic writer,
validation errors and stable canonical payloads. Reuse existing server
`FRESH_START`/`CARRY`/`DEFER`/`REDISTRIBUTE`, HB-017 loader, proposal and
`commitBatch`; React cannot recompute finance. Preserve stale-H/K rejection,
identity completeness, old/future earmarks, per-id funding evidence, audit,
checkpoint/vector anchors, idempotency, resource bounds, Berlin date rules and
post-confirm report impacts. Keep no background financial writes and no
automatic two-commit orchestration. Frontend labels RU/DE/EN must be genuine
UTF-8 and describe the **consequences**, not expose canonical mode tokens or
opaque internal diagnostics as primary content.

### Explicit exclusions

No changes to accepted D36 safe formula, A/R/S/F invariants, schema, core
transition engine, general multi-source CARRY, payment posting, PDF/operations,
new fund-origin ledger, inferred month-end bank observations, or multi-account
support. HB-019's existing broken report-diff/translation correction remains in
HB-019, not this task. HB-020 covers first-run account creation and recurring
templates independently; HB-021 is full browser E2E.

## 5. Implementation plan (proposed, independent review required)

A. Trace UI state machine and all old/new scenarios; explicitly decide when
past-period money/funding forces the additional choice. Produce a screen/copy
contract for each action, no mode silently selected.

B. Build readable preview with before/after actual B/date, full A/R/S/F by
period, effects on old funding, unchanged future allocations, retained savings,
full unpaid obligations, original vs funding month, deficit and D36 current
forecast. Technical raw proof remains server/audit; never hide critical evidence.

C. Route each explicit action through existing HB-017 candidate/preview/confirm
logic, preserving canonical finance contract. Add specific same-identity
instruction/error UX without any second automatic mutation. Keep memory draft,
permission boundaries and unknown-result requestId verification.

D. Add unit/component, isolated local PostgreSQL, RU/DE/EN, mobile/a11y and
manual browser regression evidence. Verify truthful changes only; no Git
publication before owner acceptance.

E. Independently review and implement the section 1.1 Dashboard presentation
slice (five acceptance criteria, HBUX-026–032) after separate authorization.
Use component/browser evidence for hierarchy and existing domain/history
fixtures for provenance; preserve current/past/future financial outputs exactly.

## 6. Review and acceptance gates

- **Domain parity:** `B>=0`, `A>=0`, `sum(A)=B`, `F=A-R-S`, D36
  `T=E[current]+sum(max(A[p],E[p]))`, checked cents and no duplicate R/S.
- **Transition:** FRESH_START only explicit ACTUAL, CARRY ACTUAL/REUSE, DEFER
  unchanged funding, REDISTRIBUTE with acknowledgements, no automatic proposal
  confirmation, untouched future A unless explicitly edited and accepted.
- **Audit:** immutable historical allocations, versions and H/K evidence;
  no inferred bank end balance, spend or income; original identity/due date and
  full outstanding preserved; no lost updates, partial commit or duplicate audit.
- **Restriction:** same identity transfer+lifecycle refuses atomically; two
  subsequent explicit actions succeed with separate validated revisions and
  real checkpoint/affirmation where required. Disjoint identity path unchanged.
- **UI:** real source data + representative 800/200/150/150 scenario; clear
  localization, keyboard/screen-reader labels, mobile 320px and error/focus
  handling. Dashboard CURRENT/PAST/FUTURE hierarchy and dated non-attribution
  satisfy section 1.1 and HBUX-026–032, including unknown vs observed-zero end
  balance and immutable historical versions. Existing HB-019 browser defect
  must be fixed in HB-019 first; its scope is not changed here.
- **Reporting:** Codex implementation later supplies verification commands,
  unit/component/PG fixtures, screen evidence, known limitations, source hashes;
  assistant independently reviews submitted ZIP. Owner acceptance and any
  commit/push/PR/merge/deploy are separate approvals.

## 7. Owner browser QA follow-up — 2026-11-04 (Planned only)

[Single findings register](hb-019-browser-qa-findings-2026-11-04.md):
HB19.1-UX-01–05. Owner observed partial synthetic browser flow; no independent
rerun in this documentation task, no new PASS or implementation permission.
Retain D40–D45, D36/ALL_PERIOD_MAX_V1, accepted H/K/anchor rules and Q-HB17-01
option A. No source/formula/storage/schema/architecture change is approved here.

### 7.1 Overview versus Months (HB19.1-UX-01/02)

Five acceptance criteria: (1) Overview prioritizes current money, Update budget,
D36 safe daily limit, check age and essential aggregates; (2) Months prioritizes
selected period, historical result/version/close plus distinct explicit transition
entry, not a clone with arbitrary extra buttons; (3) closed past history is
primary, latest card dated and secondary as section1.1 specifies; (4) unclosed
unknown and future planning remain honest, with no new financial read-selection
policy or expected cash; (5) shared authoritative financial read models and
RU/DE/EN/mobile/a11y semantics remain consistent, no duplicated formulas/writes.
Proof: existing HBUX-026–032 plus HBUX-033, split into page-purpose and hierarchy
verification runs of at most seven cases each. Immediate closed `/months`
misrepresentation (HB19-UX-06) stays in HB-019; this broader task does not block
HB-019 acceptance as a whole and does not authorize redesign inside HB-019.

### 7.2 Historical update preview and saved result (HB19.1-UX-03/04)

Five acceptance criteria: (1) primary preview explains proposed Oct31 real check
B90000/full AOct90000 and effective date; (2) secondary current November guidance
states its Nov04 B100000 anchor/date, outside the historical-result card; (3)
exact existing projections explain historical pending-report impact and current
head retention **for this fixture**, not a universal promise; (4) one readable
success gives saved check date/amount/allocation month, UUID only diagnostic;
(5) saved-but-reread-failed and unknown-COMMIT states preserve genuine outcome,
original request identity and explicit safe recovery, not a second hidden save.
Proof: HBUX-034/035 plus existing HBUX-019/023. Owner saw 37,03 EUR/day for
current November next to historical900 EUR; this is not evidence of a wrong D36
result. Do not hardcode that rounded value as a new formula or historical limit.
Never infer gross flows from the 100 EUR observation difference or automatically
publish v2. Historical operations that genuinely affect current state still
follow accepted current-state review/anchor rules; inspect real candidate data.

### 7.3 Update and transition journeys (HB19.1-UX-05)

Five acceptance criteria: (1) ordinary same-month action unless unresolved past
funding needs explicit disposition; (2) named, intentional FRESH_START requires
actual bank check/full A/funding/non-carry consent; (3) CARRY ACTUAL/REUSE and
DEFER remain separate explicit alternatives with correct effects; (4) same-identity
funding plus lifecycle still refuses atomically, followed only by two separately
confirmed user actions, never hidden orchestration; (5) voluntary savings,
immutable history, complete reserves/future allocations and no presumed cash-flow
remain intact. Reuse HBUX-001–025 in their existing independent slices; new
HBUX-036 checks screen/action clarity, not a second finance engine.

## 8. Documentation review boundaries and open questions

All Q01–Q07 / HBUX-033–036 additions are Planned / NOT EXECUTED. Existing scenario
results, finance mapping/required guard and verification receipts are untouched.
No normative financial question is reopened. Remaining presentation questions:
grouped-review exact-coverage proof (HB-019 OPEN-01), authentic acceptance-date
availability (OPEN-02), unattributed React error scope (OPEN-03), and independent
screen/copy review before implementation (OPEN-04), all in the findings register.
Do not create another task or change BUSINESS_RULES/ADR/DECISIONS for these UX
questions. Any proven need to change domain/storage or a shared financial contract
must stop for separate owner approval. HB-019.1 remains Planned P0.
