import 'server-only';
import { and, eq, lte, sql } from 'drizzle-orm';
import { encodeCanonical, normalizeValue } from '@/domain/updates/canonical-value';
import type { AuthorizedScope, CanonicalValue } from '@/domain/updates/contracts';
import type { Action, SavingEvent, SavingHistory } from '@/domain/savings/contracts';
import { savingAuditAfter } from '@/domain/savings/evidence';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parseCentsString } from '@/domain/money/money-codec';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseInstant } from '@/shared/pure/instant';
import { rejectBatch } from './commit';
import { loadCheckpointHistory } from './checkpoint-history';
import type { createDatabase } from './client';
import * as s from './schema';
type Connection = Pick<ReturnType<typeof createDatabase>['db'], 'select'>;
export async function loadSavingHistory(db: Connection, scope: AuthorizedScope, cut: bigint): Promise<SavingHistory> {
  const history = await loadCheckpointHistory(db, scope, cut);
  const rows = await db.select({ event: s.savingsEvents, origin: s.savingsGoals.originatingPeriodId,
    confirmation: sql<string>`to_char(${s.savingsEvents.confirmedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` })
    .from(s.savingsEvents).innerJoin(s.savingsGoals, eq(s.savingsGoals.id, s.savingsEvents.savingsId))
    .where(and(eq(s.savingsEvents.ownerUserId, scope.ownerUserId), eq(s.savingsEvents.accountId, scope.accountId), lte(s.savingsEvents.recordedSeq, cut)));
  const audits = rows.length ? await db.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId, scope.ownerUserId),
    eq(s.auditEvents.accountId, scope.accountId), lte(s.auditEvents.recordedSeq, cut))) : [];
  const savings: SavingEvent[] = rows.map(({ event: e, origin, confirmation }) => {
    try {
    const date = parseBerlinDate(e.effectiveDate);
    if (!date.ok || !parseInstant(confirmation).ok) return rejectBatch('HISTORICAL_SAVINGS_CONFLICT');
    const matches = audits.filter(a => {
      const d = a.beforeAfter;
      return d && typeof d === 'object' && 'entity' in d && d.entity !== null && typeof d.entity === 'object'
        && 'type' in d.entity && 'id' in d.entity && d.entity.type === 'SAVINGS_STATE' && d.entity.id === e.id;
    });
    const audit = matches[0], doc = normalizeValue(audit?.beforeAfter);
    if (matches.length !== 1 || audit.ownerUserId !== scope.ownerUserId || audit.accountId !== scope.accountId
      || audit.budgetUpdateId !== e.budgetUpdateId || audit.recordedSeq !== e.recordedSeq
      || !exactKeys(doc, ['schemaVersion','eventIndex','entity','before','after']) || doc.schemaVersion !== 1
      || !Number.isSafeInteger(doc.eventIndex) || (doc.eventIndex as number) < 0
      || !exactKeys(doc.entity, ['type','id']) || !doc.after || typeof doc.after !== 'object' || Array.isArray(doc.after)) return rejectBatch('HISTORICAL_SAVINGS_CONFLICT');
    const after = doc.after as Record<string, unknown>;
    const amount = (key: string): bigint | null => {
      if (after[key] === null) return null;
      const parsed = parseCentsString(after[key]);
      if (!parsed.ok || parsed.value <= 0n) return rejectBatch('HISTORICAL_SAVINGS_CONFLICT');
      return parsed.value;
    };
    const event: SavingEvent = { ...e, originatingPeriodId: origin, effectiveDate: date.value, confirmedAt: confirmation,
      action: e.action as Action, status: e.status as SavingEvent['status'], beforeState: normalizeValue(e.beforeState),
      confirmedIncreaseAmount: amount('confirmedIncreaseAmount'), confirmedReleasedAmount: amount('confirmedReleasedAmount') };
    if (encodeCanonical(doc.after as CanonicalValue) !== encodeCanonical(savingAuditAfter(event))) return rejectBatch('HISTORICAL_SAVINGS_CONFLICT');
    // Audit.before describes replaced state for corrections, or the actual predecessor for ordinary changes.
    const replaced = e.supersedesId ? rows.find(x => x.event.id === e.supersedesId) : null;
    const expectedBefore = replaced ? { schemaVersion: 1, revisionId: replaced.event.id, savingsId: replaced.event.savingsId,
      originatingPeriodId: replaced.origin, fundingPeriodId: replaced.event.fundingPeriodId, title: replaced.event.title,
      amountCents: replaced.event.amountCents.toString(), status: replaced.event.status } : e.beforeState;
    if (encodeCanonical(doc.before as CanonicalValue) !== encodeCanonical(expectedBefore as CanonicalValue)) return rejectBatch('HISTORICAL_SAVINGS_CONFLICT');
    return event;
    } catch { return rejectBatch('HISTORICAL_SAVINGS_CONFLICT'); }
  });
  return { ...history, savings };
}
