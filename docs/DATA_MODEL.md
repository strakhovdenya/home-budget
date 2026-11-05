# Data model — checkpoint-first

## HB-018 management read DTOs

No storage entities or migration. Management list/history/proposal derives from
existing immutable facts and validated audits in one coherent scoped transaction.
History returns exact full before/after snapshots, correction/predecessor refs,
recorded/effective/confirmation coordinates, actor/reason, original/funding periods,
payment/source/checkpoint/affirmation, savings amounts and funding proofs.
Signed read cursors and memory-only client drafts are not persisted entities.
Historical full states are never rebuilt by applying deltas to live amounts.
[Implementation evidence](planning/hb-018-verification.md).

## HB-014 read-only derived state

No persisted forecast/warning/reminder entities. One captured account K plus H
selects existing C/V and full obligation/savings/funding states. Independent identity
enumeration proves completeness; period IDs map within scope. Captured aggregate
revision is not a historical revision-at-K. Current pointer is checked only for the
full current selection. Unknown/incomplete/unsupported-negative branches never invent
zero cash. Money wire fields are canonical decimal cents; estimates/provenance are
deep readonly. Existing migrations0000–0005 are unchanged.
[Contract](planning/hb-014-daily-forecast.md).

## HB-013 delivered extension

obligation_events and savings_events add nullable transition_decision_id,
mandatory exactly for FUNDING_TRANSFER. Such events preserve full business state
except funding, link to the same scoped batch/position/decision and retain canonical
before-state plus immutable state/funding evidence. Existing ordinary lifecycle
actions retain null decision refs and cannot change funding. Terminal identities
are retained without transfer/reopen. One selected full state contributes once.

transfer_proposals adds mode/observation_mode and nullable source_period_id for
non-CARRY proposals. Its immutable document contains the original input and exact
server review: base vectors/funding refs, affected past, preserved future, explicit
future edits, proposed full after-states/draft refs and A/R/S/F preview.
transition_decisions adds unique scoped proposal_id; budget_transfers remains
CARRY-only. transfer_proposal_cancellations is the20th table, with scoped control
idempotency, actor, canonical document/hash, reason and UTC confirmation time.
CONFIRMED/CANCELLED are mutually exclusive; status STALE is derived without mutation.

Generated commit revision IDs are bound to proposal draft refs by immutable
decision/funding/confirmation evidence. Semantic replay validates the original
mapping/receipt and never creates another financial update. Current target and
untouched future earmarks retain exact revisions; FRESH_START only moves active
past funding. Future cash changes require explicit edits against the pinned vector.
See [contract](planning/hb-013-period-allocations.md). Older sections below retain
their original delivery-stage context.

**HB-010 implementation:** private bank-checkpoint confirmation now persists one
actual observation and complete companion vector at a shared historical position,
with immutable ordering revisions/corrections and protected chronological current
head. One forward SQL migration adds coordinate/ordering-chain guards without
tables/columns. Reads select one H/K; affected existing report heads are audited
pending flags only. Operation entities below remain logical future contracts:
production reconciliation returns D and explicitly unavailable K/U. See the
[HB-010 contract](planning/hb-010-bank-checkpoints.md) and
[verification](planning/hb-010-verification.md); later sections preserve earlier
specification/delivery context.

**HB-006 implementation status:** the logical contract below remains the accepted target.
The physical storage foundation now has 19 Drizzle tables and two versioned PostgreSQL
migrations. The detailed [physical schema and enforcement map](DATABASE.md) distinguishes
database constraints from future application validation. Migrations were executed only
against disposable local synthetic databases; no Neon or production database was created
or modified. Historical selection, reviewed financial commands and full report-manifest
validation are not implemented by these tables. [Executed evidence](planning/hb-006-verification.md).

The following specification-stage text is retained as design context; its statements
that no SQL exists describe the earlier stage, not HB-006's current delivery.

