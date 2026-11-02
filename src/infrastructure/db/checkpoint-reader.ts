import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { CheckpointReader, IntervalView, CheckpointErrorCode } from '@/domain/checkpoints/contracts';
import { correctionTips, indexHistory, selectState } from '@/domain/checkpoints/history';
import { reconcileInterval } from '@/domain/checkpoints/reconciliation';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import { validUuid } from '@/domain/updates/validation';
import { loadCheckpointHistory } from './checkpoint-history';
import { BatchFailure } from './commit';
import type { createDatabase } from './client';
import { accounts } from './schema';

export function createCheckpointReader(database: ReturnType<typeof createDatabase>): CheckpointReader {
  return { async read(scope, through) {
    try {
      if (!validUuid(scope.ownerUserId) || !validUuid(scope.accountId)) return { ok: false, code: 'FORBIDDEN' };
      const [account] = await database.db.select().from(accounts).where(and(eq(accounts.ownerUserId, scope.ownerUserId), eq(accounts.id, scope.accountId)));
      if (!account) return { ok: false, code: 'FORBIDDEN' };
      return selectState(await loadCheckpointHistory(database.db, scope, account.recordedSeq), through);
    } catch (e) {
      if (e instanceof BatchFailure && (e.code === 'ORDERING_CONFLICT' || e.code === 'HISTORICAL_STATE_CONFLICT')) return { ok: false, code: e.code };
      return { ok: false, code: 'STORAGE_ERROR' };
    }
  } };
}

/** No operation source exists yet: K/U explicitly unavailable, never an empty ledger. */
export async function readCheckpointIntervals(database: ReturnType<typeof createDatabase>, scope: AuthorizedScope): Promise<Result<readonly IntervalView[], CheckpointErrorCode | 'FORBIDDEN' | 'STORAGE_ERROR'>> {
  try {
    if (!validUuid(scope.ownerUserId) || !validUuid(scope.accountId)) return { ok: false, code: 'FORBIDDEN' };
    const [account] = await database.db.select().from(accounts).where(and(eq(accounts.ownerUserId, scope.ownerUserId), eq(accounts.id, scope.accountId)));
    if (!account) return { ok: false, code: 'FORBIDDEN' };
    const h = await loadCheckpointHistory(database.db, scope, account.recordedSeq), index = indexHistory(h), tips = correctionTips(h.checkpoints, h.knowledgeCut);
    if (!index.ok) return index;
    if (!tips.ok) return tips;
    const observations = [...tips.value].sort((a, b) => index.value.compare(a.positionId, b.positionId));
    const intervals: IntervalView[] = [];
    for (let i = 1; i < observations.length; i++) {
      const from = observations[i - 1], to = observations[i];
      const r = reconcileInterval(scope.accountId, h.knowledgeCut, from, to, { status: 'NOT_AVAILABLE' });
      if (!r.ok) return r;
      intervals.push({ fromCheckpointId: from.id, toCheckpointId: to.id, knowledgeCut: h.knowledgeCut, reconciliation: r.value });
    }
    return { ok: true, value: intervals };
  } catch { return { ok: false, code: 'STORAGE_ERROR' }; }
}
