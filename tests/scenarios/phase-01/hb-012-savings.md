# HB-012 savings acceptance scenarios

Synthetic EUR cents only. Calendar Europe/Berlin. Authority: BR-01/02/05/07/08/10/11,
Accepted ADR0001–0003, owner-approved HB-012 plan/evidence/ordering clarifications.
Contract: [HB-012](../../../docs/planning/hb-012-savings.md).
Execution evidence: [verification](../../../docs/planning/hb-012-verification.md).

GIVEN default independent fixture: actual C/V Oct01 2026 B=A[Oct]=40000,
s CREATE5000 on Oct02, origin/funding October. R=20000 in F arithmetic or an
explicitly created obligation; it is not an inferred bank debit. Unlisted periods
are zero. Commands normally Oct03; larger dates are explicit. H end-of-day, K is
inclusive committed sequence. No fixture relies on real financial data.

Table shorthand W = one budget_update/receipt, savings revision and SAVINGS_STATE
audit, account counters+1, plus position/order if new; G = identity and any missing
period; C = actual checkpoint/complete vector/allocations and bank head; P = affected
report pending flag/audit only; NONE = all tables, counters, heads and flags unchanged.
Every W without C preserves bank rows/head/date and obligation facts. Original
month_closings are immutable in every case. Rejection assertions compare full rows
of all17 scoped tables plus the account row, not counts alone.

## Lifecycle and cash isolation (S01–S07)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S01 | No saving; Oct02 CREATE5000 | ACTIVE5000,S5000,F15000 | W+G; unit/PG |
| S02 | s5000; Oct03 INCREASE3000 | ACTIVE8000,F12000 | W; unit/PG |
| S03 | s8000; Oct04 release2000 | ACTIVE6000,F14000 | W; unit/PG |
| S04 | s6000; Oct05 FULL_RELEASE6000 | RELEASED0,F20000, same identity | W; unit/PG |
| S05 | RELEASED0; Oct06 release | TERMINAL_SAVING | NONE; unit/PG |
| S06 | s6000; release7000 | RELEASE_AMOUNT_EXCEEDS_SAVING | NONE; unit/PG |
| S07 | s6000; release0/-1; CREATE0 | INVALID_SAVING; no zero ACTIVE | NONE; unit/PG |

## Voluntary amounts and deficit (S08–S14)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S08 | CREATE5000 then INCREASE3000 | B/A40000; S8000, no debit | W+G then W; unit/PG |
| S09 | default; release2000 | B40000,S3000,F17000, no credit | W; unit/PG |
| S10 | F-008 explicit savings-only release2000 | One revision, same s, C/V/date unchanged; R20000 | W; PG |
| S11 | A10000,R0,S15000 | F-5000; S not capped | selection NONE; unit |
| S12 | A10000,R8000,S5000 | F-3000 valid, no automatic release | NONE; unit |
| S13 | same state; read proposal | proposed3000,S5000,F-3000 unchanged | NONE; unit |
| S14 | explicitly release proposed3000 | S2000,F0,B/A10000 unchanged | W; unit/PG lifecycle |

## Identities and independent streams (S15–S21)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S15 | Decline/open proposal | No financial action, S5000 remains | NONE; unit |
| S16 | s1=5000,s2=3000 fundingOct | S8000; separate identity refs | reads NONE; unit |
| S17 | those plus s3=7000 fundingDec | SOct8000,SDec7000 independently | reads NONE; unit |
| S18 | s CREATE5000 then INCREASE3000 | selected S8000, not13000; duplicate selected identity rejects | reads NONE; unit/PG |
| S19 | B40000,R20000,S5000; AMEND obligation original25000 | R25000,S5000,F10000, savings revision unchanged | obligation batch only; PG |
| S20 | s5000; actual B/A1000 Oct04 | S5000 retained despite underfunding | C/batch/audit; PG |
| S21 | title AMEND Oct03 | S5000, original C/V/date unchanged | W; PG |

## History and corrections (S22–S28)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S22 | Actual unchanged B40000 + release2000 Oct03 | One new C/V and one savings revision, common position; S3000 | W+C; PG |
| S23 | CREATE then later release, distinct K | Earlier H/K select original amount; later H/newK select release state | read NONE; unit/PG |
| S24 | CREATE5000 Oct02, release2000→after3000 Oct20; insert increase3000 Oct10 alone | HISTORICAL_SAVINGS_CONFLICT, no rebase | NONE; PG |
| S25 | CREATE6000, release5000→after1000; correct CREATE4000 | Incompatible suffix refuses; confirmed5000 preserved | NONE; PG |
| S26 | Reviewed Oct10 increase3000 plus Oct20 release correction | before8000, confirmed release2000, after6000; TWO savings audits | W with2 revisions/2 savings audits/1 new position; PG |
| S27 | Oct02 obligation position then savings position after bank Oct01 | Before savings position S0; after S5000/R20000; order explicit | preparation batches, reads NONE; PG |
| S28 | CREATE5000 correction6000, no later saving | same identity/logical fact; oldK5000,newK6000 | W without G/new position; PG |

S26 exact rC/rL/rI/rLC references and all nine H/K assertions are in the contract
and executable test. The original rL and its entire original audit are compared
before/after. Changing confirmed release2000 implicitly is forbidden.

