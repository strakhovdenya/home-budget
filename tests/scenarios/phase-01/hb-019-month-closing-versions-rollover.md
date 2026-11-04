# HB-019 — Month closing, immutable versions and rollover scenarios

**2026-11-04 · PLANNING CORRECTION R1 · NOT EXECUTED.** 91 unique normative HB19 cases.
Independent ChatGPT review and separate owner implementation permission are pending.
Prior review: CHANGES REQUESTED, Critical0/High1/Medium3/Low0; seven R-cases
add correction-specific independent proof, without replacing earlier cases.
[Technical plan](../../../docs/planning/hb-019-month-closing-versions-rollover.md),
[business rules](../../../docs/BUSINESS_RULES.md), Accepted
[ADR0001](../../../docs/adr/0001-checkpoints-and-allocations.md),
[ADR0002](../../../docs/adr/0002-month-closing-and-corrections.md),
[ADR0003](../../../docs/adr/0003-daily-forecast-and-liquidity.md),
[HB2 source scenarios](hb-002-month-closing-and-corrections.md),
[F-009/F-013](core-rules.md), [HB-013](hb-013-period-allocations.md),
[HB-014](hb-014-daily-forecast.md), [HB-017](hb-017-update-budget.md),
[HB-018](hb-018-obligations-savings.md).

## Shared GIVEN and exact assertion rules

All data is synthetic, account alpha/owner alpha unless overridden. O/S/C/V aliases
represent scoped synthetic UUIDs, never production identifiers. Money is bigint
EUR cents; wire money is canonical decimal strings. Dates use Europe/Berlin;
Nov/Dec/Jan mean 2026-11/2026-12/2027-01 unless specified. Pure clock is injected.
Real PostgreSQL AND browser tests use the server-relative calendar adapter described in the
plan, preserving the same elapsed-month relationships/amounts without overriding
server clock or bypassing PERIOD_NOT_ENDED/future checks. Fixed-date pure tests
retain November examples, DST and year/leap boundaries independently.

Every case starts with an independent fixture unless it explicitly describes a
sequence. Each actual checkpoint includes one complete nonnegative V summing to B.
Unlisted A/R/S are zero only in a known COMPLETE state; unknown bank/A/F are NULL.
R is full selected unpaid remainder; S retained savings; F=A-R-S; no operation
is inferred from a checkpoint/vector difference. All ordinary unpaid are fully
reserved; possible claims have explicit all-or-none selection. Identity/origin
and every full original revision/evidence remain immutable. Optional bankDate,
observedDate, effectivePosition, confirmation and recorded coordinates are distinct.

**N:** C20 actually observed Nov20, B80000; V20 effective Nov20,
A{Nov60000,Dec20000}; O1 UNPAID original/outstanding30000, ordinary selected,
origin=fundingNov; S=0. Its independently audited CREATE precedes Nov20.
At HNov30 and K10, C20/V20/O1 are visible: RNov30000,FNov30000,FDec20000.
K10 denotes an actual complete committed boundary, not an incomplete batch.

**L:** N plus Dec2 ACTUAL_CHECK C2 B75000 and explicit CARRY in ONE HB-017 update,
V2 A{Nov0,Dec75000}, same O1 fundingDec/R30000,FDec45000, K20/revision20.
No Nov30 observation exists. Checkpoint count2; C20/V20/original O1 remain.

**T:** Nov28 C0 B90000,V0 A{Nov40000,Dec50000}; O1 unpaid30000 and S1 retained5000
fundedNov, independently created before Nov28. FNov5000,FDec50000.
Confirmed transfer-only to Dec gives B90000,A{Nov0,Dec90000},RDec30000,SDec5000,
FDec55000, same observation ID/count/date. No extra cash or target duplication.

**G:** Nov20 C0 B10000,V0 A{Nov4000,Dec6000}; no December visits/checks/updates,
R=S=0. Jan5 actual B8000 + FRESH_START yields A{Nov0,Dec0,Jan8000},FJan8000.
One new checkpoint, one final vector/decision, no intermediate rows.

**NONE** means compare complete scoped rows/canonical values of all20 tables plus
account pointer, revision/recordedSeq, reports/heads/pending, audits and receipts
before/after; all unchanged. It is stronger than counts or one error code.
Read/preview/cancel/known rejection uses NONE. Existing explicit transition prepare
may append only proposal/period CONTROL rows; compare a separately captured
post-prepare baseline for later refusal. No financial counters/facts change there.
**CLOSE** means one budget update/receipt/counter increment, one report row and
audited head creation/move, optional absent period row only; B/A/R/S and all
financial pointers/revisions unchanged. No historical position/order is created.
**IMMUTABLE** means exact stored row/canonical snapshot/manifest/order/evidence
refs and digest retained, even after later writes; JSONB key order is not raw bytes.
Unknown commit outcome is NOT a NONE assertion: prove status/exact replay first.

## Real browser and PostgreSQL calendar fixtures

Literal2026–2027 dates above remain fixed PURE/component oracles; they are not
dates to submit unchanged to today's live server. For each browser/PG run first
read PostgreSQL's actual Berlin date D with the existing server clock expression
and use `tests/fixtures/transition-calendar.ts`'s checked civil primitives.
C=periodOf(D), P=C-1 completed month, Q=C-2 completed month, F=C+1; all references
to old source/target/future periods are mapped consistently, including IDs and
funding origins. `d(M,n)` is checked calendar day n in M; `end(M)` is its true last
day. No clock injection in the real app/DB, future date, +24h shortcut or date guard
bypass. Synthetic seed uses existing authorized writers/validators with valid
audits/order/identity creation positions before the base observation; no fake
success-shaped closing row. Report versions under test come from production close.

| Live fixture | Exact dated facts and purpose |
|---|---|
| BN (E08/E12) | C20 at d(P,20), B80000,A{P60000,C20000},O1R/P30000,S0; H=end(P)<D. No later observation through H, so endNULL/F/P30000. Account has real C period because it has A/C20000. |
| BL (E09) | Start BN and close P as v1 on D; actual check on D B75000,A{C75000},CARRY P→C/O1R30000. Later on D accept a real historical synthetic observation on end(P) B76000,A{P56000,C20000} with paired vector/valid placement before D. v1 remains unknown; explicit v2 ends76000/F/P26000. Actual recorded/confirmation time stays D, not a guessed Dec3. |
| BT (E10/E11 defer) | C0 at d(P,28),B90000,A{P40000,C50000},O1R/P30000; S5000 for reuse branch, S0 for actual84000/defer branches. Actual check date is D even when its day is1. REUSE retains d(P,28); no requirement to wait until current day2. |
| BG (E11 fresh start) | C0 at d(Q,20),B10000,A{Q4000,P6000}; O9000 fundedQ/S2000 fundedP with prior creation evidence. No observation/update during P. On actual D in C confirm B8000/A{C8000},F-3000. Both Q and P have ended; no fixed Jan5 prerequisite. |
| BV (E13/E14) | BN→BL v1/v2 then supported paired historical corrections at end(P): B77000/A{P57000,C20000}, then76500/{P56500,C20000}, explicit v3/F26500, all recorded on D after earlier batches; current D B75000 unchanged. |

Concrete example ONLY if actual server D=2026-11-04: C=Nov2026,P=Oct2026,Q=Sep2026;
BN lastOct20/endOct31unknown, BL currentNov4 and lateOct31 actual76000, BG lastSep20
with missedOctober and actualNov4. If D differs, derive new dates, do not reuse
this example as a clock override. d(P,28) exists in every supported month;
end(P) handles February28/29. D can be day1; no future day2/3 seed. Creation/effective
positions are strictly valid, same-day sequence/order explicit where necessary.

E08=BN, E09=BL, E10=independent BT actual/reuse branches, E11=independent BG/BT-defer,
E12=BN plus controlled auth/ack-loss, E13=BN/BL/BV with keyboard/AT, E14=BV and
long-title variants. Display/assert dates from the live fixture manifest; preserve
all original cents/diffs/counts. R06 exercises D day1, leap/nonleap and year shifts
without implying that browser runtime was executed on those dates. Fixed DST and
Nov30→Dec1 instant cases remain independent pure tests and valid elapsed-date PG
fixtures. A browser cannot pretend to execute a future server-day scenario.

Record D,C/P/Q/F, actual dates/positions, synthetic alias mapping, server timezone,
source fingerprint and per-journey branch in safe local evidence. Re-read server
date before new confirm; crossing a civil month makes new-action review stale:
stop/reseed a fresh isolated fixture/review, never override target or auto-rebase.
An unresolved COMMIT keeps its original request for status/replay across midnight;
never discard/reseed it until resolved. Need to seed fixtures is not permission
to expose a seed endpoint, modify production data or bypass auth/calendar guards.

## Planned executable identities and evidence levels

Each heading is a unique test identity; planned title is its exact heading text
after `## `, e.g. `HB19-A01 Final-day actual observation`.
No title here denotes an existing passing test. Tags assign separate proof:

