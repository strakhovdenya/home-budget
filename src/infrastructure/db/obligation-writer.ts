import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { parseObligationBatch } from '@/domain/obligations/validation';
import { snapshot, transition, validState } from '@/domain/obligations/lifecycle';
import { calculatePeriodReserves, selectObligationState, validateLifecycleHistory } from '@/domain/obligations/history';
import type { ObligationEvent, ObligationState, ObligationHistory } from '@/domain/obligations/contracts';
import { correctionTips, indexHistory, selectState } from '@/domain/checkpoints/history';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { parseInstant, berlinDateOfInstant } from '@/shared/pure/instant';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { loadObligationHistory } from './obligation-history';
import { persistCheckpointPlan, affectedReports } from './checkpoint-persistence';
import { rejectBatch, type BatchWriter } from './commit';
import * as s from './schema';

export const writeObligations: BatchWriter = async (tx, batch) => {
  const input = parseObligationBatch(batch.command.payload);
  if (!input.ok) return rejectBatch(input.code);
  const now = parseInstant(batch.recordedAt);
  if (!now.ok) return rejectBatch('STORAGE_ERROR');
  const today = berlinDateOfInstant(now.value);
  if (!today.ok) return rejectBatch('STORAGE_ERROR');
  if (batch.command.effectiveDate !== input.value[0].effectiveDate) return rejectBatch('INVALID_OBLIGATION');
  const scope = { ownerUserId: batch.account.ownerUserId, accountId: batch.account.id };
  const base = { ...scope, budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq };
  const original = await loadObligationHistory(tx, scope, batch.account.recordedSeq);
  const baseline = validateLifecycleHistory(original);
  if (!baseline.ok) return rejectBatch(baseline.code);
  const bankHead = selectState(original, today.value);
  if (!bankHead.ok) return rejectBatch(bankHead.code);
  if ((bankHead.value.vector?.id ?? null) !== batch.account.activeAllocationRevisionId) return rejectBatch('HISTORICAL_STATE_CONFLICT');
  let history: ObligationHistory = { ...original };
  const audits: AuditDescriptor[] = [], created = new Map<string, ObligationEvent>(), freshDays = new Set<string>();
  async function period(key: string) {
    let [p] = await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId, scope.ownerUserId), eq(s.budgetPeriods.accountId, scope.accountId), eq(s.budgetPeriods.period, key)));
    if (!p) [p] = await tx.insert(s.budgetPeriods).values({ ...scope, id: randomUUID(), period: key }).returning();
    return p.id;
  }
  for (const change of input.value) {
    if (change.effectiveDate > today.value || (change.bankDate && change.bankDate > today.value)) return rejectBatch('INVALID_OBLIGATION');
    const tips = correctionTips(history.events, history.knowledgeCut), index = indexHistory(history);
    if (!tips.ok) return rejectBatch(tips.code);
    if (!index.ok) return rejectBatch(index.code);
    const old = change.correctionId ? tips.value.find(e => e.id === change.correctionId) : null;
    if (change.correctionId && (!old || old.obligationId !== change.obligationId || old.action !== change.action)) return rejectBatch('CORRECTION_CONFLICT');
    const previous = change.previousChangeKey ? created.get(change.previousChangeKey) : change.expectedStateRevisionId ? history.events.find(e => e.id === change.expectedStateRevisionId && e.recordedSeq <= history.knowledgeCut) : null;
    if (change.action !== 'CREATE' && (!previous || previous.obligationId !== change.obligationId)) return rejectBatch('STALE_OBLIGATION');
    if (change.action === 'CREATE' && (previous || change.previousChangeKey || change.expectedStateRevisionId)) return rejectBatch('INVALID_OBLIGATION');
    let positionId = old?.positionId ?? randomUUID();
    if (old && change.effectiveDate !== old.effectiveDate) return rejectBatch('HISTORICAL_STATE_CONFLICT');
    let checkpointId: string | null = null;
    if (change.bankCheck) {
      if (old || freshDays.has(change.effectiveDate)) return rejectBatch('ORDERING_CONFLICT');
      const beforeBank = selectState(history, today.value);
      if (!beforeBank.ok) return rejectBatch(beforeBank.code);
      const plan = planConfirmation(history, change.bankCheck, batch.recordedSeq, { checkpointId: randomUUID(), vectorId: randomUUID(), positionId,
        orderingId: randomUUID(), oldDayOrderingId: randomUUID() }, today.value, now.value);
      if (!plan.ok) return rejectBatch(plan.code);
      const plannedIndex = indexHistory(plan.value.history), oldChecks = correctionTips(history.checkpoints, history.knowledgeCut);
      if (!plannedIndex.ok) return rejectBatch(plannedIndex.code);
      if (!oldChecks.ok) return rejectBatch(oldChecks.code);
      const priorCheck = [...oldChecks.value].filter(c => plannedIndex.value.compare(c.positionId, positionId) < 0)
        .sort((a,b) => plannedIndex.value.compare(a.positionId,b.positionId)).at(-1);
      if (change.paymentConfirmation?.source === 'OUTSIDE_TRACKED_CARD'
        && (!priorCheck || priorCheck.balanceCents !== change.bankCheck.balanceCents || !change.paymentConfirmation.unchangedBalanceAcknowledged)) return rejectBatch('PAYMENT_CONFIRMATION_REQUIRED');
      if (priorCheck?.balanceCents === change.bankCheck.balanceCents && !change.paymentConfirmation?.unchangedBalanceAcknowledged) return rejectBatch('PAYMENT_CONFIRMATION_REQUIRED');
      // Each helper uses this one tx, and sees the preceding planned bank head if any.
      audits.push(...await persistCheckpointPlan(tx, { ...batch, account: { ...batch.account, activeAllocationRevisionId: beforeBank.value.vector?.id ?? null } }, history, plan.value, beforeBank.value, false));
      history = { ...plan.value.history, events: history.events };
      checkpointId = plan.value.checkpoint.id; positionId = plan.value.checkpoint.positionId; freshDays.add(change.effectiveDate);
    } else if (change.paymentConfirmation) {
      const c = history.checkpoints.find(c => c.id === change.paymentConfirmation!.checkpointId && c.recordedSeq <= history.knowledgeCut);
      if (!old || !c || c.positionId !== positionId || c.observedDate !== change.effectiveDate) return rejectBatch('PAYMENT_CONFIRMATION_REQUIRED');
      checkpointId = c.id;
      if (old.payment?.checkpointId !== checkpointId || old.payment.source !== change.paymentConfirmation.source
        || (old.payment.unchangedBalanceAcknowledged && !change.paymentConfirmation.unchangedBalanceAcknowledged)) return rejectBatch('PAYMENT_CONFIRMATION_REQUIRED');
    } else if (!old) {
      if (freshDays.has(change.effectiveDate)) return rejectBatch('ORDERING_CONFLICT');
      const day = index.value.days.get(change.effectiveDate), members = [...(day?.positionIds ?? [])], p = change.placement;
      if (!p && members.length) return rejectBatch('ORDERING_CONFLICT');
      const at = p?.afterPositionId ? members.indexOf(p.afterPositionId) + 1 : 0;
      if (p && (p.expectedOrderingRevisionId !== (day?.id ?? null) || (p.afterPositionId && !at) || (members[at] ?? null) !== p.beforePositionId)) return rejectBatch('ORDERING_CONFLICT');
      members.splice(at, 0, positionId);
      const order = { id: randomUUID(), historicalDate: change.effectiveDate, recordedSeq: batch.recordedSeq, previousRevisionId: day?.id ?? null,
        positionIds: members, edges: day?.edges ?? [] };
      await tx.insert(s.historicalPositions).values({ ...base, id: positionId, historicalDate: change.effectiveDate, kind: 'OBLIGATION' });
      await tx.insert(s.orderingRevisions).values({ ...base, id: order.id, historicalDate: order.historicalDate, previousRevisionId: order.previousRevisionId,
        manifest: { schemaVersion: 1, positionIds: members }, dependencies: { schemaVersion: 1, edges: order.edges } });
      history = { ...history, knowledgeCut: batch.recordedSeq, positions: [...history.positions, { id: positionId, historicalDate: change.effectiveDate, recordedSeq: batch.recordedSeq }], orderings: [...history.orderings, order] };
      freshDays.add(change.effectiveDate);
      audits.push({ entityType: 'DAY_ORDERING', entityId: order.id, before: { revisionId: order.previousRevisionId }, after: { date: order.historicalDate, positionIds: members } });
    }
    history = { ...history, knowledgeCut: batch.recordedSeq };
    const ordering = indexHistory(history);
    if (!ordering.ok) return rejectBatch(ordering.code);
    if (previous && !(ordering.value.compare(previous.positionId, positionId) < 0)) return rejectBatch('ORDERING_CONFLICT');
    if (change.action !== 'CREATE') {
      const at = tips.value.filter(e => e.obligationId === change.obligationId && ordering.value.compare(e.positionId, positionId) < 0).sort((a,b) => ordering.value.compare(a.positionId,b.positionId)).at(-1);
      if (at?.id !== previous?.id) return rejectBatch('STALE_OBLIGATION');
    }
    let state: ObligationState;
    if (change.action === 'CREATE') {
      const origin = await period(String(change.data.originatingPeriod)), funding = await period(String(change.data.fundingPeriod));
      if (old && origin !== old.originatingPeriodId) return rejectBatch('INVALID_OBLIGATION');
      state = { originatingPeriodId: origin, fundingPeriodId: funding, title: String(change.data.title), dueDate: change.data.dueDate as ObligationState['dueDate'],
        originalCents: change.data.originalCents as bigint, outstandingCents: change.data.originalCents as bigint, status: 'UNPAID',
        isPossible: change.data.isPossible as boolean, reserveFull: change.data.reserveFull as boolean };
      if (!validState(state)) return rejectBatch('INVALID_OBLIGATION');
    } else {
      const result = transition(previous!, change.action, change.data);
      if (!result.ok) return rejectBatch(result.code);
      state = result.value;
    }
    const eventId = randomUUID(), obligationId = old?.obligationId ?? change.obligationId ?? randomUUID();
    const event: ObligationEvent = { ...state, id: eventId, obligationId, logicalFactId: old?.logicalFactId ?? eventId, supersedesId: old?.id ?? null,
      previousRevisionId: previous?.id ?? null, beforeState: previous ? snapshot(previous) : null, positionId, effectiveDate: change.effectiveDate,
      bankDate: change.bankDate, confirmedAt: batch.recordedAt, recordedSeq: batch.recordedSeq, action: change.action,
      payment: change.paymentConfirmation ? { ...change.paymentConfirmation, checkpointId: checkpointId!, amountCents: change.data.amountCents as bigint,
        beforeRevisionId: previous?.id ?? null, afterRevisionId: eventId } : null };
    if (change.action === 'CREATE' && !old) await tx.insert(s.obligations).values({ ...base, id: obligationId, originatingPeriodId: state.originatingPeriodId });
    await tx.insert(s.obligationEvents).values({ ...base, ...event });
    history = { ...history, events: [...history.events, event] }; created.set(change.key, event);
    audits.push({ entityType: 'OBLIGATION_STATE', entityId: event.id, before: old ? snapshot(old) : previous ? snapshot(previous) : null,
      after: { state: snapshot(event), payment: event.payment ? { ...event.payment } : null, effectiveDate: event.effectiveDate, positionId,
        bankDate: event.bankDate, supersedesId: event.supersedesId, confirmedAt: event.confirmedAt } });
  }
  const valid = validateLifecycleHistory(history);
  if (!valid.ok) return rejectBatch(valid.code);
  // Check reserves at every historical boundary, including later states, for int64 overflow.
  for (const e of valid.value) {
    const selected = selectObligationState(history, e.effectiveDate, e.positionId);
    if (!selected.ok) return rejectBatch(selected.code);
    const reserves = calculatePeriodReserves(selected.value.states);
    if (!reserves.ok) return rejectBatch(reserves.code);
  }
  const changedBankReports = await affectedReports(tx, original, history, scope.ownerUserId, scope.accountId);
  const reports = await tx.select({ head: s.reportHeads, closing: s.monthClosings }).from(s.reportHeads).innerJoin(s.monthClosings, eq(s.monthClosings.id, s.reportHeads.closingId))
    .where(and(eq(s.reportHeads.ownerUserId, scope.ownerUserId), eq(s.reportHeads.accountId, scope.accountId)));
  for (const { head, closing } of reports) {
    const day = parseBerlinDate(closing.historicalThroughDate);
    // Explicit HB11 manifest contract. Unsupported older report contracts require review.
    if (!day.ok || closing.selectionContractVersion !== 1 || !closing.sourceManifest || typeof closing.sourceManifest !== 'object'
      || !('obligationRevisionIds' in closing.sourceManifest) || !Array.isArray(closing.sourceManifest.obligationRevisionIds)) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const pinned = selectObligationState({ ...original, knowledgeCut: closing.evidenceRecordedCutoffSeq }, day.value), before = selectObligationState(original, day.value), after = selectObligationState(history, day.value);
    if (!pinned.ok || !before.ok || !after.ok) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const pinnedReserves = calculatePeriodReserves(pinned.value.states);
    if (!pinnedReserves.ok || (pinnedReserves.value.get(closing.periodId) ?? 0n) !== closing.historicalReservedCents) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const ids = (events: readonly ObligationEvent[]) => events.map(e => e.id).sort().join(',');
    const refs = closing.sourceManifest.obligationRevisionIds;
    if (refs.some(x => typeof x !== 'string') || new Set(refs).size !== refs.length || [...refs].sort().join(',') !== ids(pinned.value.states)
      || (!head.correctionPending && ids(pinned.value.states) !== ids(before.value.states))) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    if (!head.correctionPending && (ids(before.value.states) !== ids(after.value.states) || changedBankReports.some(r => r.head.id === head.id))) {
      await tx.update(s.reportHeads).set({ correctionPending: true }).where(eq(s.reportHeads.id, head.id));
      audits.push({ entityType: 'REPORT_REVIEW_REQUIRED', entityId: head.id, before: { closingId: head.closingId, correctionPending: false }, after: { closingId: head.closingId, correctionPending: true } });
    }
  }
  return audits;
};
