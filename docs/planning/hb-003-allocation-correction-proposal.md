# HB-003 — proposed correction of actual-money allocations

**Status:** Archived pre-implementation correction analysis,not current policy or a migration requirement. Corrected ADR0001/0002 and final ADR0003 are Accepted after owner-reported independent reviews;HB-001/002/003 Done,Q-HB1-01 resolved for D36..D39. Earlier proposed/pending statements in this archive remain historical. No real legacy financial data/migrations exist;HB-004 remains Planned/not started.

References: [decision history](../DECISIONS.md), [business rules](../BUSINESS_RULES.md), [ADR0001](../adr/0001-checkpoints-and-allocations.md), [ADR0002](../adr/0002-month-closing-and-corrections.md), [ADR0003 draft](../adr/0003-daily-forecast-and-liquidity.md), [correction scenarios](../../tests/scenarios/phase-01/hb-003-allocation-correction.md).

## Historical analysis — finding and provenance

The original requirement was extended incorrectly: splitting receipts/expenditures across financing months and allowing a budget deficit became permission to assign negative shares of a real card balance. A negative free budget was conflated with a negative amount of distributed cash. Sum conservation alone is necessary but insufficient:15000 + (-5000)=10000, yet one month claims15000 of only10000 existing cents.

Local Git evidence (the repository does not contain the original interview transcript; these are document statements, not independently verified quotations from that interview):

| Stage / inspectable revision | Finding |
|---|---|
| Initial specifications, `277b931`, DECISIONS D07 | Describes splitting receipts/expenditures between financial months, with bank date separate. This does not itself require a negative remaining-cash allocation. |
| Same revision, D10 and BR-03 | D10 says current-month budget can be negative; BR-03 explicitly permits negative **free** budget from full reserves. D10's use of budget is ambiguous and is not sufficient authority for A<0. |
| Same revision, BR-05 | Explicitly adds an advance from a future period before income arrives, calling it a negative month allocation. This is the earliest explicit unsupported extension found in tracked history. |
| Same revision, F-004 | Uses20 EUR current and15 EUR already-funded future money for one35 EUR purchase. Valid split funding; the word advance does not require money that does not exist. |
| Same revision, F-005 | Introduces an unreceived-future-income advance and a -15 EUR future balance. It neither identifies enough existing physical money nor distinguishes an explanatory funding label from active cash. |
| HB-001 merge `038240d`, ADR0001 / HB1-004 / HB1-009 | Checkpoint-first replaces movement allocation with complete signed remaining-cash vectors. Examples B8000/Nov9500/Dec-1500 and B9899/Nov9950/Dec-51 pass only the sum test. This entrenches the mistaken interpretation in the Accepted ADR. |
| HB-002 merge `badb4c3`, D28..D31 / ADR0002 | Signed allocations propagate into unrelated-month carry and fresh-start fixtures. The useful intent—preserve history, real obligations and explicit consent—does not require signed cash. |
| Current uncommitted HB-003 proposal | Treats signed vectors as valid input and adds liquidity diagnostics/caps around them. A liquidity warning cannot make such a distribution valid under the corrected requirement. |

Commands used: `git log --reverse --oneline -- docs/DECISIONS.md docs/BUSINESS_RULES.md tests/scenarios/phase-01/core-rules.md`, `git show 277b931:docs/BUSINESS_RULES.md`, `git show 038240d^:docs/DECISIONS.md`, `git show 038240d^:tests/scenarios/phase-01/core-rules.md`, `git show 038240d:docs/adr/0001-checkpoints-and-allocations.md`. Git preserves earlier source text even when amendments are later approved.

## Five distinct concepts