| Tag | Future executable location / proof |
|---|---|
| U | `tests/closing.test.ts`; boundary cases in `tests/closing-boundary.test.ts`; existing transition/forecast suites as explicitly reused regressions. Pure deterministic data, no ORM mocks claiming SQL proof. |
| P | `tests/integration/month-closing.test.ts`, using actual PostgreSQL and production reader/writer/boundaries; existing integration suites remain regression requirements. |
| C | `tests/closing-ui.test.tsx`, `tests/update-budget.test.tsx`, relevant dashboard/i18n component tests. Component proof is not browser proof. |
| B | Actual local browser journey named after scenario heading; screenshots/actions/result assertions plus safe evidence record. No browser runner/package exists today. |
| V | Document/source/evidence-manifest/review validation, not a runtime finance test. |

For a U/P case both implementations are required. For B actual browser evidence is
required, or explicit NOT EXECUTED and a separate owner decision. HB-018 B01–B07
waiver and HB17-A03 do not supply any HB19 browser/auth PASS. Each seven-case
subgroup is one reviewable slice in the plan.

## HB19-A01 Final-day actual observation

Proof U/P; BR-01/08; HB2-001.
GIVEN Nov30 actual C30 B76000,V30 A{Nov56000,Dec20000},O1 RNov30000,S0,K10,
date-only observedAt=NULL, operation details absent.
WHEN Dec1 preview/confirm November at HNov30/K10.
THEN endCheckpoint=C30,endBalance76000,END_DATE_OBSERVED,NOT_PROVIDED;
lastObservedNov30/B76000,A/R/S/F Nov56000/30000/0/26000. Exact date precision
is copied, no midnight check or complete gross spending claim; CLOSE only.

## HB19-A02 Older last observation and unknown end

Proof U/P; BR-01/08; HB2-002/036.
GIVEN N and no Nov21–30 observations.
WHEN Dec1 preview/confirm November with reason and pinned HNov30/K10.
THEN endCheckpoint/endBalance=NULL,INCOMPLETE,NOT_PROVIDED; last C20/Nov20/B80000,
V20 effectiveNov20,A/R/S/F60000/30000/0/30000; F is last confirmed allocation free.
No Nov30 balance80000/0, forced new check/PDF/operation or changed current B/A/R/S.

## HB19-A03 Close after actual carry

Proof U/P; BR-05/08; HB2-003/004/019.
GIVEN L at K20, HNov30, no closed report.
WHEN close November after the Dec2 update.
THEN report selects C20/V20/O1 fundedNov, lastNov20/B80000,A/R/S/F60000/30000/0/30000,
end=NULL; current C2/B75000,A{Dec75000},RDec30000,FDec45000 unchanged.
Dec2 effective facts are beyond H even though visible at K20; D=-5000 is no expense.

## HB19-A04 No observation and actual zero differ

Proof U/P; BR-01/08; HB2-026.
GIVEN elapsed November with no prior checkpoint/vector, but known O1 RNov1000,S0.
WHEN close on Dec1; independently close a fixture with actual Nov30 B0,A{} and O1.
THEN first report NO_OBSERVATION,C/V/date/last/end/A/F=NULL,R1000,S0;
second END_DATE_OBSERVED,end0,A0,R1000,S0,F-1000. Neither absence nor real zero
is confused with the other; both preserve full reserve and CLOSE-only writes.

## HB19-A05 Pre-period observation remains last known

Proof U/P; BR-01/08; HB2-040.
GIVEN G completed Jan5 with no December observation, original C0/V0 retained.
WHEN separately close November and December using own H and current K.
THEN both lastNov20/B10000,INCOMPLETE,end=NULL; Nov A4000 and Dec A6000,
R/S0,F4000/6000,allocation effectiveNov20. Jan B/A/F8000 unchanged.
Do not mark December NO_OBSERVATION or use Jan5 cash as Dec31 cash.

## HB19-A06 Full historical lifecycle selection

Proof U/P; BR-02/03/07/08; HB2-009/029.
GIVEN Nov30 B50000,A{Nov50000},O1 unpaid20000,S1 retained5000,FNov25000;
Dec1 transfer, Dec2 actual B45000/A{Dec45000} partial pay5000, then Dec3 cancel
remaining15000 and explicitly release S2000 in a supported ordinary update.
WHEN close November after those commits.
THEN snapshot O1 unpaid20000/R20000,S5000,F25000 fundedNov; current Dec R0,S3000,
F42000,B45000; Dec2 R15000/F25000. All original payment/release evidence retained;
no repeated5000 bank debit, cancellation payment or automatic S release.

## HB19-A07 Confirmed same-day order and selected reserves

Proof U/P; BR-01/02/08/10; HB2-012/021.
GIVEN Nov30 date-only C1 B50000/V1{Nov50000}/R10000 at position1,
redistribution V2{Nov40000,Dec10000} at2 and actual C2 B40000/V3{Nov30000,Dec10000}
with paid O1/R0 at3, valid manifest/order/dependencies.
WHEN close November; independently insert date-only Cx48000 without placement.
THEN report selects C2/V3,A/R/S/F30000/0/0/30000,end40000,observedAt=NULL;
ambiguous insert refuses ORDERING_CONFLICT/NONE. No recorded-time sort.

## HB19-A08 Cutoff excludes later facts

Proof U/P; BR-08/10; HB2-007/019.
GIVEN L/v1 at HNov30/K20; Dec3 historical C30/V30 B76000/A{Nov56000,Dec20000}
entered at K30 with valid Nov30 position and no incompatible later old-anchor vector.
WHEN read v1 and candidates state(H,K20) and state(H,K30).
THEN old cut C20/V20/endNULL/FNov30000; new cut C30/V30/end76000/FNov26000;
v1 IMMUTABLE and current C2/B75000/RDec30000/FDec45000 unchanged.

## HB19-A09 Resolve corrected date before filtering

Proof U/P; BR-01/08; HB2-030.
GIVEN v1 on C30/V30 Nov30 B76000/A{Nov56000,Dec20000}, earlier N and newer Dec2
B75000; reviewed paired correction moves C30/V30 to Dec1 at new K.
WHEN preview November revision.
THEN correction resolved before HNov30: select C20/V20,B80000,lastNov20,A60000,
R30000,F30000,end=NULL. No superseded Nov30 resurrection, no changed current Dec
cash; v1 pins original C30/V30 until explicit v2 and remains IMMUTABLE afterward.

## HB19-A10 Old-anchor vector conflict refuses

Proof U/P; BR-01/05/08; HB2-027.
GIVEN Nov28 C28 B90000/V28{Nov40000,Dec50000}, Nov30 V30a{Nov35000,Dec55000}
anchored C28 and newer Dec2 B85000/A{Dec85000}, R/S0.
WHEN a candidate contains inserted Nov29 C29 B88000/V29{Nov38000,Dec50000}
but still selects V30a, then attempts closing preview/confirm.
THEN HISTORICAL_STATE_CONFLICT/NONE; no automatic anchor rebase. Only a separately
accepted coherent historical replacement V30b{Nov33000,Dec55000} anchored C29
can yield FNov33000/endNULL; unsafe historical write may itself refuse earlier.

## HB19-A11 Funding and audit closure are mandatory

Proof U/P; BR-03/07/08/10.
GIVEN valid T and November report plus a later funding transfer; saved snapshot
still claims R30000/S5000/F5000 with full typed source refs.
WHEN independently remove/duplicate/tamper FUNDING_TRANSFER proof, decision ref,
beforeRevision, SAVINGS_STATE or OBLIGATION_STATE audit in a synthetic candidate
or direct-SQL malformed fixture, then read/replay/preview affected report.
THEN typed funding/payment/savings/report-proof refusal; no report disclosure
as valid, no current-state fallback/NONE. Matching monetary totals alone do not prove it.

## HB19-A12 Identity completeness and possible claims

Proof U/P; BR-03/07/08/11.
GIVEN Nov30 B10000/A{Nov10000}; ordinary O1 unpaid9000, possible O2 unpaid4000
unelected, S1 retained2000; valid separate CREATE evidence.
WHEN materialize report, then vary O2 to explicitly elected; independently omit
O1/S1 or duplicate an identity in manifest while keeping matching copied totals.
THEN first R9000/S2000/F-1000, elected R13000/S2000/F-5000; identities count once.
Omission/duplicate/proof mismatch refuses/NONE, no reserve cap or implied selection.

## HB19-A13 Bounded canonical report and history

Proof U/P; BR-10/11.
GIVEN A02 values and independently admissible metadata/history for each budget:
total rows20000, workRows²<=4000000,identities1000,periods1200,sourceBytes8MiB,
stored report8MiB,per-response wire1MiB,depth32,nodes100000,chain1000/page50.
All limits apply together;20000 total rows are not20000 allowed work rows.
WHEN validate at threshold and threshold+1 separately, including multibyte strings,
excessive closure work, nested/cyclic/accessor/sparse payload and duplicate refs.
THEN valid bounded candidates preserve F30000/endNULL; excess/malformed input
refuses safely/NONE with no truncation. Large valid reports are fully validated
and read through bounded pages/chunks, not refused just for exceeding1MiB.
Sum of all distinct H/K quadratic work plus report/chain/audit visits stays<=4M;
R03–R05/R07 specify exact independent thresholds. Command32/4096/65536 limits stay.
Independently test the whole compact audit descriptor array at its original
HB-009 limits: oversized array refuses before commit, not silently chopped into
unchecked pieces; full immutable report evidence remains referenced and validated.

## HB19-A14 Stored report validation at original coordinates

