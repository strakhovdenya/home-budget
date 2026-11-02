import { correctionTips, indexHistory } from '@/domain/checkpoints/history';
import { encodeCanonical } from '@/domain/updates/canonical-value';
import { addCents } from '@/domain/money/money';
import type { UpdateErrorCode } from '@/domain/updates/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';
import type { SavingEvent, SavingHistory, SavingState } from './contracts';
import { businessState, snapshot, transition, validState } from './lifecycle';

/** Full states are selected; immutable confirmed amounts are only consistency evidence. */
export function validateSavingHistory(h: SavingHistory): Result<readonly SavingEvent[], UpdateErrorCode> {
  const index = indexHistory(h), tips = correctionTips(h.savings, h.knowledgeCut);
  if (!index.ok) return index;
  if (!tips.ok) return tips;
  const bad = { ok: false, code: 'HISTORICAL_SAVINGS_CONFLICT' } as const;
  const visible = h.savings.filter(e => e.recordedSeq <= h.knowledgeCut);
  for (const e of visible) {
    if (!validState(e) || !['CREATE','AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE'].includes(e.action)
      || !h.positions.some(p => p.id === e.positionId && p.historicalDate === e.effectiveDate && p.recordedSeq <= e.recordedSeq)) return bad;
    if (e.supersedesId) {
      const old = visible.find(x => x.id === e.supersedesId);
      if (!old || old.savingsId !== e.savingsId || old.action !== e.action || old.positionId !== e.positionId || old.effectiveDate !== e.effectiveDate
        || old.originatingPeriodId !== e.originatingPeriodId || old.fundingPeriodId !== e.fundingPeriodId
        || old.confirmedReleasedAmount !== e.confirmedReleasedAmount || old.confirmedIncreaseAmount !== e.confirmedIncreaseAmount) return bad;
    }
    const p = visible.find(x => x.id === e.previousRevisionId);
    if (e.action === 'CREATE') {
      if (e.previousRevisionId !== null || e.beforeState !== null || e.status !== 'ACTIVE' || e.confirmedIncreaseAmount !== null || e.confirmedReleasedAmount !== null) return bad;
    } else {
      if (!p || p.savingsId !== e.savingsId || p.recordedSeq > e.recordedSeq
        || (p.recordedSeq === e.recordedSeq && p.budgetUpdateId !== e.budgetUpdateId)
        || !(index.value.compare(p.positionId, e.positionId) < 0) || encodeCanonical(e.beforeState) !== encodeCanonical(snapshot(p))) return bad;
      const financial = e.action === 'INCREASE' ? e.confirmedIncreaseAmount : e.action === 'AMEND' ? null : e.confirmedReleasedAmount;
      if ((e.action === 'INCREASE' && e.confirmedReleasedAmount !== null) || (e.action !== 'INCREASE' && e.confirmedIncreaseAmount !== null)
        || (e.action === 'AMEND' && e.confirmedReleasedAmount !== null) || (e.action !== 'AMEND' && financial === null)) return bad;
      const result = transition(p, e.action, e.action === 'AMEND' ? { title: e.title } : { amountCents: financial! });
      if (!result.ok || encodeCanonical({ ...result.value }) !== encodeCanonical({ ...businessState(e) })) return bad;
    }
  }
  const ordered = [...tips.value].sort((a,b) => index.value.compare(a.positionId,b.positionId));
  const current = new Map<string, SavingEvent>();
  for (const e of ordered) {
    const p = current.get(e.savingsId);
    if (!p) { if (e.action !== 'CREATE') return bad; }
    else if (e.action === 'CREATE' || e.previousRevisionId !== p.id || encodeCanonical(e.beforeState) !== encodeCanonical(snapshot(p))) return bad;
    current.set(e.savingsId, e);
  }
  return { ok: true, value: ordered };
}
export function selectSavingState(h: SavingHistory, through: BerlinDate, positionId?: string): Result<Readonly<{ states: readonly SavingEvent[]; knowledgeCut: bigint; orderingRevisionIds: readonly string[] }>, UpdateErrorCode> {
  const valid = validateSavingHistory(h), index = indexHistory(h);
  if (!valid.ok) return valid;
  if (!index.ok) return index;
  if (positionId && !h.positions.some(p => p.id === positionId && p.historicalDate === through && p.recordedSeq <= h.knowledgeCut)) return { ok: false, code: 'ORDERING_CONFLICT' };
  const states = new Map<string, SavingEvent>();
  for (const e of valid.value) if (e.effectiveDate <= through && (!positionId || index.value.compare(e.positionId, positionId) <= 0)) states.set(e.savingsId, e);
  return { ok: true, value: { states: [...states.values()], knowledgeCut: h.knowledgeCut,
    orderingRevisionIds: [...index.value.days.values()].filter(o => o.historicalDate <= through).map(o => o.id) } };
}
export function calculatePeriodSavings(states: readonly (SavingState & { savingsId: string })[]): Result<ReadonlyMap<string, bigint>, 'MONEY_RANGE' | 'INVALID_SAVING'> {
  const totals = new Map<string, bigint>(), seen = new Set<string>();
  let all = 0n;
  for (const e of states) {
    if (!validState(e) || seen.has(e.savingsId)) return { ok: false, code: 'INVALID_SAVING' };
    seen.add(e.savingsId);
    const amount = e.status === 'ACTIVE' ? e.amountCents : 0n;
    const sum = addCents(totals.get(e.fundingPeriodId) ?? 0n, amount), total = addCents(all, amount);
    if (!sum.ok || !total.ok) return { ok: false, code: 'MONEY_RANGE' };
    totals.set(e.fundingPeriodId, sum.value); all = total.value;
  }
  return { ok: true, value: totals };
}
