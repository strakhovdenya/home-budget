# Logical data model — checkpoint-first (draft, not migrated)

All money is signed integer EUR cents (BIGINT storage with checked conversion/range),calendar dates Europe/Berlin,recorded timestamps UTC. UUID identities and owner/account scope are explicit. Financial facts/revision sets are append-only;optimistic aggregate revisions protect the active head. Neon PostgreSQL + Drizzle remains selected. This unmigrated logical model follows [Accepted ADR 0001](adr/0001-checkpoints-and-allocations.md) and [Accepted ADR 0002](adr/0002-month-closing-and-corrections.md),not SQL. HB-003 forecast and excluded Q-HB2-02 complex A remain open;database implementation is future work.

| Entity | Key fields | Purpose |
|---|---|---|
| users | google_subject unique, email_verified, locale, theme | One allowlisted user |
| accounts | owner_user_id, currency, display_name, active_allocation_revision_id, aggregate_revision | Current authorized budget head; historical sets remain separate |
| budget_periods | owner_user_id, YYYY-MM, state, close_version | Calendar opening distinct from transfer consent |
| balance_checkpoints | account_id, observed_date, observed_at optional, recorded_at, balance_cents, revision, supersedes_id | Actual immutable bank observations; never fabricated by transfer/PDF |
| budget_updates | account_id, checkpoint_id (new or reused anchor), allocation_revision_id, idempotency_key, payload_identity, expected_revision, actor, recorded_at | Atomic update/redistribution/transfer boundary |
| allocation_revisions | account_id, checkpoint_revision_id, previous_revision_id, change_kind, effective_date, recorded_at, confirmed_by, budget_update_id | COMPLETE user-confirmed state vector; no bank movement source required |
| period_allocations | allocation_revision_id, period_id, amount_cents | One signed month balance per revision+period; rows sum to anchoring checkpoint balance |
| budget_transfers | budget_update_id, source/target_period_id, before/after_allocation_revision_id, transfer_confirmed_at, carried_funding_refs | User-approved internal action, no bank debit; no duplicate application |
| obligations | owner_user_id, originating_period_id, current_funding_period_id, original_amount_cents, outstanding_cents, status | Full active outstanding reserve, original identity retained through transfer |
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

- For EVERY committed allocation revision, sum(period_allocations.amount_cents)=referenced checkpoint.balance_cents. No unassigned/suspense row. Negative month balances allowed. First checkpoint follows exactly the same complete-distribution rule; no opening-income/source entity.
- Choose one allocation head for the active view; select historical revisions separately. Do not sum all revisions or derive active A from operation financing details.
- Same-balance redistribution/confirmed transfer reuses the bank observation and creates a full vector revision. Transfer confirmation time does not replace observed_date. A newly changed balance and transfer may share one atomic update.
- Read models keep last_bank_observed_date from the checkpoint, never transfer_confirmed_at: a Dec 1 transfer against Nov 28 leaves last_bank_observed_date=Nov 28 and checkpoint count unchanged. Allocation deltas are budget history, not confirmed operation income/spending aggregates; without operation evidence those statistics remain incomplete, not inferred from the vector.
- R[p] and S[p] are earmarks within A[p], not extra allocations. F[p]=A[p]-R[p]-S[p]; sum(F)=B-sum(R)-sum(S). Count each obligation/saving once with its effective funding association.
- Original obligation amount >0, outstanding>=0; paid implies outstanding=0 and active reserve=0. Cancelled implies active reserve=0 without inventing a payment. Partial payment leaves full remaining reserve.
- Transfer preserves obligation/savings identity, origin, amounts and full reserve; changes funding associations with history. Closing uses their historical state, not current outstanding/funding.
- Completed-month cash is not moved merely by opening a new period. Transfer lineage is explicit and retry-safe. Existing target funds are retained once.
- Unknown month-end balance is nullable/unknown, never zero by default or copied from last/later observation. Keep actual last historical observation date, allocation effective date and recorded evidence cutoff. End balance observation does not imply complete transaction evidence.
- Optional K/U and PDF links never drive ordinary update validation, cash redistribution or automatic report rewriting. No `provisional_residual` or mandatory `allocation_source` entity. Movement funding details may sum to the signed movement only as optional evidence, not as primary cash ledger.

## Transactions, constraints and unresolved implementation detail

Later implementation must enforce UNIQUE(owner,period), UNIQUE(allocation_revision,period), scoped idempotency/payload identity, account ownership/FKs and expected-revision checks; prohibit destructive cascades over history. Cross-row sum equality requires atomic aggregate validation/appropriate DB enforcement, not a per-row CHECK alone. No migration is introduced here.

