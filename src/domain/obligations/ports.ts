import type { AuthorizedScope, UpdateErrorCode } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { ObligationEvent } from './contracts';
export interface ObligationReader {
  read(scope: AuthorizedScope, through: BerlinDate, cut: bigint | null): Promise<Result<Readonly<{ states: readonly ObligationEvent[]; knowledgeCut: bigint; orderingRevisionIds: readonly string[]; reserves: ReadonlyMap<string, bigint> }>, UpdateErrorCode>>;
}