| Concept | Meaning and allowed sign | Effect on confirmed cash |
|---|---|---|
| Actual allocation A[p] | Nonnegative share of a confirmed physically existing balance, including cash assigned to future months | Complete vector sums exactly to B; no month can claim more than B |
| Free F[p] and deficit | A minus full unpaid reserves R and voluntary savings S; F may be negative | No bank debit; no partial reserve or automatic savings release |
| Historical overspend | A past comparison with an agreed budget/baseline, if evidence and definition exist | Not new available money or automatically a debt/reserve; no new entity/formula chosen here |
| Optional explanatory operations | Signed receipts/payments with optional signed funding details; bank date and financing month stay separate | Explain evidence; never post again to B/A, never mandatory for an update |
| Expected, unreceived income | An expectation, not an observed cash resource | Excluded from B, A, free and confirmed daily preview; no planning-income feature is introduced |

An old negative A is a recorded state under the old specification, not proof of actual overspend. Differences between allocations and checkpoints also do not prove overspend, expenses or income. A known historical negative F can be displayed as the historical full-earmark deficit, without inventing a purchase ledger or carrying that scalar again as a liability.

## Minimal corrected model

For the ordinary existing-money domain B>=0, using one complete confirmed vector and one coherent set of funding revisions:

```text
B = actual observed card balance
A[p] >= 0 for every period p
sum_p A[p] = B
R[p] >= 0 = full remaining unpaid obligations funded by p
S[p] >= 0 = retained voluntary savings funded by p
F[p] = A[p] - R[p] - S[p]
deficit[p] = max(0, -F[p])
daily[p] = floor(max(0,F[p]) / calendarDays[p])
sum_p F[p] = B - sum_p R[p] - sum_p S[p]
0 <= A[p] <= B; max(0,F[p]) <= A[p] <= B
```

The new constraint is on A, not on R+S or F. Full earmarks can exceed A and B: B10000,A[Nov]10000,R[Nov]20000,S0 yields F=-10000,deficit10000,daily0. A negative A is invalid even if the vector sums correctly; the proposal returns NEGATIVE_CASH_ALLOCATION before producing a guideline. Integer cents, checked arithmetic, Berlin inclusive current days and full future-month days are unchanged.

At B10000,the owner may explicitly confirm Nov10000/Dec0 or Nov5000/Dec5000. These are alternative examples, not automatic repairs of Nov15000/Dec-5000. Do not clamp, normalize or choose a month to absorb a correction. A same-bank reallocation transfers existing cash between nonnegative shares with explicit confirmation.

Expected income never enters this vector. When a later ACTUAL_CHECK confirms B60000, the user may confirm Nov10000/Dec50000 without a separate receipt record. This does not prove50000 gross income; operations remain optional. A35 EUR purchase can be explained as20 current/15 already-funded future money; confirm the actual reduced B and a new nonnegative full vector once. If only5 EUR exists, a20 EUR card purchase cannot be financed by an expected future receipt; missing other cash/overdraft facts cannot be invented.

Actual negative bank balance is a separate boundary: preserving an authentic signed bank observation is not permission to invent nonnegative shares summing to a negative number. Whether overdrafts are in scope and how to represent their distributable cash/debt requires an owner decision if needed. This proposal defines no B<0 allocation algorithm, never replaces a real negative observation with0, and never infers that credit is available. Mark the forecast as outside the approved ordinary allocation domain pending that decision; do not confuse this with rejecting a negative F.

## CARRY, FRESH_START and immutable history

Ordinary CARRY remains: for nonnegative source s and current t, A'[s]=0,A'[t]=A[t]+A[s],all other A unchanged; move every full R/S funding association once with consent. Negative source **free** does not prohibit this. Example B10000,old A10000,R20000,S0,target A0 → target A10000,R20000,F=-10000,daily0. No reserve release, extra debit or signed transfer of a deficit scalar.

Fresh actual B/full vector and ordinary CARRY may still commit together. Reused-bank transfer retains the original bank date; a real same-amount check creates a new observation. DEFER still preserves reviewed valid allocations/funding without moving old cash automatically. Multiple-source CARRY remains an independent Q-HB2-02 review gate; this correction does not approve a generalized algorithm.