All money is signed integer EUR cents (BIGINT storage with checked conversion/range),calendar dates Europe/Berlin,recorded timestamps UTC. UUID identities and owner/account scope are explicit. Financial facts/revision sets are append-only;optimistic aggregate revisions protect the active head. Neon PostgreSQL + Drizzle remains selected. This unmigrated logical model follows [Accepted ADR 0001](adr/0001-checkpoints-and-allocations.md) and [Accepted ADR 0002](adr/0002-month-closing-and-corrections.md),not SQL. HB-003 forecast is specified in Accepted ADR0003;excluded Q-HB2-02 complex A remains open;database implementation is future work.

| Entity | Key fields | Purpose |
|---|---|---|
| users | google_subject unique, email_verified, locale, theme | One allowlisted user |
| accounts | owner_user_id, currency, display_name, active_allocation_revision_id, aggregate_revision | Current authorized budget head; historical sets remain separate |
| budget_periods | owner_user_id, YYYY-MM, state, close_version | Calendar opening distinct from transfer consent |
| balance_checkpoints | account_id, observed_date, observed_at optional, recorded_at, balance_cents, revision, supersedes_id | Actual immutable bank observations; never fabricated by transfer/PDF |
| budget_updates | account_id, checkpoint_id (new or reused anchor), allocation_revision_id, idempotency_key, payload_identity, expected_revision, actor, recorded_at | Atomic update/redistribution/transfer boundary |
| allocation_revisions | account_id, checkpoint_revision_id, previous_revision_id, change_kind, effective_date, recorded_at, confirmed_by, budget_update_id | COMPLETE user-confirmed state vector; no bank movement source required |
| period_allocations | allocation_revision_id, period_id, amount_cents | One nonnegative actual-cash amount per revision+period; rows sum to anchoring checkpoint balance |
| budget_transfers | budget_update_id, source/target_period_id, before/after_allocation_revision_id, transfer_confirmed_at, carried_funding_refs | User-approved internal action, no bank debit; no duplicate application |
| obligations | owner_user_id, originating_period_id, current_funding_period_id, original_amount_cents, outstanding_cents, status, is_possible, reserve_full | Ordinary unpaid fully reserved;possible unpaid explicitly reserved fully or not included;identity retained through transfer |
| obligation_events | obligation_id, type, before/after, effective_date, confirmed_at, bank_date optional, funding_period_id, budget_update_id | Lifecycle and historical funding changes; paid not a cash posting |
| savings_goals | owner_user_id, origin_period_id, current_funding_period_id, status | Persistent voluntary earmark identity |
| savings_events | savings_id, amount_delta_cents, funding_period_id, action, effective_date, budget_update_id | Earmark/release and funding history, no automatic bank debit |
| month_closings | period_id, version, closed_at, evidence_recorded_cutoff, last_historical_checkpoint_revision_id, historical_allocation_revision_id, end_balance_cents nullable, bank_data_completeness, snapshot_json, previous_version_id, reason | Immutable historical report, including unknown actual month-end balance |
| recurring_templates / template_decisions | template_id, period_id, accepted/skipped, obligation_id | User-confirmed proposals, idempotent per period |
| cash_movements (optional detail) | account_id, occurred_date optional, signed_amount_cents, evidence/status, revision, recorded_at | Confirmed explanatory bank operations, not required for A or B |
| operation_funding_details (optional) | movement_revision_id, financial_period_id, signed_amount_cents, detail_revision_id | Optional split description, separate from active period_allocations; no automatic posting |
| reconciliation_intervals (optional derived view) | from/to_checkpoint_revision_id, D, K, U, evidence_revision | K+U=D only; U is NOT a residual financial source requiring allocations |
| movement_interval_links (optional) | movement_id, interval_revision_id, approval/evidence_ref | Unique active interval membership when known; ambiguous evidence stays pending |
| categories / transaction_categories (later optional) | movement_id, category_id, change_event_id | Classification without cash effects |
| documents / imported_statement_items (later) | account_id, statement_period, uploaded_at, private_key/hash, row_source_ref, candidate/match status | Private PDF proposals; uploads do not create observations |
| movement_evidence_links (later) | movement_id, document_id, row_source_ref, match_decision, audit_ref | Several evidence sources may explain one operation; overlapping statement dedup |
| audit_events | actor, aggregate/id, event_kind, before_after, effective_date, recorded_at, request_id, reason | Inspectable consent and immutable change history |

