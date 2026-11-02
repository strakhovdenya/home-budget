import type { AuthorizedScope } from '@/domain/updates/contracts';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parsePeriod } from '@/domain/periods/period';
import type { ProjectionSnapshotReader } from '@/domain/forecast/ports';
import type { ForecastError, AccountProjection, PeriodProjection } from '@/domain/forecast/contracts';
import { projectAccount, projectPeriod } from '@/domain/forecast/budget';
import { encodeProjection, type Wire } from '@/domain/forecast/serialization';
import type { Result } from '@/shared/pure/result';

/** Only targetPeriod crosses this boundary. Clock/H/K and owner cannot be supplied in a query. */
export function createProjectionReader(authorize: (selector: unknown) => Promise<AuthorizedScope>, reader: ProjectionSnapshotReader) {
  return async function readProjection(selector: unknown, query: unknown): Promise<Result<Wire<AccountProjection | PeriodProjection>, ForecastError>> {
    let copied: unknown;
    const accountSelector = typeof selector === 'string' ? selector : null;
    try { copied = normalizeValue(query); } catch { return { ok: false, code: 'INVALID_INPUT' }; }
    let scope: AuthorizedScope;
    try { scope = await authorize(accountSelector); }
    catch (e) { return { ok: false, code: e instanceof Error && e.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FORBIDDEN' }; }
    if (!exactKeys(copied, ['targetPeriod']) || (copied.targetPeriod !== null && !parsePeriod(copied.targetPeriod).ok)) return { ok: false, code: 'INVALID_INPUT' };
    try {
      const read = await reader.read(scope);
      if (!read.ok) return read;
      const projected = copied.targetPeriod === null ? projectAccount(read.value.snapshot, read.value.asOfDate)
        : projectPeriod(read.value.snapshot, read.value.asOfDate, copied.targetPeriod);
      return projected.ok ? encodeProjection(projected.value) : projected;
    } catch { return { ok: false, code: 'STORAGE_ERROR' }; }
  };
}
