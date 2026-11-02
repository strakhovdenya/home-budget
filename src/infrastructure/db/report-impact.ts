import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { AuthorizedScope, AuditDescriptor } from '@/domain/updates/contracts';
import type { SavingEvent, SavingHistory } from '@/domain/savings/contracts';
import { selectSavingState, calculatePeriodSavings } from '@/domain/savings/history';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { affectedReports } from './checkpoint-persistence';
import { rejectBatch, type Transaction } from './commit';
import * as s from './schema';
/** Reuses the bank/order proof. Only savings relevant to a report's period cause savings impact. */
export async function markSavingReportImpact(tx: Transaction, original: SavingHistory, candidate: SavingHistory, scope: AuthorizedScope,
  originalPending?: ReadonlyMap<string, boolean>): Promise<AuditDescriptor[]> {
  const changedBank = await affectedReports(tx, original, candidate, scope.ownerUserId, scope.accountId);
  const reports = await tx.select({ head: s.reportHeads, closing: s.monthClosings }).from(s.reportHeads)
    .innerJoin(s.monthClosings, eq(s.monthClosings.id, s.reportHeads.closingId))
    .where(and(eq(s.reportHeads.ownerUserId, scope.ownerUserId), eq(s.reportHeads.accountId, scope.accountId)));
  const audits: AuditDescriptor[] = [];
  for (const { head, closing } of reports) {
    const day = parseBerlinDate(closing.historicalThroughDate), manifest = closing.sourceManifest;
    if (!day.ok || !manifest || typeof manifest !== 'object' || !('savingsRevisionIds' in manifest) || !Array.isArray(manifest.savingsRevisionIds)) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const pinned = selectSavingState({ ...original, knowledgeCut: closing.evidenceRecordedCutoffSeq }, day.value), before = selectSavingState(original, day.value), after = selectSavingState(candidate, day.value);
    if (!pinned.ok || !before.ok || !after.ok) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    const totals = calculatePeriodSavings(pinned.value.states);
    const ids = (events: readonly SavingEvent[]) => events.map(e => e.id).sort().join(',');
    const relevant = (events: readonly SavingEvent[]) => ids(events.filter(e => e.fundingPeriodId === closing.periodId));
    const refs = manifest.savingsRevisionIds;
    if (!totals.ok || (totals.value.get(closing.periodId) ?? 0n) !== closing.historicalSavingsCents || refs.some(x => typeof x !== 'string')
      || new Set(refs).size !== refs.length || [...refs].sort().join(',') !== ids(pinned.value.states)
      || (!(originalPending?.get(head.id) ?? head.correctionPending) && relevant(pinned.value.states) !== relevant(before.value.states))) return rejectBatch('REPORT_IMPACT_REVIEW_REQUIRED');
    if (!head.correctionPending && (relevant(before.value.states) !== relevant(after.value.states) || changedBank.some(r => r.head.id === head.id))) {
      await tx.update(s.reportHeads).set({ correctionPending: true }).where(and(eq(s.reportHeads.id, head.id), eq(s.reportHeads.ownerUserId, scope.ownerUserId), eq(s.reportHeads.accountId, scope.accountId)));
      audits.push({ entityType: 'REPORT_REVIEW_REQUIRED', entityId: head.id, before: { closingId: head.closingId, correctionPending: false }, after: { closingId: head.closingId, correctionPending: true } });
    }
  }
  return audits;
}
