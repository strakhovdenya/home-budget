# Logical data model — checkpoint-first (draft, not migrated)

All money is signed integer EUR cents (BIGINT storage with checked conversion/range), calendar dates Europe/Berlin, recorded timestamps UTC. UUID identities and owner/account scope are explicit. Financial facts and revision sets are append-only; optimistic aggregate revisions protect the active head. Neon PostgreSQL + Drizzle remains selected. This is an unmigrated logical model based on [Accepted ADR 0001](adr/0001-checkpoints-and-allocations.md), not SQL; HB-002/HB-003 implementation details remain open.

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

HB-002 must specify effective/recorded ordering, same-day observations, historical allocation selection when closing after transfer, reviewed corrections and transfer proposal lineage. HB-003 must specify final forecast and liquidity warning/edge formula. Until approved, this document does not choose a policy for complex negative/multiple-old-month transfer proposals. Preserve existing confirmed later checkpoints on backdated input. See [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
