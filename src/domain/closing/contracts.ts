import type { AuthorizedScope, CommitReceipt, PreparedCommand, UpdateErrorCode } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';

export type ClosingError = 'PERIOD_NOT_ENDED' | 'REPORT_ALREADY_CLOSED' | 'STALE_REPORT_HEAD'
  | 'NO_REPORT_CHANGE' | 'REPORT_PROOF_INVALID' | 'REPORT_LIMIT_EXCEEDED' | 'UNSUPPORTED_REPORT_VERSION';
export type Json = null | boolean | number | string | readonly Json[] | {readonly [key:string]:Json};
export type ClosingQuery = Readonly<{period:string;version:number|null;offset:number;digest:string|null}>;
export type ClosingInput = Readonly<{
  schemaVersion:1; operation:'INITIAL'|'REVISION'; period:string; historicalThroughDate:string;
  knowledgeCut:string; expectedHeadId:string|null; expectedHeadVersion:number|null;
  snapshotSchemaVersion:1; selectionContractVersion:1; reviewDigest:string; confirmed:true;
}>;
export type ClosingResult<T> = Result<T,UpdateErrorCode>;
export interface ClosingRepository {
  load(scope:AuthorizedScope,query:ClosingQuery):Promise<ClosingResult<Json>>;
  preview(scope:AuthorizedScope,command:PreparedCommand):Promise<ClosingResult<Json>>;
  confirm(scope:AuthorizedScope,command:PreparedCommand):Promise<ClosingResult<CommitReceipt>>;
  status(scope:AuthorizedScope,requestId:string):Promise<ClosingResult<CommitReceipt|null>>;
  chunk(scope:AuthorizedScope,query:ClosingQuery):Promise<ClosingResult<Json>>;
  review(scope:AuthorizedScope,command:PreparedCommand,offset:number):Promise<ClosingResult<Json>>;
}
