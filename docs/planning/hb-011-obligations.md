# HB-011 — Obligations: full reserve and lifecycle

Status: Done. Independent review completed; owner accepted HB-011 on 2026-11-02.
Branch: `feat/hb-011-obligations`. Authority: owner-approved initial plan and two
review clarifications in the implementation request, BR-01/02/03/05/06/08/10/11,
Accepted ADR0001–0003. Evidence: [verification](hb-011-verification.md).
Scenarios: [HB11](../../tests/scenarios/phase-01/hb-011-obligations.md).

## Scope and layers

Pure `domain/obligations` defines exact DTO validation, immutable full business
states, transitions, historical consistency, H/K selection and period reserves.
Features exposes an authorized read port. Infrastructure loads immutable facts
and audited payment evidence, writes through HB-009 and implements that port.
App composes HB-007 and the private boundaries; no action/route or generic event
endpoint is registered. Existing architecture directions are unchanged.

CREATE, AMEND, PARTIAL_SETTLEMENT, PAID and CANCELLED work without UI. No savings
workflow, funding transfers, CARRY/FRESH_START, forecast, recurring templates,
interest, ledger, import/PDF, OAuth or dependency change is included.

## State and invariants

`obligations` retains identity and immutable originating period. Every event stores
title (trimmed, nonempty, at most 200 Unicode code points), nullable Berlin dueDate,
original/outstanding bigint cents, status, isPossible, reserveFull and one scoped
funding period. Effective date/position, bankDate, confirmation and batch recording
coordinates are independent. Due dates may be in the future or past and never
change status, funding or reserve automatically.

UNPAID has positive original/outstanding; ordinary UNPAID always reserves fully.
Possible UNPAID explicitly chooses full reserve or zero. PAID has outstanding0
and reserveFull=false. CANCELLED preserves outstanding but reserves0. No reserved
amount/fraction input exists. `R[p]` sums selected full UNPAID remainder once per
identity. R may exceed A/B; no reserve cap or automatic S release exists.
F=A-R-S is signed and may be negative; full production F/forecast remains HB-014.
Checked int64 arithmetic and HB-008 codecs/calendar primitives are reused.

AMEND preserves settled=oldOriginal-oldOutstanding, with
newOutstanding=newOriginal-settled>0. Metadata-only AMEND is allowed. isPossible
changes require explicit reserve choice, and ordinary requires true. Partial
payment is strictly positive and less than outstanding; PAID explicitly confirms
the exact remainder. Terminal ordinary commands reject. Reviewed corrections
retain the original action; reopening/action-changing corrections are excluded.

## Private command contract

Existing HB-009 envelope: requestId, expectedRevision, effectiveDate, reason,
payload. Money accepts canonical decimal cents or bigint, never number. The same
normalized frozen command graph drives hashing and decoding. Client owner/actor,
before/after snapshots and unknown fields reject. Original wire identity is
preserved for retries; counters/receipts/errors remain HB-009's contract.

Payload is `{changes:[...]}`, one to seven explicitly reviewed operations. Each
operation has the exact fields below, including explicit nulls:

```text
key, action, obligationId, expectedStateRevisionId, correctionId,
previousChangeKey, effectiveDate, bankDate, data, placement,
bankCheck, paymentConfirmation
```

CREATE data: title, dueDate, originalCents, isPossible, reserveFull,
originatingPeriod and fundingPeriod (YYYY-MM). Identity is server-generated;
correction CREATE specifies the existing obligationId/correctionId.
AMEND data is a nonempty subset of title/dueDate/originalCents/isPossible/reserveFull.
Omitted AMEND fields retain their value; dueDate:null explicitly clears it.
Settlement/PAID data is `{amountCents}`; CANCELLED data is `{}`.
Ordinary existing events name expectedStateRevisionId. Same-batch reviewed
dependencies instead name an earlier operation key in previousChangeKey.

`createObligation`, `amendObligation`, `settleObligationPartially`,
`markObligationPaid`, `cancelObligation` restrict their action and disallow
corrections. `correctObligationHistory` accepts the bounded reviewed set privately.
Read query is exactly `{through:BerlinDate,knowledgeCut:decimalString|null}`;
it is copied before async authorization. Null cut captures the account K once.
Read active filters UNPAID only after selecting full states.

## Payment and transaction boundary

Option A: one existing account-locked HB-009 commitBatch. A fresh actual bankCheck
uses the complete HB-010 input, a real observation, full vector and reviewed
placement. Payment and its checkpoint/vector are co-located, with equal effective
and observation dates. Optional bankDate stays separate. No bank operation/debit
is posted. OUTSIDE_TRACKED_CARD requires a real fresh confirmation with B equal
to the preceding chronologically valid observation and explicit unchanged-balance
acknowledgment. Missing prior observation or a different B rejects with
PAYMENT_CONFIRMATION_REQUIRED, even if acknowledged. TRACKED_CARD may confirm a
genuinely changed B. This check applies to new observations, not reviewed corrections.