Proof U/P; BR-08/10.
GIVEN A02 v1 with copied O1 title and exact H/K/order/selection/schema/audit refs.
WHEN later rename/pay O1, then read original version; independently corrupt its
copied title/amount, manifest, receipt mapping, unknown schema/selection version
or foreign source ref through a deliberately malformed storage fixture.
THEN valid read returns original title/R30000/F30000/endNULL, IMMUTABLE;
corrupt/unsupported report refuses before disclosure/NONE. Never join live title
or use current algorithm to silently reinterpret an old payload.

## HB19-B01 Atomic initial report commit

Proof P; BR-08/10; HB2-028.
GIVEN N, Dec1 valid preview HNov30/K10/revision10/headNULL and fresh request q.
WHEN authorized owner confirms exact normalized command/digest/reason.
THEN one v1 and head, two logical report/head audit descriptors plus mandatory
normalized command/receipt mapping, K10 and commitSeq11/revision11; endNULL,
A/R/S/F60000/30000/0/30000. CLOSE, no current B/A/R/S or vector pointer mutation.

## HB19-B02 Virtual period materializes only on explicit commit

Proof U/P; BR-05/08/10.
GIVEN elapsed November has no budget_periods row and no C/V, known R/S0.
WHEN GET/load/preview then explicitly confirm valid NO_OBSERVATION v1.
THEN reads NONE; confirm creates one scoped November period and v1/head in CLOSE
transaction; A/F/bank/endNULL,R/S0. Failure after period insert rolls it back too;
no read-time ensurePeriod call or fabricated zero checkpoint.

## HB19-B03 Too early and future month refusal

Proof U/P; BR-08/10; HB2-026.
GIVEN N and server Berlin Nov30 23:59:59, headNULL.
WHEN attempt November close, or close December before it ends; independently
advance pure clock to Dec1 00:00 and preview November.
THEN early calls PERIOD_NOT_ENDED/NONE; at Dec1 November eligible with endNULL,
lastNov20/B80000/F30000. Date boundary uses Berlin, not UTC/host timezone.

## HB19-B04 Changed account revision invalidates review

Proof U/P; BR-08/10.
GIVEN B01 preview at revision10/K10; another accepted historical or current
write advances revision11/K11, even if B80000 and selected November totals match.
WHEN confirm old new request.
THEN STALE_REVISION/NONE from post-rival baseline; no v1, audit or version consumed.
Refresh/review required, no implicit use of new K or automatic rebase.

## HB19-B05 Tampered review digest or cutoff

Proof U/P; BR-08/10.
GIVEN B01 preview with exact HNov30/K10/order/digest and C20/V20 refs.
WHEN mutate H toNov29, K to9/11, reason, expected head,
schema/selection version, candidate digest, confirmed flag or add a client amount.
THEN safe invalid/stale/proof refusal/NONE; source stays B80000/F30000/endNULL.
Never trust a supplied digest as evidence without server re-selection and equality.
No preview token/key is required. Digest binds server-resolved scope/request/
reason and all pinned content; caller checksum is not authentication. An unrelated
instance rebuilds and checks everything under lock plus explicit authenticated
consent. Client cutoff timestamp/previewProof keys are invalid; report cutoff time
is captured by the server at confirmation for the same K, not echoed from client.

## HB19-B06 No intermediate head or mixed report read

Proof P; BR-08/10.
GIVEN B01 and two real database connections with a barrier inside report commit.
WHEN writer inserts v1 but pauses before head/audit/COMMIT and reader loads month.
THEN reader sees committed no-report state until commit, then complete validated
v1/head/A60000/R30000/F30000/endNULL; never partial report/head or half-audit.
Capture one repeatable-read K/head/source snapshot; do not combine connections.

## HB19-B07 Audit insertion failure rolls back

Proof P; BR-08/10.
GIVEN B01 baseline, including all report/head/audit/receipt/counter rows.
WHEN a real PostgreSQL audit INSERT failure occurs after v1/head insertion.
THEN TRANSACTION_FAILED and NONE; no version number consumed, previous B80000,
A{Nov60000,Dec20000},RNov30000/FNov30000 unchanged. Fresh valid retry q commits
v1 exactly once, no v2 or isolated calendar row.

## HB19-B08 Deferred constraint and known commit failure

Proof P; BR-08/10.
GIVEN B01; inject a scoped deferred FK/constraint violation after callback writes.
WHEN callback completes but actual COMMIT rejects; separately fail report INSERT.
THEN known TRANSACTION_FAILED/NONE across reports/head/audit/receipt/counters and
optional period; no success from returning Result.error. q valid retry may create
v1 once; original financial state B80000/R30000/FNov30000 remains untouched.

## HB19-B09 Lost successful commit acknowledgment

Proof P; BR-08/10.
GIVEN B01 with valid q, production writer and actual SQL commit.
WHEN durable commit succeeds but connection acknowledgment is deliberately lost.
THEN COMMIT_OUTCOME_UNKNOWN, original q/payload retained; do not assert rollback.
Authorized status and explicit same-key retry validate original report/command/audit
and return same receipt/v1, endNULL/F30000; exactly one update/head/audit set,
one revision increment. No new-key automatic retry or second v1/v2.

## HB19-B10 Exact request replay after heads advance

Proof U/P; BR-08/10.
GIVEN q closed A02 v1, then a separate late fact/review creates accepted v2 and
another calendar month begins and the serving process restarts; current bank
may now be75000.
WHEN retry q with identical original command.
THEN authorized original-evidence validation precedes stale/new-calendar checks;
returns original receipt/v1 with last80000/endNULL, not v2/current candidate.
NONE, old/new heads/versions/financial state unchanged. No transient preview state
or affinity can block durable validated status/replay after a commit.

## HB19-B11 Same request with changed payload conflicts

Proof U/P; BR-08/10.
GIVEN successful q/v1 from B01.
WHEN reuse q changing reason, H/K, mode INITIAL→REVISION, expected revision,
head, digest or observed-proof identity even where amounts remain80000/30000.
THEN REQUEST_PAYLOAD_CONFLICT/NONE, no prior result disclosure as that command's
success and no second report. Canonical identity includes scope and every review coordinate.

## HB19-B12 Concurrent first confirmations

Proof P; BR-08/10.
GIVEN two independently authorized B01 previews at same revision/headNULL,
distinct requests q1/q2, real two-connection account lock barrier.
WHEN both confirm concurrently; separately double-click same q1.
THEN distinct requests: one v1 winner, loser stale/head conflict, no fork/v2;
same q1: winner plus exact replay receipt, no second update. B80000/A/R/S
unchanged; exactly one report/head/audit/receipt set and counter+1.

## HB19-B13 Foreign account and unauthorized result isolation

Proof U/P; BR-10.
GIVEN alpha A02 q/v1, unrelated owned beta and unauthenticated/other-owner callers.
WHEN call preview/confirm/readVersion/status with alpha report/source/head/request
IDs from beta or unauthorized session; compare unknown UUID cases.
THEN safe UNAUTHORIZED/FORBIDDEN, no report values80000/30000/30000, title,
receipt/head existence, SQL/parameters or distinguishing membership oracle; NONE.
Valid UUID, client owner field or old receipt is not authorization.

## HB19-B14 Strict DTO and safe status failures

Proof U/P; BR-10.
GIVEN B01 and a scoped invalid/missing request or corrupted committed receipt.
WHEN submit decimal fractions/numbers/leading-zero money, malformed UUID/sequence,
prototype/accessor graph, excessive reason, fake actor/account fields; separately
request authorized status during storage error or after evidence corruption.
THEN typed safe refusal/NONE, never raw driver error, assumed success/rollback
or original-result disclosure without proof; bank80000/R30000/FNov30000 unchanged.

## HB19-C01 Late fact only marks pending

Proof U/P; BR-01/08/10; HB2-006/007.
GIVEN L with accepted November v1 based on C20/V20/K20 and endNULL/F30000.
WHEN Dec3 existing authorized checkpoint writer accepts historical C30/V30
B76000/A{Nov56000,Dec20000}, valid relative placement before Dec2.
THEN v1 IMMUTABLE/headv1, correctionPending=true with audited impact, no v2;
current Dec B75000/A75000/R30000/F45000 unchanged, account revision advances.

## HB19-C02 Explicit second report version

Proof U/P; BR-08/10; HB2-008.
GIVEN C01, new K includes C30/V30; preview reason "Added actual Nov30 check".
WHEN explicitly confirm exact diff against v1 and current revision.
THEN v2 previous=v1,END_DATE_OBSERVED,end76000,lastNov30,A/R/S/F56000/30000/0/26000;
diff last80000→76000,A60000→56000,F30000→26000,endNULL→76000 with typed refs.
Headv2/pendingfalse, v1 IMMUTABLE, current Dec B/A/R/F75000/75000/30000/45000.

## HB19-C03 Correction of correction publishes third version

Proof U/P; BR-08/10; HB2-022.
GIVEN C02 v2 and C30 tip t1 B76000/V56000+20000, active Dec2 B75000.
WHEN separately reviewed coherent t2 B77000/V57000+20000 then t3 B76500/V56500+20000
supersede original historical facts with paired vectors; confirm candidate v3.
THEN v3 previous=v2,end76500,R30000,F26500; t1/t2/t3 and all paired V retained,
v1/v2 IMMUTABLE,current Dec unchanged. No branch or implicit overwrite/rebase.

