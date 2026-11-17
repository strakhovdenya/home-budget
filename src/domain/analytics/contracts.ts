import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { HistoryError } from '@/domain/history/contracts';
import type { Result } from '@/shared/pure/result';

export type View = 'CHECKPOINTS' | 'MONTHS' | 'FUNDING';

export type ReportRef = Readonly<{
  id: string;
  batchId: string;
  version: number;
  digest: string;
}>;

export type ReportSelection = Readonly<{
  id: string;
  batchId: string;
  version: number;
  digest: string | null;
}>;

export type Selection = Readonly<{
  dayH: string | null;
  knowledgeAnchor: string | null;
  report: ReportSelection | null;
}>;

export type Basis = Readonly<{
  schemaVersion: 1;
  accountId: string;
  indexAnchor: string | null;
  indexCut: string;
  stateAnchor: string | null;
  stateCut: string;
  dayH: string;
  today: string;
  capturedAt: string;
  report: ReportRef | null;
}>;

export type Filters = Readonly<{
  from: string;
  to: string;
  origin: string | null;
  funding: string | null;
}>;

export type Cursor = Readonly<{
  binding: string;
  lastKey: string;
}>;

export type Query = Readonly<{
  schemaVersion: 1;
  basis: Basis;
  view: View;
  filters: Filters;
  cursor: Cursor | null;
  compare: readonly [string, string] | null;
}>;

export type OpenQuery = Readonly<{
  schemaVersion: 1;
  selection: Selection;
}>;

export type Check = Readonly<{
  id: string;
  logicalFactId: string;
  observedDate: string;
  observedAt: string | null;
  balance: string;
  positionId: string;
}>;

export type Month = Readonly<{
  period: string;
  allocated: string | null;
  reserved: string;
  savings: string;
  free: string | null;
  deficit: string | null;
}>;

export type Identity = Readonly<{
  id: string;
  revisionId: string;
  title: string;
  origin: string;
  funding: string;
  original: string;
  outstanding: string;
  status: 'UNPAID';
  reserveFull: true;
  isPossible: boolean;
}>;

export type Group = Readonly<{
  origin: string;
  funding: string;
  amount: string;
  count: number;
}>;

export type Comparison = Readonly<{
  from: Check;
  to: Check;
  delta: string;
  evidence: 'NOT_AVAILABLE';
  known: null;
  unexplained: null;
}>;

export type Common = Readonly<{
  schemaVersion: 1;
  basis: Basis;
  query: Query;
  completeness: 'COMPLETE';
  lastCheck: Check | null;
  endBalance: string | null;
  count: number;
  next: Cursor | null;
}>;

export type Page = Common & (
  | Readonly<{
    view: 'CHECKPOINTS';
    checks: readonly Check[];
    comparison: Comparison | null;
  }>
  | Readonly<{
    view: 'MONTHS';
    months: readonly Month[];
  }>
  | Readonly<{
    view: 'FUNDING';
    identities: readonly Identity[];
    groups: readonly Group[];
    total: string;
    totalCount: number;
    subtotal: string;
    subtotalCount: number;
  }>
);

export type AnalyticsResult<T> = Result<T, HistoryError>;

export type ChoicesQuery = Readonly<{
  schemaVersion: 1;
  basis: Basis;
  beforeSeq: string | null;
}>;

export type Choices = Readonly<{
  basis: Basis;
  items: readonly Readonly<{
    id: string;
    seq: string;
    recordedAt: string;
    report: (ReportSelection & Readonly<{
      period: string;
    }>) | null;
  }>[];
  nextBeforeSeq: string | null;
}>;

export interface AnalyticsReader {
  open(scope: AuthorizedScope, query: OpenQuery): Promise<AnalyticsResult<Page>>;
  read(scope: AuthorizedScope, query: Query): Promise<AnalyticsResult<Page>>;
  choices(scope: AuthorizedScope, query: ChoicesQuery): Promise<AnalyticsResult<Choices>>;
}
