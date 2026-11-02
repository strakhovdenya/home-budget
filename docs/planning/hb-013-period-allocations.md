# HB-013 — Period allocations and confirmed transitions

Status: Done. Independent static source and calendar-fixture review completed.
Owner acceptance confirmed: 2026-11-02. Calendar-fixture High corrected and
re-reviewed; open findings Critical/High/Medium/Low: 0/0/0/0.
Branch: feat/hb-013-period-allocations; base e59082a (HB-012 / PR12).
Authority: owner implementation authorization after two independent plan reviews;
Accepted ADR0001–0003, corrected D32–D35, BR-01/02/03/05/07/08/10/11.

## Implemented private contracts

Existing confirmBankCheckpoint remains the initial/ordinary actual-check workflow.
redistributeAllocations confirms ALLOCATION_ONLY complete vectors against the
retained checkpoint. periodTransitions exposes prepare/read/confirm/cancel through
HB-007 authorization and domain ports. No Server Action or public route is added.

Transition input has exact fields: schemaVersion1, intent, mode, observationMode,
target, sources, balanceCents, allocations, futureEdits, fundingRefs,
expectedCheckpointRevisionId, expectedAllocationRevisionId, effectiveDate,
checkpoint, placement and consent. All wire amounts are canonical decimal strings.
Unknown fields, number money, malformed objects and oversized graphs reject.
Consent explicitly confirms the complete vector, unchanged funding (redistribution),
transition/funding and non-carry (FRESH_START). Arrays retain canonical identity;
same-key wire differences are never silently normalized into equivalent requests.

REDISTRIBUTE changes A only. Nov40000/Dec50000 with RNov30000 may become
Nov0/Dec90000 while R remains November30000; FNov=-30000/FDec90000. Full retained
funding refs and unchanged-funding acknowledgment are mandatory. Missing review or
a disguised funding rollover refuses TRANSITION_CONFIRMATION_REQUIRED. D36 still
protects the old reserve: safe oracle60000, not90000. Forecast API stays HB-014.

CARRY supports one completed calendar source into the current Berlin month,
without a closing prerequisite. REUSE preserves B/checkpoint/date and moves source
A into target once, preserving other A. ACTUAL passes the single final vector to
HB-010, without an intermediate vector. Source A clears; all active source funding
states move intact. Negative F and earmarks exceeding B never cause reserve caps.
Multi-source CARRY refuses OWNER_POLICY_REQUIRED before persistent control/finance
writes. It never selects FRESH_START automatically.

FRESH_START requires ACTUAL_CHECK. Past set is the union of base allocation and
active funding periods before current month, including earmark-only periods.
Past A clears; historical facts persist. All active past funding moves once.
Untouched future A is retained exactly. Any future difference requires a matching
explicit future edit against the pinned vector; missing review refuses
FUTURE_ALLOCATION_REVIEW_REQUIRED. Preserved future cash exceeding actual B refuses
PRESERVED_ALLOCATION_CONFLICT, including rollback of the proposed checkpoint.
Existing current/future earmarks stay unchanged. Current target is reviewed once;
previous target money is not added again. Old negative F is not a new liability.

DEFER records explicit consent and a final vector, retaining all funding and
creating no transfer. Page access/read/abandon performs no financial mutation.

## Funding history and SQL

FUNDING_TRANSFER is distinct from AMEND/payment/release. Both event streams link
to a scoped transition_decision_id in the same batch/position. Identity, origin,
amount/status/title and obligation dueDate/selection/original/outstanding remain
unchanged. Full canonical predecessor, immutable state audit and funding proof pin
before/after revisions. Savings increase/release amounts are null; payment is null.
PAID/CANCELLED/RELEASED are never transferred or reopened.

0005_period_transfers.sql is the only new migration. Generated snapshot/journal
carry schema changes; custom SQL extends existing lifecycle functions without
editing0000–0004. It adds decision FKs/action checks, exact funding linkage,
unique funding per identity/decision, proposal/decision/transfer relationships,
confirmed-vector equality, source/target guards and cancellation exclusion.
History remains append-only. Complete JSON meaning, genuine consent, full affected
identity closure, H/K and audit completeness remain runtime-owned.

## Proposals, replay and cancellation

Prepare stores immutable scoped review without financial counters/receipt.
Proposal status is derived: decision=>CONFIRMED, cancellation=>CANCELLED, base or
Berlin target mismatch=>STALE, otherwise PROPOSED. No automatic rebase.
Read/confirm/cancel recheck ownership under account lock.

Confirmation envelope payload is exactly proposalId/proposalIdentity/input/review;
reason/effectiveDate/expectedRevision must match prepared review. Confirmation
audit stores the canonical document and exact committed checkpoint/vector/decision/
funding mapping. Original funding states and draft refs are in the reviewed document.

commitBatch has a trusted PERIOD_TRANSITION-only replay hook after standard
request replay and before stale/calendar checks. New requestId can replay only
after exact canonical identity/document match and validated original update,
actor/scope/sequence/receipt, persisted vector/anchor/funding evidence and transfer
linkage. Only requestId and nonbusiness transport data differ; generated commit
IDs/timestamps/counters are checked against storage separately. Changed confirmation
refuses PROPOSAL_ALREADY_CONFIRMED; corrupt evidence/receipt refuses STORAGE_ERROR.
Same-request rules remain HB-009. Unknown commit outcome requires identical retry.

Cancellation is one immutable transfer_proposal_cancellations control fact with
scoped controlRequestId, proposal fingerprint, actor, reason, canonical document
and microsecond UTC timestamp. Matching retry returns the original control result;
changed same key refuses REQUEST_PAYLOAD_CONFLICT. No budget_update, financial
receipt/audit or counter is created. Account-then-proposal locks serialize cancel
against confirm; deferred SQL checks prohibit both outcomes, even in one transaction.

## Ordering, reports and supported limits

One new historical position per date/batch is reused by the checkpoint/vector,
decision and distinct funding identities. Each identity's predecessor must be
strictly earlier. No UUID/INSERT/recordedSeq ordering is inferred. Corrections resolve
at K before H; full lifecycle suffix validation protects later states and active
head. Unsupported joint corrections refuse; normal payment/release after a valid
funding transfer remains supported.

Combined report impact uses final candidate streams and original pending flags.
Pinned bank/ordering/obligation/savings basis must reproduce. Only affected heads
are marked pending; original versions/bytes/H/K/source refs never change and no
automatic v2 is created. Unprovable impact refuses REPORT_IMPACT_REVIEW_REQUIRED.

Owner-authorized exclusions: pure optional financing details only; no persisted
operations/PDF/ledger; no payment/release plus funding of one identity in one
compound command; no unproved historical joint corrections; oversized sets reject
without truncation. No new dependency, UI, forecast/closing engine or transaction
manager. Full-history loading remains in memory; no scale benchmark is claimed.

Scenario mapping: [HB13 acceptance](../../tests/scenarios/phase-01/hb-013-period-allocations.md).
Actual evidence: [verification](hb-013-verification.md).
