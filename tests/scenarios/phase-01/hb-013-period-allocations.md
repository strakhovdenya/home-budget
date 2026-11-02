# HB-013 acceptance and executable proof mapping

Synthetic integer EUR cents only; Europe/Berlin. Authority: owner-approved plan,
two independent plan reviews and implementation authorization; BR-01/02/03/05/07/
08/10/11 and Accepted ADR0001–0003. A>=0,sum(A)=B>=0; F=A-R-S may be negative.
This specification is not itself a passing test claim. Actual commands/counts are
in [verification](../../../docs/planning/hb-013-verification.md).

## Exact fixtures and storage assertions

PG clock is checked against2026-11-02; no server time is overridden. A later run
must review the fixed current-month fixtures rather than silently bypass the guard.
R fixture: actual2026-10-01 B89000,A Oct40000/Nov48000/Dec1000;
O CREATE Oct02 original/outstanding30000 fundedOct; S CREATE Oct03 amount5000
fundedOct. R Oct30000,S Oct5000,F Oct5000/Nov48000/Dec1000. Ordinary transition
effectiveNov02 carries to A Nov88000/Dec1000,R Nov30000,S Nov5000,F Nov53000/Dec1000.
HOct31 selects old revisions at both old/new K; HNov02/newK selects new full states.
REUSE retains the original checkpoint ID/count/date. ACTUAL creates exactly one
new observation and one final vector, including an equal-balance real observation.

F fixture: actualSep20 B10000,A Sep4000/Oct4000/Dec2000. Obligations Sep3000,
Oct1000,Nov500; savings Sep500,Nov200,Dec700, each created on distinct Sep21..26
positions. Initial F Sep500/Oct3000/Nov-700/Dec1300. Nov02 actual9000 fresh start
preserves Dec2000: A Nov7000/Dec2000,R Nov4500,S Nov700/Dec700,F Nov1800/Dec1300.
Only old O1/O2/S1 receive funding events; target/future identities remain exact.
Explicit Dec2000->1000 gives A Nov8000/Dec1000,F Nov2800/Dec300. Actual1500 with
untouched Dec2000 refuses atomically; reviewed Dec1000 permits Nov500,FNov-4700.

All refusals compare complete rows of all18 scoped tables plus account pointers,
revision/recordedSeq and flags. Prepare may append only immutable proposal and
calendar-period control records; cancellation only its control fact. Neither
increments financial counters or creates a financial receipt. Replay writes nothing.
Valid transitions append checkpoint iff actual, one vector, one decision, a transfer
iff CARRY, one funding revision per affected identity, full state/funding audit,
ordering and one receipt/counter increment. All other facts and old closings remain
unchanged. Audit/SQL failure rolls back the entire candidate.

## Mapping conventions

U=tests/transitions.test.ts and tests/transition-boundary.test.ts.
PG=tests/integration/transitions.test.ts. Retained HB9/HB10/HB11/HB12 tests execute
under the same full-suite command; reuse is explicit below, not a new duplicate test.
Grouped assertions do not imply one Vitest test for every scenario ID.