FRESH_START's core behavior survives: explicit nondefault choice; one fresh actual observation and complete nonnegative vector; old active allocations reset with consent; all full unpaid obligations/savings preserved and funding reviewed once; skipped months need no invented checks or serial closes. Historical deficits are not automatically debited again. No automatic clearing of real obligations or release of savings.

The earlier Nov-5000/Dec15000 at B10000 example must no longer be a valid newly created state. Retain it as a **legacy specification fixture** when testing historical compatibility. At fresh Jan5 B8000 and explicitly confirmed A={Jan:8000},F=8000 (no earmarks),q296,r8 over27 days. With existing R9000/S2000 fundedJan,F=-3000,deficit3000,q0. This does not decide how a separate future overspend feature would carry anything.

Legacy handling must be explicit: preserve original checkpoint, vector, event and report bytes/revision references/selection version; display that the signed vector used an earlier interpretation. Do not silently clip negatives, redistribute surplus, rewrite a report or call a negative old allocation verified expenditure. Historical reads remain possible under their original contract and are not revalidated as new valid cash distributions. A new active corrected vector requires reviewed confirmation; an audit links the before/after revisions and model interpretation. No schema/migration or automatic conversion is selected here.

If an untouched legacy future allocation is negative or old positive future claims exceed the new actual B, an ordinary unchanged-state CARRY cannot simply bless it as valid cash. The exact migration/repair UX is an open decision. Keep history readable and explicit fresh-state confirmation available; do not silently retain a newly invalid vector, choose replacement amounts, or default to FRESH_START. Existing positive future allocations may be retained only if the reviewed final vector is nonnegative and sums to the fresh B; explicit future edits require consent. A validation rejection is not a cash movement.

Closing/correction remains ADR0002's two-cut,immutable-version contract. A later semantic amendment is not evidence that an old bank balance/date was different. It must not automatically issue corrected reports or replace v1. Any later expressly requested correction retains original versions, reason and provenance; missing month-end observations stay unknown.

## HB-003 meanings and contracts

| Field / contract | Required proposed correction |
|---|---|
| allocated | Nonnegative confirmed remaining cash for the selected period, not a signed planning position or expected income |
| free | Keep signed A-R-S; describe as derived unearmarked budget, not a newly observed bank figure |
| deficit | Keep max(0,-free); do not reuse it as historical spending, debt or an amount automatically carried/debited |
| ActiveSnapshot / Allocation.amount | Proposed NonNegativeCents refinement for allocation amounts, checked at boundary; raw signed Money remains valid for balances/history/operation detail and derived F |
| ForecastErrorCode | Add NEGATIVE_CASH_ALLOCATION for new confirmed-state inputs; preserve distinct SUM_MISMATCH, range and earmark errors |
| Legacy snapshot | Separate tagged input/read path from corrected active cash snapshots; no trusted daily result from silently reusing signed legacy A. Exact migration UI is pending. |
| Future preview | Keep whole-month divisor and signed F deficit; only actually allocated cash minus full R/S, never expected income |
| Historical overspend | No automatic addition to this DTO or subtraction from F; new representation requires definition/approval |
| Negative B | Separate unresolved overdraft-domain state, not the previous blanket permission for signed A/F/B |

The base daily formula does not change. The motivating case B10000/Nov15000/Dec-5000 becomes invalid input, not a liquidity-warning example. Candidate cap C01/C04/C08 and the negative-vector part of C07 cannot remain candidate acceptance cases for ordinary confirmed state.

However, cross-period underfunding and stale observations remain real concerns. At B10000,A={Nov:10000,Dec:0},R[Dec]=20000,S0,Nov F10000,q3333 over3 days while global earmarks exceed B by10000. The owner's clarification does not choose a reserve-priority policy for that situation. ADR0003's protection L=B-E[current]-sum(max(A[p],E[p])) for p!=current remains an **unapproved** candidate even with A>=0. If every other A[p]>=E[p],then L=F[current]; otherwise the candidate is lower. No cash-allocation cap is needed to legalize negative A, but cross-period reserve warnings/presentation still require review. Do not delete Q-HB1-01 wholesale or declare the capped variant approved/unnecessary in all cases.