## HB19-C04 No change from advancing knowledge alone

Proof U/P; BR-08/10.
GIVEN A02 v1 K10; later commit beyond H or unrelated metadata advances K11
but selected November financial/evidence content/order refs remain identical.
WHEN preview revision at K11 and attempt confirm unchanged review.
THEN NO_REPORT_CHANGE,NONE; headv1/version1, A60000/R30000/F30000/endNULL.
K/reason/request/time alone never justifies v2; any existing pending flag is not
silently cleared by this read/refusal.

## HB19-C05 Cancel and abandon correction preview

Proof U/P/C; BR-08/10; HB2-006.
GIVEN C01 pendingv1 and visible candidate C02 end76000/F26000.
WHEN preview then cancel/navigate away without confirm.
THEN NONE; v1 still endNULL/F30000/default, pending retained, no reserved version,
head/audit/receipt/counter changes; ordinary cancel returns focus and preserves
appropriate memory draft, no page-opening side effect.

## HB19-C06 Default latest and explicit old version

Proof U/P/C; BR-08/10.
GIVEN C03 chain v1(endNULL/F30000),v2(end76000/F26000),v3(end76500/F26500).
WHEN load month with no version then explicitly select versions1/2/3.
THEN defaultv3, each selection returns exact original H/K/ref/title/amounts,
never patched by live states; every read NONE. Pending is external to immutable
payload; unknown/foreign/unsupported version safely refuses.

## HB19-C07 Exact F-013 reserve correction

Proof U/P; BR-03/08/10; F-013.
GIVEN Nov30 B50000/A{Nov50000}, O1 original/outstanding10000,R10000,S0,F40000,
v1 accepted with its immutable source refs and no incompatible later lifecycle.
WHEN existing authorized same-action historical correction changes amount to12000,
marks pending; owner reviews/explicitly confirms reason/evidence and v2.
THEN v2 R12000/F38000/B50000,end50000,previousv1; original v1 R10000/F40000
IMMUTABLE and accessible, no automatic v2 or bank debit from the2000 difference.

## HB19-C08 Rival version head and revision race

Proof P; BR-08/10; HB2-022/028.
GIVEN C02 candidate against headv1, two real concurrent requests at same revision.
WHEN both confirm with account/head lock barriers.
THEN one v2 winner, other STALE_REVISION/STALE_REPORT_HEAD; no v3, fork or orphan
report/audit/receipt, next successful actual correction uses version3.
v1 IMMUTABLE, Dec B75000/R30000/F45000; failed request consumes no counter/version.

## HB19-C09 Fact correction fork and invalid positions

Proof U/P; BR-08/10.
GIVEN C03 retained t1→t2→t3, last historical B76500/F26500.
WHEN propose another child from t1, cycle/missing correction predecessor,
duplicate root or contradictory same-day dependency/ordering manifest.
THEN CORRECTION_CONFLICT/ORDERING_CONFLICT/NONE at the existing fact boundary
or report proof; no entry-time winner/resurrection or automatic report version.
All accepted reports remain readable at their original validated cuts.

## HB19-C10 Historical partial payment and suffix compatibility

Proof U/P; BR-02/03/08; HB2-013.
GIVEN Nov30 B50000/A50000/O1R10000 and later Dec2 full paid state/B40000.
WHEN review historical Nov30 partial2000 with actual historical B48000/A48000,
O1 remaining8000; compare a suffix with originally confirmed Dec2 payment10000
against one whose accepted immutable payment evidence is compatible8000.
THEN incompatible suffix refuses HISTORICAL_PAYMENT_CONFLICT/NONE, no rebase of
original payment. Supported coherent candidate gives Nov A48000/R8000/F40000,
Dec B40000/R0/F40000; v1 unchanged until explicit version. Do not fabricate suffix proof.

## HB19-C11 Pending review is targeted and audited

Proof U/P; BR-08/10.
GIVEN separately accepted October/November reports and current Dec B75000;
November C01 late fact affects HNov30 only, while October selection is identical.
WHEN accept that fact then confirm only November v2.
THEN only affected November pending flag audited then cleared by v2; October
head/payload/flag unchanged, no automatic report cascade. Original-to-final impact
must validate original pending flags before sibling writes can mask source drift.

## HB19-C12 Evidence-only change and optional PDF boundary

Proof U, future operation integration DEFERRED; BR-08/09; HB2-018.
GIVEN L/v1 and a pure hypothetical accepted operation-evidence manifest explaining
distinct -3000 Nov25/-2000 Dec1, D=-5000,K_ops=-5000,U0, unchanged B75000/R30000.
WHEN diff evidence-only candidate, duplicate same evidence, or provide only new K.
THEN changed evidence permits explicit new report candidate with partialNov subtotal3000;
duplicate/K-only gives NO_REPORT_CHANGE. No reposting, automatic v2, gross-complete
claim or persisted PDF workflow is implemented by HB-019; unsupported live detail input refuses.

## HB19-C13 Version rollback and unknown acknowledgment

Proof P; BR-08/10.
GIVEN C02 preview against v1, version2 not yet committed.
WHEN separately fail v2 insert, head update, audit insert, deferred constraint
or known commit; independently lose acknowledgment after a successful commit.
THEN known failures NONE/v1 remains head and version2 unconsumed; unknown outcome
requires original-key status/replay and returns exact durable v2 once if committed.
v1 IMMUTABLE/current Dec75000/30000/45000 in every branch, no duplicate v2/v3.

## HB19-C14 Retained report is stable after later payment and carry

Proof U/P; BR-02/05/08; HB2-005/009/029.
GIVEN November v1 N A60000/R30000/F30000/endNULL and copied source bytes/refs.
WHEN Dec2 actual B75000/A{Dec75000} carries O1 once, then Dec3 actual B45000/
A{Dec45000} pays full30000 with fresh affirmation, later read v1 repeatedly.
THEN current B45000/R0/F45000, no second30000 debit; v1 IMMUTABLE/R30000/F30000,
head unchanged absent actual historical impact. Separate current lifecycle is labeled
with its own date and never embedded retrospectively into v1.

## HB19-D01 Automatic calendar availability is read-only

Proof U/P/C; BR-05/08; HB2-033.
GIVEN two independent consistent branches, both advancing Nov30→Dec1 while closed:
(a) T exactly as defined, including an EXISTING December period for ADec50000;
(b) C0 observedNov28/B90000,V0 A{Nov90000},O1RNov30000/S1SNov5000,FNov55000,
and no December allocation, funding, period row, proposal, report or other FK ref.
WHEN load/prefetch months/dashboard in each branch and abandon a B84000 draft.
THEN in both December OPEN/November AWAITING_CLOSE and NONE: (a) retains existing
December row,A{Nov40000,Dec50000},FNov5000/FDec50000; (b) December remains virtual,
no December row is created,A{Nov90000},FNov55000/FDec0. B90000/RNov30000/SNov5000
unchanged in both; no scheduler, control write, auto-transfer/close or synthetic C.

## HB19-D02 Calendar status and future navigation

Proof U/P/C; BR-05/08.
GIVEN Dec2, November accepted v1, October no report, current T allocations.
WHEN navigate October/November/December/January and back.
THEN October AWAITING_CLOSE, November CLOSED (pending badge if external flag),
December OPEN, January future preview with no close eligibility. Reads NONE;
closed November cash may remain40000 until explicit carry, state is not a sweep.

## HB19-D03 Closing and rollover are separate

Proof U/P/C; BR-05/08.
GIVEN T current Dec1, no report, source A40000/R30000/S5000 stillNov.
WHEN confirm November close only; independently enter update-budget without close.
THEN close snapshot A40000/R30000/S5000/F5000/endNULL and CLOSE-only writes;
active A remainsNov40000/Dec50000, no carry/free55000. Update-budget remains
available without close prerequisite or final-day checkpoint.

## HB19-D04 Actual changed balance plus carry once

Proof U/P/C; BR-01/02/05; HB2-031/036.
GIVEN T without S (S0), Nov F10000, lastNov28/B90000.
WHEN Dec2 actual check84000 plus explicit CARRY/full A{Nov0,Dec84000} confirms
same O1 fundingDec in ONE existing HB-017 transaction.
THEN C count2/lastDec2,B84000,R30000/F54000,one vector/decision/transfer/funding
set; no intermediate90000 check, source-delta allocation or second debit.
November report remains/selects lastNov28/A40000/R30000/F10000/endNULL.

## HB19-D05 Actual equal amount still creates observation

Proof U/P/C; BR-01/02/05; HB2-032.
GIVEN D04 initial B90000,count1,lastNov28,RNov30000,S0.
WHEN Dec2 actual bank check confirms same90000/CARRY/full A{Dec90000}.
THEN new C ID/count2/lastDec2,RDec30000,F60000; retry same request reuses that
result, not another observation. Amount equality cannot choose REUSE_CONFIRMED
or imply no activity, and carry adds no separate bank trend point.

## HB19-D06 Explicit reuse preserves bank date

Proof U/P/C; BR-01/05/07; HB2-010/011.
GIVEN T,count1,lastNov28.
WHEN Dec1 explicitly choose REUSE_CONFIRMED+CARRY and confirm full target vector.
THEN B90000/C ID/count1/dateNov28 unchanged,A{Dec90000},same O1R30000/S1S5000,
F55000, one vector and funding transfer once. No freshness reset, new bank dot,
income or target100000/140000 from double counting already existing funds.