## Conflict, transaction and authorization (S29–S35)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S29 | Wrong identity predecessor/correction or terminal bypass | Runtime/SQL refusal | NONE; PG |
| S30 | New request with stale aggregate revision | STALE_REVISION | NONE; PG |
| S31 | Repeat original successful request/payload | exact receipt replay before stale, no duplicate revision/audit | NONE on retry; PG |
| S32 | same key, different amount | REQUEST_PAYLOAD_CONFLICT | NONE; PG |
| S33 | two real concurrent release4000 from5000, same expected revision | one success,S1000; one STALE_REVISION | one W; PG |
| S34 | co-located release/checkpoint then actual audit INSERT failure | TRANSACTION_FAILED; all facts/head/receipt rollback | NONE; PG |
| S35 | direct SQL invalid position date, deferred constraint at commit | TRANSACTION_FAILED, all rows/counters restored | NONE; PG |

## Reports, limits and future boundary (S36–S41)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S36 | foreign owner/account/identity refs | safe forbidden/scoped refusal | NONE; PG |
| S37 | October v1 S5000; release Nov01 | October snapshot/manifest/cutoff unchanged, no October pending | W; PG |
| S38 | correct October CREATE6000 plus reviewed Nov release suffix | October pending; unrelated September head stays false; no auto-v2 | W+P; PG |
| S39 | missing/wrong savingsRevisionIds or unexplained unflagged drift | REPORT_IMPACT_REVIEW_REQUIRED and full rollback | NONE; PG |
| S40 | MAX saving then INCREASE1 or additional identity1 | MONEY_RANGE, full amount not capped; total across periods checked | NONE on overflow; unit/PG |
| S41 | Oct25 00:30Z/01:30Z; Oct31 23:30Z actual check | Oct25 instants distinct; last maps Nov01; H Oct31 excludes rename, funding unchanged | explicit W+C; PG plus retained calendar tests |

## Calendar persistence (S42–S43)

| ID | GIVEN / WHEN | THEN | Storage / proof |
|---|---|---|---|
| S42 | origin/fundingOct,s5000; Nov01 read | same identity/funding/amount, no new event | NONE; unit/PG |
| S43 | Attempt funding AMEND/CARRY/FRESH_START through saving contract | INVALID_SAVING; full state retains origin/funding for future HB-013 | NONE; unit; calendar PG |

HB1-015/HB2-010/HB2-029 transfer semantics remain future HB-013 compatibility
requirements, not implemented transfer commands or claimed passing end-to-end flows.

## Evidence cases (E01–E10)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| E01 | PARTIAL_RELEASE5000→3000, confirmed2000 | exact revision/batch/snapshots readable |
| E02 | FULL_RELEASE6000→0, confirmed6000 | RELEASED0 with exact evidence |
| E03 | direct SQL missing audit for PARTIAL/FULL | reader and subsequent writer HISTORICAL_SAVINGS_CONFLICT |
| E04 | direct SQL confirmed1999 inconsistent with state | typed refusal; never infer2000 |
| E05 | wrong revision/batch/recordedSeq/scope/predecessor/snapshot | typed refusal for both release actions |
| E06 | absent, number, fractional/noncanonical amount or duplicate evidence | typed refusal for both release actions |
| E07 | write over E03–E06 history | every scoped table/account equals baseline after refusal |
| E08 | S26 increase alone | full rollback, original release evidence2000 intact |
| E09 | complete reviewed S26 | exact nine H/K cuts; two new savings audits; original audit unchanged |
| E10 | direct UPDATE/DELETE event/audit | SQL immutable refusal; original rows retained |

E03–E07 use parameterized direct SQL, bypassing saving validators. SQL accepts
missing evidence deliberately: tests prove runtime read/write refusal, not an
invented SQL audit guarantee. INCREASE missing evidence additionally refuses,
while old K remains readable. All evidence fixtures are synthetic.

## Ordering cases (O01–O08)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| O01 | new Oct10 increase + existing Oct20 correction in one batch | strict date order, same batch predecessor accepted |
| O02 | two NEW positions on Oct03 in one batch | ORDERING_CONFLICT; full rollback |
| O03 | correct existing CREATE and INCREASE on same Oct02 | retained positions reused, no new position |
| O04 | predecessor later than candidate position | ORDERING_CONFLICT; no UUID/INSERT inference |
| O05 | same-day corrected predecessor before corrected successor in validated manifest | SQL/runtime accept, shared budgetUpdateId |
| O06 | actual checkpoint/vector/savings co-located | one position/batch; revision and recordedSeq+1 once |
| O07 | O06 plus second new position that day | entire bank/vector/savings batch rolls back |
| O08 | two dependent lifecycle states at identical position | pure candidate refuses; no within-position pseudo-order |

Each unit/PG scenario group has at most seven acceptance rows. Supporting negative
SQL controls also cover blank/overlong title, unknown action, wrong before-state,
ACTIVE0, RELEASEDpositive, amount change through AMEND, wrong direction/funding,
duplicate original CREATE, wrong identity and terminal bypass. Migration tests
cover full-chain/replay and legacy refusal without title backfill.
