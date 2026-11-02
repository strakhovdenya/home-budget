import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, bigint, integer, boolean, date, timestamp, jsonb, unique, foreignKey, check, type AnyPgColumn } from 'drizzle-orm/pg-core';

// SQL triggers/deferrable constraints in 0001 are part of this schema contract.
const money = (name: string) => bigint(name, { mode: 'bigint' });
const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });
const scope = () => ({
  id: uuid('id').primaryKey(),
  ownerUserId: uuid('owner_user_id').notNull(),
  accountId: uuid('account_id').notNull(),
});
const scoped = (t: { id: AnyPgColumn; ownerUserId: AnyPgColumn; accountId: AnyPgColumn }) => [
  unique().on(t.ownerUserId, t.accountId, t.id),
  foreignKey({ columns: [t.ownerUserId, t.accountId], foreignColumns: [accounts.ownerUserId, accounts.id] }),
];
const fact = () => ({
  ...scope(),
  budgetUpdateId: uuid('budget_update_id').notNull(),
  recordedSeq: money('recorded_seq').notNull(),
});
const factKeys = (t: { id: AnyPgColumn; ownerUserId: AnyPgColumn; accountId: AnyPgColumn; budgetUpdateId: AnyPgColumn; recordedSeq: AnyPgColumn }) => [
  ...scoped(t),
  foreignKey({ columns: [t.ownerUserId, t.accountId, t.budgetUpdateId, t.recordedSeq], foreignColumns: [budgetUpdates.ownerUserId, budgetUpdates.accountId, budgetUpdates.id, budgetUpdates.recordedSeq] }),
];
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), googleSubject: text('google_subject').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  locale: text('locale').notNull().default('ru'), theme: text('theme').notNull().default('system'),
});
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(), ownerUserId: uuid('owner_user_id').notNull().references(() => users.id),
  currency: text('currency').notNull().default('EUR'), displayName: text('display_name').notNull(),
  aggregateRevision: money('aggregate_revision').notNull().default(sql`0`),
  recordedSeq: money('recorded_seq').notNull().default(sql`0`),
  activeAllocationRevisionId: uuid('active_allocation_revision_id'),
}, t => [unique().on(t.ownerUserId, t.id), check('account_eur', sql`${t.currency} = 'EUR'`),
  check('account_counters', sql`${t.aggregateRevision} >= 0 AND ${t.recordedSeq} >= 0`)]);
export const budgetPeriods = pgTable('budget_periods', {
  ...scope(), period: text('period').notNull(),
}, t => [...scoped(t), unique().on(t.ownerUserId, t.accountId, t.period),
  check('period_format', sql`${t.period} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left(${t.period},4) <> '0000'`)]);
export const budgetUpdates = pgTable('budget_updates', {
  ...scope(), requestId: uuid('request_id').notNull(), payloadIdentity: text('payload_identity').notNull(),
  expectedRevision: money('expected_revision').notNull(), recordedSeq: money('recorded_seq').notNull(),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  recordedAt: instant('recorded_at').notNull().defaultNow(),
  result: jsonb('result').notNull(), kind: text('kind').notNull(),
}, t => [...scoped(t), unique().on(t.ownerUserId,t.accountId,t.requestId),
  unique().on(t.ownerUserId,t.accountId,t.recordedSeq),
  unique().on(t.ownerUserId,t.accountId,t.id,t.recordedSeq),
  check('update_revision', sql`${t.expectedRevision} >= 0 AND ${t.recordedSeq} > 0 AND length(${t.payloadIdentity}) > 0`)]);

export const historicalPositions = pgTable('historical_positions', {
  ...fact(), historicalDate: date('historical_date').notNull(), kind: text('kind').notNull(),
}, t => [...factKeys(t), ]);

export const orderingRevisions = pgTable('ordering_revisions', {
  ...fact(), historicalDate: date('historical_date').notNull(), previousRevisionId: uuid('previous_revision_id'), manifest: jsonb('manifest').notNull(), dependencies: jsonb('dependencies').notNull(),
}, t => [...factKeys(t), ]);

export const balanceCheckpoints = pgTable('balance_checkpoints', {
  ...fact(), logicalFactId: uuid('logical_fact_id').notNull(), supersedesId: uuid('supersedes_id'), positionId: uuid('position_id').notNull(), observedDate: date('observed_date').notNull(), observedAt: instant('observed_at'), balanceCents: money('balance_cents').notNull(), reason: text('reason').notNull(),
}, t => [...factKeys(t), check('checkpoint_nonnegative', sql`${t.balanceCents} >= 0`), check('checkpoint_berlin', sql`${t.observedAt} IS NULL OR (${t.observedAt} AT TIME ZONE 'Europe/Berlin')::date = ${t.observedDate}`),]);

