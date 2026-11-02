import 'server-only';
import type { Action } from '@/domain/obligations/contracts';
import { parseObligationBatch } from '@/domain/obligations/validation';
import { createObligationStateReader } from '@/features/obligations/read-obligations';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createObligationReader } from '@/infrastructure/db/obligation-reader';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { rejectBatch } from '@/infrastructure/db/commit';
import { createBudgetUpdateBoundary } from './budget-update-boundary';
function boundary(action: Action) {
  return createBudgetUpdateBoundary(`OBLIGATION_${action}`, async (tx, batch) => {
    const p = parseObligationBatch(batch.command.payload);
    if (!p.ok) return rejectBatch(p.code);
    if (p.value.length !== 1 || p.value[0].action !== action || p.value[0].correctionId) return rejectBatch('INVALID_OBLIGATION');
    return writeObligations(tx, batch);
  });
}
export const createObligation = boundary('CREATE');
export const amendObligation = boundary('AMEND');
export const settleObligationPartially = boundary('PARTIAL_SETTLEMENT');
export const markObligationPaid = boundary('PAID');
export const cancelObligation = boundary('CANCELLED');
/** Private reviewed correction set, not a public arbitrary event endpoint. */
export const correctObligationHistory = createBudgetUpdateBoundary('OBLIGATION_CORRECTION_SET', writeObligations);
export const readObligationStates = createObligationStateReader(requireOwnedAccount, {
  read: (scope, through, cut) => createObligationReader(databaseFromEnvironment()).read(scope, through, cut),
});
export async function readActiveObligations(selector: unknown, query: unknown) {
  const result = await readObligationStates(selector, query);
  return result.ok ? { ...result, value: { ...result.value, states: result.value.states.filter(e => e.status === 'UNPAID') } } : result;
}
