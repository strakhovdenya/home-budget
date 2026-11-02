import type { BerlinDate } from '@/shared/pure/calendar';
import type { MicrosecondInstant } from '@/shared/pure/instant';
import type { Result } from '@/shared/pure/result';
import type { AllocationRevision, Checkpoint, CheckpointErrorCode, CheckpointInput, History, Ordering } from './contracts';
import { correctionTips, indexHistory, selectState, validateHistoricalStates } from './history';

export type ConfirmationIds = Readonly<{ checkpointId: string; vectorId: string; positionId: string; orderingId: string; oldDayOrderingId: string }>;
export function planConfirmation(history: History, input: CheckpointInput, seq: bigint, ids: ConfirmationIds,
  today: BerlinDate, now: MicrosecondInstant): Result<Readonly<{
    history: History; checkpoint: Checkpoint; vector: AllocationRevision; orders: readonly Ordering[];
    newPosition: boolean; activeVectorId: string;
  }>, CheckpointErrorCode> {
  if (input.observedDate > today || (input.observedAt !== null && input.observedAt > now)) return { ok: false, code: 'INVALID_CHECKPOINT' };
  const index = indexHistory(history), tips = correctionTips(history.checkpoints, history.knowledgeCut), vectors = correctionTips(history.vectors, history.knowledgeCut);
  if (!index.ok) return index;
  if (!tips.ok) return tips;
  if (!vectors.ok) return vectors;
  const old = input.correction ? tips.value.find(c => c.id === input.correction!.checkpointId) : null;
  const oldVector = input.correction ? vectors.value.find(v => v.id === input.correction!.allocationRevisionId) : null;
  if (input.correction && (!old || !oldVector || oldVector.checkpointId !== old.id || oldVector.positionId !== old.positionId)) return { ok: false, code: 'CORRECTION_CONFLICT' };
  const reuse = !!old && !input.correction!.reposition;
  if (reuse && (input.observedDate !== old!.observedDate || input.observedAt !== old!.observedAt || input.placement !== null)) return { ok: false, code: 'CORRECTION_CONFLICT' };
  // A position-level dependency from another stream cannot silently follow a moved fact.
  // Its explicit re-confirmation belongs to that stream's correction workflow.
  if (old && !reuse && [...index.value.days.values()].some(o => o.edges.some(e => e.before === old.positionId || e.after === old.positionId))) return { ok: false, code: 'HISTORICAL_STATE_CONFLICT' };
  const positionId = reuse ? old!.positionId : ids.positionId;
  const checkpoint: Checkpoint = { id: ids.checkpointId, logicalFactId: old?.logicalFactId ?? ids.checkpointId,
    supersedesId: old?.id ?? null, recordedSeq: seq, positionId, observedDate: input.observedDate, observedAt: input.observedAt, balanceCents: input.balanceCents };
  const orders: Ordering[] = [];
  if (!reuse) {
    const day = index.value.days.get(input.observedDate), members = [...(day?.positionIds ?? [])];
    let insert = 0;
    if (input.placement) {
      const p = input.placement;
      if (p.expectedOrderingRevisionId !== (day?.id ?? null)) return { ok: false, code: 'ORDERING_CONFLICT' };
      insert = p.afterPositionId === null ? 0 : members.indexOf(p.afterPositionId) + 1;
      if ((p.afterPositionId !== null && insert === 0) || (members[insert] ?? null) !== p.beforePositionId) return { ok: false, code: 'ORDERING_CONFLICT' };
    } else if (members.length) return { ok: false, code: 'ORDERING_CONFLICT' };
    members.splice(insert, 0, positionId);
    orders.push({ id: ids.orderingId, historicalDate: input.observedDate, recordedSeq: seq, previousRevisionId: day?.id ?? null, positionIds: members, edges: day?.edges ?? [] });
    // Reaffirm the complete old day's manifest on a date move; ghosts retain immutable identity.
    if (old && old.observedDate !== input.observedDate) {
      const oldDay = index.value.days.get(old.observedDate);
      if (!oldDay) return { ok: false, code: 'ORDERING_CONFLICT' };
      orders.push({ ...oldDay, id: ids.oldDayOrderingId, previousRevisionId: oldDay.id, recordedSeq: seq });
    }
  }
  const positions = reuse ? history.positions : [...history.positions, { id: positionId, historicalDate: input.observedDate, recordedSeq: seq }];
  const provisional: History = { ...history, knowledgeCut: seq, positions, orderings: [...history.orderings, ...orders], checkpoints: [...history.checkpoints, checkpoint] };
  const newIndex = indexHistory({ ...provisional, vectors: [] });
  if (!newIndex.ok) return newIndex;
  const prior = vectors.value.filter(v => newIndex.value.compare(v.positionId, positionId) <= 0).sort((a, b) => newIndex.value.compare(a.positionId, b.positionId)).at(-1);
  const vector: AllocationRevision = { id: ids.vectorId, logicalFactId: oldVector?.logicalFactId ?? ids.vectorId,
    supersedesId: oldVector?.id ?? null, checkpointId: checkpoint.id, recordedSeq: seq, positionId,
    effectiveDate: input.observedDate, previousRevisionId: oldVector ? oldVector.previousRevisionId : prior?.id ?? null, allocations: input.allocations };
  const candidate = { ...provisional, vectors: [...history.vectors, vector] };
  const valid = validateHistoricalStates(candidate);
  if (!valid.ok) return valid;
  const current = selectState(candidate, today);
  if (!current.ok) return current;
  if (current.value.status !== 'OBSERVED') return { ok: false, code: 'HISTORICAL_STATE_CONFLICT' };
  return { ok: true, value: { history: candidate, checkpoint, vector, orders, newPosition: !reuse, activeVectorId: current.value.vector.id } };
}
