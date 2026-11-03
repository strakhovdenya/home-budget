'use server';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { resolveDashboardAccount } from '../dashboard-account-boundary';
import { management } from '../management-boundary';
export async function loadManagement() {
  const a = await resolveDashboardAccount();
  return a.kind === 'ACCOUNT' ? management.list(a.accountId) : { ok: false as const, code: 'FORBIDDEN' as const };
}
export async function loadManagementHistory(input: unknown) {
  let captured; try { captured = normalizeValue(input); } catch { return { ok: false as const, code: 'INVALID_INPUT' as const }; }
  const a = await resolveDashboardAccount();
  return a.kind === 'ACCOUNT' ? management.history(a.accountId, captured) : { ok: false as const, code: 'FORBIDDEN' as const };
}
export async function proposeRelease(identityId: unknown) {
  const captured = typeof identityId === 'string' ? identityId : null;
  const a = await resolveDashboardAccount();
  return a.kind === 'ACCOUNT' ? management.proposeRelease(a.accountId, captured) : { ok: false as const, code: 'FORBIDDEN' as const };
}
