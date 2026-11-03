import 'server-only';
import { createBudgetUpdates } from '@/features/budget-updates/use-cases';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createBudgetRepository } from '@/infrastructure/db/budget-update-repository';
import type { BudgetUpdateRepository } from '@/domain/budget-update/ports';

const repository:BudgetUpdateRepository={
  load:(...args)=>createBudgetRepository(databaseFromEnvironment()).load(...args),
  preview:(...args)=>createBudgetRepository(databaseFromEnvironment()).preview(...args),
  confirm:(...args)=>createBudgetRepository(databaseFromEnvironment()).confirm(...args),
  status:(...args)=>createBudgetRepository(databaseFromEnvironment()).status(...args),
  history:(...args)=>createBudgetRepository(databaseFromEnvironment()).history(...args),
};
export const budgetUpdates=createBudgetUpdates(requireOwnedAccount,repository);
