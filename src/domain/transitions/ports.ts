import type { AuthorizedScope,PreparedCommand,CommitReceipt,CanonicalValue,UpdateErrorCode } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
export interface ProposalRepository{
 prepare(scope:AuthorizedScope,command:PreparedCommand):Promise<Result<CanonicalValue,UpdateErrorCode>>;
 read(scope:AuthorizedScope,id:string):Promise<Result<CanonicalValue,UpdateErrorCode>>;
 confirm(scope:AuthorizedScope,command:PreparedCommand):Promise<Result<CommitReceipt,UpdateErrorCode>>;
 cancel(scope:AuthorizedScope,input:CanonicalValue):Promise<Result<CanonicalValue,UpdateErrorCode>>;
}
