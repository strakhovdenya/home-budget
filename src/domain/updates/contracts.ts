import type { BerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';
import type { CheckpointErrorCode } from '@/domain/checkpoints/contracts';
import type { ObligationErrorCode } from '@/domain/obligations/contracts';
import type { SavingErrorCode } from '@/domain/savings/contracts';
import type { TransitionError } from '@/domain/transitions/contracts';
export type CanonicalValue = null | string | boolean | number | bigint
  | readonly CanonicalValue[] | { readonly [key: string]: CanonicalValue };
export type UpdateErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED'
  | 'REQUEST_PAYLOAD_CONFLICT' | 'STALE_REVISION' | 'REVISION_RANGE'
  | 'INVALID_AUDIT' | 'TRANSACTION_FAILED' | 'RETRYABLE_STORAGE_ERROR'
  | 'COMMIT_OUTCOME_UNKNOWN' | 'STORAGE_ERROR' | CheckpointErrorCode | ObligationErrorCode | SavingErrorCode | TransitionError;
export type AuthorizedScope = Readonly<{ ownerUserId: string; accountId: string }>;
export type PreparedCommand = Readonly<{
  requestId: string; expectedRevision: bigint; effectiveDate: BerlinDate;
  reason: string; payload: CanonicalValue;
}>;
export type CommitReceipt = Readonly<{ updateId: string; recordedSeq: string; aggregateRevision: string }>;
export type AuditDescriptor = Readonly<{
  entityType: string; entityId: string; before: CanonicalValue; after: CanonicalValue;
}>;
export interface UpdateRepository {
  commit(scope: AuthorizedScope, command: PreparedCommand): Promise<Result<CommitReceipt, UpdateErrorCode>>;
}
