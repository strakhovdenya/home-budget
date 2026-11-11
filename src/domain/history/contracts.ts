import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';

export type HistoryError = 'FORBIDDEN'|'INVALID_INPUT'|'HISTORY_SOURCE_INVALID'|'HISTORY_LIMIT_EXCEEDED'|'RETRYABLE_STORAGE_ERROR'|'STORAGE_ERROR';
export type Basis = Readonly<{schemaVersion:1; indexAnchor:string|null; knowledgeCut:string; month:string|null; today:string; capturedAt:string}>;
export type SourceKind = 'OBLIGATION_IDENTITY'|'SAVING_IDENTITY'|'PERIOD_ALLOCATION'|'BANK_CHECKPOINT'|'ALLOCATION_REVISION'|'OBLIGATION_STATE'|'SAVINGS_STATE'|'TRANSITION_DECISION'|'BUDGET_TRANSFER'|'DAY_ORDERING'|'POSITION'|'MONTH_CLOSING'|'AUDIT';
export type SourceRef = Readonly<{kind:SourceKind; id:string; date:string; recordedSeq:string; positionId:string|null; supersedesId:string|null; previousRevisionId:string|null; action:string|null}>;
export type Entry = Readonly<{id:string;kind:string;recordedSeq:string;recordedAt:string;sourceStatus:'VALID'|'INVALID'|'UNSUPPORTED';sources:readonly SourceRef[]}>;
export type PageQuery = Readonly<{schemaVersion:1;basis:Basis;fromLastSeq:string|null;lastSeq:string|null}>;
export type Page = Readonly<{schemaVersion:1;basis:Basis;fromLastSeq:string|null;lastSeq:string|null;nextLastSeq:string|null;items:readonly Entry[];sourceValidity:'VALID'|'INVALID'}>;
export type HistoryResult<T> = Result<T,HistoryError>;
export interface HistoryIndexReader {
  open(scope:AuthorizedScope, month:string|null):Promise<HistoryResult<Page>>;
  page(scope:AuthorizedScope, query:PageQuery):Promise<HistoryResult<Page>>;
}
