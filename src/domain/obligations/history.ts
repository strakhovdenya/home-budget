import { correctionTips, indexHistory } from '@/domain/checkpoints/history';
import { encodeCanonical } from '@/domain/updates/canonical-value';
import { addCents } from '@/domain/money/money';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { CanonicalValue } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import type { CheckpointErrorCode } from '@/domain/checkpoints/contracts';
import type { ObligationEvent, ObligationHistory, ObligationErrorCode } from './contracts';
import { snapshot, transition, validState } from './lifecycle';
type ErrorCode = ObligationErrorCode | CheckpointErrorCode;
export function validateLifecycleHistory(h: ObligationHistory): Result<readonly ObligationEvent[], ErrorCode> {
  const index = indexHistory(h), tips = correctionTips(h.events, h.knowledgeCut);
  if (!index.ok) return index;
  if (!tips.ok) return tips;
  const bad = { ok: false, code: 'HISTORICAL_PAYMENT_CONFLICT' } as const;
  const visible = h.events.filter(e => e.recordedSeq <= h.knowledgeCut), positions = new Map(h.positions.map(p => [p.id, p]));
  for (const e of visible) {
    if (!validState(e) || positions.get(e.positionId)?.historicalDate !== e.effectiveDate) return bad;
    if (e.supersedesId) {
      const old = visible.find(x => x.id === e.supersedesId);
      if (!old || old.obligationId !== e.obligationId || old.action !== e.action) return bad;
    }
    const p = e.previousRevisionId ? visible.find(x => x.id === e.previousRevisionId) : null;
    if (e.action === 'CREATE') { if (p || e.beforeState !== null || e.status !== 'UNPAID' || e.originalCents !== e.outstandingCents) return bad; }
    else if (!p || p.obligationId !== e.obligationId || p.recordedSeq > e.recordedSeq || !(index.value.compare(p.positionId, e.positionId) < 0)
      || encodeCanonical(e.beforeState) !== encodeCanonical(snapshot(p))) return bad;
    if (e.action === 'PAID' || e.action === 'PARTIAL_SETTLEMENT') {
      if (!e.payment || e.payment.afterRevisionId !== e.id || e.payment.beforeRevisionId !== e.previousRevisionId || !e.payment.bankStateAffirmed
        || !['TRACKED_CARD', 'OUTSIDE_TRACKED_CARD'].includes(e.payment.source)) return bad;
      const c = h.checkpoints.find(c => c.id === e.payment!.checkpointId && c.recordedSeq <= e.recordedSeq);
      if (!c || c.positionId !== e.positionId || c.observedDate !== e.effectiveDate) return bad;
    } else if (e.payment !== null) return bad;
  }
  const ordered = [...tips.value].sort((a, b) => index.value.compare(a.positionId, b.positionId));
  const current = new Map<string, ObligationEvent>();
  for (const e of ordered) {
    const p = current.get(e.obligationId);
    if (!p) { if (e.action !== 'CREATE') return bad; }
    else {
      if (e.action === 'CREATE' || p.status !== 'UNPAID' || index.value.compare(p.positionId, e.positionId) === 0
        || p.originatingPeriodId !== e.originatingPeriodId || p.fundingPeriodId !== e.fundingPeriodId) return bad;
      const data: Record<string, CanonicalValue> = e.action === 'AMEND' ? { title: e.title, dueDate: e.dueDate, originalCents: e.originalCents, isPossible: e.isPossible, reserveFull: e.reserveFull }
        : e.payment ? { amountCents: e.payment.amountCents } : {};
      const result = transition(p, e.action, data);
      if (!result.ok || encodeCanonical({ ...result.value }) !== encodeCanonical({ originatingPeriodId: e.originatingPeriodId,
        fundingPeriodId: e.fundingPeriodId, title: e.title, dueDate: e.dueDate, originalCents: e.originalCents,
        outstandingCents: e.outstandingCents, status: e.status, isPossible: e.isPossible, reserveFull: e.reserveFull })) return bad;
    }
    current.set(e.obligationId, e);
  }
  return { ok: true, value: ordered };
}
export function selectObligationState(h: ObligationHistory, through: BerlinDate, positionId?: string): Result<Readonly<{ states: readonly ObligationEvent[]; knowledgeCut: bigint; orderingRevisionIds: readonly string[] }>, ErrorCode> {
  const valid = validateLifecycleHistory(h), index = indexHistory(h);
  if (!valid.ok) return valid;
  if (!index.ok) return index;
  if (positionId && !h.positions.some(p => p.id === positionId && p.historicalDate === through && p.recordedSeq <= h.knowledgeCut)) return { ok: false, code: 'ORDERING_CONFLICT' };
  const states = new Map<string, ObligationEvent>();
  for (const e of valid.value) if (e.effectiveDate <= through && (!positionId || index.value.compare(e.positionId, positionId) <= 0)) states.set(e.obligationId, e);
  return { ok: true, value: { states: [...states.values()], knowledgeCut: h.knowledgeCut,
    orderingRevisionIds: [...index.value.days.values()].filter(o => o.historicalDate <= through).map(o => o.id) } };
}
export function calculatePeriodReserves(states: readonly ObligationEvent[]): Result<ReadonlyMap<string, bigint>, 'MONEY_RANGE' | 'INVALID_OBLIGATION'> {
  const reserves = new Map<string, bigint>(), seen = new Set<string>();
  for (const e of states) {
    if (!validState(e) || seen.has(e.obligationId)) return { ok: false, code: 'INVALID_OBLIGATION' };
    seen.add(e.obligationId);
    const sum = addCents(reserves.get(e.fundingPeriodId) ?? 0n, e.status === 'UNPAID' && e.reserveFull ? e.outstandingCents : 0n);
    if (!sum.ok) return { ok: false, code: 'MONEY_RANGE' };
    reserves.set(e.fundingPeriodId, sum.value);
  }
  return { ok: true, value: reserves };
}
