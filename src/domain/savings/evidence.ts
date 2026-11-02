import type { CanonicalValue } from '@/domain/updates/contracts';
import type { SavingEvent } from './contracts';
import { snapshot } from './lifecycle';
/** Complete immutable audit payload: confirmed amounts are inputs, not reconstructed deltas. */
export function savingAuditAfter(e: SavingEvent): CanonicalValue {
  return { schemaVersion: 1, savingsId: e.savingsId, savingsRevisionId: e.id, budgetUpdateId: e.budgetUpdateId,
    action: e.action, confirmedIncreaseAmount: e.confirmedIncreaseAmount?.toString() ?? null,
    confirmedReleasedAmount: e.confirmedReleasedAmount?.toString() ?? null,
    beforeRevisionId: e.previousRevisionId, afterRevisionId: e.id, stateBefore: e.beforeState, stateAfter: snapshot(e),
    effectiveDate: e.effectiveDate, positionId: e.positionId, supersedesId: e.supersedesId, confirmedAt: e.confirmedAt };
}
