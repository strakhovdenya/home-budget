import type { BerlinDate } from '@/shared/pure/calendar';
import type { Period } from '@/domain/periods/period';
import type { Result } from '@/shared/pure/result';
import type { UpdateErrorCode } from '@/domain/updates/contracts';

export type ForecastError = UpdateErrorCode | 'INVALID_DATE' | 'INVALID_PERIOD' | 'SCOPE_MISMATCH'
  | 'ANCHOR_MISMATCH' | 'SUM_MISMATCH' | 'DUPLICATE_ID_OR_PERIOD' | 'INVALID_EARMARK'
  | 'STATE_AFTER_AS_OF' | 'INVALID_OBSERVATION_KIND' | 'INVALID_STATE_SHAPE' | 'PROJECTION_LIMIT_EXCEEDED';
export type Source = Readonly<{
  identityId: string; revisionId: string; accountId: string; originPeriod: Period; fundingPeriod: Period;
  effectiveDate: BerlinDate; positionId: string; transitionDecisionId: string | null;
}>;
export type Obligation = Source & Readonly<{
  title: string; dueDate: BerlinDate | null; original: bigint; outstanding: bigint;
  status: 'UNPAID' | 'PAID' | 'CANCELLED'; isPossible: boolean; reserveFull: boolean;
}>;
export type Saving = Source & Readonly<{ title: string; amount: bigint; status: 'ACTIVE' | 'RELEASED' }>;
export type Provenance = Readonly<{
  selectionVersion: 1; knowledgeCut: bigint; capturedAggregateRevision: bigint; historicalThroughDate: BerlinDate;
  orderingRevisionIds: readonly string[];
}>;
export type Bank = Readonly<{ revisionId: string; observedDate: BerlinDate; observedAt: string | null; balance: bigint }>;
type Context = Readonly<{ accountId: string; provenance: Provenance }>;
export type CompleteSnapshot = Context & Readonly<{
  kind: 'ACTIVE_COMPLETE'; checkpoint: Bank; allocationRevisionId: string; anchorCheckpointRevisionId: string;
  allocationEffectiveDate: BerlinDate; allocations: readonly Readonly<{ period: Period; amount: bigint }>[];
  obligations: readonly Obligation[]; savings: readonly Saving[];
}>;
export type Snapshot = CompleteSnapshot
  | Context & Readonly<{ kind: 'NO_OBSERVATION'; knownObligations: readonly Obligation[]; knownSavings: readonly Saving[] }>
  | Context & Readonly<{ kind: 'INCOMPLETE_STATE'; missing: readonly ('BANK' | 'ALLOCATIONS' | 'OBLIGATIONS' | 'SAVINGS')[] }>
  | Context & Readonly<{ kind: 'NEGATIVE_BANK_OBSERVATION'; checkpoint: Bank }>;
export type Notice = 'EARLIER_OBSERVATION' | 'REMINDER_DUE' | 'MONTH_REVIEW_REQUIRED' | 'CURRENT_UNFUNDED';
export type Freshness = Readonly<{ basisDate: BerlinDate; ageDays: number; showReminder: boolean; notices: readonly Notice[] }>;
export type Warning = 'OBLIGATIONS_UNDERFUNDED' | 'EARMARKS_UNDERFUNDED' | 'PROTECTION_UNDERFUNDED' | 'BUDGET_EXCEEDS_SAFE';
export type CoverageMeaning = Exclude<Warning, 'BUDGET_EXCEEDS_SAFE'>;
export type Warnings = Readonly<{
  warnings: readonly Warning[]; coverageGroups: readonly Readonly<{ amount: bigint; meanings: readonly CoverageMeaning[] }>[];
  comparisonsAreNonAdditive: true; budgetExplanation: 'BUDGET_EXCEEDS_SAFE' | null;
}>;
export type Daily = Readonly<{ kind: 'BUDGET_ESTIMATE'; mode: 'CURRENT' | 'FUTURE_PREVIEW'; days: number;
  eligible: bigint; ordinaryGuideline: bigint; roundingRemainder: bigint; liquidityPresentation: 'SAFE_MAIN' }>
  | Readonly<{ kind: 'UNAVAILABLE'; reason: 'HISTORICAL_PERIOD' }>;
export type PeriodBudget = Readonly<{
  period: Period; allocated: bigint; reserved: bigint; savings: bigint; earmarked: bigint; free: bigint; deficit: bigint;
  ordinary: Daily; obligationRevisionIds: readonly string[]; savingRevisionIds: readonly string[];
}>;
export type Liquidity = Warnings & Readonly<{
  kind: 'SAFE_ESTIMATE'; presentation: 'SAFE_MAIN'; formula: 'ALL_PERIOD_MAX_V1'; days: number;
  budgetFree: bigint; budgetDeficit: bigint; budgetGuideline: bigint; totalReserved: bigint; totalSavings: bigint;
  protectedTotal: bigint; otherPeriodProtection: bigint; liquidityFreeSigned: bigint;
  safeAvailable: bigint; safeDailyLimit: bigint; safeRemainder: bigint;
  obligationShortfall: bigint; earmarkShortfall: bigint; protectionShortfall: bigint; budgetSafeGap: bigint;
  protectionByPeriod: readonly Readonly<{ period: Period; allocated: bigint; reserved: bigint; savings: bigint; protectedAmount: bigint }>[];
}>;
export type AccountEstimate = Readonly<{
  kind: 'ACCOUNT_ESTIMATE'; schemaVersion: 1; currency: 'EUR'; accountId: string; asOfDate: BerlinDate; currentPeriod: Period;
  completeness: 'COMPLETE'; bank: Bank;
  provenance: Provenance & Readonly<{ allocationRevisionId: string; anchorCheckpointRevisionId: string; allocationEffectiveDate: BerlinDate;
    obligationSources: readonly Obligation[]; savingSources: readonly Saving[] }>;
  periods: readonly PeriodBudget[]; totals: Readonly<{ allocated: bigint; reserved: bigint; savings: bigint; earmarked: bigint; freeSigned: bigint }>;
  currentLiquidity: Liquidity; freshness: Freshness;
}>;
export type Unavailable = Readonly<{
  kind: 'UNAVAILABLE'; reason: 'NO_OBSERVATION' | 'INCOMPLETE_STATE' | 'OVERDRAFT_POLICY_REQUIRED';
  accountId: string; asOfDate: BerlinDate; provenance: Provenance;
}> & (Readonly<{ reason: 'NO_OBSERVATION'; knownEarmarks: Readonly<{ completeness: 'COMPLETE'; obligations: readonly Obligation[]; savings: readonly Saving[] }> }>
  | Readonly<{ reason: 'INCOMPLETE_STATE'; missing: readonly string[] }>
  | Readonly<{ reason: 'OVERDRAFT_POLICY_REQUIRED'; bank: Bank }>);
export type AccountProjection = AccountEstimate | Unavailable;
export type PeriodProjection = Readonly<{ kind: 'PERIOD_ESTIMATE'; asOfDate: BerlinDate; budget: PeriodBudget;
  provenance: AccountEstimate['provenance']; bank: Bank; freshness: Freshness;
  liquidity: Liquidity | Readonly<{ kind: 'LIQUIDITY_UNAVAILABLE'; reason: 'NOT_CURRENT_PERIOD' }> }> | Unavailable;
export type ProjectionResult<T> = Result<T, ForecastError>;
export const LIMITS = Object.freeze({ historyRows: 20000, identities: 1000, periods: 1200, storageBytes: 8 * 1024 * 1024, wireBytes: 1024 * 1024 });
