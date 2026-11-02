import type { CheckpointReader, IntervalReader } from '@/domain/checkpoints/contracts';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { parseBerlinDate } from '@/shared/pure/calendar';

export function createBankStateReader(authorize: (selector: unknown) => Promise<AuthorizedScope>, reader: CheckpointReader) {
  return async function readBankState(selector: unknown, historicalThroughDate: unknown) {
    const date = parseBerlinDate(historicalThroughDate);
    const captured = typeof selector === 'string' ? selector : null;
    let scope: AuthorizedScope;
    try { scope = await authorize(captured); }
    catch (e) { return { ok: false, code: e instanceof Error && e.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FORBIDDEN' } as const; }
    if (!date.ok) return date;
    return reader.read(scope, date.value);
  };
}

export function createBankIntervalReader(authorize: (selector: unknown) => Promise<AuthorizedScope>, reader: IntervalReader) {
  return async function readBankIntervals(selector: unknown) {
    const captured = typeof selector === 'string' ? selector : null;
    let scope: AuthorizedScope;
    try { scope = await authorize(captured); }
    catch (e) { return { ok: false, code: e instanceof Error && e.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FORBIDDEN' } as const; }
    return reader.read(scope);
  };
}
