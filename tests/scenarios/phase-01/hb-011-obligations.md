# HB-011 acceptance scenarios — synthetic only

Status: accepted on 2026-11-02 after independent review. All money is bigint EUR cents;
dates are Europe/Berlin. H is inclusive historical date; K is account commit seq.
Base: K1 Oct01 2026 actual B50000/A{Oct:50000}, K2 Oct02 CREATE O20000,
ordinary UNPAID fully reserved, S0, title Synthetic rent, dueDate null. Base
R20000/F30000. Failed requests do not advance K or persist facts/audit/receipt.

## Block 1 — reserve/lifecycle (seven cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-01 | Base H Oct02/K2 | R20000,F30000,B50000 |
| HB11-02 | Alternative possible CREATE reserve=false,K2 | R0,F50000 |
| HB11-03 | HB11-02 AMEND reserve=true Oct03,K3 | H Oct03/K3 R20000,F30000 |
| HB11-04 | HB11-03 reserve=false Oct04,K4 | H Oct04/K4 R0; H Oct03/K4 R20000 |
| HB11-05 | Base submit reservedAmount5000 Oct03 | Reject; H Oct03/K2 R20000 |
| HB11-06 | Base partial5000 + actual B/A45000 Oct05,K3 | outstanding/R15000,F30000,B45000 |
| HB11-07 | After06 PAID15000 + actual B/A30000 Oct06,K4 | outstanding/R0,F30000,B30000 |

## Block 2 — terminal/amount/funding (seven cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-08 | Base CANCELLED Oct03,K3 | outstanding20000,R0,F50000,no payment |
| HB11-09 | After07 new PAID request | Terminal refusal; H Oct07/K4 still PAID |
| HB11-10 | After08 metadata AMEND Oct04 | Terminal refusal; K3 unchanged |
| HB11-11 | After06 AMEND original25000 Oct06,K4 | outstanding20000,R20000,F25000; original5000 rejects |
| HB11-12 | Alternative base B/A10000,O20000 | H Oct02/K2 R20000,F=-10000; no reserve cap |
| HB11-13 | Base CREATE O2=7000 Oct03,K3, same funding | H Oct03/K3 R27000; each identity once |
| HB11-14 | O2 instead fundedNov | H Oct03/K3 R Oct20000/Nov7000; no funding transfer |

## Block 3 — actual bank confirmation (five cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-15 | No C/V; K1 CREATE20000, payment without real check | R20000 readable; payment rejects; A/F unavailable |
| HB11-16 | Base partial5000 plus real Oct05 B42000/full A42000 | K3 outstanding/R15000,F27000; one transaction |
| HB11-17 | Base partial5000, unchanged real B/A50000 | Without acknowledgment reject,K2; with ack K3 R15000,F35000 |
| HB11-18 | HB11-17 source OUTSIDE_TRACKED_CARD | Real confirmation and ack required; source in audit; no card debit |
| HB11-19 | HB11-06/07 | B45000/30000 exactly, not40000/15000; no movement ledger |

## Block 4 — historical payment review (six cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-20a | Base; K3 Oct10 PAID20000 at actual B/A30000. On Oct12 insert historical Oct05 partial5000 at real B/A45000 without correction | HISTORICAL_PAYMENT_CONFLICT; K3 unchanged; H Oct05/K3 R20000; no new checkpoint/event/audit/receipt |
| HB11-20b | Same base; reviewed set historical partial5000 + correction late PAID20000→15000 | Atomic K4; H Oct05/K4 R15000,F30000; H Oct10/K4 R0,B30000; H Oct10/K3 retains PAID20000 evidence |
| HB11-21 | After06 query H Oct04/K3, Oct05/K2, Oct05/K3 | Respectively R20000/20000/15000; K prevents future knowledge |
| HB11-22a | After20b correct partial5000→4000 alone | Conflict; K4 remains, late PAID15000 not rewritten |
| HB11-22b | Reviewed partial4000 + corrected late PAID16000 with same-batch previousChangeKey | K5 H Oct05 R16000,F29000; H Oct10 R0; old K4 R15000 |
| HB11-23 | Base same-day AMEND without placement, then with reviewed after-CREATE neighbors | First refuses; explicit placement K3 succeeds, no fake observation time |

## Block 5 — atomicity/security (seven cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-24 | After06 submit expectedRevision2 | STALE_REVISION; K3 unchanged |
| HB11-25 | Repeat identical successful request after head moves | Original receipt, zero duplicate rows |
| HB11-26 | Same request ID, different title/payment payload | REQUEST_PAYLOAD_CONFLICT |
| HB11-27 | Two real connections submit same base revision, different requests | One winner; other stale; no repeated state change |
| HB11-28 | Payment writer succeeds then audit descriptor/INSERT fails | Entire C/V/event/audit/receipt/counters roll back |
| HB11-29 | Payment plus deferred SQL rejection or post-write rejectBatch | Same complete rollback |
| HB11-30 | Foreign owner/account read/write or existing state ref | No history/receipt disclosure or foreign mutation |