export const allocationRevisions = pgTable('allocation_revisions', {
  ...fact(), logicalFactId: uuid('logical_fact_id').notNull(), supersedesId: uuid('supersedes_id'), checkpointId: uuid('checkpoint_id').notNull(), previousRevisionId: uuid('previous_revision_id'), positionId: uuid('position_id').notNull(), effectiveDate: date('effective_date').notNull(), changeKind: text('change_kind').notNull(), confirmedAt: instant('confirmed_at').notNull().defaultNow(), insertTransaction: text('insert_transaction').notNull().default(sql`pg_current_xact_id()::text`),
}, t => [...factKeys(t), ]);

export const periodAllocations = pgTable('period_allocations', {
  ...scope(), allocationRevisionId: uuid('allocation_revision_id').notNull(), periodId: uuid('period_id').notNull(), amountCents: money('amount_cents').notNull(),
}, t => [...scoped(t), check('allocation_nonnegative', sql`${t.amountCents} >= 0`), unique().on(t.allocationRevisionId,t.periodId),]);

export const obligations = pgTable('obligations', {
  ...fact(), originatingPeriodId: uuid('originating_period_id').notNull(),
}, t => [...factKeys(t), ]);

export const obligationEvents = pgTable('obligation_events', {
  title: text('title').notNull(), dueDate: date('due_date'),
  ...fact(), obligationId: uuid('obligation_id').notNull(), previousRevisionId: uuid('previous_revision_id'), supersedesId: uuid('supersedes_id'), logicalFactId: uuid('logical_fact_id').notNull(), positionId: uuid('position_id').notNull(), fundingPeriodId: uuid('funding_period_id').notNull(), effectiveDate: date('effective_date').notNull(), bankDate: date('bank_date'), confirmedAt: instant('confirmed_at').notNull().defaultNow(), action: text('action').notNull(), beforeState: jsonb('before_state'), originalCents: money('original_cents').notNull(), outstandingCents: money('outstanding_cents').notNull(), status: text('status').notNull(), isPossible: boolean('is_possible').notNull(), reserveFull: boolean('reserve_full').notNull(),
}, t => [...factKeys(t), check('obligation_state', sql`${t.originalCents}>0 AND ${t.outstandingCents}>=0 AND ${t.status} IN ('UNPAID','PAID','CANCELLED') AND (${t.status}<>'UNPAID' OR (${t.outstandingCents}>0 AND (${t.isPossible} OR ${t.reserveFull}))) AND (${t.status}='UNPAID' OR NOT ${t.reserveFull}) AND (${t.status}<>'PAID' OR ${t.outstandingCents}=0)`),]);

export const savingsGoals = pgTable('savings_goals', {
  ...fact(), originatingPeriodId: uuid('originating_period_id').notNull(),
}, t => [...factKeys(t), ]);

export const savingsEvents = pgTable('savings_events', {
  title: text('title').notNull(),
  ...fact(), savingsId: uuid('savings_id').notNull(), previousRevisionId: uuid('previous_revision_id'), supersedesId: uuid('supersedes_id'), logicalFactId: uuid('logical_fact_id').notNull(), positionId: uuid('position_id').notNull(), fundingPeriodId: uuid('funding_period_id').notNull(), effectiveDate: date('effective_date').notNull(), confirmedAt: instant('confirmed_at').notNull().defaultNow(), action: text('action').notNull(), beforeState: jsonb('before_state'), amountCents: money('amount_cents').notNull(), status: text('status').notNull(),
}, t => [...factKeys(t), check('savings_nonnegative', sql`${t.amountCents}>=0`), check('saving_status', sql`${t.status} IN ('ACTIVE','RELEASED') AND (${t.status}<>'RELEASED' OR ${t.amountCents}=0)`),]);

export const transferProposals = pgTable('transfer_proposals', {
  ...scope(), expectedRevision: money('expected_revision').notNull(), baseCheckpointId: uuid('base_checkpoint_id').notNull(), baseAllocationRevisionId: uuid('base_allocation_revision_id').notNull(), targetPeriodId: uuid('target_period_id').notNull(), sourcePeriodId: uuid('source_period_id').notNull(), payloadIdentity: text('payload_identity').notNull(), proposal: jsonb('proposal').notNull(), createdAt: instant('created_at').notNull().defaultNow(),
}, t => [...scoped(t), ]);

