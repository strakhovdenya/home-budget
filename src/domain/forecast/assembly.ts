import type { BerlinDate } from '@/shared/pure/calendar';
import { parsePeriod } from '@/domain/periods/period';
import { selectState, validateHistoricalStates } from '@/domain/checkpoints/history';
import { selectObligationState } from '@/domain/obligations/history';
import { selectSavingState } from '@/domain/savings/history';
import type { ObligationHistory } from '@/domain/obligations/contracts';
import type { SavingHistory } from '@/domain/savings/contracts';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { LIMITS, type Snapshot, type Obligation, type Saving, type Source } from './contracts';
import { capture, checked, refuse, validateSnapshot } from './validation';

export type Identity = Readonly<{ id: string; ownerUserId: string; accountId: string; originatingPeriodId: string; recordedSeq: bigint }>;
export type AssemblyInput = Readonly<{
  scope: AuthorizedScope; asOfDate: BerlinDate; capturedSeq: bigint; capturedAggregateRevision: bigint; activeAllocationRevisionId: string | null;
  obligationHistory: ObligationHistory; savingHistory: SavingHistory;
  obligationIdentities: readonly Identity[]; savingIdentities: readonly Identity[];
  periods: readonly Readonly<{ id: string; ownerUserId: string; accountId: string; period: string }>[];
}>;
/** Selects existing histories; no event deltas are replayed into balances or earmarks. */
export function assembleSnapshot(input: AssemblyInput): Snapshot {
  const { scope, asOfDate: h, obligationHistory: oh, savingHistory: sh } = input, k = oh.knowledgeCut;
  if (k !== sh.knowledgeCut || k < 0n || k > input.capturedSeq) refuse('INVALID_INPUT');
  const inScope = (r: { ownerUserId: string; accountId: string }) => r.ownerUserId === scope.ownerUserId && r.accountId === scope.accountId;
  const periods = new Map(input.periods.map(p => [p.id, checked(parsePeriod(p.period))]));
  if (periods.size !== input.periods.length || input.periods.some(p => !inScope(p))) refuse('SCOPE_MISMATCH');
  function period(id: string) { const p = periods.get(id); if (!p) return refuse('HISTORICAL_FUNDING_CONFLICT'); return p; }
  function identities(ids: readonly Identity[], events: readonly Readonly<{ id: string; identityId: string; originatingPeriodId: string; fundingPeriodId: string; recordedSeq: bigint; action: string }>[]) {
    const indexed = new Map(ids.map(i => [i.id, i])), seen = new Set<string>();
    if (indexed.size !== ids.length) refuse('DUPLICATE_ID_OR_PERIOD');
    for (const i of ids) {
      if (!inScope(i) || i.recordedSeq > k) refuse('SCOPE_MISMATCH'); period(i.originatingPeriodId);
    }
    for (const e of events.filter(e => e.recordedSeq <= k)) {
      const i = indexed.get(e.identityId);
      if (!i || i.originatingPeriodId !== e.originatingPeriodId || e.recordedSeq < i.recordedSeq) refuse('HISTORICAL_STATE_CONFLICT');
      period(e.fundingPeriodId);
      if (e.action === 'CREATE' && e.recordedSeq === i.recordedSeq) seen.add(i.id);
    }
    if (seen.size !== ids.length) refuse('HISTORICAL_STATE_CONFLICT');
  }
  identities(input.obligationIdentities, oh.events.map(e => ({ ...e, identityId: e.obligationId })));
  identities(input.savingIdentities, sh.savings.map(e => ({ ...e, identityId: e.savingsId })));
  checked(validateHistoricalStates(oh));
  const bank = checked(selectState(oh, h)), obligations = checked(selectObligationState(oh, h)), savings = checked(selectSavingState(sh, h));
  if (obligations.states.length + savings.states.length > LIMITS.identities) refuse('PROJECTION_LIMIT_EXCEEDED');
  // A present-day pointer is not historical evidence. Compare only when H covers all financial positions at full captured K.
  if (k === input.capturedSeq && oh.positions.every(p => p.historicalDate <= h)
    && (bank.vector?.id ?? null) !== input.activeAllocationRevisionId) refuse('HISTORICAL_STATE_CONFLICT');
  function source(e: { id: string; positionId: string; effectiveDate: BerlinDate; originatingPeriodId: string; fundingPeriodId: string; transitionDecisionId?: string | null }, identityId: string): Source {
    return { identityId, revisionId: e.id, accountId: scope.accountId, originPeriod: period(e.originatingPeriodId), fundingPeriod: period(e.fundingPeriodId),
      effectiveDate: e.effectiveDate, positionId: e.positionId, transitionDecisionId: e.transitionDecisionId ?? null };
  }
  const os: Obligation[] = obligations.states.map(e => ({ ...source(e, e.obligationId), title: e.title, dueDate: e.dueDate,
    original: e.originalCents, outstanding: e.outstandingCents, status: e.status, isPossible: e.isPossible, reserveFull: e.reserveFull }));
  const ss: Saving[] = savings.states.map(e => ({ ...source(e, e.savingsId), title: e.title, amount: e.amountCents, status: e.status }));
  os.sort((a,b) => a.identityId.localeCompare(b.identityId)); ss.sort((a,b) => a.identityId.localeCompare(b.identityId));
  const common = { accountId: scope.accountId, provenance: { selectionVersion: 1 as const, knowledgeCut: k,
    capturedAggregateRevision: input.capturedAggregateRevision, historicalThroughDate: h, orderingRevisionIds: bank.orderingRevisionIds } };
  const result: Snapshot = bank.status === 'NO_OBSERVATION' ? { ...common, kind: 'NO_OBSERVATION', knownObligations: os, knownSavings: ss }
    : { ...common, kind: 'ACTIVE_COMPLETE', checkpoint: { revisionId: bank.checkpoint.id, balance: bank.checkpoint.balanceCents,
      observedDate: bank.checkpoint.observedDate, observedAt: bank.checkpoint.observedAt }, allocationRevisionId: bank.vector.id,
      anchorCheckpointRevisionId: bank.vector.checkpointId, allocationEffectiveDate: bank.vector.effectiveDate,
      allocations: bank.vector.allocations.map(a => ({ period: a.period, amount: a.amountCents })), obligations: os, savings: ss };
  return capture(validateSnapshot(result, h).state);
}