## HB19-D07 Exact F-009 carry and historical close

Proof U/P; BR-03/05/08; F-009.
GIVEN Oct20 actual B60000,A{Oct60000},same unpaid O1R50000,S0,F10000;
October close has endNULL/lastOct20/B60000 and original full refs.
WHEN November opens, inspect before consent, then confirm technical CARRY toNov
and later actual B10000/A{Nov10000} pays50000 with valid affirmation.
THEN before carry no old cash eligible inNov; after carry B60000/RNov50000/F10000,
after payment B10000/R0/F10000; original October A60000/R50000/F10000 IMMUTABLE.

## HB19-D08 No implicit mode or fallback

Proof U/P/C; BR-05/10; HB2-044.
GIVEN G before Jan5 update and draft actual8000; no transition choice.
WHEN view/leave or submit transition without mode; separately attempt unsupported
multi-source CARRY with same numerical fresh-start vector.
THEN view NONE, missing choice TRANSITION_CHOICE_REQUIRED (presentation refusal),
unsupported A OWNER_POLICY_REQUIRED/NONE; no default B/DEFER, B10000/A4000+6000
remain. Explicit B remains independently available.

## HB19-D09 Full carry with existing target and future

Proof U/P/C; BR-03/05/07; HB2-037/038.
GIVEN Nov28 B89000,A{Nov40000,Dec48000,Jan1000},O1RNov30000,S1SNov5000,
target O2RDec2000/S2SDec1000, future S3SJan500, all identities distinct.
WHEN Dec2 actual equal89000 and explicit CARRY confirm A{Nov0,Dec88000,Jan1000}.
THEN RDec32000,SDec6000,FDec50000,SJan500/FJan500,sumF50500;
target/future exact identity refs retained once, source O1/S1 funding moves once,
sumA89000 and no cash debit/recreation/release.

## HB19-D10 Negative source free still carries fully

Proof U/P; BR-03/05/07; HB2-025.
GIVEN Nov28 B10000,A{Nov10000},O1 unpaid20000,S0,FNov-10000.
WHEN Dec1 single-source REUSE_CONFIRMED CARRY confirms A{Dec10000}.
THEN same O1RDec20000/FDec-10000,B10000/date/count unchanged; no OWNER_POLICY_REQUIRED
because of F<0, reserve cap, payment/release or conversion of10000 deficit into
another liability. Any new negative A still invalid independently.

## HB19-D11 Fresh start across missing December

Proof U/P/C; BR-01/05/08; HB2-039/040.
GIVEN G initial C0/V0, no December observations.
WHEN Jan5 actual8000,explicit FRESH_START/full vector{Jan8000} confirms once.
THEN one C1/count2,V1/decision, not-carried{Nov4000,Dec6000} with old/new refs,
FJan8000, no transfer row/intermediate C/V/close. Historical Nov4000/Dec6000
effectiveNov20 persist,endNov30/endDec31NULL, D=-2000 not expense/debt.

## HB19-D12 Fresh start keeps zero-cash old earmarks and future

Proof U/P/C; BR-03/05/07; HB2-041/042/046.
GIVEN Nov20 B10000,A{Oct0,Nov4000,Dec4000,Feb2027:2000}; O1 unpaid3000 fundedOct,
S1 retained1000 fundedDec,S2 retained500 fundedFeb; no December check.
WHEN Jan5 actual8000+FRESH_START confirms A{Oct0,Nov0,Dec0,Jan6000,Feb2000}.
THEN O1/S1 fundedJan,R3000/S1000/FJan2000,S2Feb500/FFeb1500,sumF3500;
decision includes earmark-only Oct0 and all past values, full identities/origins
retained, no intermediate updates, Jan B8000/future2000 count once.

## HB19-D13 Fresh start deficit and explicit savings alternative

Proof U/P/C; BR-03/05/07; HB2-042/043.
GIVEN G initial plus O1 unpaid9000 fundedNov,S1 retained2000 fundedDec.
WHEN Jan5 actual8000+FRESH_START with all past earmarks fundedJan.
THEN R9000/S2000/FJan-3000,B8000; no partial reserve/auto-release. Independently,
base O5000/S3000 gives F0 after reset; requested same-S release2000+funding at one
position refuses SAME_IDENTITY_COMPOUND_NOT_SUPPORTED/NONE, not implicit F2000.
A separately chosen normal release after a completed reset gives S1000/F2000,
with its own explicit audit; app never auto-splits the rejected compound.

## HB19-D14 Defer does not move funding

Proof U/P/C; BR-02/05/07; HB2-034/035.
GIVEN D04 initial B90000,A{Nov40000,Dec50000},O1RNov30000,S0.
WHEN Dec2 actual84000+DEFER confirms A{Nov34000,Dec50000}; then explicitly review
a refreshed REUSE_CONFIRMED+CARRY against that committed head.
THEN defer B84000/count2,RNov30000,FNov4000/FDec50000,no transfer/funding move;
later technical carry B84000/count2/A{Dec84000},RDec30000/F54000, no second6000
cash effect. Trying old A summing90000 with84000 rejects rather than auto-sweeps.

## HB19-D15 Same and disjoint typed identities

Proof U/P/C; BR-02/05/07/10; accepted Q-HB17-01.
GIVEN T, source O1/S1 and distinct current O2 unpaid2000, same numeric UUID
can appear in OBLIGATION and SAVING namespaces only when each scoped identity exists.
WHEN combine carry O1/S1 with explicit O2 cancellation; independently pay/release
O1/S1 while moving its own funding at the same position.
THEN disjoint case commits one supported HB-017 update,RDec30000/S5000/F55000;
same typed identity case refuses/NONE with draft retained. No namespace collision,
fake date/position, automatic second save or weakening predecessor SQL constraints.

## HB19-D16 Stale target and changed dependencies

Proof U/P/C; BR-05/10; HB2-015/024/038.
GIVEN D09 proposal pins source/target/funding/future vector and revision.
WHEN independently change balance/target funds/funding ref or January1000,
then confirm; separately advance target December→January with no account write.
THEN STALE_REVISION/STALE_PROPOSAL or TARGET_PERIOD_CHANGED,NONE after rival;
no automatic adding new target/source values. Refreshed review required, equal
B89000 alone never proves freshness.

## HB19-D17 Transition retry race and rollback remain intact

Proof U/P; BR-02/05/10; HB2-014/045.
GIVEN D04 CARRY and FRESH_START previews at same base revision for actual84000.
WHEN one confirms, retry exact same request, alter same-key mode, confirm rival
concurrently, or inject audit/deferred SQL/acknowledgment failure separately.
THEN one C/V/decision/funding result,R30000/F54000; retry original only,
payload conflict/stale refuses, known failures rollback whole batch, unknown outcome
uses original status/replay. Existing semantic proposal replay stays calendar-independent.

## HB19-D18 Calendar boundaries and precision

Proof U/P; BR-01/08/10; HB2-023.
GIVEN Oct25 observations B10000 at00:30Z and B9900 at01:30Z with full vectors;
date-only alternative and Nov30 23:30Z observation B9800.
WHEN convert/select in Berlin and close October/November; test Mar29 local02:30
without valid instant, Feb2028 leap29/Feb2026 day28 and Dec31→Jan1 separately.
THEN repeated02:30 offsets+02/+01 ordered by known instants, laterB9900;
Nov30 23:30Z isDec1 so cannot be November end9800; date-only staysNULL, invalid
local time refuses, month/day operations use civil dates not elapsed24h.

## HB19-D19 Nonnegative cash and exact cents

Proof U/P; BR-05/10/11; HB2-017.
GIVEN B8000/A{Dec8000},R/S0 and a valid separate B1/A{Dec1} fixture.
WHEN submit A{Dec9500,Jan-1500},B<0, fractional/wire number, overflow beyond
9223372036854775807, or allocations summing7999/8001.
THEN typed money/sign/sum refusal/NONE, no repair by expected receipt or cap;
valid one-cent transfer stays B1/sumA1 with exact F1 and same bank observation.
Negative F from full R/S remains valid and distinct from negative A/B.

## HB19-D20 Future cash and safe main use max

Proof U/P/C; BR-04/05/11; D36–D39.
GIVEN Nov28 B50000,A{Nov40000,Dec10000},RNov30000/SNov5000,RDec2000/SDec1000.
WHEN render current account and closing entry, with expected future receipt99999
present only as unsupported external draft metadata.
THEN E35000/3000,T45000,L/safe5000,n3,daily1666/remainder2;
not T48000 from A+E, no future expected cash or old cash automatically added.
Unknown state has no numeric0; old complete state remains dated/informational.

## HB19-D21 Multi-source carry exclusion and explicit future edit

Proof U/P/C; BR-05/10; HB2-016/038/046.
GIVEN Dec1 B90000,A{Oct10000,Nov30000,Dec50000},ROct5000/RNov10000,S0.
WHEN request generalized simultaneous CARRY; independently choose actual90000
FRESH_START/full A{Dec90000}; separately alter D12 futureFeb2000→1000 explicitly.
THEN A path OWNER_POLICY_REQUIRED/NONE; explicit B succeeds RDec15000/F75000
without serial carries/closes. D12 explicit future edit may give AJan7000/Feb1000,
FJan3000/FFeb500,sumF3500; unreviewed future sweep/omitted earmark refuses.