export const transitionDecisions = pgTable('transition_decisions', {
  ...fact(), mode: text('mode').notNull(), observationMode: text('observation_mode').notNull(), beforeAllocationRevisionId: uuid('before_allocation_revision_id'), afterAllocationRevisionId: uuid('after_allocation_revision_id').notNull(), positionId: uuid('position_id').notNull(), confirmedAt: instant('confirmed_at').notNull().defaultNow(), manifest: jsonb('manifest').notNull(), reason: text('reason').notNull(),
}, t => [...factKeys(t), unique().on(t.budgetUpdateId), check('transition_mode', sql`${t.mode} IN ('CARRY','FRESH_START','DEFER') AND ${t.observationMode} IN ('ACTUAL_CHECK','REUSE_CONFIRMED') AND (${t.mode}<>'FRESH_START' OR ${t.observationMode}='ACTUAL_CHECK')`),]);

export const budgetTransfers = pgTable('budget_transfers', {
  ...fact(), proposalId: uuid('proposal_id').notNull(), decisionId: uuid('decision_id').notNull(), sourcePeriodId: uuid('source_period_id').notNull(), targetPeriodId: uuid('target_period_id').notNull(), beforeAllocationRevisionId: uuid('before_allocation_revision_id').notNull(), afterAllocationRevisionId: uuid('after_allocation_revision_id').notNull(), confirmedAt: instant('confirmed_at').notNull().defaultNow(), fundingManifest: jsonb('funding_manifest').notNull(),
}, t => [...factKeys(t), unique().on(t.proposalId), unique().on(t.decisionId), check('different_periods', sql`${t.sourcePeriodId}<>${t.targetPeriodId}`),]);

export const monthClosings = pgTable('month_closings', {
  ...fact(), periodId: uuid('period_id').notNull(), version: integer('version').notNull(), previousVersionId: uuid('previous_version_id'), historicalThroughDate: date('historical_through_date').notNull(), closedAt: instant('closed_at').notNull().defaultNow(), closedBy: uuid('closed_by').notNull().references(() => users.id), evidenceRecordedCutoffSeq: money('evidence_recorded_cutoff_seq').notNull(), evidenceRecordedCutoffAt: instant('evidence_recorded_cutoff_at').notNull(), reason: text('reason').notNull(), changeEvidenceRefs: jsonb('change_evidence_refs').notNull(), lastCheckpointId: uuid('last_checkpoint_id'), lastBankObservedDate: date('last_bank_observed_date'), lastBankObservedAt: instant('last_bank_observed_at'), lastObservedBalanceCents: money('last_observed_balance_cents'), historicalAllocationRevisionId: uuid('historical_allocation_revision_id'), allocationEffectiveDate: date('allocation_effective_date'), endCheckpointId: uuid('end_checkpoint_id'), endBalanceCents: money('end_balance_cents'), bankDataCompleteness: text('bank_data_completeness').notNull(), operationDetailStatus: text('operation_detail_status').notNull(), historicalAllocatedCents: money('historical_allocated_cents'), historicalReservedCents: money('historical_reserved_cents').notNull(), historicalSavingsCents: money('historical_savings_cents').notNull(), historicalFreeCents: money('historical_free_cents'), snapshotSchemaVersion: integer('snapshot_schema_version').notNull(), selectionContractVersion: integer('selection_contract_version').notNull(), snapshotJson: jsonb('snapshot_json').notNull(), sourceManifest: jsonb('source_manifest').notNull(), orderingRevisionRefs: jsonb('ordering_revision_refs').notNull(),
}, t => [...factKeys(t), unique().on(t.accountId,t.periodId,t.version), unique().on(t.previousVersionId), check('closing_version', sql`${t.version}>0 AND ((${t.version}=1) = (${t.previousVersionId} IS NULL)) AND length(trim(${t.reason}))>0 AND ${t.evidenceRecordedCutoffSeq}<${t.recordedSeq} AND ${t.snapshotSchemaVersion}>0 AND ${t.selectionContractVersion}>0`), check('closing_free', sql`${t.historicalReservedCents}>=0 AND ${t.historicalSavingsCents}>=0 AND (${t.historicalAllocatedCents} IS NULL OR (${t.historicalAllocatedCents}>=0 AND ${t.historicalFreeCents}=${t.historicalAllocatedCents}-${t.historicalReservedCents}-${t.historicalSavingsCents}))`), check('closing_detail', sql`${t.operationDetailStatus} IN ('NOT_PROVIDED','PARTIAL','USER_CONFIRMED_COMPLETE')`),]);

export const reportHeads = pgTable('report_heads', {
  ...scope(), periodId: uuid('period_id').notNull(), closingId: uuid('closing_id').notNull(), correctionPending: boolean('correction_pending').notNull().default(false),
}, t => [...scoped(t), unique().on(t.accountId,t.periodId),]);

export const auditEvents = pgTable('audit_events', {
  ...fact(), eventKind: text('event_kind').notNull(), effectiveDate: date('effective_date').notNull(), reason: text('reason').notNull(), beforeAfter: jsonb('before_after').notNull(),
}, t => [...factKeys(t), ]);
