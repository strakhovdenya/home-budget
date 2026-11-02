import 'server-only';
import { createPeriodTransitions } from '@/features/period-transitions/use-cases';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createProposalRepository } from '@/infrastructure/db/transfer-proposal-repository';
import { writeRedistribution } from '@/infrastructure/db/redistribution-writer';
import { createBudgetUpdateBoundary } from './budget-update-boundary';
const repository={
  prepare:(...args:Parameters<ReturnType<typeof createProposalRepository>['prepare']>)=>createProposalRepository(databaseFromEnvironment()).prepare(...args),
  read:(...args:Parameters<ReturnType<typeof createProposalRepository>['read']>)=>createProposalRepository(databaseFromEnvironment()).read(...args),
  confirm:(...args:Parameters<ReturnType<typeof createProposalRepository>['confirm']>)=>createProposalRepository(databaseFromEnvironment()).confirm(...args),
  cancel:(...args:Parameters<ReturnType<typeof createProposalRepository>['cancel']>)=>createProposalRepository(databaseFromEnvironment()).cancel(...args),
};
/** Private server composition only, no registered Server Action or route. */
export const periodTransitions=createPeriodTransitions(requireOwnedAccount,repository);
export const redistributeAllocations=createBudgetUpdateBoundary('ALLOCATION_ONLY',writeRedistribution);
