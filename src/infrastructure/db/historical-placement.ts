import 'server-only';
import { randomUUID } from 'node:crypto';
import { indexHistory } from '@/domain/checkpoints/history';
import type { History, Placement } from '@/domain/checkpoints/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { rejectBatch, type Transaction, type BatchContext } from './commit';
import * as s from './schema';
/** One immutable position and day manifest, on the caller's transaction. */
export async function insertHistoricalPosition(tx: Transaction, batch: BatchContext, history: History, date: BerlinDate,
  positionId: string, placement: Placement | null, kind: string): Promise<{ history: History; audit: AuditDescriptor }> {
  const index = indexHistory(history);
  if (!index.ok) return rejectBatch(index.code);
  const day = index.value.days.get(date), members = [...(day?.positionIds ?? [])], p = placement;
  if (!p && members.length) return rejectBatch('ORDERING_CONFLICT');
  const at = p?.afterPositionId ? members.indexOf(p.afterPositionId) + 1 : 0;
  if (p && (p.expectedOrderingRevisionId !== (day?.id ?? null) || (p.afterPositionId && !at) || (members[at] ?? null) !== p.beforePositionId)) return rejectBatch('ORDERING_CONFLICT');
  members.splice(at, 0, positionId);
  const order = { id: randomUUID(), historicalDate: date, recordedSeq: batch.recordedSeq, previousRevisionId: day?.id ?? null, positionIds: members, edges: day?.edges ?? [] };
  const base = { ownerUserId: batch.account.ownerUserId, accountId: batch.account.id, budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq };
  await tx.insert(s.historicalPositions).values({ ...base, id: positionId, historicalDate: date, kind });
  await tx.insert(s.orderingRevisions).values({ ...base, id: order.id, historicalDate: date, previousRevisionId: order.previousRevisionId,
    manifest: { schemaVersion: 1, positionIds: members }, dependencies: { schemaVersion: 1, edges: order.edges } });
  return { history: { ...history, knowledgeCut: batch.recordedSeq,
    positions: [...history.positions, { id: positionId, historicalDate: date, recordedSeq: batch.recordedSeq }], orderings: [...history.orderings, order] },
    audit: { entityType: 'DAY_ORDERING', entityId: order.id, before: { revisionId: order.previousRevisionId }, after: { date, positionIds: members, edges: order.edges } } };
}