## Block 6 — reports, ranges and dates (four cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-31 | Synthetic Oct v1 H Oct31/K2,R20000. Nov01 payment then historical Oct05 partial + reviewed late correction | Later payment alone leaves pending=false; historical change marks only affected head with audit. v1 bytes/refs/version unchanged; no v2 |
| HB11-32 | HB11-13/14 followed by ordinary actual checkpoint | Same identities/reserves; no new obligation states; duplicate selected identity rejects |
| HB11-33 | B/A/O=9223372036854775807 at K2; another O=1 | MAX succeeds; additional cent overflow rejects whole K3 candidate; MAX+1 input rejects |
| HB11-34 | Oct25 checks 00:30Z/01:30Z, partial5000 in second at B45000; Oct31 23:30Z payment is Nov01 | DST checks ordered by explicit offsets/placement, R15000. H Oct31 remains UNPAID; H Nov01 PAID. HB8/HB10 retain invalid local-time/leap-year tests |

## Block 7 — metadata (five cases)

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-M1 | CREATE title200 Unicode code points, dueDate2027-01-05, fundingNov, effectiveOct02 | Valid; coordinates independent; title201 points rejects |
| HB11-M2 | Base AMEND title/dueDate Nov05 Oct03,K3 | H Oct02/K3 old metadata; H Oct03/K3 new; B/R unchanged |
| HB11-M3 | Metadata AMEND dueDate=null Oct04,K4 | Clears only new state; earlier K/H retains date |
| HB11-M4 | Missing/blank title, number/fractional/overflow cents, invalid date, unknown field | Input refusal; no writes |
| HB11-M5 | PAID/CANCELLED ordinary metadata AMEND | Terminal refusal; action-preserving reviewed correction is separate |

## SQL and evidence mapping

Medium re-review cases use the base state and Oct05 partial5000. Every refusal
preserves SQL row counts (including allocation rows), revision, sequence and head.

| ID | GIVEN / WHEN | THEN |
|---|---|---|
| HB11-Medium-A | OUTSIDE_TRACKED_CARD,B50000→42000,ack=false | PAYMENT_CONFIRMATION_REQUIRED,full rollback,K2 unchanged |
| HB11-Medium-B | Same changed B,ack=true | Same refusal; acknowledgment cannot override unequal B |
| HB11-Medium-C | OUTSIDE_TRACKED_CARD,B50000→50000,ack=true | K3,new real check,B50000,R15000,F35000 |
| HB11-Medium-D | Same unchanged B,ack=false | Refusal,full rollback,K2 unchanged |
| HB11-Medium-E | TRACKED_CARD,B50000→45000,ack=false | K3,B45000,R15000,F30000,no second debit |
| HB11-Medium-F | No bank observation; K1 CREATE20000; external payment plus proposed first B50000,ack=true | Conservative refusal,K1/head null unchanged; no first checkpoint fabricated |

`tests/integration/obligations.test.ts` directly inserts invalid action, missing/
foreign predecessor, mismatched/numeric/extra beforeState, invalid title, position
date, partial reserve, paid remainder, duplicate CREATE, foreign correction and
terminal-bypass rows. UPDATE/DELETE of metadata/history reject. Positive controls
cover correction CREATE and20b/22b same-batch dependencies. Legacy fixture applies
0000–0002, inserts an unnamed event, then proves0003 stops without adding columns
or changing that row. Empty migration/replay uses the full suite.

Pure validation/arithmetic/query-copy tests are in `tests/obligations.test.ts`;
static negative assertions are in `tests/types/hb-011.ts`. Retained HB8/HB9/HB10
tests cover money/calendar boundaries, account lock, audit errors, unknown COMMIT
outcome and checkpoint regression. Grouped cases do not claim one Vitest test per
assertion. Exact executed counts and failures: [verification](../../../docs/planning/hb-011-verification.md).

F-001/F-002 full-reserve/no-double-debit meaning is preserved by06/07/17/19;
F-006 by12, F-007 by08, F-017 by06. HB1-008 and HB2-009/012/013/019/029/030 inform
the H/K/correction assertions. Savings and funding-transition parts remain
HB-012/HB-013 fixtures/specifications, not implemented features. No PDF evidence
or operation classification is inferred from checkpoint differences.
