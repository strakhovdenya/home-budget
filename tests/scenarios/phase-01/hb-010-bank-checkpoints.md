# HB-010 — actual checks, historical positions and optional interval evidence

Status: implementation scenarios; independent review/owner acceptance pending.
All amounts are synthetic EUR cents. Calendar Europe/Berlin; explicit pure-test
clock 2026-11-02T12:00:00Z. Database tests use actual server recording time with
past October/September observations. [Contract](../../../docs/planning/hb-010-bank-checkpoints.md).
F-010 dates are shifted to October to keep fixtures past on the verification date.
No UI, operation persistence, transfers, lifecycle command or closing engine is claimed.

## Complete cash and calendar validation

- **HB10-V01** GIVEN empty account. WHEN B=10000 on 2026-10-05, A[Oct]=6000,
  A[Dec]=4000 confirmed. THEN one actual C/V at the same position/date, exact sum,
  future A distinct, no operation/inferred income/debit; audit/receipt/counters atomic.
- **HB10-V02** GIVEN empty account. WHEN B=0/A=[] or B=MAX_CENTS/A[Oct]=MAX_CENTS.
  THEN exact stored/returned bigint, observed zero differs from no observation.
- **HB10-V03** GIVEN empty account. WHEN B=-1, B=MAX+1, number money, negative A,
  sum 49999/50001 against B50000, duplicate Oct, or [MAX,1] allocations.
  THEN typed rejection, no committed request/facts/audit/counters/period rows.
- **HB10-V04** GIVEN valid request. WHEN caller mutates balance/array during async
  authorization, or supplies getters/sparse arrays/unknown actor. THEN saved hash
  and execution use the immutable captured command; unsafe structure rejects.
- **HB10-T01** GIVEN Gregorian date parsing. WHEN 0001-01-01,0099-12-31,1600-02-29,
  2028-02-29,9999-12-31 parsed. THEN accepted; 2026/1900 Feb29 and year0000 reject.
  Future observation rejects in confirmation; year9999 parsing is not a future write.
- **HB10-T02** GIVEN Berlin DST spring/autumn. WHEN explicit UTC/offset instants
  2026-03-29T00:30Z/01:30Z and 2026-10-25T02:30+02:00/+01:00 supplied.
  THEN correct civil dates; autumn occurrences distinct; no guessed local offset.
- **HB10-T03** GIVEN timestamp input. WHEN missing offset, >6 fractional digits,
  leap second, -00:00 or UTC conversion beyond years1..9999. THEN reject. UTC
  Sep30T22:30Z belongs to Oct1; claiming Sep30 rejects. Microseconds .000001,
  .000002,.000003 remain distinguishable through actual PostgreSQL round-trip.

## Historical selection and reviewed corrections

- **HB10-H01 / F-010** GIVEN C5=50000/V5 and C10=45000/V10. WHEN C7=48000/V7
  recorded later. THEN C10/V10 and immutable lineage stay current, revision/seq
  advance, H7 selects C7, original K reproduces C5. No balance-delta replay.
- **HB10-H02** GIVEN real checks Oct5/Oct6 at identical B50000. WHEN distinct
  requests confirmed. THEN two observations. Retry first request returns its receipt;
  changed payload with same key conflicts without duplicate observation.
- **HB10-H03** GIVEN two checks on one day with null time. WHEN no placement.
  THEN ORDERING_CONFLICT. Explicit current-manifest adjacent placement accepts
  with null time; stale manifest rejects. Timed placement contradicting microsecond
  order rejects; insertion of .000002 between .000001/.000003 preserves latest.
- **HB10-H04** GIVEN C5=50000/V5, V8 still anchored C5, C10=45000/V10.
  WHEN insert C7=48000/V7. THEN HISTORICAL_STATE_CONFLICT at H8, full rollback,
  even though current C10/V10 is coherent. No automatic rebase or V10 rewrite.
- **HB10-H05** GIVEN C5 tip. WHEN amount correction 50000->51000 with full
  companion A and reposition=false. THEN same logical IDs/position, new immutable
  CP/V superseding tips, original K retained. Stale-tip fork or date change without
  reposition consent rejects. Older correction preserves later C10/V10.
- **HB10-H06** GIVEN C5/V5 and C10/V10. WHEN C5 corrected to Oct11/B51000 with
  reposition=true. THEN new position, new target/old-day manifests, old facts/order
  retained; resolve before H7 -> NO_OBSERVATION rather than resurrecting old C5.
  Same-day order correction also creates a new position, retaining logical identity.
  Other-stream position dependencies block an unsupported silent move.
