import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { parseSavingBatch } from '@/domain/savings/validation';
import { snapshot, transition, validState } from '@/domain/savings/lifecycle';
import { savingAuditAfter } from '@/domain/savings/evidence';
import { calculatePeriodSavings, selectSavingState, validateSavingHistory } from '@/domain/savings/history';
import type { SavingEvent, SavingHistory, SavingState } from '@/domain/savings/contracts';
import { correctionTips, indexHistory, selectState } from '@/domain/checkpoints/history';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { parseInstant, berlinDateOfInstant } from '@/shared/pure/instant';
import { loadSavingHistory } from './savings-history';
import { insertHistoricalPosition } from './historical-placement';
import { persistCheckpointPlan } from './checkpoint-persistence';
import { markSavingReportImpact } from './report-impact';
import { rejectBatch, type BatchWriter } from './commit';
import * as s from './schema';

export const writeSavings: BatchWriter = async (tx, batch) => {
  const input = parseSavingBatch(batch.command.payload);
  if (!input.ok) return rejectBatch(input.code);
  const now = parseInstant(batch.recordedAt);
  if (!now.ok) return rejectBatch('STORAGE_ERROR');
  const today = berlinDateOfInstant(now.value);
  if (!today.ok) return rejectBatch('STORAGE_ERROR');
  if (batch.command.effectiveDate !== input.value[0].effectiveDate) return rejectBatch('INVALID_SAVING');
  const scope = { ownerUserId: batch.account.ownerUserId, accountId: batch.account.id };
  const base = { ...scope, budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq };
  const original = await loadSavingHistory(tx, scope, batch.account.recordedSeq);
  const baseline = validateSavingHistory(original);
  if (!baseline.ok) return rejectBatch(baseline.code);
  const bankHead = selectState(original, today.value);
  if (!bankHead.ok) return rejectBatch(bankHead.code);
  if ((bankHead.value.vector?.id ?? null) !== batch.account.activeAllocationRevisionId) return rejectBatch('HISTORICAL_STATE_CONFLICT');
  let history: SavingHistory = { ...original };
  const audits: AuditDescriptor[] = [], created = new Map<string, SavingEvent>(), freshDays = new Set<string>();
  async function period(key: string) {
    let [p] = await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId, scope.ownerUserId), eq(s.budgetPeriods.accountId, scope.accountId), eq(s.budgetPeriods.period, key)));
    if (!p) [p] = await tx.insert(s.budgetPeriods).values({ ...scope, id: randomUUID(), period: key }).returning();
    return p.id;
  }
  for (const change of input.value) {
    if (change.effectiveDate > today.value) return rejectBatch('INVALID_SAVING');
    const tips = correctionTips(history.savings, history.knowledgeCut);
    if (!tips.ok) return rejectBatch(tips.code);
    const old = change.correctionId ? tips.value.find(e => e.id === change.correctionId) : null;
    if (change.correctionId && (!old || old.savingsId !== change.savingsId || old.action !== change.action)) return rejectBatch('CORRECTION_CONFLICT');
    const previous = change.previousChangeKey ? created.get(change.previousChangeKey) : change.expectedStateRevisionId ? history.savings.find(e => e.id === change.expectedStateRevisionId) : null;
    if (change.action !== 'CREATE' && (!previous || previous.savingsId !== change.savingsId)) return rejectBatch('STALE_SAVING');
    if (old && change.effectiveDate !== old.effectiveDate) return rejectBatch('HISTORICAL_SAVINGS_CONFLICT');
    const positionId = old?.positionId ?? randomUUID();
    if (!old) {
      if (freshDays.has(change.effectiveDate)) return rejectBatch('ORDERING_CONFLICT');
      if (change.bankCheck) {
        const before = selectState(history, today.value);
        if (!before.ok) return rejectBatch(before.code);
        const plan = planConfirmation(history, change.bankCheck, batch.recordedSeq, { checkpointId: randomUUID(), vectorId: randomUUID(), positionId,
          orderingId: randomUUID(), oldDayOrderingId: randomUUID() }, today.value, now.value);
        if (!plan.ok) return rejectBatch(plan.code);
        audits.push(...await persistCheckpointPlan(tx, { ...batch, account: { ...batch.account, activeAllocationRevisionId: before.value.vector?.id ?? null } }, history, plan.value, before.value, false));
        history = { ...plan.value.history, savings: history.savings };
      } else {
        const placed = await insertHistoricalPosition(tx, batch, history, change.effectiveDate, positionId, change.placement, 'SAVINGS');
        history = { ...placed.history, savings: history.savings }; audits.push(placed.audit);
      }
      freshDays.add(change.effectiveDate);
    }
    history = { ...history, knowledgeCut: batch.recordedSeq };
    const index = indexHistory(history);
    if (!index.ok) return rejectBatch(index.code);
    if (previous && !(index.value.compare(previous.positionId, positionId) < 0)) return rejectBatch('ORDERING_CONFLICT');
    if (change.action !== 'CREATE') {
      const at = tips.value.filter(e => e.savingsId === change.savingsId && index.value.compare(e.positionId, positionId) < 0).sort((a,b) => index.value.compare(a.positionId,b.positionId)).at(-1);
      if (at?.id !== previous?.id) return rejectBatch('STALE_SAVING');
    }
    let state: SavingState;
    if (change.action === 'CREATE') {
      const origin = await period(String(change.data.originatingPeriod)), funding = await period(String(change.data.fundingPeriod));
      if (old && (origin !== old.originatingPeriodId || funding !== old.fundingPeriodId)) return rejectBatch('INVALID_SAVING');
      state = { originatingPeriodId: origin, fundingPeriodId: funding, title: String(change.data.title), amountCents: change.data.amountCents as bigint, status: 'ACTIVE' };
      if (!validState(state)) return rejectBatch('INVALID_SAVING');
    } else {
      const result = transition(previous!, change.action, change.data);
      if (!result.ok) return rejectBatch(result.code);
      state = result.value;
    }
    const id = randomUUID(), savingsId = old?.savingsId ?? change.savingsId ?? randomUUID();
    const event: SavingEvent = { ...state, id, savingsId, logicalFactId: old?.logicalFactId ?? id, supersedesId: old?.id ?? null,
      previousRevisionId: previous?.id ?? null, beforeState: previous ? snapshot(previous) : null, positionId, effectiveDate: change.effectiveDate,
      confirmedAt: batch.recordedAt, recordedSeq: batch.recordedSeq, budgetUpdateId: batch.id, action: change.action,
      confirmedIncreaseAmount: change.action === 'INCREASE' ? change.data.amountCents as bigint : null,
      confirmedReleasedAmount: change.action === 'PARTIAL_RELEASE' || change.action === 'FULL_RELEASE' ? change.data.amountCents as bigint : null };
    if (change.action === 'CREATE' && !old) await tx.insert(s.savingsGoals).values({ ...base, id: savingsId, originatingPeriodId: state.originatingPeriodId });
    await tx.insert(s.savingsEvents).values({ ...base, ...event });
    history = { ...history, savings: [...history.savings, event] }; created.set(change.key, event);
    audits.push({ entityType: 'SAVINGS_STATE', entityId: id, before: old ? snapshot(old) : event.beforeState, after: savingAuditAfter(event) });
  }
  const valid = validateSavingHistory(history);
  if (!valid.ok) return rejectBatch(valid.code);
  for (const e of valid.value) {
    const selected = selectSavingState(history, e.effectiveDate, e.positionId);
    if (!selected.ok) return rejectBatch(selected.code);
    const totals = calculatePeriodSavings(selected.value.states);
    if (!totals.ok) return rejectBatch(totals.code);
  }
  audits.push(...await markSavingReportImpact(tx, original, history, scope));
  return audits;
};
