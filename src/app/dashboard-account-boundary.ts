import 'server-only';
import { requireOwner } from '@/infrastructure/auth/auth';
import { ownerRepository } from '@/infrastructure/auth/repository';
import { validId } from '@/infrastructure/auth/policy';

export type DashboardAccount = Readonly<{ kind: 'ACCOUNT'; accountId: string }>
  | Readonly<{ kind: 'UNAUTHORIZED' | 'NO_ACCOUNT' | 'ACCOUNT_SELECTION_REQUIRED' | 'STORAGE_ERROR' }>;

/** No caller-controlled selector, provisioning, or primary-account guess. */
export function createDashboardAccountResolver(
  authorize: () => Promise<{ id: string }>,
  find: (ownerId: string) => Promise<readonly string[]>,
) {
  return async function resolve(): Promise<DashboardAccount> {
    let owner: { id: string };
    try { owner = await authorize(); } catch { return { kind: 'UNAUTHORIZED' }; }
    if (!validId(owner.id)) return { kind: 'UNAUTHORIZED' };
    try {
      const ids = await find(owner.id);
      if (!ids.every(validId)) return { kind: 'STORAGE_ERROR' };
      if (ids.length === 0) return { kind: 'NO_ACCOUNT' };
      if (ids.length !== 1) return { kind: 'ACCOUNT_SELECTION_REQUIRED' };
      return { kind: 'ACCOUNT', accountId: ids[0] };
    } catch { return { kind: 'STORAGE_ERROR' }; }
  };
}

export const resolveDashboardAccount = createDashboardAccountResolver(requireOwner, owner => ownerRepository.findAccountIdsForOwner(owner));
