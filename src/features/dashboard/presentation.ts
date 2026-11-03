import { parsePeriod, shiftPeriod, type Period } from '@/domain/periods/period';
import { parseBerlinDate } from '@/shared/pure/calendar';
import type { AccountProjection, PeriodProjection, PeriodBudget, Liquidity, Freshness } from '@/domain/forecast/contracts';
import type { Wire } from '@/domain/forecast/serialization';

export type DashboardFailure = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NO_ACCOUNT' | 'ACCOUNT_SELECTION_REQUIRED'
  | 'STORAGE_ERROR' | 'PROJECTION_LIMIT_EXCEEDED' | 'CALCULATION_ERROR' | 'INVALID_PERIOD';
type BankView = Readonly<{ balance: string; observedDate: string }>;
type BudgetView = Pick<Wire<PeriodBudget>, 'allocated' | 'reserved' | 'savings' | 'free' | 'deficit' | 'ordinary'> & Readonly<{ period: string }>;
type SafeView = Pick<Wire<Liquidity>, 'safeAvailable' | 'safeDailyLimit' | 'days' | 'coverageGroups' | 'comparisonsAreNonAdditive' | 'budgetExplanation'>;
export type DashboardView = Readonly<{ kind: DashboardFailure }>
  | Readonly<{ kind: 'UNAVAILABLE'; reason: 'NO_OBSERVATION' | 'INCOMPLETE_STATE' | 'OVERDRAFT_POLICY_REQUIRED';
      period: string; asOfDate: string; bank: BankView | null;
      known: readonly Readonly<{ title: string; amount: string; type: 'reserved' | 'savings'; period: string }>[] }>
  | Readonly<{ kind: 'READY'; period: string; mode: 'CURRENT' | 'FUTURE' | 'PAST'; asOfDate: string;
      bank: BankView; budget: BudgetView; safe: SafeView | null; freshness: Pick<Wire<Freshness>, 'ageDays' | 'showReminder' | 'notices'> }>;

export function parseDashboardQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some(k => k !== 'period')) return { ok: false } as const;
  if (query.period === undefined) return { ok: true, value: null } as const;
  return parsePeriod(query.period);
}
export function periodHref(base: '/' | '/months', period: string | null) {
  if (period === null) return base;
  const p = parsePeriod(period);
  if (!p.ok) throw new Error('INVALID_PERIOD');
  return `${base}?period=${p.value}`;
}
export function adjacentPeriod(period: string, offset: -1 | 1): Period | null {
  const p = parsePeriod(period);
  if (!p.ok) return null;
  const next = shiftPeriod(p.value, offset);
  return next.ok ? next.value : null;
}
function dateObject(date: string): Date {
  if (!parseBerlinDate(date).ok) throw new Error('INVALID_DATE');
  const result = new Date(0);
  result.setUTCFullYear(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  result.setUTCHours(12, 0, 0, 0);
  return result;
}
export function formatCalendarDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin' }).format(dateObject(date));
}
export function formatMonth(period: string, locale: string): string {
  if (!parsePeriod(period).ok) throw new Error('INVALID_PERIOD');
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'Europe/Berlin' }).format(dateObject(`${period}-01`));
}

/** Selects display facts only. No financial calculation, identity graph, or historical inference. */
export function dashboardPresentation(p: Wire<AccountProjection | PeriodProjection>, target: string | null = null): DashboardView {
  const asOfDate = String(p.asOfDate), current = asOfDate.slice(0, 7);
  if (p.kind === 'UNAVAILABLE') {
    return { kind: 'UNAVAILABLE', reason: p.reason, period: target ?? current, asOfDate,
      bank: p.reason === 'OVERDRAFT_POLICY_REQUIRED' ? { balance: p.bank.balance, observedDate: String(p.bank.observedDate) } : null,
      known: p.reason === 'NO_OBSERVATION' ? [
        ...p.knownEarmarks.obligations.filter(o => o.status === 'UNPAID' && o.reserveFull).map(o => ({ title: o.title, amount: o.outstanding, type: 'reserved' as const, period: String(o.fundingPeriod) })),
        ...p.knownEarmarks.savings.filter(s => s.status === 'ACTIVE').map(s => ({ title: s.title, amount: s.amount, type: 'savings' as const, period: String(s.fundingPeriod) })),
      ] : [] };
  }
  const budget = p.kind === 'ACCOUNT_ESTIMATE' ? p.periods.find(b => b.period === p.currentPeriod) : p.budget;
  if (!budget) return { kind: 'CALCULATION_ERROR' };
  const safe = p.kind === 'ACCOUNT_ESTIMATE' ? p.currentLiquidity : p.liquidity;
  const period = String(budget.period);
  return { kind: 'READY', period, mode: period === current ? 'CURRENT' : period > current ? 'FUTURE' : 'PAST',
    asOfDate, bank: { balance: p.bank.balance, observedDate: String(p.bank.observedDate) },
    budget: { period, allocated: budget.allocated, reserved: budget.reserved, savings: budget.savings, free: budget.free, deficit: budget.deficit, ordinary: budget.ordinary },
    safe: safe.kind === 'SAFE_ESTIMATE' ? { safeAvailable: safe.safeAvailable, safeDailyLimit: safe.safeDailyLimit, days: safe.days,
      coverageGroups: safe.coverageGroups, comparisonsAreNonAdditive: safe.comparisonsAreNonAdditive, budgetExplanation: safe.budgetExplanation } : null,
    freshness: { ageDays: p.freshness.ageDays, showReminder: p.freshness.showReminder, notices: p.freshness.notices } };
}
