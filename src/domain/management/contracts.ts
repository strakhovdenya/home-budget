import type { AuthorizedScope, CanonicalValue } from '@/domain/updates/contracts';
import type { ProjectionResult, AccountProjection, Obligation, Saving } from '@/domain/forecast/contracts';
import type { Wire } from '@/domain/forecast/serialization';

export type ManagementKind = 'OBLIGATION' | 'SAVING';
export type ManagementList = Readonly<{
  scopeKey: string; revision: string; knowledgeCut: string; today: string;
  obligations: readonly Wire<Obligation>[]; savings: readonly Wire<Saving>[];
  projection: Wire<AccountProjection>;
}>;
export type HistoryQuery = Readonly<{ kind: ManagementKind; identityId: string; cursor: string | null }>;
export type HistoryEntry = Readonly<{
  id: string; action: string; previousRevisionId: string | null; supersedesId: string | null;
  supersededBy: string | null; effectiveDate: string; recordedAt: string; recordedSeq: string;
  positionId: string; confirmedAt: string; originPeriod: string; fundingPeriod: string;
  before: CanonicalValue; after: CanonicalValue; payment: CanonicalValue;
  actorId: string; reason: string; beforeFundingPeriod: string | null;
  increase: string | null; released: string | null; bankDate: string | null; fundingProof: CanonicalValue;
}>;
export type ManagementHistory = Readonly<{
  entries: readonly HistoryEntry[]; cursor: string | null; knowledgeCut: string; through: string; hasNewData: boolean;
}>;
export type ReleaseProposal = Readonly<{ identityId: string; revisionId: string; knowledgeCut: string; revision: string; amount: string }>;
export interface ManagementReader {
  list(scope: AuthorizedScope): Promise<ProjectionResult<ManagementList>>;
  history(scope: AuthorizedScope, query: HistoryQuery): Promise<ProjectionResult<ManagementHistory>>;
  proposeRelease(scope: AuthorizedScope, identityId: string): Promise<ProjectionResult<ReleaseProposal>>;
}
