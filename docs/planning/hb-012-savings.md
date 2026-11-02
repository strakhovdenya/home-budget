# HB-012 — Savings events and release

Status: Done. Independently reviewed and accepted on 2026-11-02.
Branch: feat/hb-012-savings. Approved technical plan and evidence/ordering
clarifications are the authority, together with BR-01/02/05/07/08/10/11,
Accepted ADR0001–0003 and D05/D23–D39. Owner acceptance recorded on 2026-11-02.

## Scope and state

Private domain/server savings lifecycle, history, explicit voluntary release,
optional actual checkpoint composition, audited corrections and existing-report
impact. No UI, forecast API, operation/payment ledger, PDF, funding transfer,
CARRY/FRESH_START, account transfer, OAuth or dependency change.

Immutable savings_goals stores identity/origin. Each savings_events revision
stores full amount/status/funding/title, predecessor/before-state, logical fact/
correction, effective date/position and confirmation. Batch FK supplies recording,
actor/request/reason. Required title is trimmed, 1–200 Unicode code points;
it distinguishes goals when choosing a release and remains revisioned metadata.

ACTIVE has amount>0; RELEASED has amount0 and is terminal for ordinary commands.
CREATE requires explicit positive amount and origin/funding periods. INCREASE
adds a positive confirmed amount. PARTIAL_RELEASE requires 0<release<retained;
FULL_RELEASE confirms the exact whole retained amount. AMEND changes title only,
rejecting no-ops and amount/status/funding fields. Reuse after release requires
a new identity. All money uses checked int64 bigint; wire money uses canonical
decimal-cent strings, never number. No new money codec or Result hierarchy.

S[p] sums one selected ACTIVE state per identity funded by p. S may exceed A;
R+S may exceed B. F=A-R-S may be negative; no cap or automatic release. All
period sums and the combined savings total are checked for overflow. F/forecast
production API remains HB-014. Saving actions do not alter B/A/R or infer cash
activity. Known S can be read without a bank observation; no B/A/F is invented.

## Commands, evidence and atomicity

Reuse HB-009 envelope requestId/expectedRevision/effectiveDate/reason/payload.
Payload is {changes:[...]}, bounded to seven reviewed changes. Each has exact keys:
key, action, savingsId, expectedStateRevisionId, correctionId, previousChangeKey,
effectiveDate, data, placement, bankCheck. CREATE data is title/amountCents/
originatingPeriod/fundingPeriod; AMEND is title; financial actions are amountCents.
Nulls are explicit. New identity IDs are server-generated. Existing IDs/period
refs are scoped and checked. No client before/after/actor/owner is accepted.

Private wrappers createSaving/increaseSaving/releaseSavingPartially/
releaseSavingFully/amendSaving accept one ordinary standalone operation.
correctSavingHistory accepts reviewed action-preserving sets without bankCheck.
updateSavingWithActualCheckpoint accepts one ordinary savings change with an
actual complete HB-010 checkpoint input. No route, Server Action or generic
arbitrary-event endpoint is registered. Authenticated read query is exactly
{through,knowledgeCut}; null cut captures current account K once.

Every revision has exactly one SAVINGS_STATE audit whose entity.id is the exact
savings revision ID. Its versioned after-document stores savingsId,
savingsRevisionId, budgetUpdateId, action, confirmedIncreaseAmount,
confirmedReleasedAmount, beforeRevisionId/afterRevisionId, complete stateBefore/
stateAfter, effectiveDate/positionId, supersedesId and confirmedAt. Financial
confirmed amounts are canonical strings; absent kinds are explicit null.
Audit.before is the replaced revision for correction, otherwise the predecessor.
stateBefore always means the actual referenced predecessor, including correction.

Reader loads audits at the same K and requires exactly one match, correct
owner/account/batch/recordedSeq, exact IDs, canonical amounts, snapshots and
temporal provenance. Missing/duplicate/malformed/mismatching evidence refuses
HISTORICAL_SAVINGS_CONFLICT; no amount is reconstructed from state differences.
INCREASE evidence has the same protection as release evidence. Audit/history
immutability and original confirmation amounts survive corrections forever.

All writes reuse commitBatch, its account lock, authorization-before-replay,
matching-replay-before-stale, frozen command identity, mandatory audit/receipt and
single counter increment. Typed refusal throws via rejectBatch. Audit failure,
deferred SQL failure or invalid candidate rolls back every fact, receipt, counter,
bank head and report flag. Unknown COMMIT acknowledgement remains
COMMIT_OUTCOME_UNKNOWN; retry the identical request, never rebase/new key.

## History, suffix and ordering

Capture K, load immutable facts through K, resolve corrections, validate shared
ordering and lifecycle, then apply H and choose one maximal full state per identity.
No delta replay over today's state. Corrected events retain action/date/position,
identity/origin/funding and original confirmed increase/release amount. Reopening,
action-changing/reposition corrections conservatively refuse.

The whole resolved suffix is checked. Referenced before-state must equal its
immutable predecessor, and resolved sequence must reference the exact preceding
selected revision. Any changed predecessor requires an explicitly reviewed suffix
correction, otherwise full rollback. Original superseded revisions and evidence
remain readable at old K.

