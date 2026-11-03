import type { CheckpointInput, History, Placement } from '@/domain/checkpoints/contracts';
import type { Change as ObligationChange, ObligationEvent } from '@/domain/obligations/contracts';
import type { Change as SavingChange, SavingEvent } from '@/domain/savings/contracts';
import type { TransitionInput } from '@/domain/transitions/contracts';
import type { CanonicalValue, AuthorizedScope, UpdateErrorCode } from '@/domain/updates/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';

export type BudgetDraft = Readonly<{
  schemaVersion: 1; knowledgeCut: bigint; baseCheckpointId: string | null; baseVectorId: string | null;
  effectiveDate: BerlinDate; checkpoint: CheckpointInput | null; allocationChange: TransitionInput | null;
  completeVectorConfirmed: true; obligations: readonly ObligationChange[]; savings: readonly SavingChange[];
}>;
export type BudgetContext = Readonly<{
  scope: AuthorizedScope; revision: bigint; recordedSeq: bigint; activeVectorId: string | null;
  today: BerlinDate; now: string; history: History;
  obligations: readonly ObligationEvent[]; savings: readonly SavingEvent[];
  periods: readonly Readonly<{ id: string; period: string }>[];
}>;
export type BudgetError = UpdateErrorCode | 'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED';
export type CandidateCoordinates = Readonly<{
  batchId: string; seq: bigint; now: string; id: (key: string) => string;
}>;
export type CandidatePlan = Readonly<{
  history: History; positionId: string; checkpointId: string; vectorId: string;
  checkpointPlan: Extract<ReturnType<typeof import('@/domain/checkpoints/confirmation').planConfirmation>, {ok:true}>['value'] | null;
  obligations: readonly ObligationEvent[]; savings: readonly SavingEvent[];
  periods: readonly Readonly<{ id: string; period: string }>[];
  review: CanonicalValue; placement: Placement | null;
  sourcePeriodIds: readonly string[];
}>;