## HB19-E01 Locale labels and unknown values

Proof C; BR-01/08/10.
GIVEN A02 report and A04 no-observation/actual-zero branches.
WHEN render RU/DE/EN in light/dark/system themes.
THEN lastNov20/B80000 and endUNKNOWN are distinct, A60000/R30000/F30000 effective
Nov20 labeled last confirmed state; no-observation has NULL A/F, real zero shows0.
Dates/currency use existing formatters, no hardcoded untranslated finance copy,
false final spending/complete activity or live balance substituted into report.

## HB19-E02 Accessible report review and version selection

Proof C; BR-08/10.
GIVEN C03 reports and before/after diff endNULL→76000/F30000→26000.
WHEN keyboard through version links, preview, confirm, cancel and error paths.
THEN semantic labeled controls, visible focus, correct version/current selection,
polite loading/result messages; focus first error, receipt on success, trigger on
cancel. Headings/table or description semantics preserve exact before/after meaning.

## HB19-E03 Responsive long-content comparison

Proof C; BR-08/10.
GIVEN A02 plus long Unicode title/reason within approved bounds, C02 diff.
WHEN render 320/375/1280 widths and200% zoom across three locales/themes.
THEN B80000/endUNKNOWN/A60000/R30000/F30000 and changed76000/26000 readable,
no clipped confirm, horizontal document overflow, color-only status or focus trap;
wrapping does not hide amounts/versions, reduced motion respected.

## HB19-E04 Memory draft and stale errors

Proof C; BR-08/10; accepted Q-HB17-03.
GIVEN B01 draft/review, then server returns STALE_REVISION or transient safe error.
WHEN error arrives or user navigates with unsaved review.
THEN keep entered reason/context in scoped memory, explicit refresh/review action,
no automatic confirm/new K/default transition or localStorage/sessionStorage/IndexedDB.
Unknown outcome keeps original q/payload; no recovery promise after crash/OAuth.
Current B80000/R30000/FNov30000 unchanged on known refusal.

## HB19-E05 Unauthorized and malicious display input

Proof U/C; BR-10.
GIVEN B13 foreign/unknown IDs and A02 title containing synthetic HTML/script text.
WHEN direct action calls bypass page guard, session expires during review, or
reason/title render attempts HTML injection/open redirect/external evidence URL.
THEN every read/write/status authorizes; safe access error and no private report
values; text is escaped, no executable HTML/foreign fetch, no membership oracle.
Amounts B80000/F30000 never enter logs/error URLs/analytics or client persistent storage.

## HB19-E06 Independent closing and budget sessions

Proof C; BR-05/08/10.
GIVEN T, existing mounted HB-017 draft and month report preview in same owner scope.
WHEN choose month transition entry, then separately confirm close while budget
preview remains open; switch authenticated owner/scope afterward.
THEN entry reuses existing screen/editors/actions, no parallel financial save;
close only changes report/revision, stale budget preview requires review.
No draft cross-scope leakage or automatic B90000 carry from closing action.

## HB19-E07 Safe URLs and paged version list

Proof U/P/C; BR-08/10.
GIVEN C03 chain plus synthetic versions up to approved bounded chain limit.
WHEN load default/latest, `period`/positive `version` selection, page50 summaries,
malformed/duplicate query values or unsupported report schema.
THEN exact chosen report values/refs, no source manifest truncated for integrity;
invalid query/proof safely refuses, never exposes foreign IDs. URL contains only
period/version/read navigation, not B75000, reason, q or evidence/account identifiers.

## HB19-E08 Browser closes with unknown end

Proof B; BR-01/08.
GIVEN authenticated owned isolated local app seeded BN from actual server D,
H=end(P)<D, no final-day check/PDF.
WHEN real browser opens P, previews UNKNOWN end, confirms reason once,
reloads and opens version1.
THEN production v1/head persisted,CLOSE, last=d(P,20)/B80000,A/P60000/R30000/F30000,
endUNKNOWN, no forced transactions/check or current financial changes. Record
actual actions/screenshots and storage evidence; component execution is insufficient.

## HB19-E09 Browser late fact and explicit versions

Proof B; BR-08/10.
GIVEN BL: E08 v1 for P, actual C2 on D and late C30/V30 observed end(P), accepted
through supported fact boundary with actual recording/order on D.
WHEN browser sees pending, previews v2, cancels, then re-previews/confirms and
chooses v1/v2 explicitly.
THEN cancel leaves v1/endUNKNOWN, confirm publishes v2/end76000/F26000 with reason,
v1 stays80000/60000/30000/endNULL, defaultv2,current C75000/R30000/F45000.
Record real before/after navigation, no automatic report creation by load.

## HB19-E10 Browser actual carry and explicit reuse

Proof B; BR-01/02/05.
GIVEN two independent BT fixtures derived from server D: actual branch S0 and
reuse branch S5000; source P ended, target C current.
WHEN real browser enters actual84000/full vector/CARRY, reviews funding and
confirms once; separately choose REUSE_CONFIRMED transfer-only in BT/S5000.
THEN first B84000/count2/dateD/R30000/F54000; second B90000/count1/date=d(P,28)/
R30000/S5000/F55000. Neither silently selects mode by amount or sends two saves.

## HB19-E11 Browser missed months and defer

Proof B; BR-03/05/07/08.
GIVEN BG with completed Q/P and O9000/S2000, independent BT/S0 for changed-balance
DEFER; both use actual server D, no fixed Jan5/Dec2.
WHEN browser chooses FRESH_START at actual8000/reviews all past refs/deficit,
then independently DEFER at84000 with reviewed A{P34000,C50000}.
THEN reset R9000/S2000/F-3000 with one update/no synthetic missed-P observation;
defer retains R/P30000,F/P4000,F/C50000,no funding move. No preselected mode,
auto-release or close prerequisite; each action has its own recorded evidence.

## HB19-E12 Browser auth origin recovery and unknown result

Proof B plus P for durability; BR-10.
GIVEN owned BN local review with H=end(P)<D and controlled session expiration/origin rejection,
separate commit-acknowledgment-loss fixture.
WHEN use direct action/expired session, foreign Origin mutation, unknown-result
status and explicit original-key retry through actual app.
THEN unauthorized/CSRF calls reveal nothing and make no writes; durable unknown
q resolves to exactly one v1/endNULL/F30000 without new-key duplicate. Do not
disable OAuth/session/CSRF or reuse HB17-A03 as proof of a specific provider failure.

## HB19-E13 Browser keyboard and assistive technology

Proof B; BR-08/10.
GIVEN BN report/BL revision review/BV versions with elapsed P in all three locales.
WHEN actual keyboard-only preview/version/cancel/confirm/error navigation and
screen-reader review, including reduced motion and200% zoom.
THEN labeled UNKNOWN end vs last80000, before/after F30000→26000 understood,
focus/status/confirmation accessible, no trap/occlusion/color-only meaning.
Record browser/AT/version used; physical screen reader not run is explicitly
NOT EXECUTED, not inferred from DOM assertions.

## HB19-E14 Browser viewport themes privacy and navigation

Proof B; BR-08/10.
GIVEN BV v1/v2/v3 for elapsed P plus long titles, actual-D local synthetic-only runtime.
WHEN browser journeys at320/375/1280 widths in RU/DE/EN light/dark/system,
reload/back/direct period-version links and inspect URL/storage/network/log behavior.
THEN correct persisted v1/v2/v3 values and current B75000, no clipped controls,
unsaved memory limits honest, no financial persistent cache/URL/log disclosure,
cross-scope remnants or page-open writes. Record every variant or mark it NOT EXECUTED.

## HB19-R01 Cross-instance exact-content confirmation

Proof U/P; High1; supplements B01/B05/B12.
GIVEN B01 N preview served by instanceA, HNov30/K10/revision10/headNULL,
full candidate/diff digests and exact consent envelope; fresh instanceB has no
process-shared preview key/cache. PG uses the elapsed-period equivalent.
WHEN authenticated owner confirms exact command/confirmed=true on B after A exits;
independently omit consent, alter scope/H/K/head/reason/request/content digest,
or commit a rival write before confirming the original command.
THEN valid case commits v1 once/endNULL/A60000/R30000/F30000, independent of
instance affinity; invalid cases refuse/NONE from their starting baselines.
Digest authenticates no caller and proves no UI visit; server rebuild/auth/CSRF/
explicit exact-content consent all remain mandatory. No secret/store/schema addition.
Candidate checksum excludes generated report/update IDs, commit time/seq/closedAt
and preview timestamp; expected head/version and all immutable source IDs remain
bound. Different process clock/random UUID output cannot stale an unchanged review.

## HB19-R02 Server cutoff and durable recovery across instances

