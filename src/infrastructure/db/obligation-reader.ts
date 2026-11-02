import 'server-only';
import { and, eq } from 'drizzle-orm';
import { selectObligationState, calculatePeriodReserves } from '@/domain/obligations/history';
import type { ObligationReader } from '@/domain/obligations/ports';
import type { createDatabase } from './client';
import { loadObligationHistory } from './obligation-history';
import { BatchFailure } from './commit';
import { accounts } from './schema';
export function createObligationReader(db: ReturnType<typeof createDatabase>): ObligationReader {
  return { async read(scope, through, cut) {
    try {
      const [account] = await db.db.select().from(accounts).where(and(eq(accounts.ownerUserId, scope.ownerUserId), eq(accounts.id, scope.accountId)));
      if (!account) return { ok: false, code: 'FORBIDDEN' };
      const k = cut ?? account.recordedSeq;
      if (k < 0n || k > account.recordedSeq) return { ok: false, code: 'INVALID_INPUT' };
      const selected = selectObligationState(await loadObligationHistory(db.db, scope, k), through);
      if (!selected.ok) return selected;
      const reserves = calculatePeriodReserves(selected.value.states);
      return reserves.ok ? { ok: true, value: { ...selected.value, reserves: reserves.value } } : reserves;
    } catch (e) { return { ok: false, code: e instanceof BatchFailure ? e.code : 'STORAGE_ERROR' }; }
  } };
}
