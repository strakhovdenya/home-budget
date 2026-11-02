import type { BerlinDate } from '@/shared/pure/calendar';
import type { MicrosecondInstant } from '@/shared/pure/instant';
import type { Period } from '@/domain/periods/period';
import type { Result } from '@/shared/pure/result';
import type { Reconciliation } from './reconciliation';

export type CheckpointErrorCode = 'INVALID_CHECKPOINT' | 'MONEY_RANGE' | 'NEGATIVE_CASH_ALLOCATION'
  | 'OVERDRAFT_POLICY_REQUIRED' | 'ALLOCATION_SUM_MISMATCH' | 'DUPLICATE_PERIOD'
  | 'ORDERING_CONFLICT' | 'HISTORICAL_STATE_CONFLICT' | 'CORRECTION_CONFLICT'
  | 'REPORT_IMPACT_REVIEW_REQUIRED' | 'EVIDENCE_CONFLICT';
export type Allocation = Readonly<{ period: Period; amountCents: bigint }>;
export type Placement = Readonly<{ expectedOrderingRevisionId: string | null; afterPositionId: string | null; beforePositionId: string | null }>;
export type CheckpointInput = Readonly<{
  observedDate: BerlinDate; observedAt: MicrosecondInstant | null; balanceCents: bigint;
  allocations: readonly Allocation[];
  correction: Readonly<{ checkpointId: string; allocationRevisionId: string; reposition: boolean }> | null;
  placement: Placement | null;
}>;
export type Revision = Readonly<{ id: string; logicalFactId: string; supersedesId: string | null; recordedSeq: bigint; positionId: string }>;
export type Checkpoint = Revision & Readonly<{ observedDate: BerlinDate; observedAt: MicrosecondInstant | null; balanceCents: bigint }>;
export type AllocationRevision = Revision & Readonly<{
  checkpointId: string; effectiveDate: BerlinDate; previousRevisionId: string | null; allocations: readonly Allocation[];
}>;
export type Position = Readonly<{ id: string; historicalDate: BerlinDate; recordedSeq: bigint }>;
export type Edge = Readonly<{ before: string; after: string }>;
export type Ordering = Readonly<{
  id: string; historicalDate: BerlinDate; recordedSeq: bigint; previousRevisionId: string | null;
  positionIds: readonly string[]; edges: readonly Edge[];
}>;
export type History = Readonly<{
  knowledgeCut: bigint; checkpoints: readonly Checkpoint[]; vectors: readonly AllocationRevision[];
  positions: readonly Position[]; orderings: readonly Ordering[];
}>;
export type SelectedState = Readonly<{
  knowledgeCut: bigint; historicalThroughDate: BerlinDate; orderingRevisionIds: readonly string[];
}> & (Readonly<{ status: 'NO_OBSERVATION'; checkpoint: null; vector: null; endBalanceCents: null }>
  | Readonly<{ status: 'OBSERVED'; checkpoint: Checkpoint; vector: AllocationRevision; endBalanceCents: bigint | null }>);
export interface CheckpointReader {
  read(scope: Readonly<{ ownerUserId: string; accountId: string }>, through: BerlinDate): Promise<Result<SelectedState, CheckpointErrorCode | 'FORBIDDEN' | 'STORAGE_ERROR'>>;
}
export type IntervalView = Readonly<{ fromCheckpointId: string; toCheckpointId: string; knowledgeCut: bigint; reconciliation: Reconciliation }>;
export interface IntervalReader {
  read(scope: Readonly<{ ownerUserId: string; accountId: string }>): Promise<Result<readonly IntervalView[], CheckpointErrorCode | 'FORBIDDEN' | 'STORAGE_ERROR'>>;
}