At most one NEW position per Berlin date per batch. Corrections reuse existing
positions; several same-day corrections can use their retained proven order.
Same-batch predecessor requires the same budgetUpdateId and strict historical
order by date/validated day manifest, never UUID/INSERT order/equal recordedSeq.
Co-located actual checkpoint/vector/savings use one position and one batch.
Two sequential savings actions cannot share a position. One batch increments
account revision/recordedSeq only once.

### S26 exact correction

K10: rC CREATE5000 on Oct02/p02. K11: rL PARTIAL_RELEASE confirmed2000,
previous=rC, before5000, after3000 on Oct20/p20. K12/b12 appends rI INCREASE
confirmed3000, previous=rC, after8000 on new Oct10/p10, plus rLC correction of rL
at retained Oct20/p20, previous=rI, before8000, confirmed release2000, after6000.
rLC supersedes rL with the same logical fact. b12 creates TWO savings revisions,
TWO distinct SAVINGS_STATE audits, one new p10 and necessary ordering facts.
Original rL and b11 audit are unchanged. Inserting rI alone refuses atomically.

| H | K | Revision / S |
|---|---|---|
| Oct01 | 12 | none / 0 |
| Oct02 | 11 | rC / 5000 |
| Oct10 | 11 | rC / 5000 |
| Oct20 | 11 | rL / 3000 |
| Oct02 | 12 | rC / 5000 |
| Oct10 | 12 | rI / 8000 |
| Oct19 | 12 | rI / 8000 |
| Oct20 | 12 | rLC / 6000 |
| Oct31 | 12 | rLC / 6000 |

Fixture production sequences include bank/bootstrap batches, so executable tests
pin actual k11/k12 returned by commits rather than fabricate account counters.

## Bank, obligations, proposals and month boundary

Standalone release preserves checkpoint/vector ID/count/date and bank freshness.
F-008: B/A40000,R20000,S5000,F15000 → release2000 → S3000,F17000;
one savings revision, no checkpoint or obligation change. A genuinely new actual
check at unchanged B40000 creates one real observation plus complete vector in
the same transaction, because the user checked the bank. No payment affirmation
or fake bank freshness is inferred from release. D03 payment rules stay specific
to obligations. Attached savings checkpoint corrections require joint review and
are refused by the standalone bank writer.

Shared insertHistoricalPosition is extracted from the obligation writer; shared
HB-010 ordering/correction/history and checkpoint-persistence are reused. Other
writers validate retained savings evidence/history and report impact when savings
exist. Obligation payment evidence/amount transitions are not reused for savings.

Pure proposeSavingRelease takes one explicitly selected ACTIVE identity, its
funding period, signed free and pinned revisions: suggestion=min(amount,max(0,-F)).
It writes nothing; decline/open/read does not change S. Confirmation is a separate
normal release command revalidated under lock. B/A10000,R8000,S5000,F-3000 gives
suggestion3000; confirmation yields S2000,F0. Other periods are not auto-selected.

Calendar opening retains identity/origin/funding/amount. HB-013 must explicitly
extend action allowlists and append reviewed funding full states tied to its
transition decision. No current action changes funding; no calendar sweep.
HB1-015/HB2-010 and the transfer part of HB2-029 remain future acceptance contracts.

## SQL and reports

One forward 0004 adds title, positive ACTIVE/action checks, unique original CREATE
excluding corrections, canonical before-state, date, same-identity lineage,
same-action/same-position corrections, valid amount/status/funding transitions
and terminal suffix guards. Existing 0000–0003 are unchanged. Existing ordering
logic is extracted to hb_position_before with the old obligation function retained
as a compatible wrapper. Same-batch lineage uses proven historical order. No
UNIQUE(previousRevisionId), new table or destructive migration is introduced.
Nonempty legacy savings events refuse migration, without invented metadata.

SQL does NOT prove audit completeness/consent, confirmed amount meaning, complete
JSON manifests, H/K or full suffix semantics. Direct-SQL evidence tests prove
trusted-runtime read/write refusal, not nonexistent SQL guarantees.

Report-impact reuses HB-010 bank/order proof and exact pinned savingsRevisionIds
plus historical S. All pinned identity refs must reproduce at closing K; only
period-relevant selected states/provenance and bank/vector changes mark that
report pending. Unrelated-period changes/new ordering IDs alone do not mark all
reports. Unsupported manifests/unexplained baseline drift refuse atomically.
Old snapshots, cutoff, source refs, closing pointer and versions remain immutable;
no auto-v2 or automatic clearing of an existing pending flag.

## Verification and limits

Scenario source: [HB12](../../tests/scenarios/phase-01/hb-012-savings.md).
Actual commands/results and changed-file inventory: [evidence](hb-012-verification.md).
Full histories/audits are currently materialized in memory; no production-scale
performance claim. HB-009 size/depth/node budgets can reject large reviewed sets.
No Neon/deployment/browser/e2e claim. Independent implementation review and owner
acceptance remain required; HB-012 is not Done.
