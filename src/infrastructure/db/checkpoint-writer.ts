import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { parseCheckpoint } from '@/domain/checkpoints/validation';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import { selectState } from '@/domain/checkpoints/history';
import type { History } from '@/domain/checkpoints/contracts';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { loadCheckpointHistory } from './checkpoint-history';
import { rejectBatch, type BatchWriter, type Transaction } from './commit';
import * as s from './schema';

/** Only bank/vector changes occur here; existing earmarks and closing snapshots are untouched. */
async function affectedReports(tx: Transaction, history: History, candidate: History, ownerUserId: string, accountId: string) {
  const reports = await tx.select({ head: s.reportHeads, closing: s.monthClosings }).from(s.reportHeads)
    .innerJoin(s.monthClosings, eq(s.monthClosings.id, s.reportHeads.closingId))
    .where(and(eq(s.reportHeads.ownerUserId, ownerUserId), eq(s.reportHeads.accountId, accountId)));
  const changed: typeof reports = [];
  for (const report of reports) {
    const c = report.closing, through = parseBerlinDate(c.historicalThroughDate);
    if (!through.ok || c.selectionContractVersion !== 1 || c.evidenceRecordedCutoffSeq > history.knowledgeCut) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const pinned = selectState({ ...history, knowledgeCut: c.evidenceRecordedCutoffSeq }, through.value);
    const before = selectState(history, through.value), after = selectState(candidate, through.value);
    if (!pinned.ok || !before.ok || !after.ok || pinned.value.checkpoint?.id !== (c.lastCheckpointId ?? undefined)
      || pinned.value.vector?.id !== (c.historicalAllocationRevisionId ?? undefined)) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const refs = c.orderingRevisionRefs;
    if (!Array.isArray(refs) || refs.length !== pinned.value.orderingRevisionIds.length
      || new Set(refs).size !== refs.length || !pinned.value.orderingRevisionIds.every(id => refs.includes(id))) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    if (!report.head.correctionPending && (pinned.value.checkpoint?.id !== before.value.checkpoint?.id || pinned.value.vector?.id !== before.value.vector?.id)) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    if (before.value.checkpoint?.id !== after.value.checkpoint?.id || before.value.vector?.id !== after.value.vector?.id) changed.push(report);
  }
  return changed;
}

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
  const previous = selectState(history, today.value);
  if (!previous.ok) return rejectBatch(previous.code);
  if ((previous.value.vector?.id ?? null) !== batch.account.activeAllocationRevisionId) return rejectBatch('HISTORICAL_STATE_CONFLICT');
  const plan = planConfirmation(history, parsed.value, batch.recordedSeq, {
    checkpointId: randomUUID(), vectorId: randomUUID(), positionId: randomUUID(), orderingId: randomUUID(), oldDayOrderingId: randomUUID(),
  }, today.value, now.value);
  if (!plan.ok) return rejectBatch(plan.code);
  const p = plan.value, c = p.checkpoint, v = p.vector;
  const reports = await affectedReports(tx, history, p.history, ownerUserId, accountId);
  const base = { ownerUserId, accountId, budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq };
  if (p.newPosition) await tx.insert(s.historicalPositions).values({ ...base, id: c.positionId, historicalDate: c.observedDate, kind: 'BANK_CHECK' });
  for (const o of p.orders) await tx.insert(s.orderingRevisions).values({ ...base, id: o.id, historicalDate: o.historicalDate,
    previousRevisionId: o.previousRevisionId, manifest: { schemaVersion: 1, positionIds: o.positionIds }, dependencies: { schemaVersion: 1, edges: o.edges } });
  await tx.insert(s.balanceCheckpoints).values({ ...base, id: c.id, logicalFactId: c.logicalFactId, supersedesId: c.supersedesId,
    positionId: c.positionId, observedDate: c.observedDate, observedAt: c.observedAt, balanceCents: c.balanceCents, reason: batch.command.reason });
  await tx.insert(s.allocationRevisions).values({ ...base, id: v.id, logicalFactId: v.logicalFactId, supersedesId: v.supersedesId,
    checkpointId: v.checkpointId, previousRevisionId: v.previousRevisionId, positionId: v.positionId, effectiveDate: v.effectiveDate,
    changeKind: c.supersedesId ? 'CHECKPOINT_CORRECTION' : 'ACTUAL_CHECK', confirmedAt: batch.recordedAt });
  for (const a of v.allocations) {
    let [period] = await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId, ownerUserId), eq(s.budgetPeriods.accountId, accountId), eq(s.budgetPeriods.period, a.period)));
    if (!period) [period] = await tx.insert(s.budgetPeriods).values({ ...scope, id: randomUUID(), period: a.period }).returning();
    await tx.insert(s.periodAllocations).values({ ...scope, id: randomUUID(), allocationRevisionId: v.id, periodId: period.id, amountCents: a.amountCents });
  }
  if (p.activeVectorId !== batch.account.activeAllocationRevisionId) await tx.update(s.accounts).set({ activeAllocationRevisionId: p.activeVectorId })
    .where(and(eq(s.accounts.id, accountId), eq(s.accounts.ownerUserId, ownerUserId)));
  const beforeCheckpoint = c.supersedesId ? history.checkpoints.find(x => x.id === c.supersedesId) : null;
  const beforeVector = v.supersedesId ? history.vectors.find(x => x.id === v.supersedesId) : null;
  const audits: AuditDescriptor[] = [
    { entityType: 'BANK_CHECKPOINT', entityId: c.id, before: beforeCheckpoint ? { ...beforeCheckpoint } : null, after: { ...c } },
    { entityType: 'ALLOCATION_REVISION', entityId: v.id, before: beforeVector ? { ...beforeVector } : null, after: { ...v } },
    { entityType: 'BANK_HEAD', entityId: accountId, before: { allocationRevisionId: batch.account.activeAllocationRevisionId, checkpointId: previous.value.checkpoint?.id ?? null },
      after: { allocationRevisionId: p.activeVectorId, checkpointId: p.history.vectors.find(x => x.id === p.activeVectorId)!.checkpointId } },
  ];
  for (const o of p.orders) audits.push({ entityType: 'DAY_ORDERING', entityId: o.id,
    before: { revisionId: o.previousRevisionId }, after: { date: o.historicalDate, positionIds: o.positionIds, edges: o.edges } });
  for (const report of reports) if (!report.head.correctionPending) {
    await tx.update(s.reportHeads).set({ correctionPending: true }).where(and(eq(s.reportHeads.id, report.head.id), eq(s.reportHeads.ownerUserId, ownerUserId), eq(s.reportHeads.accountId, accountId)));
    audits.push({ entityType: 'REPORT_REVIEW_REQUIRED', entityId: report.head.id, before: { correctionPending: false, closingId: report.head.closingId }, after: { correctionPending: true, closingId: report.head.closingId } });
  }
  return audits;
};
