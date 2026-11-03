import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { BudgetContext } from '@/domain/budget-update/contracts';
import { readProjectionContext } from './projection-reader';
import { databaseToday } from './transition-state';
import { rejectBatch, type Transaction } from './commit';
import * as s from './schema';

/** No separate transaction: preview is REPEATABLE READ READ ONLY, commit supplies its locked tx. */
export async function loadBudgetContext(tx:Transaction,scope:AuthorizedScope,locked?:typeof s.accounts.$inferSelect):Promise<BudgetContext> {
  await tx.execute(sql`SET LOCAL statement_timeout = '10000ms'`);
  const account=locked??(await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId))))[0];
  if(!account||account.ownerUserId!==scope.ownerUserId||account.id!==scope.accountId)return rejectBatch('FORBIDDEN');
  const clock=await databaseToday(tx);
  const source=await readProjectionContext(tx,scope,account,clock.today,account.recordedSeq);
  return {scope,revision:account.aggregateRevision,recordedSeq:account.recordedSeq,activeVectorId:account.activeAllocationRevisionId,
    today:clock.today,now:clock.now,history:source.history,obligations:source.obligationHistory.events,savings:source.savingHistory.savings,periods:source.periods};
}
