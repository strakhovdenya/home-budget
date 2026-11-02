import 'server-only';
import { and, eq, getTableColumns, lte, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { validUuid } from '@/domain/updates/validation';
import type { History, Ordering } from '@/domain/checkpoints/contracts';
import { parseCheckpoint, exactKeys } from '@/domain/checkpoints/validation';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseInstant } from '@/shared/pure/instant';
import type { createDatabase } from './client';
import { rejectBatch } from './commit';
import * as s from './schema';

type Connection = Pick<ReturnType<typeof createDatabase>['db'], 'select'>;
export async function loadCheckpointHistory(db: Connection, scope: AuthorizedScope, cut: bigint): Promise<History> {
  const where = (t: { ownerUserId: AnyPgColumn; accountId: AnyPgColumn; recordedSeq: AnyPgColumn }) =>
    and(eq(t.ownerUserId, scope.ownerUserId), eq(t.accountId, scope.accountId), lte(t.recordedSeq, cut));
  // Separate immutable reads are pinned to the one account cut. No mutable head is re-read.
  const cps = await db.select({ ...getTableColumns(s.balanceCheckpoints),
    observedAt: sql<string | null>`to_char(${s.balanceCheckpoints.observedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` }).from(s.balanceCheckpoints).where(where(s.balanceCheckpoints));
  const vectors = await db.select().from(s.allocationRevisions).where(where(s.allocationRevisions));
  const positions = await db.select().from(s.historicalPositions).where(where(s.historicalPositions));
  const orderings = await db.select().from(s.orderingRevisions).where(where(s.orderingRevisions));
  const amounts = await db.select({ revisionId: s.periodAllocations.allocationRevisionId, period: s.budgetPeriods.period, amountCents: s.periodAllocations.amountCents })
    .from(s.periodAllocations).innerJoin(s.budgetPeriods, eq(s.budgetPeriods.id, s.periodAllocations.periodId))
    .innerJoin(s.allocationRevisions, eq(s.allocationRevisions.id, s.periodAllocations.allocationRevisionId)).where(where(s.allocationRevisions));
  const checkpoints = cps.map(c => {
    const date = parseBerlinDate(c.observedDate), at = c.observedAt === null ? null : parseInstant(c.observedAt);
    if (!date.ok || (at && !at.ok)) return rejectBatch('HISTORICAL_STATE_CONFLICT');
    return { ...c, observedDate: date.value, observedAt: at?.ok ? at.value : null };
  });
  const parsedVectors = vectors.map(v => {
    const anchor = checkpoints.find(c => c.id === v.checkpointId);
    const date = parseBerlinDate(v.effectiveDate);
    if (!anchor || !date.ok) return rejectBatch('HISTORICAL_STATE_CONFLICT');
    const parsed = parseCheckpoint({ observedDate: anchor.observedDate, observedAt: anchor.observedAt, balanceCents: anchor.balanceCents,
      allocations: amounts.filter(a => a.revisionId === v.id).map(a => ({ period: a.period, amountCents: a.amountCents })), correction: null, placement: null });
    if (!parsed.ok) return rejectBatch('HISTORICAL_STATE_CONFLICT');
    return { ...v, effectiveDate: date.value, allocations: parsed.value.allocations };
  });
  const parsedPositions = positions.map(p => {
    const date = parseBerlinDate(p.historicalDate);
    if (!date.ok) return rejectBatch('ORDERING_CONFLICT');
    return { ...p, historicalDate: date.value };
  });
  const parsedOrders: Ordering[] = orderings.map(o => {
    let manifest: unknown, dependencies: unknown;
    try { manifest = normalizeValue(o.manifest); dependencies = normalizeValue(o.dependencies); }
    catch { return rejectBatch('ORDERING_CONFLICT'); }
    const date = parseBerlinDate(o.historicalDate);
    if (!date.ok || !exactKeys(manifest, ['schemaVersion', 'positionIds']) || manifest.schemaVersion !== 1
      || !Array.isArray(manifest.positionIds) || !manifest.positionIds.every(validUuid)
      || !exactKeys(dependencies, ['schemaVersion', 'edges']) || dependencies.schemaVersion !== 1 || !Array.isArray(dependencies.edges)) return rejectBatch('ORDERING_CONFLICT');
    const edges = dependencies.edges.map(e => {
      if (!exactKeys(e, ['before', 'after']) || !validUuid(e.before) || !validUuid(e.after)) return rejectBatch('ORDERING_CONFLICT');
      return { before: e.before, after: e.after };
    });
    return { ...o, historicalDate: date.value, positionIds: manifest.positionIds, edges };
  });
  return { knowledgeCut: cut, checkpoints, vectors: parsedVectors, positions: parsedPositions, orderings: parsedOrders };
}
