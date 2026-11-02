import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { parseCheckpoint } from '@/domain/checkpoints/validation';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import { selectState } from '@/domain/checkpoints/history';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';
import { loadCheckpointHistory } from './checkpoint-history';
import { persistCheckpointPlan } from './checkpoint-persistence';
import { rejectBatch, type BatchWriter } from './commit';
import { obligationEvents } from './schema';
export const writeBankCheckpoint: BatchWriter = async (tx, batch) => {
  const parsed = parseCheckpoint(batch.command.payload);
  if (!parsed.ok) return rejectBatch(parsed.code);
  if (batch.command.effectiveDate !== parsed.value.observedDate) return rejectBatch('INVALID_CHECKPOINT');
  const now = parseInstant(batch.recordedAt);
  if (!now.ok) return rejectBatch('STORAGE_ERROR');
  const today = berlinDateOfInstant(now.value);
  if (!today.ok) return rejectBatch('STORAGE_ERROR');
  const ownerUserId = batch.account.ownerUserId, accountId = batch.account.id, scope = { ownerUserId, accountId };
  const history = await loadCheckpointHistory(tx, scope, batch.account.recordedSeq);
  if (parsed.value.correction) {
    const target = history.checkpoints.find(c => c.id === parsed.value.correction!.checkpointId);
    if (target) {
      const attached = await tx.select({ id: obligationEvents.id }).from(obligationEvents).where(and(eq(obligationEvents.ownerUserId, ownerUserId),
        eq(obligationEvents.accountId, accountId), eq(obligationEvents.positionId, target.positionId)));
      if (attached.length) return rejectBatch('HISTORICAL_STATE_CONFLICT');
    }
  }
  const previous = selectState(history, today.value);
  if (!previous.ok) return rejectBatch(previous.code);
  if ((previous.value.vector?.id ?? null) !== batch.account.activeAllocationRevisionId) return rejectBatch('HISTORICAL_STATE_CONFLICT');
  const plan = planConfirmation(history, parsed.value, batch.recordedSeq, {
    checkpointId: randomUUID(), vectorId: randomUUID(), positionId: randomUUID(), orderingId: randomUUID(), oldDayOrderingId: randomUUID(),
  }, today.value, now.value);
  if (!plan.ok) return rejectBatch(plan.code);
  return persistCheckpointPlan(tx, batch, history, plan.value, previous.value);
};
