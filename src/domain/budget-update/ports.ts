import type { AuthorizedScope, CanonicalValue, PreparedCommand, CommitReceipt, UpdateErrorCode } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
export type BudgetResult<T> = Result<T,UpdateErrorCode>;
export interface BudgetUpdateRepository {
  load(scope:AuthorizedScope):Promise<BudgetResult<CanonicalValue>>;
  preview(scope:AuthorizedScope,command:PreparedCommand):Promise<BudgetResult<CanonicalValue>>;
  confirm(scope:AuthorizedScope,command:PreparedCommand):Promise<BudgetResult<CommitReceipt>>;
  status(scope:AuthorizedScope,requestId:string):Promise<BudgetResult<CommitReceipt|null>>;
  history(scope:AuthorizedScope,updateId:string|null):Promise<BudgetResult<CanonicalValue>>;
}