HB-002 specifies effective/recorded ordering,same-day observations,historical selection,reviewed corrections and transition lineage in [Accepted ADR 0002](adr/0002-month-closing-and-corrections.md). Logical constraints are accepted within that scope,not migrated or runtime-tested. FRESH_START across missed months is accepted;Q-HB2-02 complex A is excluded and must reject without financial writes until separately approved. B remains available. HB-003 owns final forecast/liquidity formula. Preserve confirmed later checkpoints on backdated input. See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## HB-002 accepted logical extensions

The earlier table is a summary;ADR 0002's field/constraint table is the complete accepted logical closing contract. Existing accepted cash/vector invariants are unchanged;no SQL or executed database tests are implied.

| Entity / addition | Accepted logical fields and constraints |
|---|---|
| Account commit boundary | Monotonic `recorded_seq` per account transaction; whole batches share one seq; `aggregate_revision` increments for historical writes too |
| Historical positions / ordering revisions | Stable position IDs, Berlin day, confirmed predecessor/successor dependencies; immutable ordered manifests for day positions, pinned by reports; no fabricated times or mutable renumbering |
| Checkpoint/allocation/lifecycle revisions | Stable logical fact identity, `supersedes_id`, explicit observation/effective position refs, `recorded_seq`; correction-tip uniqueness, no forks/cycles; resolve correction before historical date filtering |
| Obligation/savings state revisions | Full before/after status, outstanding/earmark, funding period and origin, effective position, confirmation/recording, budget update; deltas remain explanatory history, not replayed through newer full states |
| Transfer proposals | Scoped base checkpoint/vector/aggregate revision, exact base/proposed complete vectors, carried identity/funding refs, target month, payload identity and status; confirmed proposal points to one committed transfer |
| Combined actual-check update | Explicit observation mode ACTUAL_CHECK/REUSE_CONFIRMED, actual observation identity/date/optional instant/balance for a new check, transition_mode CARRY/FRESH_START/DEFER with no default, affected period/funding dependencies, one final vector; new equal-balance checks are not deduplicated by amount |
| Period transition decisions | One scoped immutable decision per budget_update_id, mode, not_carried_period_ids and signed prior amounts for FRESH_START, before/after checkpoint/vector refs, preserved/explicitly amended funding-state refs, actor/reason/confirmed/effective/recorded coordinates, request/payload identity; FRESH_START is not a budget_transfers or cash_movements row |
| Transfer financial facts | Proposal ID unique, before/after vector and funding refs, consent/effective position, explicit source lineage; immutable, not bank movements |
| Closing record extensions | Scoped account, last Berlin historical date, cutoff seq/time, actor, reason, exact last/end checkpoint refs, observed date/time/balance, allocation effective date, full snapshot/manifest and ordering refs, schema/selection versions, detail completeness independent of end observation |
| Report head / pending correction | Mutable audited current confirmed report pointer, external pending-work flags; UNIQUE(account,period,version), UNIQUE(previous_version_id) for non-v1, same-period contiguous version chain; no mutation of report payload |

`bank_data_completeness` is END_DATE_OBSERVED / INCOMPLETE / NO_OBSERVATION,independently of NOT_PROVIDED / PARTIAL / USER_CONFIRMED_COMPLETE operation detail. Null end balance is mandatory without an actual final-day observation;observed zero is real zero. With no observation at all,bank/vector/allocated/free fields are null,known earmark states remain reportable. Exact nullability/integrity:[ADR 0002 closing record](adr/0002-month-closing-and-corrections.md#logical-closing-record-and-constraints). Historical vector/anchor mismatch blocks the affected report candidate,never silently changes newer heads. Scope/FK/sum validation,head checks,audit and idempotency results commit together. No SQL/migrations introduced.

The ordinary new-month update atomically commits a real checkpoint, full confirmed vector, consented transfer and existing funding revisions; there is no synthetic intermediate vector/checkpoint or second cash debit. An explicit carry deferral records no transfer or funding move, while the ordinary confirmed vector must still sum to the actual new B. Unconfirmed website access performs no financial writes; current period availability can be resolved on access without a background process. Transfer eligibility uses the affected dependency set and preserves all untouched allocation/funding states, including signed future months. Global account revision still rejects stale previews conservatively; scoped sign checks do not weaken authorization, full-vector sum, chronology or concurrency validation.

Owner D29..D31 adds FRESH_START as an alternative to CARRY in that same atomic boundary. It requires ACTUAL_CHECK and one full vector, clears affected past active allocations with explicit not-carried lineage and preserves every past revision. Every affected unpaid/savings identity receives reviewed current funding while retaining full amounts/status/origin unless separately explicitly amended. No unpaid identity can disappear because its old allocation is zero. Entire missed interval is one update;no intermediate checkpoint/vector/transfer/close rows. Negative/count-of-past-month gates apply only to unresolved A proposal details,not FRESH_START. New financial heads change only after confirmation;closed report heads/payloads remain untouched.
