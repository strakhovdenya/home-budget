import 'server-only';
import { createBankStateReader, createBankIntervalReader } from '@/features/bank-checkpoints/read-state';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createCheckpointReader, readCheckpointIntervals } from '@/infrastructure/db/checkpoint-reader';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { createBudgetUpdateBoundary } from './budget-update-boundary';

/** Private server composition, no action/route/UI or arbitrary event endpoint. */
export const confirmBankCheckpoint = createBudgetUpdateBoundary('BANK_CHECKPOINT', writeBankCheckpoint);
export const readBankState = createBankStateReader(requireOwnedAccount, {
  read: (scope, through) => createCheckpointReader(databaseFromEnvironment()).read(scope, through),
});
export const readBankIntervals = createBankIntervalReader(requireOwnedAccount, {
  read: scope => readCheckpointIntervals(databaseFromEnvironment(), scope),
});
