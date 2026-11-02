import type { AuthorizedScope, UpdateErrorCode } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import type { BerlinDate } from '@/shared/pure/calendar';
import type { SavingEvent } from './contracts';
export interface SavingReader {
  read(scope: AuthorizedScope, through: BerlinDate, cut: bigint | null): Promise<Result<Readonly<{ states: readonly SavingEvent[]; knowledgeCut: bigint; orderingRevisionIds: readonly string[]; savingsTotals: ReadonlyMap<string, bigint> }>, UpdateErrorCode>>;
}