## Scenario impact register

Original scenarios remain untouched. The following is a proposed correction list, not silent replacement of acceptance history.

| Original IDs | Classification and concrete proposed amendment |
|---|---|
| F-004; HB1-003 | Keep numeric behavior: both months already hold actual cash. Rename advance wording to split funding from existing cash; optional signed operation rows remain non-posting. |
| F-005 | Contradicts ordinary cash model. Replace future negative-allocation expectation with rejection or a fully specified existing-cash purchase; preserve former example as history only. Do not invent an overspend account. |
| HB1-004 | Reject new B8000/9500/-1500 vector; later nonnegative128000/9500/118500 is arithmetically admissible on its own,not proof of an automatic advance adjustment. |
| HB1-009 | Reject9899/9950/-51 despite matching sum. Retain1-cent/sum/range/no-double-debit tests with explicit valid vector such as Nov9900/Dec0 at B9900; do not silently repair the original9899 input. |
| HB1-020 | Preserve initial complete-vector checks; replace the final newly accepted75000/76000/-1000 redistribution with NEGATIVE_CASH_ALLOCATION. |
| HB2-017/025/037 | Newly valid signed source/target/unrelated-month expectations contradict the requirement. Recast as rejected new distributions or explicit legacy inputs; preserve ordinary positive-cash carry in separate fixtures. |
| HB2-038 | Based on037's invalid new-state premise. Keep omission/stale/payload failure tests using nonnegative months; evaluate legacy repair separately. |
| HB2-039/040/041/042/043/044/046 | Inherit or contain signed historical initial vectors. Stop presenting those as valid newly created allocations. Preserve old values as legacy regression fixtures; retain FRESH_START results,full earmarks,unknown ends,no auto mode and immutable-history assertions. |
| HB2-016/031..036/045 | Nonnegative fixtures remain valid; multi-source gate,ordinary carry,new equal check,DEFER,rollback/idempotency remain. |
| HB3-010/030 | Replace negative-A initial validity/oracles; retain later valid cash-state preview and no repeated optional-detail posting. |
| HB3-017/018/033 | Recast initial signed allocations as legacy-history fixtures; retain fresh actual Jan results and preserved full reserves. Rework signed-CARRY gate assertions; keep multiple-source policy separate. |
| HB3-032 | Signed negative bank/allocation validity assertion is outside corrected ordinary domain; separate negative-F tests from unresolved overdraft scope. |
| HB3-C01/C04/C08; C07's C01 branch | Invalid signed allocations cannot be candidate liquidity displays; make new-input rejection cases. Keep C07's absence/age behavior using a valid cash vector. |
| HB3-C02/C03/C05/C06; HB3-007/011/019/020/021/027 | Keep full-earmark deficits,overlap protection as unapproved policy,explicit lifecycle and exact zero cases; A is nonnegative. |

HB2-040's legacy historical F/labels also require historical-model provenance; a source vector's old A=-5000 is not a newly certified physical cash amount or evidence-backed overspend. Scenario evidence from prior revisions remains recorded as historical arithmetic/document checks,not proof that invalid signed inputs meet the clarified requirement.

## Required document amendments after review

