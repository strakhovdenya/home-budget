import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { ProjectionResult, Snapshot } from './contracts';

export type SnapshotRead = Readonly<{ snapshot: Snapshot; asOfDate: BerlinDate }>;
export interface ProjectionSnapshotReader {
  read(scope: AuthorizedScope): Promise<ProjectionResult<SnapshotRead>>;
}
