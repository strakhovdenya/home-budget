import type {BudgetResult} from '@/domain/budget-update/ports';
import type {CanonicalValue,PreparedCommand,CommitReceipt} from '@/domain/updates/contracts';
export interface OnboardingRepository {
  preview(owner:string,command:PreparedCommand):Promise<BudgetResult<CanonicalValue>>;
  confirm(owner:string,command:PreparedCommand):Promise<BudgetResult<CommitReceipt>>;
  status(owner:string,requestId:string):Promise<BudgetResult<CommitReceipt|null>>;
}