## State and persistence invariants

- For EVERY committed allocation revision, sum(period_allocations.amount_cents)=referenced checkpoint.balance_cents. No unassigned/suspense row. Each amount>=0;ordinary checkpoint B>=0. Negative free from full earmarks is allowed;negative bank/overdraft scope is separately pending. First checkpoint follows exactly the same complete-distribution rule; no opening-income/source entity.
- Choose one allocation head for the active view; select historical revisions separately. Do not sum all revisions or derive active A from operation financing details.
- Same-balance redistribution/confirmed transfer reuses the bank observation and creates a full vector revision. Transfer confirmation time does not replace observed_date. A newly changed balance and transfer may share one atomic update.
- Read models keep last_bank_observed_date from the checkpoint, never transfer_confirmed_at: a Dec 1 transfer against Nov 28 leaves last_bank_observed_date=Nov 28 and checkpoint count unchanged. Allocation deltas are budget history, not confirmed operation income/spending aggregates; without operation evidence those statistics remain incomplete, not inferred from the vector.
- A[p] is actual allocated money;R[p] sums included full unpaid requirements and S[p] is retained voluntary savings. They are not necessarily funded subsets of A:R+S may exceed A or B,producing negative F without new cash. F[p]=A[p]-R[p]-S[p];sum(F)=B-sum(R)-sum(S). Count each identity once;never cap reserves or automatically reduce savings.
- Original obligation amount>0,outstanding>=0;UNPAID outstanding>0. Ordinary unpaid requires reserve_full=true;is_possible unpaid permits explicit true/false. Only UNPAID with reserve_full=true contributes its full outstanding to R;unelected possible claims contribute0. PAID implies outstanding0 and reserve_full=false;CANCELLED requires reserve_full=false without inventing payment. Partial payment leaves the full selected reserve on the remainder. No partial-reserve amount exists;selection/possible flags and funding/lifecycle states retain immutable before/after history.
- Transfer preserves obligation/savings identity, origin, amounts and full reserve; changes funding associations with history. Closing uses their historical state, not current outstanding/funding.
- Completed-month cash is not moved merely by opening a new period. Transfer lineage is explicit and retry-safe. Existing target funds are retained once.
- Unknown month-end balance is nullable/unknown, never zero by default or copied from last/later observation. Keep actual last historical observation date, allocation effective date and recorded evidence cutoff. End balance observation does not imply complete transaction evidence.
- Optional K/U and PDF links never drive ordinary update validation, cash redistribution or automatic report rewriting. No `provisional_residual` or mandatory `allocation_source` entity. Movement funding details may sum to the signed movement only as optional evidence, not as primary cash ledger.

## Transactions, constraints and unresolved implementation detail

Later implementation must enforce UNIQUE(owner,period), UNIQUE(allocation_revision,period), scoped idempotency/payload identity, account ownership/FKs and expected-revision checks; prohibit destructive cascades over history. Cross-row sum equality requires atomic aggregate validation/appropriate DB enforcement, not a per-row CHECK alone. No migration is introduced here.

HB-002 specifies effective/recorded ordering,same-day observations,historical selection,reviewed corrections and transition lineage in [Accepted ADR 0002](adr/0002-month-closing-and-corrections.md). Logical constraints were originally accepted;the A>=0 amendment is re-accepted after owner-reported repeated independent review,not migrated or runtime-tested. FRESH_START across missed months is accepted;Q-HB2-02 complex A is excluded and must reject without financial writes until separately approved. B remains available. Accepted ADR0003 defines the final safe-main/budget/freshness read contract without new storage entities. Preserve confirmed later checkpoints on backdated input. See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## HB-002 logical extensions after corrected-contract re-acceptance