Proof U/P; High1; supplements B09/B10/C13.
GIVEN R01 review generated at server instant tPreview, unchanged H/K10 and exact
command, tConfirm later on B; current B80000, R30000/FNov30000.
WHEN confirm on B captures its server tConfirm for evidenceRecordedCutoffAt,
actual commit succeeds but acknowledgment is lost; then status/exact original-key
retry runs on new instanceC after restart/date/head changes.
THEN report K10/cutoffAt=tConfirm (server-captured boundary, not browser preview
time), commitSeq11 and original receipt/v1 once; no duplicate or key-dependent
failure. Client knowledgeCutAt/previewProof fields reject, informational
previewGeneratedAt never becomes trusted persistence. Exact durable audit/source
proof precedes new-action freshness/time checks. Unknown outcome is not NONE.

## HB19-R03 Full large report retrieval within wire limit

Proof U/P/C; Medium1; supplements A13/E07.
Owner-authorized MINIMAL acceptance correction (2026-11-04, after R2): exact8MiB
PostgreSQL persistence is no longer required. Two independent profiles exceeded
the unchanged source budget before report construction. No new exact8MiB fixture
or reachability research is required. Earlier failed/unexecuted exact8MiB PG
stages remain historical; they must never be relabelled PASS. Only this test
acceptance changes; production bounds and financial behavior remain unchanged.

GIVEN the existing admissible A02 PG fixtures with A60000/R30000/F30000/endNULL,
canonical reports exactly1048576 and1048577 bytes, all joint bounds satisfied.
WHEN production preview/confirm and complete131072-byte chunk reads on another
reader instance THEN the entire report, source manifest, audit/digest and atomic
closing guarantees hold. Reassembly bytes/length/SHA-256 match the canonical
report; each response including base64/metadata<=1048576. Existing B01/C12 and
proof-integrity cases supply independent atomic/audit/manifest evidence without
duplicating financial fixtures.1MiB+1 is the large admissible PG round-trip proof.

Separately GIVEN existing codec/protocol fixtures exactly1048576,1048577,8388608
bytes, with multibyte characters crossing raw chunk boundaries, WHEN encode/read
complete streams THEN no truncation/replacement;8MiB takes64 chunks and verified
bytes/length/SHA-256 match.8388609-byte codec content refuses before use. This
is U/C evidence, not a PostgreSQL8MiB persistence claim.

Reuse the already measured R2 source-overflow profile as a negative PG case,
without calibration/search or a new fixture. WHEN production preview and confirm
exceed source admission THEN REPORT_LIMIT_EXCEEDED and full NONE: all20 scoped
table/user/account baselines unchanged, no root/report/head/audit/receipt/counter
append. Existing report/work/audit limits and financial invariants remain. Codec
refusal and PG source rollback are separate guarantees, not proof that a source-
admissible oversized report was persisted. No new PG test is required where
existing equivalent coverage suffices.

## HB19-R04 Per-cut quadratic and total operation work

Proof U/P; Medium1; supplements A13.
GIVEN A02 amounts unchanged and valid bounded contexts with actual preflight
workRows W:2000 or2001, total rows below20000; separately two distinct H/K contexts
W1500 each, or W1000 each. Whole-operation cost is sum(W_i²)+V including repeated
serialization/source/audit/chain visits, not just one context's count.
WHEN evaluate admission before expensive loops/loads, then exact total-cost
4000000/4000001 fixtures with other limits safely below threshold.
THEN primitive W2000 passes/W2001 refuses; full W2000+V>0 refuses, two1500 refuse
4500000 before V, two1000 may pass only if V<=2000000. Exact total4000000 passes,
4000001 refuses/NONE. Same-cut cached-within-request reuse is charged once only
when identical validated work is actually reused; repeated work is charged again.
No partial candidate, truncated history or weakened existing guard.

## HB19-R05 Version-chain aggregate cost and continued old reads

Proof U/P; Medium1; supplements C06/E07.
GIVEN valid structural chain999/1000 links, selected original report endNULL/F30000,
bounded chain metadata/audit bytes and distinct selected-root original H/K sources;
other live history later grows beyond original K. Each successor has meaningful
supported synthetic changes/reason/evidence, no no-change versions to inflate count.
WHEN read version1/latest, preview/confirm next version, or independently exceed
1000 links,1MiB aggregate metadata/audit or sum(W_i²)+V threshold.
THEN supported reads validate linear chain metadata plus selected payload at its
original H/K, not1000 full history replays. Version1001 or other excess refuses
before append/NONE; no accepted report made unreadable by new live K or by
single-response1MiB cap. Equal1000-link case still must satisfy bytes/work;
max-count is not permission to exceed aggregate cost. Changed limits/corruption
are explicit errors, not silently skipped ancestors or fake full-evidence proof.

## HB19-R06 Server-relative browser fixture admission

Proof U/V plus B on actual date; Medium2/3; supplements D01/E08–E14.
GIVEN actual server D and BN/BL/BT/BG/BV mapping; pure parameter cases D=2026-11-01,
2027-01-01,2028-03-01 and2026-03-01; cents80000/75000/76000 and fresh8000 unchanged.
WHEN validate manifests for each date with civil primitives, then prepare actual
local browser fixture from its real server D; independently inspect both D01 branches.
THEN every P/Q month has ended, observation dates<=D, actual transition target=C,
late actual date=end(P), no future day2/3/Jan5, leap/year handling exact; BN/BL have
C period for their C allocations. D01a retains existing target row/D01b has no
target refs and stays virtual on read. Record actual dates; pure dates do not count
as browser executions. Month-crossing new action requires refreshed review, while
unknown COMMIT retains original-key recovery, no clock override/guard bypass.

## HB19-R07 Paged proof tampering isolation and bounded repeated work

Proof U/P/C; Medium1/High1; supplements B13/E05/E07.
GIVEN R03 valid large PG version and separate8MiB codec/protocol stream, exact
scoped digest/length and128KiB chunks; valid
large review with unchanged A60000/R30000/F30000/endNULL at pinned K/head.
WHEN read on different instances, alter version/digest/offset/length or use foreign
scope, corrupt source evidence after fixture setup, then change head during review.
THEN each request fully validates selected root/chain before disclosure within
aggregate budget; foreign/invalid/corrupt input refuses without oracle/partial
valid-report display; review pages refuse stale rather than mixing candidates.
Client reassembly rejects gap/overlap/missing/changed bytes before complete parse;
no confirm from partial hidden changes. Full64-chunk retrieval has64 independently
bounded validations, up to64*4000000 work units; record real costs/latency and
bounded concurrency, never claim one4M validation for the whole transfer. NONE.

## HB19-F01 Final pure and component regression

Proof U/C/V; BR-01–11.
GIVEN final implementation and scenarios with N/L/T/G exact cents above.
WHEN after last source/test/normative change run full lint,typecheck,build,
UTC unit/component suites with fresh reporter evidence.
THEN all required executable IDs genuinely pass with source fingerprint/exit codes,
old HB-008–018 invariants and accepted limitations retained; no skipped failures,
source-mutating workaround, fake PASS or counts combined across overlapping subsets.

## HB19-F02 Final real PostgreSQL regression and migrations

Proof P/V; BR-08/10/11.
GIVEN reviewed owned disposable loopback PG with all3 URL overrides/local markers,
actual migration0000–0005 chain and synthetic N/L/T/G fixtures.
WHEN apply/reapply migrations, full integration and isolated DB17 after final change.
THEN real SQL v1/v2/v3, locks, deferred rollback, exact replay/ack loss and row
baselines pass; no mock SQL substitute, .env/Neon/production/foreign container
access or reused persistent data. Record actual counts, versions and safe logs.

## HB19-F03 Timezone and cents parity

Proof U/V; BR-01/04/10.
GIVEN final UTC reporter and reviewed calendar/closing finance timezone subset.
WHEN execute same subset in America/Los_Angeles with injected Berlin dates,
fixed Nov30→Dec1/Jan rollover, leap/DST and one-cent/range variants.
THEN exact test identity parity/results and bigint fixture amounts match;
no host-timezone bleed, elapsed24h date arithmetic or fallback0 for unknown states.
Record separate subset result rather than claiming another full test-suite run.

## HB19-F04 Honest finance gate and traceability

Proof U/V; BR-08/10/11.
GIVEN all46 HB2 rows and F-00960000/50000/10000,F-013R10000 branch mapping below,
fresh actual unit/integration/timezone reports and final source hashes.
WHEN register HB19 parser/contexts/mappings and run existing finance checker.
THEN gate green only for exact executed reviewed obligations; altered/missing/
skipped/stale/ambiguous evidence fails. HB2-018 PDF and unsupported compound
branches remain explicitly deferred/refused; seeded report storage is not close API proof.

## HB19-F05 Artifact manifest and review ZIP

Proof V.
GIVEN final synthetic-only diff and real execution artifacts including q/r/counts,
safe browser evidence/status and exact source fingerprint.
WHEN prepare later owner-approved ignored manifest/ZIP for independent review.
THEN exact included paths/SHA256/sizes/commands/exit codes match final source;
no .env/secrets/private data/node_modules/cache or stale evidence, no replacement
of existing tmp ZIPs. Review can reproduce test inputs and inspect full failures.

## HB19-F06 Independent review and owner gate

Proof V.
GIVEN plan/scenarios then later final implementation/proof for values above.
WHEN independent ChatGPT reviewer checks finance/security/history/actual app and
owner evaluates findings and any NOT EXECUTED browser variants.
THEN record separate plan review, implementation review, actual test author and
owner acceptance; no agent self-review masquerading as independent review.
No implementation before separate owner permission or statusDone without evidence.

