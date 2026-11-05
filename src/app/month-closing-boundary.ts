import 'server-only';
import { createMonthClosing } from '@/features/month-closing/use-cases';
import type { ClosingRepository } from '@/domain/closing/ports';
import { requireOwnedAccount } from '@/infrastructure/auth/auth';
import { databaseFromEnvironment } from '@/infrastructure/db/client';
import { createClosingRepository } from '@/infrastructure/db/closing-repository';
const repository:ClosingRepository={
  load:(...a)=>createClosingRepository(databaseFromEnvironment()).load(...a),
  preview:(...a)=>createClosingRepository(databaseFromEnvironment()).preview(...a),
  confirm:(...a)=>createClosingRepository(databaseFromEnvironment()).confirm(...a),
  status:(...a)=>createClosingRepository(databaseFromEnvironment()).status(...a),
  chunk:(...a)=>createClosingRepository(databaseFromEnvironment()).chunk(...a),
  review:(...a)=>createClosingRepository(databaseFromEnvironment()).review(...a),
};
export const monthClosing=createMonthClosing(requireOwnedAccount,repository);