paymentConfirmation has source (TRACKED_CARD or OUTSIDE_TRACKED_CARD),
bankStateAffirmed:true, unchangedBalanceAcknowledged:boolean and checkpointId.
For a fresh payment checkpointId is null; for an action-preserving reviewed
correction it identifies the original confirmed checkpoint. Unchanged balance is
compared with the chronological observation preceding the new position, including
same-day placement; it requires explicit acknowledgment. Corrections cannot drop
an existing acknowledgment or silently change source/checkpoint.

`checkpoint-persistence.ts` extracts HB-010 inserts/audit/affected-report checks.
It accepts the caller's tx and batch, never opens a transaction or advances
counters. Existing BANK_CHECKPOINT behavior is retained; correcting a checkpoint
with an attached obligation event conservatively rejects pending joint review.

Authorization precedes replay; locked scope is rechecked. Matching request replay
precedes stale revision/lifecycle checks. New writes validate account and state
revisions. Any refusal uses rejectBatch; facts, audits, pending flags, counters
and receipt roll back together. Unknown COMMIT outcome requires the same request
and payload, never automatic rebasing or a new request ID.

## Historical consistency and immutable payment evidence

Every payment audit stores the originally confirmed amount, action through the
event, source, affirmation/acknowledgment, checkpoint and original before/after
revision provenance. The loader requires one matching typed payment audit, checks
its state against the event and parses exact bigint cents. Superseded events and
their original audits remain readable. A hash alone is not payment evidence.

At one K: resolve corrections before H; validate complete ordering; choose one
maximal full state per identity through H. No delta is replayed over today's
outstanding. Each new candidate validates the entire resolved lifecycle suffix:
reapply the immutable confirmed payment amount only as a consistency assertion
against each chronological predecessor, then compare the complete resulting state.
AMEND, cancellation and terminal semantics are also checked. Incompatible later
facts cause HISTORICAL_PAYMENT_CONFLICT, without rewriting any later event.

Reviewed sets may append a historical partial and a correction of the late PAID
in one batch, or correct several dependent events. previousRevisionId can name
an earlier effective state from the same batch: same recordedSeq is allowed only
with the same budgetUpdateId and proven strict historical order. No UUID/INSERT
ordering or UNIQUE(previousRevisionId) is used. Existing facts keep their original
beforeState; newly corrected facts name their explicitly reviewed predecessor.

The current implementation limits each batch to one newly inserted position per
day; same-position corrections reuse the existing position. Several corrections
at distinct dates and same-batch dependencies are supported. Event reposition/date
changes and correction payments with replacement checkpoints conservatively reject.
These are explicit supported-boundary refusals, not automatic rebases.

## SQL and runtime guarantee boundary

One forward 0003 adds title/due_date to obligation_events only, plus title/amount/
action checks, unique original CREATE, canonical snapshot helper and deferred
position/lineage/transition/terminal guards. Existing 0000–0002 remain unchanged.
The first statement refuses any pre-existing obligation_events with
HB011_LEGACY_METADATA_REVIEW_REQUIRED; there is no invented title/backfill.

Initial CREATE: previous/before/supersedes null, UNPAID and original=outstanding.
Correction CREATE preserves identity/logical fact/action, previous/before remain
null; the original-root index excludes corrections. Other events require exact
canonical beforeState matching their referenced predecessor, same obligation,
valid transition and unchanged funding. Corrections retain action and cannot
bypass checks. Existing correction root/child guards prevent forks/cycles.

Canonical beforeState contains exactly schemaVersion1, revisionId, obligationId,
originatingPeriodId, fundingPeriodId, title, dueDate, originalCents/outstandingCents
as decimal strings, status, isPossible and reserveFull. Exact revision pins all
temporal provenance. SQL computes this object from retained relational facts.

SQL proves same-batch lineage via budgetUpdateId and date/manifest order, refusing
terminal suffixes with unprovable placement. Complete JSON manifests/dependencies,
full H/K coherence, genuine user affirmation, historical payment meaning and audit
completeness remain runtime-owned. Direct SQL is not application authorization.
Negative tests cover both actual SQL guarantees and runtime-only refusals.

## Closed reports and limits

Bank report provenance/order checks reuse HB-010. Lifecycle report manifests must
include exact unique `obligationRevisionIds` for all selected account identities.
Pinned K must reproduce those references and the period reserved amount. Unknown
selection/manifests or unflagged basis drift reject REPORT_IMPACT_REVIEW_REQUIRED.
Only affected existing heads become correctionPending with audit. Snapshot bytes,
closing pointer and versions stay unchanged; no automatic v2 is created.

Full-history loading/validation is in memory; no production-scale performance
claim. HB-009 size/depth/node budgets apply and may reject large correction/audit
sets atomically. Legacy nonempty migration is deliberately blocked for review.
No hosted CI/deployment/Neon/browser result is implied. Remaining product scope:
action-changing terminal corrections/reopen need a separate decision; the owner
approved all implemented amount, metadata, payment and reserve semantics.
