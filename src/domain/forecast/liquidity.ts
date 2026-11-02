import { addCents, subtractCents, sumCents, divideNonNegativeCents, nonNegativeCents } from '@/domain/money/money';
import type { Period } from '@/domain/periods/period';
import { remainingDaysInMonth, type BerlinDate } from '@/shared/pure/calendar';
import type { Liquidity, PeriodBudget } from './contracts';
import { checked } from './validation';
import { groupWarnings } from './warnings';

export function calculateLiquidity(balance: bigint, periods: readonly PeriodBudget[], current: Period, asOf: BerlinDate): Liquidity {
  const c = periods.find(p => p.period === current)!;
  const protectionByPeriod = periods.map(p => ({ period: p.period, allocated: p.allocated, reserved: p.reserved, savings: p.savings,
    protectedAmount: p.period === current ? p.earmarked : p.allocated > p.earmarked ? p.allocated : p.earmarked }));
  const otherPeriodProtection = checked(sumCents(protectionByPeriod.filter(p => p.period !== current).map(p => p.protectedAmount)));
  const protectedTotal = checked(addCents(c.earmarked, otherPeriodProtection));
  const liquidityFreeSigned = checked(subtractCents(balance, protectedTotal)), safeAvailable = liquidityFreeSigned > 0n ? liquidityFreeSigned : 0n;
  const totalReserved = checked(sumCents(periods.map(p => p.reserved))), totalSavings = checked(sumCents(periods.map(p => p.savings)));
  const totalE = checked(addCents(totalReserved, totalSavings));
  const shortage = (n: bigint) => { const v = checked(subtractCents(n, balance)); return v > 0n ? v : 0n; };
  const obligationShortfall = shortage(totalReserved), earmarkShortfall = shortage(totalE), protectionShortfall = shortage(protectedTotal);
  const budgetSafeGap = checked(subtractCents(c.free > 0n ? c.free : 0n, safeAvailable));
  const days = remainingDaysInMonth(asOf), daily = checked(divideNonNegativeCents(checked(nonNegativeCents(safeAvailable)), BigInt(days)));
  return { kind: 'SAFE_ESTIMATE', presentation: 'SAFE_MAIN', formula: 'ALL_PERIOD_MAX_V1', days,
    budgetFree: c.free, budgetDeficit: c.deficit, budgetGuideline: c.ordinary.kind === 'BUDGET_ESTIMATE' ? c.ordinary.ordinaryGuideline : 0n,
    totalReserved, totalSavings, protectedTotal, otherPeriodProtection, liquidityFreeSigned, safeAvailable,
    safeDailyLimit: daily.quotient, safeRemainder: daily.remainder, obligationShortfall, earmarkShortfall, protectionShortfall, budgetSafeGap,
    protectionByPeriod, ...groupWarnings(obligationShortfall, earmarkShortfall, protectionShortfall, budgetSafeGap) };
}
