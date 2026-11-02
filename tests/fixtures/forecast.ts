import type { CompleteSnapshot, Obligation, Saving } from '@/domain/forecast/contracts';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parsePeriod } from '@/domain/periods/period';
import type { Result } from '@/shared/pure/result';
export function value<T>(r: Result<T, string>): T { if (!r.ok) throw Error(r.code); return r.value; }
export const day = (s: string) => value(parseBerlinDate(s));
export const period = (s: string) => value(parsePeriod(s));
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function obligation(amount: bigint, funding = '2026-11', n = 10): Obligation {
  return { identityId: id(n), revisionId: id(n + 100), accountId: id(1), originPeriod: period('2026-10'), fundingPeriod: period(funding),
    effectiveDate: day('2026-11-20'), positionId: id(n + 200), transitionDecisionId: null, title: 'Synthetic obligation', dueDate: null,
    original: amount, outstanding: amount, status: 'UNPAID', isPossible: false, reserveFull: true };
}
export function saving(amount: bigint, funding = '2026-11', n = 20): Saving {
  return { identityId: id(n), revisionId: id(n + 100), accountId: id(1), originPeriod: period('2026-10'), fundingPeriod: period(funding),
    effectiveDate: day('2026-11-20'), positionId: id(n + 200), transitionDecisionId: null, title: 'Synthetic saving', amount, status: 'ACTIVE' };
}
export function state(balance = 10000n, allocations: Record<string, bigint> = { '2026-11': balance }, obligations: readonly Obligation[] = [], savings: readonly Saving[] = []): CompleteSnapshot {
  return { kind: 'ACTIVE_COMPLETE', accountId: id(1), provenance: { selectionVersion: 1, knowledgeCut: 5n, capturedAggregateRevision: 5n,
    historicalThroughDate: day('2026-11-28'), orderingRevisionIds: [id(4)] },
    checkpoint: { revisionId: id(2), balance, observedDate: day('2026-11-20'), observedAt: null },
    allocationRevisionId: id(3), anchorCheckpointRevisionId: id(2), allocationEffectiveDate: day('2026-11-20'),
    allocations: Object.entries(allocations).map(([p, amount]) => ({ period: period(p), amount })), obligations, savings };
}