## HB19-F07 Document-only integrity and safe worktree

Proof V, permitted in this planning turn.
GIVEN two new HB-019 Markdown documents and main baseline3288ce91, existing ignored files.
WHEN check strict UTF-8, all91 unique IDs/GIVEN/WHEN/THEN, all46 HB2 references,
links/anchors, exact bigint equations and whitespace/final git status.
THEN only those two documents changed, TASKS remainsPlanned, code/schema/tests/
coverage untouched, ignored files preserved; no runtime suite/commit/push/PR/Neon
access. Report document results separately from future U/P/C/B evidence.

## Complete HB2 traceability to planned test titles

Each target is the exact title defined above through its unique ID. Execute the
whole GIVEN/WHEN/THEN and each independent alternative, not merely one assertion
that shares an ID. This table does not amend historic mapping or declare PASS.

| Normative source | Planned HB19 test titles by ID | Branch disposition |
|---|---|---|
| HB2-001 | A01 | Exact76000/56000/30000/26000 end-date close. |
| HB2-002 | A02 | Exact80000/60000/30000/30000 unknown end. |
| HB2-003 | A03, D04 | Exact75000 after80000; combined84000 path separately. |
| HB2-004 | A03 | Close after carry selects old H, not live funding. |
| HB2-005 | C14 | Close before carry/payment; retained bytes/refs. |
| HB2-006 | C01, C05 | Pending and abandoned preview, no v2. |
| HB2-007 | A08, C01 | Historical76000 preserves newer75000. |
| HB2-008 | C02 | Explicit v2/diff, original intact. |
| HB2-009 | A06, C14 | Historical unpaid vs later fully paid; exact10000 variant also required under these titles. |
| HB2-010 | D06 | Transfer-only full30000/5000 into90000. |
| HB2-011 | D06 | No new C/date/count/freshness. |
| HB2-012 | A07 | Same-day C/V/payment order. |
| HB2-013 | C10 | Coherent accepted suffix candidate and unsafe original-payment conflict refusal distinguished. |
| HB2-014 | D17 | Same-request and identical-confirmed-proposal replay; altered q/proposal conflicts. |
| HB2-015 | D16 | New85000/35000+50000 exact variant required, refreshed target85000/R30000/F55000. |
| HB2-016 | D21, A04 | Multi-source exclusion; explicit B; own-H independent no-observation close. |
| HB2-017 | D19 | Negative A even with exact sum. |
| HB2-018 | C12 | Pure evidence/nonposting/diff; real operation/PDF match integration remains HB-024–026 deferred. |
| HB2-019 | A08 | Exact old/new K and retained v1. |
| HB2-020 | A03, E01, C12 | No invented expense/gross zero/interpolated bank values; future statistics/PDF integration excluded. |
| HB2-021 | A07 | Ambiguous placement and explicit before/after variants. |
| HB2-022 | C03, C08, C09 | Correction-of-correction, stale fact tip, one rival report winner. |
| HB2-023 | D18 | Repeated/missing hour and UTC/Berlin month boundary. |
| HB2-024 | D16, D17 | Rival proposals and changed calendar with unchanged revision. |
| HB2-025 | D10 | Negative free full reserve, ordinary carry allowed. |
| HB2-026 | A04, B03 | Missing vs real0; early close. |
| HB2-027 | A10 | Old-anchor refusal and reviewed coherent remedy. |
| HB2-028 | B01, B07, B08, B10, B11, B13 | Actual authorized closing transaction, replay/rollback/privacy. |
| HB2-029 | A06, C14 | Exact historical partial/cancel/release state selection. |
| HB2-030 | A09 | Date correction resolved at K before H. |
| HB2-031 | D04 | Actual84000 carry in one batch. |
| HB2-032 | D05 | Equal90000 actual creates real C. |
| HB2-033 | D01 | Calendar/read/draft abandonment NONE. |
| HB2-034 | D14 | Exact DEFER equal90000 and changed84000 variants. |
| HB2-035 | D14 | Refreshed technical carry no second bank effect. |
| HB2-036 | A02, D04 | Nov28/90000/40000/30000/10000 exact variant, endNULL. |
| HB2-037 | D09 | Original target/future-only variant must also assert R30000/S5000/F53000,FJan1000,sumF54000; S0 alternative58000/59000. |
| HB2-038 | D09, D16, D19, D21 | Wrong sum/omitted S/stale refs/negative untouched A; separately reviewed target89000/Jan0. |
| HB2-039 | D11 | Exact skipped-month G8000. |
| HB2-040 | A05 | Dec6000 from pre-period V, no Dec check. |
| HB2-041 | D12 | Exact original7000/outstanding5000 variant required: JanR5000/F3000 and historical NovF-1000. |
| HB2-042 | D13 | Exact9000/2000/-3000 full earmarks. |
| HB2-043 | D13, D15 | Baseline reset preserves S3000/F0; same-S release+funding refused by later accepted HB-017 restriction; separate explicit release and disjoint supported alternative. |
| HB2-044 | D08 | No default/fallback, explicit DEFER distinct. |
| HB2-045 | D17 | FRESH_START exact84000 variant with replay/competing carry/mode conflict/rollback. |
| HB2-046 | D12, D21 | Past A0 earmark, all old periods, untouched future; explicit future edit separately. |

Additional exact variants specified by this crosswalk belong to the referenced
case's executable title as named parameter variants; do not omit them because a
broader fixture appears in its heading. Unsupported branch assertions prove safe
refusal, not the missing operation's successful implementation.

| Other authority | Planned proof |
|---|---|
| F-009 | D07 exact60000/50000/10000 pre/post consent and immutable October; A03/C14 reinforce as-closed separation. |
| F-013 | C07 exact initial reserve10000/new12000 and immutable v1/v2; C02/C03 version metadata/correction chain. |
| HB-013 T13–28/T31–45/PG-P; HB-017 U/P | D04–17/D21, B09, C14; retain existing exact funding/control/replay/SQL tests. |
| HB-014 max protection/freshness/bounds | D18–20,A13,A14,F03; no alternative forecast or copy of unknown state as0. |
| HB-017 disjoint/same identity and memory draft | D13/D15/E04/E06/E12; accepted exception HB17-A03 unchanged. |
| HB-018 original proof/history/draft/privacy | A11/A12/A14/E04/E05/E14; prior B01–B07 NOT EXECUTED never counted as new browser proof. |

## R1 finding-to-proof resolution

| Review finding | Corrected contract / scenarios | Review state |
|---|---|---|
| High1 | Stateless reconstruction/explicit authenticated exact-content consent; server confirm cutoff, no required HMAC/secret/store. B05/B10/R01/R02/R07 retain scoped H/K/head/replay/unknown-COMMIT proof. | Corrected proposal, independent re-review pending. |
| Medium1 | Full8MiB reads over bounded pages/chunks; existing W²<=4M and aggregate sum+V, bounded chain metadata and original-root proof. A13/E07/R03–R05/R07. | Specification complete; runtime NOT EXECUTED. |
| Medium2 | Independent D01a existing-target T and D01b no-target-reference virtual period. D01/R06. | Corrected specification. |
| Medium3 | Actual server-date BN/BL/BT/BG/BV, all E08–E14 mapped to ended P/Q and current C; fixed-date pure tests separate. R06. | Corrected specification; browser NOT EXECUTED. |

## Execution and stopping rules

Planning currently permits only F07 document verification. U/P/C/B and runtime
F01–F04 remain NOT EXECUTED. No coverage.json edit, test implementation, schema,
ADR/BR/task status change, commit/push/PR or external financial access.

Future implementer must run meaningful targeted suites first, then after the LAST
source/test/normative change the full lint/typecheck/build/UTC unit-component/real
PG migrations-reapply/full integration/DB17/LA parity/HB-015 finance gate with fresh
fingerprints. Known rollback tests compare full baselines; unknown acknowledgments
prove the committed-or-not distinction through original-key status. Actual browser
and independent review are separate gates, each missing variant explicit. Retain
full safe logs/artifact manifest; owner acceptance never fabricated or inferred.

**STOP for independent ChatGPT plan review and separate owner implementation permission.**


## Implementation execution classification

Owner implementation authorization followed R1 approval. F07 above is the
historical planning-turn integrity check and must not be reused as a current
claim that only two files changed. Current source scope, worktree and artifact
integrity are recorded separately in the verification document. F05/F06 are V
checks outside the executable finance gate; independent implementation review
and Owner Acceptance remain separate and pending.

E08-E14 require a real browser/AT runtime and server-relative fixtures. Their
status is NOT EXECUTED when that runtime is unavailable; component assertions
never satisfy these B/V contracts. The finance registry records these explicit
verification statuses and does not count them as runtime passes.

The owner-approved closing-only period mode must retain the complete period-ID
closure at K, including future allocations and origin/funding/transition refs.
R05 regression additionally checks an original report after adding 1201 periods
beyond its K, identical full bytes/manifest/digest, missing and foreign referenced
period refusal, and unchanged current-reader period limits.

Execution naming correction: A07 uses the existing HB-010 typed refusal
ORDERING_CONFLICT for absent same-day placement; ORDER_CONFIRMATION_REQUIRED
was a planning label absent from the accepted runtime error union. No placement
rule, fallback or financial behavior changes.