- **HB10-H07** GIVEN unchanged history. WHEN row arrays arrive in any tested order,
  or six permutations of C5/C7/C10 insertion are used. THEN identical H-cut bank
  authority, coherent vector sums and deterministic provenance. Duplicate/missing
  manifest members, tied independent facts, invalid dependencies/forks reject.

## Atomicity, security and SQL

- **HB10-DB01** GIVEN fresh isolated PostgreSQL18. WHEN entire three-migration
  chain applied and reapplied twice. THEN 19 tables, three journal entries, no repair
  or mutation of existing historical rows. Direct SQL wrong CP/V position dates,
  ordering scope/day/equal/future-seq, duplicate roots/children reject by SQL guards.
- **HB10-DB02** GIVEN account at one expected revision. WHEN two real connections
  race with first held under lock and second observed waiting. THEN identical
  request returns one receipt; different request yields one winner/one stale refusal.
- **HB10-DB03** GIVEN successful actual PostgreSQL COMMIT with driver acknowledgement
  lost. WHEN retry same request. THEN COMMIT_OUTCOME_UNKNOWN followed by saved
  validated receipt, one C/V/batch, no automatic new-request retry.
- **HB10-DB04** GIVEN a writer already inserted checkpoint/vector/period/head rows.
  WHEN expected domain rejection, invalid audit or deferred vector constraint fails.
  THEN complete real rollback including request/counters; no Result.error COMMIT.
- **HB10-DB05** GIVEN owned/foreign accounts and existing receipt. WHEN unauthorized
  replay/read, wrong owner, forged actor, stale expected revision or MAX counter.
  THEN authorization before replay, scope rechecked under lock, typed refusal,
  no partial writes. Existing HB9 tests also cover forged SQL actors/receipts.
- **HB10-DB06** GIVEN full reserve20000 and saving5000, B10000. WHEN real B15000
  confirmed next day. THEN B15000, identical full earmark histories, no automatic
  debit/release/cap; HB-011/012 lifecycle and forecasts remain future features.
- **HB10-DB07** GIVEN closed Sep v1 at C Sep20=80000, A Sep60000/Oct20000,
  current C Oct2=75000 and Oct v1. WHEN late Sep30=76000/A Sep56000/Oct20000.
  THEN only Sep head pending=true, audited atomically; both immutable v1 payloads,
  versions and Oct current head unchanged. Audit failure rolls back pending flag.
  Unsupported selection contract rejects REPORT_IMPACT_REVIEW_REQUIRED.

## Optional reconciliation, independent from confirmation

- **HB10-R01** GIVEN real B50000->45000 without operation source. WHEN read interval.
  THEN D=-5000, K/U=null, NOT_AVAILABLE; no fake empty ledger. Explicit trusted
  empty CONFIRMED_SET instead gives K0/U-5000, still not gross completeness.
- **HB10-R02 / F-011** GIVEN B40000->150000. WHEN explicitly supplied confirmed
  operations +120000/-10000. THEN D=K110000,U0, gross completeness NOT_ASSERTED;
  neither bank nor A changes. Optional operation persistence remains future work.
- **HB10-R03** GIVEN one operation/revision -3000 repeated. WHEN reconcile D-5000.
  THEN count once, K-3000/U-2000. Different revisions require one authoritative
  current revision; conflicting/missing proof or same revision/different amount rejects.
  Upper/lowercase spellings of the same UUID operation/revision also count once.
- **HB10-R04** GIVEN explicit evidence. WHEN account, endpoint, K or membership
  mismatches, or selected operation revision is absent. THEN EVIDENCE_CONFLICT,
  never guessed interval assignment or heuristic amount/date deduplication.
- **HB10-R05 / F-018** GIVEN B50000->45000 with late B48000. WHEN split real intervals.
  THEN Dleft=-2000/Dright=-3000. Explicit assigned Kleft=-1500/Kright=-1000 gives
  Uleft=-500/Uright=-2000; sum D unchanged and latest C45000 retained. Production
  interval reader returns unavailable K/U until a real future source exists.
- **HB10-R06** GIVEN D=MAX and K=-1, or intermediate K=[MAX,1,-1]. WHEN calculate.
  THEN MONEY_RANGE; no floating arithmetic or unbounded intermediate netting.

Executable coverage: `tests/checkpoints.test.ts`, `tests/checkpoint-reconciliation.test.ts`,
`tests/checkpoint-types.ts`, `tests/integration/bank-checkpoints.test.ts`, plus retained
HB-008/009 and persistence regression suites. Actual commands/counts and remaining
limits belong to the [verification report](../../../docs/planning/hb-010-verification.md).
