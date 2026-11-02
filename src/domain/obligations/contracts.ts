import type { BerlinDate } from '@/shared/pure/calendar';
import type { History, Placement, CheckpointInput } from '@/domain/checkpoints/contracts';
import type { CanonicalValue } from '@/domain/updates/contracts';
export type ObligationErrorCode = 'INVALID_OBLIGATION' | 'TERMINAL_OBLIGATION' | 'STALE_OBLIGATION'
  | 'HISTORICAL_PAYMENT_CONFLICT' | 'PAYMENT_CONFIRMATION_REQUIRED';
export type Action = 'CREATE' | 'AMEND' | 'PARTIAL_SETTLEMENT' | 'PAID' | 'CANCELLED';
export type ObligationState = Readonly<{
  originatingPeriodId: string; fundingPeriodId: string; title: string; dueDate: BerlinDate | null;
  originalCents: bigint; outstandingCents: bigint; status: 'UNPAID' | 'PAID' | 'CANCELLED'; isPossible: boolean; reserveFull: boolean;
}>;
export type Payment = Readonly<{
  amountCents: bigint; source: 'TRACKED_CARD' | 'OUTSIDE_TRACKED_CARD'; bankStateAffirmed: true;
  unchangedBalanceAcknowledged: boolean; checkpointId: string; beforeRevisionId: string | null; afterRevisionId: string | null;
}>;
export type ObligationEvent = ObligationState & {
  id: string; obligationId: string; logicalFactId: string; supersedesId: string | null; previousRevisionId: string | null;
  positionId: string; effectiveDate: BerlinDate; bankDate: BerlinDate | null; confirmedAt: string; recordedSeq: bigint;
  action: Action; beforeState: CanonicalValue; payment: Payment | null;
};
export type ObligationHistory = History & Readonly<{ events: readonly ObligationEvent[] }>;
export type Change = Readonly<{
  key: string; action: Action; obligationId: string | null; expectedStateRevisionId: string | null; correctionId: string | null;
  previousChangeKey: string | null; effectiveDate: BerlinDate; bankDate: BerlinDate | null; data: Readonly<Record<string, CanonicalValue>>;
  placement: Placement | null; bankCheck: CheckpointInput | null;
  paymentConfirmation: Readonly<{ source: Payment['source']; bankStateAffirmed: true; unchangedBalanceAcknowledged: boolean; checkpointId: string | null }> | null;
}>;
