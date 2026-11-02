import 'server-only';
import { createProjectionReader } from '@/features/budget-projection/read-account';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createProjectionRepository } from '@/infrastructure/db/projection-reader';

/** Private server composition. No public handler/action; H/K and server clock stay inside repository. */
export const readBudgetProjection = createProjectionReader(requireOwnedAccount, {
  read: scope => createProjectionRepository(databaseFromEnvironment()).read(scope),
});
export const readAccountProjection = (selector: unknown) => readBudgetProjection(selector, { targetPeriod: null });
export const readPeriodProjection = (selector: unknown, targetPeriod: unknown) => readBudgetProjection(selector, { targetPeriod });
export async function readCurrentLiquidity(selector: unknown) {
  const result = await readAccountProjection(selector);
  if (!result.ok || result.value.kind === 'UNAVAILABLE') return result;
  if (result.value.kind !== 'ACCOUNT_ESTIMATE') return { ok: false, code: 'INVALID_STATE_SHAPE' } as const;
  const account = result.value;
  return { ok: true, value: Object.freeze({ ...account.currentLiquidity, asOfDate: account.asOfDate, bank: account.bank,
    provenance: account.provenance, freshness: account.freshness }) } as const;
}
