# Logical data model (draft, not migrated)

All records have UUID PK, owner_user_id where appropriate, created_at/updated_at UTC timestamps and optimistic version. DATE values mean Europe/Berlin **calendar** dates; EUR amounts are signed BIGINT cents unless stated otherwise. Only one account in v1, explicit account_id foreign keys for future.

| Entity | Key fields | Purpose |
|---|---|---|
| users | google_subject unique, email_verified, preferred_locale, theme | One allowlisted user in v1 |
| accounts | owner_user_id, currency, display_name, status | Primary bank card now; more later |
| budget_periods | owner_user_id, YYYY-MM, state, close_version | Financial month independent of bank dates |
| balance_checkpoints | account_id, observed_date, observed_at optional, recorded_at, balance_cents, revision, supersedes_id | Actual bank balance points, can be backdated |
| budget_updates | account_id, checkpoint_id, idempotency_key unique, actor, recorded_at | Atomic batch boundary |
| period_allocations | source_kind, source_id, period_id, amount_cents, kind, origin_period_id optional | Allocation of income/movement/advance/release to period; debit/credit clear |
| cash_movements | account_id, occurred_date optional, recorded_at, amount_cents, kind, description, classification_status | User-supplied *known* bank activity, not all checkpoint diffs |
| reconciliation_intervals | from_checkpoint_id, to_checkpoint_id, observed_net_cents, known_net_cents, unresolved_net_cents | Derived/checkable, avoids fake transactions |
| obligations | owner_user_id, originating_period_id, label, kind (confirmed/potential/planned), current_outstanding_cents, status | Full reserve from unpaid outstanding |
| obligation_events | obligation_id, type, delta, funding_period_id, confirmed_at, bank_date optional, budget_update_id | Created, amended, payment, cancellation, carry state |
| recurring_templates | title, amount_cents, recurrence, effective_periods, enabled | Suggestions, never auto-obligations |
| template_decisions | template_id, budget_period_id, action (accepted/skipped), obligation_id optional | Idempotent per period |
| savings_goals | label, origin_period_id, status | Voluntary money set aside |
| savings_events | savings_id, amount_delta_cents, effective_period_id, action, budget_update_id | Increase, release, withdrawal, carry history |
| month_closings | period_id, version_number, closed_at, snapshot_json, previous_version_id, reason | Immutable closed reports |
| categories | owner_user_id, key, display_name optional | Optional taxonomy |
| transaction_categories | cash_movement_id, category_id, change_event_id | Categorization and corrections |
| documents | account_id, statement_period_id, private_blob_key, mime, size, hash, status | PDF metadata only (future) |
| imported_statement_items | document_id, source_ref, amount/date/description, match_status, cash_movement_id nullable | Proposed/approved details (future) |
| audit_events | actor_user_id, aggregate_type/id, event_kind, before_after_json, effective_date, recorded_at | Complete audit log |

## Important boundaries
- Bank balance is a checkpoint **observation**, not reconstructed from obligation paid flags.
- A checkpoint net difference is **not** automatically a cash_movements income/expense. Derived unresolved change must not be double-booked when a PDF later supplies detail.
- Obligation reserved amount is derived from outstanding cents at as-of date. No user-set partial reservation fraction.
- An obligation payment event can be confirmed with no known real bank date. Paid flags do not issue a cash debit.
- Period allocations must reconcile per source movement; permit an explicitly labeled unresolved/suspense allocation.
- A cross-month split is a single bank observation/known movement with multiple allocations; never duplicate bank item.
- A closed month uses immutable versioned JSON + normalized historical aggregates; later corrections create a new version.
- Do not pretend current outstanding equals obligation's historical as-of outstanding.

## Projection plan
Finance engine is pure, takes ordered events + as-of clock + historical checkpoints, returns read models with provenance. Projection ordered by effective date and deterministic sequence for same-day updates; recorded_at is distinct for audit. Latest observed bank balance by observation date does not move when a backdated checkpoint is inserted; interval boundaries change and future projection may need rebuilding.

## DB-level constraints (when implemented)
CHECK currency='EUR' in v1; UNIQUE (owner_user_id, period key), UNIQUE(idempotency_key, owner_user_id); CHECK positive obligation original/outstanding values; CHECK document mime/size; FK references account/user; CASCADE deletion prohibited for events/closures; rows of period allocations must be balanced for each source update. Add migration and transaction tests before UI.

## To finalize before migrations
See docs/OPEN_QUESTIONS.md. Schema is **logical proposal**, not definitive SQL.
