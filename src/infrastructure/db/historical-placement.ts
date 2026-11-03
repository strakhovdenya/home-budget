import 'server-only';
import { randomUUID } from 'node:crypto';
import { planPosition } from '@/domain/checkpoints/placement';
import type { History, Placement } from '@/domain/checkpoints/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { rejectBatch, type Transaction, type BatchContext } from './commit';
import * as s from './schema';
/** One immutable position and day manifest, on the caller's transaction. */
export async function insertHistoricalPosition(tx: Transaction, batch: BatchContext, history: History, date: BerlinDate,
  positionId: string, placement: Placement | null, kind: string): Promise<{ history: History; audit: AuditDescriptor }> {
  const planned = planPosition(history,date,batch.recordedSeq,positionId,randomUUID(),placement);
  if (!planned.ok) return rejectBatch(planned.code);
  const {order} = planned.value, members = order.positionIds;
  const base = { ownerUserId: batch.account.ownerUserId, accountId: batch.account.id, budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq };
  await tx.insert(s.historicalPositions).values({ ...base, id: positionId, historicalDate: date, kind });
  await tx.insert(s.orderingRevisions).values({ ...base, id: order.id, historicalDate: date, previousRevisionId: order.previousRevisionId,
    manifest: { schemaVersion: 1, positionIds: members }, dependencies: { schemaVersion: 1, edges: order.edges } });
  return { history: planned.value.history,
    audit: { entityType: 'DAY_ORDERING', entityId: order.id, before: { revisionId: order.previousRevisionId }, after: { date, positionIds: members, edges: order.edges } } };
}
