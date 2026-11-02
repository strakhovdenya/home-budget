import type { BerlinDate } from '@/shared/pure/calendar';
import type { History, Placement, CheckpointInput } from '@/domain/checkpoints/contracts';
import type { CanonicalValue } from '@/domain/updates/contracts';
import type { FundingProof } from '@/domain/transitions/contracts';
export type SavingErrorCode = 'INVALID_SAVING' | 'STALE_SAVING' | 'TERMINAL_SAVING'
  | 'RELEASE_AMOUNT_EXCEEDS_SAVING' | 'HISTORICAL_SAVINGS_CONFLICT';
export type Action = 'CREATE' | 'AMEND' | 'INCREASE' | 'PARTIAL_RELEASE' | 'FULL_RELEASE' | 'FUNDING_TRANSFER';
export type SavingState = Readonly<{
  originatingPeriodId: string; fundingPeriodId: string; title: string;
  amountCents: bigint; status: 'ACTIVE' | 'RELEASED';
}>;
export type SavingEvent = SavingState & Readonly<{
  id: string; savingsId: string; logicalFactId: string; supersedesId: string | null;
  previousRevisionId: string | null; beforeState: CanonicalValue;
  positionId: string; effectiveDate: BerlinDate; confirmedAt: string;
  recordedSeq: bigint; budgetUpdateId: string;
  confirmedIncreaseAmount: bigint | null; confirmedReleasedAmount: bigint | null;
  transitionDecisionId?:string|null; fundingProof?:FundingProof|null;
}> & Readonly<{ action: Action }>;
export type SavingHistory = History & Readonly<{ savings: readonly SavingEvent[] }>;
export type Change = Readonly<{
  key: string; action: Action; savingsId: string | null; expectedStateRevisionId: string | null;
  correctionId: string | null; previousChangeKey: string | null; effectiveDate: BerlinDate;
  data: Readonly<Record<string, CanonicalValue>>; placement: Placement | null; bankCheck: CheckpointInput | null;
}>;
