import 'server-only';
import { and, eq, lte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { validUuid } from '@/domain/updates/validation';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { SnapshotRead, ProjectionSnapshotReader } from '@/domain/forecast/ports';
import { LIMITS, type ProjectionResult } from '@/domain/forecast/contracts';
import { assembleSnapshot } from '@/domain/forecast/assembly';
import { capture, checked, ForecastFailure, refuse } from '@/domain/forecast/validation';
import { normalizeValue, encodeCanonical } from '@/domain/updates/canonical-value';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseInstant, berlinDateOfInstant } from '@/shared/pure/instant';
import { loadCheckpointHistory } from './checkpoint-history';
import { loadObligationHistory } from './obligation-history';
import { loadSavingHistory } from './savings-history';
import { indexAudits } from './history-read-context';
import type { createDatabase } from './client';
import { BatchFailure, type Transaction } from './commit';
import * as s from './schema';

export function checkProjectionBudget(rows: bigint, bytes: bigint, workRows: bigint, periodCount: bigint): void {
  // Existing chronological validators do bounded suffix/index scans. Admission caps their conservative quadratic work at 4M pairs.
  if (rows > BigInt(LIMITS.historyRows) || bytes > BigInt(LIMITS.storageBytes) || workRows * workRows > 4000000n || periodCount > BigInt(LIMITS.periods)) refuse('PROJECTION_LIMIT_EXCEEDED');
}
async function preflight(tx: Transaction, scope: AuthorizedScope, cut: bigint) {
  type ScopedTable = PgTable & { ownerUserId: AnyPgColumn; accountId: AnyPgColumn };
  const where = (t: ScopedTable) => and(eq(t.ownerUserId, scope.ownerUserId), eq(t.accountId, scope.accountId));
  const tables = [s.balanceCheckpoints, s.allocationRevisions, s.historicalPositions, s.orderingRevisions,
    s.obligations, s.obligationEvents, s.savingsGoals, s.savingsEvents, s.auditEvents, s.transitionDecisions] as const;
  let rows = 0n, bytes = 0n, work = 0n;
  async function count(table: ScopedTable, predicate: SQL | undefined) {
    const result = await tx.execute<{ count: string; bytes: string }>(sql`SELECT count(*)::text AS count,
      coalesce(sum(octet_length(to_jsonb(${table})::text)),0)::text AS bytes FROM ${table} WHERE ${predicate}`);
    rows += BigInt(result.rows[0].count); bytes += BigInt(result.rows[0].bytes); return BigInt(result.rows[0].count);
  }
  for (const t of tables) {
    const n = await count(t, and(where(t), lte(t.recordedSeq, cut)));
    if (t !== s.auditEvents && t !== s.transitionDecisions && t !== s.obligations && t !== s.savingsGoals) work += n;
    checkProjectionBudget(rows, bytes, work, 0n);
  }
  await count(s.periodAllocations, and(where(s.periodAllocations), sql`EXISTS (SELECT 1 FROM ${s.allocationRevisions}
    WHERE ${s.allocationRevisions.id}=${s.periodAllocations.allocationRevisionId} AND ${s.allocationRevisions.recordedSeq}<=${cut})`));
  const periods = await count(s.budgetPeriods, where(s.budgetPeriods));
  checkProjectionBudget(rows, bytes, work, periods);
}

