import 'server-only';
import { and, eq } from 'drizzle-orm';
import { selectSavingState, calculatePeriodSavings } from '@/domain/savings/history';
import type { SavingReader } from '@/domain/savings/ports';
import type { createDatabase } from './client';
import { loadSavingHistory } from './savings-history';
import { BatchFailure } from './commit';
import { accounts } from './schema';
export function createSavingReader(db: ReturnType<typeof createDatabase>): SavingReader {
  return { async read(scope, through, cut) {
    try {
      const [account] = await db.db.select().from(accounts).where(and(eq(accounts.ownerUserId, scope.ownerUserId), eq(accounts.id, scope.accountId)));
      if (!account) return { ok: false, code: 'FORBIDDEN' };
      const k = cut ?? account.recordedSeq;
      if (k < 0n || k > account.recordedSeq) return { ok: false, code: 'INVALID_INPUT' };
      const selected = selectSavingState(await loadSavingHistory(db.db, scope, k), through);
      if (!selected.ok) return selected;
      const savingsTotals = calculatePeriodSavings(selected.value.states);
      return savingsTotals.ok ? { ok: true, value: { ...selected.value, savingsTotals: savingsTotals.value } } : savingsTotals;
    } catch (e) { return { ok: false, code: e instanceof BatchFailure ? e.code : 'STORAGE_ERROR' }; }
  } };
}