The earlier table is a summary;ADR 0002's field/constraint table is the complete historical closing contract after corrected-contract re-acceptance. Cash/vector validity is corrected to A>=0,sum(A)=B>=0 while immutable history semantics remain;no SQL or executed database tests are implied.

| Entity / addition | Logical fields and constraints |
|---|---|
| Account commit boundary | Monotonic `recorded_seq` per account transaction; whole batches share one seq; `aggregate_revision` increments for historical writes too |
| Historical positions / ordering revisions | Stable position IDs, Berlin day, confirmed predecessor/successor dependencies; immutable ordered manifests for day positions, pinned by reports; no fabricated times or mutable renumbering |
| Checkpoint/allocation/lifecycle revisions | Stable logical fact identity, `supersedes_id`, explicit observation/effective position refs, `recorded_seq`; correction-tip uniqueness, no forks/cycles; resolve correction before historical date filtering |
| Obligation/savings state revisions | Full before/after status,is_possible,reserve_full,outstanding/savings amount,funding period and origin,effective position,confirmation/recording,budget update;deltas are not replayed through newer full states |
| Transfer proposals | Scoped base checkpoint/vector/aggregate revision, exact base/proposed complete vectors, carried identity/funding refs, target month, payload identity and status; confirmed proposal points to one committed transfer |
| Combined actual-check update | Explicit observation mode ACTUAL_CHECK/REUSE_CONFIRMED, actual observation identity/date/optional instant/balance for a new check, transition_mode CARRY/FRESH_START/DEFER with no default, affected period/funding dependencies, one final vector; new equal-balance checks are not deduplicated by amount |
| Period transition decisions | One scoped immutable decision per budget_update_id, mode, not_carried_period_ids and prior nonnegative allocation amounts for FRESH_START, before/after checkpoint/vector refs, preserved/explicitly amended funding-state refs, actor/reason/confirmed/effective/recorded coordinates, request/payload identity; FRESH_START is not a budget_transfers or cash_movements row |
| Transfer financial facts | Proposal ID unique, before/after vector and funding refs, consent/effective position, explicit source lineage; immutable, not bank movements |
| Closing record extensions | Scoped account, last Berlin historical date, cutoff seq/time, actor, reason, exact last/end checkpoint refs, observed date/time/balance, allocation effective date, full snapshot/manifest and ordering refs, schema/selection versions, detail completeness independent of end observation |
| Report head / pending correction | Mutable audited current confirmed report pointer, external pending-work flags; UNIQUE(account,period,version), UNIQUE(previous_version_id) for non-v1, same-period contiguous version chain; no mutation of report payload |

