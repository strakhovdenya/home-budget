import 'server-only';
import { dashboardPresentation, parseDashboardQuery, type DashboardView } from '@/features/dashboard/presentation';
import { readBudgetProjection } from './budget-projection-boundary';
import { resolveDashboardAccount, type DashboardAccount } from './dashboard-account-boundary';

export function createDashboardLoader(resolve: () => Promise<DashboardAccount>, read: typeof readBudgetProjection) {
  return async function load(query: Record<string, unknown>): Promise<DashboardView> {
    const parsed = parseDashboardQuery(query);
    if (!parsed.ok) return { kind: 'INVALID_PERIOD' };
    const account = await resolve();
    if (account.kind !== 'ACCOUNT') return account;
    const result = await read(account.accountId, { targetPeriod: parsed.value });
    if (result.ok) return dashboardPresentation(result.value, parsed.value);
    switch (result.code) {
      case 'UNAUTHORIZED': case 'FORBIDDEN': case 'STORAGE_ERROR': case 'PROJECTION_LIMIT_EXCEEDED': return { kind: result.code };
      default: return { kind: 'CALCULATION_ERROR' };
    }
  };
}
export const loadDashboard = createDashboardLoader(resolveDashboardAccount, readBudgetProjection);
