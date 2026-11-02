import type { Allocation, CheckpointInput, Placement } from '@/domain/checkpoints/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { CanonicalValue } from '@/domain/updates/contracts';
export type TransitionError = 'TRANSITION_CONFIRMATION_REQUIRED' | 'FUTURE_ALLOCATION_REVIEW_REQUIRED' | 'PRESERVED_ALLOCATION_CONFLICT'
  | 'OWNER_POLICY_REQUIRED' | 'STALE_PROPOSAL' | 'TARGET_PERIOD_CHANGED' | 'PROPOSAL_ALREADY_CONFIRMED' | 'PROPOSAL_CANCELLED'
  | 'PROPOSAL_ALREADY_CANCELLED' | 'HISTORICAL_FUNDING_CONFLICT';
export type Mode = 'REDISTRIBUTE' | 'CARRY' | 'FRESH_START' | 'DEFER';
export type FundingRef = Readonly<{kind:'OBLIGATION'|'SAVING';identityId:string;revisionId:string}>;
export type FundingState = FundingRef & Readonly<{period:string;state:CanonicalValue}>;
export type FundingProof = Readonly<{decisionId:string;budgetUpdateId:string;positionId:string;sourcePeriodId:string;targetPeriodId:string;beforeRevisionId:string;afterRevisionId:string}>;
export type FutureEdit = Readonly<{period:string;beforeAmountCents:bigint;afterAmountCents:bigint;explicitConsent:true}>;
export type AllocationBase = Readonly<{balanceCents:bigint;allocations:readonly Readonly<{period:string;amountCents:bigint}>[];checkpointId:string;vectorId:string;funding:readonly FundingState[]}>;
export type AllocationChange = Readonly<{mode:Mode;observationMode:'ACTUAL_CHECK'|'REUSE_CONFIRMED';target:string;sources:readonly string[];
  balanceCents:bigint;allocations:readonly Readonly<{period:string;amountCents:bigint}>[];futureEdits:readonly FutureEdit[];fundingRefs:readonly FundingRef[]}>;
export type TransitionInput = AllocationChange & Readonly<{schemaVersion:1;intent:'ALLOCATION_ONLY'|'TRANSITION';
  expectedCheckpointRevisionId:string;expectedAllocationRevisionId:string;effectiveDate:BerlinDate;
  checkpoint:CheckpointInput|null;placement:Placement|null;
  consent:Readonly<{completeVectorConfirmed:true;fundingUnchangedAcknowledged:boolean;transitionConfirmed:boolean;fundingConfirmed:boolean;nonCarryConfirmed:boolean}>;
  allocations:readonly Allocation[]}>;
