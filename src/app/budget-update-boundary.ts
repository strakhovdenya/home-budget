import 'server-only';
import { createUpdateExecutor } from '@/features/budget-updates/execute-update';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import type { BatchWriter } from '@/infrastructure/db/commit';
import { createUpdateRepository } from '@/infrastructure/db/update-repository';
/** Server composition only; no use-server directive or client-callable arbitrary writer. */
export function createBudgetUpdateBoundary(kind: string, writer: BatchWriter) {
  return createUpdateExecutor({ authorize: requireOwnedAccount,
    repository: { commit: (scope, command) => createUpdateRepository(databaseFromEnvironment(), kind, writer).commit(scope, command) } });
}
