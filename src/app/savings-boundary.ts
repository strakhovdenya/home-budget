import 'server-only';
import type { Action } from '@/domain/savings/contracts';
import { parseSavingBatch } from '@/domain/savings/validation';
import { createSavingStateReader } from '@/features/savings/read-savings';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createSavingReader } from '@/infrastructure/db/savings-reader';
import { writeSavings } from '@/infrastructure/db/savings-writer';
import { rejectBatch } from '@/infrastructure/db/commit';
import { createBudgetUpdateBoundary } from './budget-update-boundary';
function boundary(action: Action) {
  return createBudgetUpdateBoundary(`SAVING_${action}`, async (tx, batch) => {
    const p = parseSavingBatch(batch.command.payload);
    if (!p.ok) return rejectBatch(p.code);
    if (p.value.length !== 1 || p.value[0].action !== action || p.value[0].correctionId || p.value[0].bankCheck) return rejectBatch('INVALID_SAVING');
    return writeSavings(tx, batch);
  });
}
export const createSaving = boundary('CREATE');
export const increaseSaving = boundary('INCREASE');
export const releaseSavingPartially = boundary('PARTIAL_RELEASE');
export const releaseSavingFully = boundary('FULL_RELEASE');
export const amendSaving = boundary('AMEND');
export const correctSavingHistory = createBudgetUpdateBoundary('SAVING_CORRECTION_SET', async (tx, batch) => {
  const p = parseSavingBatch(batch.command.payload);
  if (!p.ok) return rejectBatch(p.code);
  if (p.value.some(c => c.bankCheck)) return rejectBatch('INVALID_SAVING');
  return writeSavings(tx, batch);
});
export const updateSavingWithActualCheckpoint = createBudgetUpdateBoundary('SAVING_ACTUAL_CHECK', async (tx, batch) => {
  const p = parseSavingBatch(batch.command.payload);
  if (!p.ok) return rejectBatch(p.code);
  if (p.value.length !== 1 || !p.value[0].bankCheck || p.value[0].correctionId) return rejectBatch('INVALID_SAVING');
  return writeSavings(tx, batch);
});
export const readSavings = createSavingStateReader(requireOwnedAccount, {
  read: (scope, through, cut) => createSavingReader(databaseFromEnvironment()).read(scope, through, cut),
});