/** Internal trusted H/K capability. Never composed into an action/route or accepted in the feature query. */
export function createProjectionRepository(database: ReturnType<typeof createDatabase>): ProjectionSnapshotReader & {
  readAt(scope: AuthorizedScope, selection: Readonly<{ through: unknown; knowledgeCut: bigint | null }>): Promise<ProjectionResult<SnapshotRead>>;
} {
  async function read(scope: AuthorizedScope, selection: Readonly<{ through: unknown; knowledgeCut: bigint | null }> | null): Promise<ProjectionResult<SnapshotRead>> {
    try {
      scope = capture(scope); selection = selection === null ? null : capture(selection);
      if (!validUuid(scope.ownerUserId) || !validUuid(scope.accountId)) return { ok: false, code: 'FORBIDDEN' };
      return await database.db.transaction(async tx => {
        await tx.execute(sql`SET LOCAL statement_timeout = '10000ms'`);
        const [account] = await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId, scope.ownerUserId), eq(s.accounts.id, scope.accountId)));
        if (!account) return { ok: false, code: 'FORBIDDEN' } as const;
        const clock = await tx.execute<{ instant: string }>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS instant`);
        const today = checked(berlinDateOfInstant(checked(parseInstant(clock.rows[0].instant))));
        const asOfDate = selection ? checked(parseBerlinDate(selection.through)) : today;
        if (asOfDate > today) refuse('STATE_AFTER_AS_OF');
        const cut = selection?.knowledgeCut ?? account.recordedSeq;
        if (typeof cut !== 'bigint' || cut < 0n || cut > account.recordedSeq) refuse('INVALID_INPUT');
        const { snapshot } = await readProjectionContext(tx,scope,account,asOfDate,cut);
        return { ok: true, value: { snapshot, asOfDate } } as const;
      }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
    } catch (e) {
      return { ok: false, code: e instanceof ForecastFailure || e instanceof BatchFailure ? e.code : 'STORAGE_ERROR' };
    }
  }
  return { read: scope => read(scope, null), readAt: (scope, selection) => read(scope, selection) };
}

/** Shared bounded coherent source loader, always on the caller's scoped transaction. */
export async function readProjectionContext(tx:Transaction,scope:AuthorizedScope,account:typeof s.accounts.$inferSelect,asOfDate:import('@/shared/pure/calendar').BerlinDate,cut:bigint) {
await preflight(tx, scope, cut);
const where = (t: { ownerUserId: AnyPgColumn; accountId: AnyPgColumn; recordedSeq: AnyPgColumn }) =>
  and(eq(t.ownerUserId, scope.ownerUserId), eq(t.accountId, scope.accountId), lte(t.recordedSeq, cut));
const history = await loadCheckpointHistory(tx, scope, cut);
const audits = await tx.select().from(s.auditEvents).where(where(s.auditEvents));
const decisions = await tx.select().from(s.transitionDecisions).where(where(s.transitionDecisions));
const context = { history, audits, ...indexAudits(audits), decisions: new Map(decisions.map(d => [d.id, d])) };
const oh = await loadObligationHistory(tx, scope, cut, context), sh = await loadSavingHistory(tx, scope, cut, context);
// HB-011's general reader validates payment evidence. Projection additionally requires every obligation state audit.
const byRevision = new Map(oh.events.map(e => [e.id, e]));
try { for (const e of oh.events) {
  const matches = context.auditByEntity.get(`OBLIGATION_STATE:${e.id}`) ?? [], audit = matches[0];
  if (matches.length !== 1 || audit.recordedSeq !== e.recordedSeq || audit.budgetUpdateId !== e.budgetUpdateId) refuse('HISTORICAL_PAYMENT_CONFLICT');
  const doc = normalizeValue(audit.beforeAfter);
  if (!exactKeys(doc, ['schemaVersion', 'eventIndex', 'entity', 'before', 'after']) || doc.schemaVersion !== 1
    || !Number.isSafeInteger(doc.eventIndex) || (doc.eventIndex as number) < 0
    || !exactKeys(doc.entity, ['type', 'id']) || doc.entity.type !== 'OBLIGATION_STATE' || doc.entity.id !== e.id
    || !exactKeys(doc.after, ['state', 'payment', 'effectiveDate', 'positionId', 'bankDate', 'supersedesId', 'confirmedAt'])) refuse('HISTORICAL_PAYMENT_CONFLICT');
  const prior = byRevision.get(e.supersedesId ?? e.previousRevisionId ?? '');
  const canonical = (v: unknown) => encodeCanonical(normalizeValue(v));
  if (canonical(doc.before) !== canonical(prior ? obligationSnapshot(prior) : null)
    || canonical(doc.after.state) !== canonical(obligationSnapshot(e)) || canonical(doc.after.payment) !== canonical(e.payment ? { ...e.payment, amountCents: e.payment.amountCents.toString() } : null)
    || doc.after.effectiveDate !== e.effectiveDate || doc.after.positionId !== e.positionId || doc.after.bankDate !== e.bankDate
    || doc.after.supersedesId !== e.supersedesId || doc.after.confirmedAt !== e.confirmedAt) refuse('HISTORICAL_PAYMENT_CONFLICT');
} } catch (e) {
  if (e instanceof ForecastFailure) throw e;
  refuse('HISTORICAL_PAYMENT_CONFLICT');
}
const obligationIdentities = await tx.select().from(s.obligations).where(where(s.obligations));
const savingIdentities = await tx.select().from(s.savingsGoals).where(where(s.savingsGoals));
const periods = await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId, scope.ownerUserId), eq(s.budgetPeriods.accountId, scope.accountId)));
const snapshot = assembleSnapshot({ scope, asOfDate, capturedSeq: account.recordedSeq, capturedAggregateRevision: account.aggregateRevision,
  activeAllocationRevisionId: account.activeAllocationRevisionId, obligationHistory: oh, savingHistory: sh, obligationIdentities, savingIdentities, periods });
  return { snapshot, history, obligationHistory:oh, savingHistory:sh, periods, audits };
}