`bank_data_completeness` is END_DATE_OBSERVED / INCOMPLETE / NO_OBSERVATION,independently of NOT_PROVIDED / PARTIAL / USER_CONFIRMED_COMPLETE operation detail. Null end balance is mandatory without an actual final-day observation;observed zero is real zero. With no observation at all,bank/vector/allocated/free fields are null,known earmark states remain reportable. Exact nullability/integrity:[ADR 0002 closing record](adr/0002-month-closing-and-corrections.md#logical-closing-record-and-constraints). Historical vector/anchor mismatch blocks the affected report candidate,never silently changes newer heads. Scope/FK/sum validation,head checks,audit and idempotency results commit together. No SQL/migrations introduced.

The ordinary new-month update atomically commits a real checkpoint, full confirmed vector, consented transfer and existing funding revisions; there is no synthetic intermediate vector/checkpoint or second cash debit. An explicit carry deferral records no transfer or funding move, while the ordinary confirmed vector must still sum to the actual new B. Unconfirmed website access performs no financial writes; current period availability can be resolved on access without a background process. Transfer eligibility uses the affected dependency set and preserves all untouched allocation/funding states, including nonnegative future allocations. Global account revision still rejects stale previews conservatively; whole-vector nonnegative amount checks do not weaken authorization, full-vector sum, chronology or concurrency validation.

Owner D29..D31 adds FRESH_START as an alternative to CARRY in that same atomic boundary. It requires ACTUAL_CHECK and one full vector, clears affected past active allocations with explicit not-carried lineage and preserves every past revision. Every affected unpaid/savings identity receives reviewed current funding while retaining full amounts/status/origin unless separately explicitly amended. No unpaid identity can disappear because its old allocation is zero. Entire missed interval is one update;no intermediate checkpoint/vector/transfer/close rows. Multiple-source A policy remains pending;historical negative free does not block ordinary CARRY/FRESH_START. New financial heads change only after confirmation;closed report heads/payloads remain untouched.

There is no runtime app or real financial data to migrate. Do not add legacy tables/converters. Earlier signed examples are archived only;future constraints validate new nonnegative cash while retaining immutable reports/events. Expected receipts are not cash. Original acceptance evidence remains in DECISIONS;the amended contract is now re-Accepted after owner-reported repeated independent review.

## HB-011 delivered state contract

Obligation identity/origin remains in obligations. Every immutable obligation_events
state now also stores title (required, <=200 Unicode code points) and nullable
due_date, distinct from funding period, effective position and bank date.
No mutable metadata head is introduced. Originally confirmed payment amount,
source/affirmation/acknowledgment/checkpoint and exact before/after revision refs
are mandatory typed audit evidence. Corrections append new states/audits and keep
all original facts. H/K selection resolves corrections before date filtering and
checks all later confirmed payment meanings without rebasing.
[Contract and limitations](planning/hb-011-obligations.md).

## HB-012 savings state and evidence

Savings identity/origin remain immutable. savings_events adds revisioned required
title (1?200 Unicode code points). ACTIVE requires positive retained amount;
RELEASED requires zero and is terminal for ordinary commands. Each revision has
one exact SAVINGS_STATE audit; INCREASE/release store confirmed input amounts,
complete before/after and revision/batch/position refs. Reader validates evidence
at K without reconstructing amounts. Same-position action-preserving reviewed
corrections retain original evidence and validate the whole suffix. Funding stays
unchanged until future HB-013. [Contract](planning/hb-012-savings.md).

## HB-017 aggregate use of existing records

No schema/migration change. One aggregate update uses existing budget_updates, historical_positions, ordering_revisions, optional balance_checkpoints, allocation_revisions/period_allocations and full obligation/savings events. Transition control proposals precede confirmation; transition_decisions, optional budget_transfers and FUNDING_TRANSFER evidence belong to the same confirmed batch as disjoint lifecycle edits. SQL historical ordering and same-identity restrictions remain intact.

A mandatory versioned BUDGET_UPDATE_REVIEW audit document copies the normalized complete command, financial before/after review, original-to-final report impact and checkpoint/vector/proposal mapping. Payment/release/increase/funding evidence retains existing independent audit contracts. Receipt/history replay validates original source evidence at original H/K and date before disclosure; it never joins newer live titles into the copied result. Existing report versions and prior audit facts stay immutable. Memory-only drafts/unknown-outcome requestIds are not new persisted entities. [Verification](planning/hb-017-verification.md).

## HB-019 use of existing immutable reports

No schema or migration is added. month_closings stores copied historical scalar
facts, snapshot_json, source_manifest, ordering_revision_refs and typed change
refs at original H/K and selection/schema version1. A real end is present only
with a real observation on the Berlin last day; no observation and actual zero
remain distinct. operation_detail_status is independently NOT_PROVIDED.

One MONTH_CLOSE batch appends the version and moves/creates its report_heads row,
plus exactly REPORT_VERSION and REPORT_HEAD audit documents, original normalized
command and existing durable receipt/counters. An absent period may materialize
only in this explicit transaction. Current bank/vector/lifecycle/funding rows do
not change. Existing historical writers alone mark affected heads pending.

The checksum binds exact reviewed content and scope, not authentication. The
server stamps cutoff_at at confirmation with the prior recorded sequence as K.
Reads and recovery prove the original immutable command/receipt/audit/report;
ancestor validation is bounded metadata work, not a replay of every old graph.
The source manifest keeps top-level obligationRevisionIds/savingsRevisionIds for
existing report-impact compatibility. [Verification](planning/hb-019-verification.md).