| Scenarios | Executable assertion area |
|---|---|
| T01–T04 | Retained HB10 complete initial/changed/equal checkpoints; PG combined equal/changed; PG redistribution |
| T05–T07 | U input/cash policy, retained HB10 V03 and direct SQL DB06/07 |
| T08–T12 | U F-004/F-015 pure nonposting detail; retained checkpoint future vectors; expected income has no supported posting field |
| T13–T16 | PG full CARRY exact target88000/future1000, O30000/S5000 |
| T17–T18 | U signed F/full earmarks; PG zero-cash carry |
| T19–T21 | PG unchanged checkpoint/date and one actual C/V at equal/changed B |
| T22–T23 | U multiple missed periods; PG F past Sep/Oct into November without intermediate checks |
| T24–T27 | PG F full old/target/future identities, earmark-only A0 and insufficient actual cash |
| T28 | PG explicit DEFER, unchanged O/S, no transfer |
| T29–T30 | PG prepare/preview control-only; cancellation terminal unchanged financial state |
| T31–T32 | PG stale aggregate and aged Berlin target without account changes |
| T33–T36 | PG exact/same-key/adversarial replay and real two-connection lock barriers |
| T37–T38 | PG OWNER_POLICY_REQUIRED zero writes; FRESH_START several old periods succeeds |
| T39–T41 | PG old/new H/K, full historical funding and co-located distinct identities; retained ordering tests |
| T42–T43 | PG incompatible later obligation suffix; supported boundary typed refusal, no joint-correction rebase |
| T44–T45 | PG original closing bytes/pinned K untouched, targeted historical correction flag/no v2 |
| T46–T47 | Boundary unauthorized/storage guard, PG foreign replay, audit/SQL/report failure rollback |
| T48–T49 | PG parameterized direct SQL bypass of runtime validators: both event streams and terminal outcome guards |
| T50 | Retained HB8 calendar/HB10 DST, microseconds and year/period tests; U planner receives injected period |
| T51–T53 | U amount-preserving lifecycle, PG immutable histories/one selected state, duplicate funding SQL refusal |
| T54–T55 | Existing checkpoint path plus pure nonposting details; no operation/category input or posting table exists |
| T56 | U terminal funding refusals; retained HB11/HB12 terminal SQL guards preserved by0005 |
| T57 | Entire retained HB9–HB12 integration suites |
| T58–T59 | PG cancel/confirm lock race and actual COMMIT acknowledgement loss |
| T60–T63 | PG zero cash/full earmarks; U one cent, bounded oversized graph and checked overflow |
| T64–T65 | PG missing funding evidence refuses reads; ordinary title/payment works after transfer |
| T66 | Existing HB12 original-pending drift regression plus final-candidate report coordinator validation |
| T67–T68 | PG SQL duplicate per-identity decision and exact prepare preview with no financial writes |

## Re-review scenarios

PG-R01/R03: allocation-only converts old cash into current without changing any
O/S revision. Missing unchanged-funding acknowledgment refuses. Old F becomes
-35000 while current F88000; safe oracle53000 protects all old35000 plus future1000.
The owner90000/30000 example is retained in the implementation contract: safe60000.
PG-R02: rollover intent/funding is not accepted through an allocation-only command;
exact parser/consent and funding-review guards refuse. PG-R04: CARRY moves funding
with its own decision and full state proof.

PG-F01/F02/F03/F04/F05/F06: F fixture above exercises preserved future A, explicit
future edit, refused silent sweep, insufficient preserved cash, explicit remedy,
and existing target1000 not added again. State/amount/history assertions include
the existing current/future earmarks.

PG-P01/P02/P03: same request replay, changed same-key payload conflict, new request
exact semantic replay; no additional audit/counters/receipt. PG-P04..P08 mutate one
amount, funding before ref, after draft ref, consent, observation, ordering/base or
reason under the same proposalId; all refuse PROPOSAL_ALREADY_CONFIRMED.
PG-P09 foreign scope discloses no receipt. PG-P10 corrupted original mapping,
funding evidence or receipt refuses STORAGE_ERROR. PG-P11/P12 cancellation is
terminal/idempotent with its own key/document and one immutable control row.
PG-P13/P14 prove concurrent cancellation/confirmation and repeated confirmation
with PostgreSQL lock waiting, one financial/control winner and no duplicate effects.
PG-P15 keeps confirmed replay independent of today's target month by checking
original immutable confirmation before new-action calendar validation; current
month change is also independently tested by the stale-target scenario.

## Explicit exclusions

No forecast API, UI wizard, closing/version creator, persisted operation/PDF,
overdraft, multi-source CARRY or same-identity payment/release+funding compound.
Unsupported joint corrections and oversized sets reject completely. No truncation,
automatic savings release, partial reserve, synthetic bank observation or inferred
income/expense is accepted.
