import 'server-only';
import { createManagement } from '@/features/management/read-management';
import { createManagementReader } from '@/infrastructure/db/management-reader';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import type { ManagementReader } from '@/domain/management/contracts';
const reader: ManagementReader = {
  list: (...args) => createManagementReader(databaseFromEnvironment()).list(...args),
  history: (...args) => createManagementReader(databaseFromEnvironment()).history(...args),
  proposeRelease: (...args) => createManagementReader(databaseFromEnvironment()).proposeRelease(...args),
};
export const management = createManagement(requireOwnedAccount, reader);