| Target | Concrete proposed edits; not applied to Accepted ADRs here |
|---|---|
| ADR0001: Primary model; Negative budgets; forecast edge; invariants5/6 | Replace signed A with nonnegative A and exact sum; add per-row rejection even with matching total. Keep signed F and optional operation details. Retire negative-allocation advance example as valid state; replace with reserve-induced deficit and already-funded split purchase. Reframe liquidity issue around cross-period earmark shortage/staleness. Append amendment/provenance rather than erase acceptance history. |
| ADR0002: acceptance scope; Fresh start; transfer eligibility; negative/month table; invariants | Separate legacy signed states from new actual-cash vectors; retain immutable cuts,report versions,FRESH_START consent/full funding and ordinary CARRY. Remove blanket valid untouched-negative-new-month exception; retain no silent legacy repair. Distinguish negative F from negative A and keep multiple-source gate. Version new interpretation without rewriting earlier snapshots. |
| DECISIONS D07/D10/D22/D28..D31 | Append latest owner clarification identifying incorrect earlier extension. Explain D07 operation splits,D10 free deficit,D22 non-posting detail. Annotate signed D28/D30 examples as legacy documentation,retain their chronology and unaffected consent/history intent. Do not rewrite earlier owner statements as if they already used the corrected terms. |
| BUSINESS_RULES vocabulary; BR-04/05/11 | Nonnegative actual allocations,sum=B; signed free/full R/S deficits; no unreceived-income resources; invalid signed new vectors. Preserve optional updates,deferral,history and no automatic deficit payment/reset. |
| PRD definitions; UC-03/05/06; UX update/months | Replace negative actual-cash editing/advance claims with existing-cash reallocation; separate deficit and legacy history; confirm only real receipt after checkpoint,no required income operation. |
| DATA_MODEL period_allocations/invariants | Proposed amount>=0 for corrected-model new vectors; keep signed financial primitives for F/operations/legacy. Do not add a global constraint that destroys or makes legacy history unreadable; final version/migration representation requires review. |
| ARCHITECTURE and architecture.json | Replace preserved-signed-new-month policy labels with nonnegative new-state validity and explicit legacy boundary. Keep seven layers,atomicity and actual-check rules. Do not change machine metadata before agreeing the amendment scope. |
| ADR0003/types and HB3 scenarios | Tighten allocation preconditions/errors; retain F/deficit/calendar formulas; quarantine invalid signed fixtures and reconsider candidate liquidity examples using valid A. Record earlier verification as arithmetic of the earlier draft only. |
| TASKS/IMPLEMENTATION_PLAN/CODEX_WORKFLOW/ADR index and cross-references | Link amendment and invalidate reliance on old signed-input validity for new work. Keep HB-003 Review/ADR0003 Proposed;do not silently reopen/recomplete HB-001/002 or start HB-004. |

## Decisions genuinely still open

1. Does the product need a distinct historical-overspend feature? If so,what is the baseline/evidence,what is displayed,and does it affect later planning? Possible descriptive reporting versus explicit planning adjustment must be compared later; no mandatory ledger/debt/carry scalar is chosen here. Legacy negative A alone cannot populate it.
2. How should a user explicitly replace a legacy signed active vector,including untouched negative future rows or positive claims above today's B? Preserve originals and require final consent; choose migration/versioning/repair presentation separately. This is not permission to create new negative allocations.
3. Are real negative card observations/overdrafts in scope? If yes,define distributable cash and debt treatment separately;never distribute unreceived income or fabricate0 balances.
4. For valid nonnegative A with obligations elsewhere exceeding their allocations,which warnings/protection policy should HB-003 display? Exact stale-data display and reminder boundary also remain open.

No new decision is needed to forbid negative new actual-money allocations,retain negative free/full reserves,exclude expected income or keep checkpoint-first/no mandatory receipt operation:the owner has already clarified these. Ordinary consented CARRY and FRESH_START's core intent do not require a new overspend accounting mechanism.

## Verification and handoff

Verification evidence is recorded in the [new scenario document](../../tests/scenarios/phase-01/hb-003-allocation-correction.md). This proposal does not change accepted ADR contents or historical scenario files. Header notices on the HB-003 draft identify which earlier assertions are under correction,without removing their text or original evidence. No runtime implementation,commits,push or PR. Independent review and owner decisions on the limited open questions remain pending.
