import 'server-only';
import type { History } from '@/domain/checkpoints/contracts';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { validateSavingHistory } from '@/domain/savings/history';
import { loadSavingHistory } from './savings-history';
import { markSavingReportImpact } from './report-impact';
import { rejectBatch, type Transaction } from './commit';
/** Other streams retain full savings and validate their shared ordering at one cut. */
export async function checkRetainedSavings(tx: Transaction, scope: AuthorizedScope, before: History, after: History,
  originalPending?: ReadonlyMap<string, boolean>) {
  const original = await loadSavingHistory(tx, scope, before.knowledgeCut);
  if (!original.savings.length) return [];
  const candidate = { ...after, savings: original.savings };
  const valid = validateSavingHistory(candidate);
  if (!valid.ok) return rejectBatch(valid.code);
  return markSavingReportImpact(tx, original, candidate, scope, originalPending);
}
