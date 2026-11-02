import type { BerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';
import { sumCents, validateCents } from '@/domain/money/money';
import { parsePeriod } from '@/domain/periods/period';
import type { AllocationRevision, Checkpoint, CheckpointErrorCode, History, Ordering, Revision, SelectedState } from './contracts';

export function correctionTips<T extends Revision>(facts: readonly T[], cut: bigint): Result<readonly T[], 'CORRECTION_CONFLICT'> {
  const visible = facts.filter(f => f.recordedSeq <= cut);
  const ids = new Map(visible.map(f => [f.id, f]));
  const replaced = new Set<string>(), roots = new Set<string>();
  if (ids.size !== visible.length) return { ok: false, code: 'CORRECTION_CONFLICT' };
  for (const f of visible) {
    if (f.supersedesId === null) {
      if (roots.has(f.logicalFactId)) return { ok: false, code: 'CORRECTION_CONFLICT' };
      roots.add(f.logicalFactId);
    } else {
      const prior = ids.get(f.supersedesId);
      if (!prior || prior.logicalFactId !== f.logicalFactId || prior.recordedSeq >= f.recordedSeq || replaced.has(prior.id)) return { ok: false, code: 'CORRECTION_CONFLICT' };
      replaced.add(prior.id);
    }
  }
  return { ok: true, value: visible.filter(f => !replaced.has(f.id)) };
}

export function indexHistory(history: History): Result<Readonly<{
  ranks: ReadonlyMap<string, number>; days: ReadonlyMap<string, Ordering>;
  compare: (a: string, b: string) => number;
}>, CheckpointErrorCode> {
  const bad = { ok: false, code: 'ORDERING_CONFLICT' } as const;
  const positions = history.positions.filter(p => p.recordedSeq <= history.knowledgeCut);
  const byId = new Map(positions.map(p => [p.id, p]));
  if (byId.size !== positions.length) return bad;
  const days = new Map<string, Ordering>(), ranks = new Map<string, number>();
  for (const day of [...new Set([...positions.map(p => p.historicalDate), ...history.orderings.filter(o => o.recordedSeq <= history.knowledgeCut).map(o => o.historicalDate)])].sort()) {
    const revisions = history.orderings.filter(o => o.historicalDate === day && o.recordedSeq <= history.knowledgeCut);
    const ids = new Map(revisions.map(o => [o.id, o]));
    const children = new Set<string>();
    if (ids.size !== revisions.length || revisions.filter(o => o.previousRevisionId === null).length !== 1) return bad;
    for (const o of revisions) if (o.previousRevisionId !== null) {
      const prior = ids.get(o.previousRevisionId);
      if (!prior || prior.recordedSeq >= o.recordedSeq || children.has(prior.id)) return bad;
      children.add(prior.id);
    }
    const tips = revisions.filter(o => !children.has(o.id));
    if (tips.length !== 1) return bad;
    const tip = tips[0], members = new Set(tip.positionIds);
    const expected = positions.filter(p => p.historicalDate === day);
    if (members.size !== tip.positionIds.length || members.size !== expected.length || expected.some(p => !members.has(p.id))) return bad;
    tip.positionIds.forEach((id, rank) => ranks.set(id, rank)); days.set(day, tip);
  }
  const compare = (a: string, b: string) => {
    const x = byId.get(a), y = byId.get(b);
    if (!x || !y) return NaN;
    return x.historicalDate < y.historicalDate ? -1 : x.historicalDate > y.historicalDate ? 1 : ranks.get(a)! - ranks.get(b)!;
  };
  for (const o of days.values()) for (const edge of o.edges) if (!(compare(edge.before, edge.after) < 0)) return bad;
  const cps = correctionTips(history.checkpoints, history.knowledgeCut), vs = correctionTips(history.vectors, history.knowledgeCut);
  if (!cps.ok) return cps;
  if (!vs.ok) return vs;
  if (new Set(cps.value.map(c => c.positionId)).size !== cps.value.length || new Set(vs.value.map(v => v.positionId)).size !== vs.value.length) return bad;
  for (const c of cps.value) {
    const p = byId.get(c.positionId);
    if (!p || p.historicalDate !== c.observedDate || !validateCents(c.balanceCents).ok || c.balanceCents < 0n) return bad;
  }
  const timed = cps.value.filter(c => c.observedAt !== null).sort((a, b) => compare(a.positionId, b.positionId));
  for (let i = 1; i < timed.length; i++) if (timed[i - 1].observedDate === timed[i].observedDate && timed[i - 1].observedAt! > timed[i].observedAt!) return bad;
  for (const v of vs.value) {
    const p = byId.get(v.positionId), anchor = history.checkpoints.find(c => c.id === v.checkpointId && c.recordedSeq <= history.knowledgeCut);
    if (!p || p.historicalDate !== v.effectiveDate || !anchor || !(compare(anchor.positionId, v.positionId) <= 0)) return bad;
    const sum = sumCents(v.allocations.map(a => a.amountCents));
    if (!sum.ok || sum.value !== anchor.balanceCents || v.allocations.some(a => a.amountCents < 0n || !parsePeriod(a.period).ok)
      || new Set(v.allocations.map(a => a.period)).size !== v.allocations.length) return { ok: false, code: 'HISTORICAL_STATE_CONFLICT' };
    if (v.previousRevisionId !== null) {
      const prior = history.vectors.find(r => r.id === v.previousRevisionId && r.recordedSeq <= history.knowledgeCut);
      if (!prior || !(compare(prior.positionId, v.positionId) <= 0)) return bad;
    }
  }
  return { ok: true, value: { ranks, days, compare } };
}

/** Corrections resolve at K BEFORE filtering by H (including moves beyond H). */
export function selectState(history: History, through: BerlinDate, throughPositionId?: string): Result<SelectedState, CheckpointErrorCode> {
  const index = indexHistory(history);
  if (!index.ok) return index;
  if (throughPositionId && !history.positions.some(p => p.id === throughPositionId && p.recordedSeq <= history.knowledgeCut && p.historicalDate === through)) return { ok: false, code: 'ORDERING_CONFLICT' };
  const cps = correctionTips(history.checkpoints, history.knowledgeCut), vs = correctionTips(history.vectors, history.knowledgeCut);
  if (!cps.ok) return cps;
  if (!vs.ok) return vs;
  const eligible = (date: BerlinDate, position: string) => date <= through && (!throughPositionId || index.value.compare(position, throughPositionId) <= 0);
  const c = cps.value.filter(c => eligible(c.observedDate, c.positionId)).sort((a, b) => index.value.compare(a.positionId, b.positionId)).at(-1);
  const v = vs.value.filter(v => eligible(v.effectiveDate, v.positionId)).sort((a, b) => index.value.compare(a.positionId, b.positionId)).at(-1);
  const provenance = { knowledgeCut: history.knowledgeCut, historicalThroughDate: through,
    orderingRevisionIds: [...index.value.days.values()].filter(o => o.historicalDate <= through).map(o => o.id) };
  if (!c && !v) return { ok: true, value: { ...provenance, status: 'NO_OBSERVATION', checkpoint: null, vector: null, endBalanceCents: null } };
  if (!c || !v || v.checkpointId !== c.id) return { ok: false, code: 'HISTORICAL_STATE_CONFLICT' };
  return { ok: true, value: { ...provenance, status: 'OBSERVED', checkpoint: c, vector: v,
    endBalanceCents: c.observedDate === through ? c.balanceCents : null } };
}

/** Check every effective position, not just today's apparently coherent head. */
export function validateHistoricalStates(history: History): Result<true, CheckpointErrorCode> {
  const index = indexHistory(history);
  if (!index.ok) return index;
  const cps = correctionTips(history.checkpoints, history.knowledgeCut), vs = correctionTips(history.vectors, history.knowledgeCut);
  if (!cps.ok) return cps;
  if (!vs.ok) return vs;
  const points = [...new Set([...cps.value.map(c => c.positionId), ...vs.value.map(v => v.positionId)])].sort(index.value.compare);
  const byCheckpoint = new Map(cps.value.map(c => [c.positionId, c])), byVector = new Map(vs.value.map(v => [v.positionId, v]));
  let checkpoint: Checkpoint | undefined, vector: AllocationRevision | undefined;
  // Co-located observation and vector take effect atomically; never inspect half a batch.
  for (const point of points) {
    checkpoint = byCheckpoint.get(point) ?? checkpoint; vector = byVector.get(point) ?? vector;
    if (!checkpoint || !vector || vector.checkpointId !== checkpoint.id) return { ok: false, code: 'HISTORICAL_STATE_CONFLICT' };
  }
  return { ok: true, value: true };
}
