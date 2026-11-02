import { addCents, subtractCents, negateCents, sumCents, divideNonNegativeCents, nonNegativeCents } from '@/domain/money/money';
import { daysInMonth, parsePeriod, periodOf, type Period } from '@/domain/periods/period';
import { remainingDaysInMonth, type BerlinDate } from '@/shared/pure/calendar';
import { LIMITS, type CompleteSnapshot, type PeriodBudget, type AccountProjection, type PeriodProjection, type ProjectionResult } from './contracts';
import { attempt, capture, checked, refuse, validateSnapshot } from './validation';
import { calculateLiquidity } from './liquidity';
import { freshness } from './freshness';

export function periodBudget(s: CompleteSnapshot, asOf: BerlinDate, target: Period): PeriodBudget {
  const allocated = s.allocations.find(a => a.period === target)?.amount ?? 0n;
  const obligations = s.obligations.filter(e => e.fundingPeriod === target), savings = s.savings.filter(e => e.fundingPeriod === target);
  const reserved = checked(sumCents(obligations.map(e => e.status === 'UNPAID' && e.reserveFull ? e.outstanding : 0n)));
  const saved = checked(sumCents(savings.map(e => e.status === 'ACTIVE' ? e.amount : 0n)));
  const earmarked = checked(addCents(reserved, saved)), free = checked(subtractCents(allocated, earmarked));
  const deficit = free < 0n ? checked(negateCents(free)) : 0n, current = periodOf(asOf);
  const base = { period: target, allocated, reserved, savings: saved, earmarked, free, deficit,
    obligationRevisionIds: obligations.map(e => e.revisionId), savingRevisionIds: savings.map(e => e.revisionId) };
  if (target < current) return { ...base, ordinary: { kind: 'UNAVAILABLE', reason: 'HISTORICAL_PERIOD' } };
  const days = target === current ? remainingDaysInMonth(asOf) : daysInMonth(target), eligible = free > 0n ? free : 0n;
  const daily = checked(divideNonNegativeCents(checked(nonNegativeCents(eligible)), BigInt(days)));
  return { ...base, ordinary: { kind: 'BUDGET_ESTIMATE', mode: target === current ? 'CURRENT' : 'FUTURE_PREVIEW', days,
    eligible, ordinaryGuideline: daily.quotient, roundingRemainder: daily.remainder, liquidityPresentation: 'SAFE_MAIN' } };
}
function account(raw: unknown, rawDate: unknown): AccountProjection {
  const { state: s, asOf } = validateSnapshot(raw, rawDate), current = periodOf(asOf);
  const common = { kind: 'UNAVAILABLE' as const, accountId: s.accountId, asOfDate: asOf, provenance: s.provenance };
  if (s.kind === 'NO_OBSERVATION') return capture({ ...common, reason: 'NO_OBSERVATION', knownEarmarks: { completeness: 'COMPLETE', obligations: s.knownObligations, savings: s.knownSavings } });
  if (s.kind === 'INCOMPLETE_STATE') return capture({ ...common, reason: 'INCOMPLETE_STATE', missing: s.missing });
  if (s.kind === 'NEGATIVE_BANK_OBSERVATION') return capture({ ...common, reason: 'OVERDRAFT_POLICY_REQUIRED', bank: s.checkpoint });
  const byId = <T extends { identityId: string }>(a: readonly T[]) => [...a].sort((x, y) => x.identityId < y.identityId ? -1 : x.identityId > y.identityId ? 1 : 0);
  const sorted = { ...s, obligations: byId(s.obligations), savings: byId(s.savings) };
  const keys = [...new Set([current, ...s.allocations.map(a => a.period), ...s.obligations.map(e => e.fundingPeriod), ...s.savings.map(e => e.fundingPeriod)])].sort();
  if (keys.length > LIMITS.periods) refuse('PROJECTION_LIMIT_EXCEEDED');
  const periods = keys.map(p => periodBudget(sorted, asOf, p));
  const reserved = checked(sumCents(periods.map(p => p.reserved))), savings = checked(sumCents(periods.map(p => p.savings)));
  const earmarked = checked(addCents(reserved, savings)), freeSigned = checked(sumCents(periods.map(p => p.free)));
  const currentLiquidity = calculateLiquidity(s.checkpoint.balance, periods, current, asOf);
  return capture({ kind: 'ACCOUNT_ESTIMATE', schemaVersion: 1, currency: 'EUR', accountId: s.accountId, asOfDate: asOf, currentPeriod: current,
    completeness: 'COMPLETE', bank: s.checkpoint, provenance: { ...s.provenance, allocationRevisionId: s.allocationRevisionId,
      anchorCheckpointRevisionId: s.anchorCheckpointRevisionId, allocationEffectiveDate: s.allocationEffectiveDate,
      obligationSources: sorted.obligations, savingSources: sorted.savings }, periods,
    totals: { allocated: s.checkpoint.balance, reserved, savings, earmarked, freeSigned }, currentLiquidity,
    freshness: freshness(s, asOf, periods.find(p => p.period === current)!.allocated) });
}
export function projectAccount(snapshot: unknown, asOfDate: unknown): ProjectionResult<AccountProjection> {
  return attempt(() => account(snapshot, asOfDate));
}
export function projectPeriod(snapshot: unknown, asOfDate: unknown, targetPeriod: unknown): ProjectionResult<PeriodProjection> {
  return attempt(() => {
    const target = checked(parsePeriod(targetPeriod)), result = account(snapshot, asOfDate);
    if (result.kind !== 'ACCOUNT_ESTIMATE') return result;
    const budget = result.periods.find(p => p.period === target) ?? periodBudget(checkedSnapshot(snapshot, asOfDate), result.asOfDate, target);
    return capture({ kind: 'PERIOD_ESTIMATE', asOfDate: result.asOfDate, budget, provenance: result.provenance, bank: result.bank, freshness: result.freshness,
      liquidity: target === result.currentPeriod ? result.currentLiquidity : { kind: 'LIQUIDITY_UNAVAILABLE', reason: 'NOT_CURRENT_PERIOD' } });
  });
}
function checkedSnapshot(raw: unknown, date: unknown): CompleteSnapshot {
  const s = validateSnapshot(raw, date).state;
  if (s.kind !== 'ACTIVE_COMPLETE') return refuse('INVALID_STATE_SHAPE');
  return s;
}
