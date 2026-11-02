import 'server-only';
import { and, eq, lte, sql } from 'drizzle-orm';
import { parseCentsString } from '@/domain/money/money-codec';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseInstant } from '@/shared/pure/instant';
import { snapshot } from '@/domain/obligations/lifecycle';
import { encodeCanonical } from '@/domain/updates/canonical-value';
import type { ObligationEvent, ObligationHistory, Payment, Action } from '@/domain/obligations/contracts';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { exactKeys } from '@/domain/checkpoints/validation';
import { validUuid } from '@/domain/updates/validation';
import { loadCheckpointHistory } from './checkpoint-history';
import { rejectBatch } from './commit';
import type { createDatabase } from './client';
import * as s from './schema';
type Connection = Pick<ReturnType<typeof createDatabase>['db'], 'select'>;
export async function loadObligationHistory(db: Connection, scope: AuthorizedScope, cut: bigint): Promise<ObligationHistory> {
  const history = await loadCheckpointHistory(db, scope, cut);
  const rows = await db.select({ event: s.obligationEvents, origin: s.obligations.originatingPeriodId,
    confirmation: sql<string>`to_char(${s.obligationEvents.confirmedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` })
    .from(s.obligationEvents).innerJoin(s.obligations, eq(s.obligations.id, s.obligationEvents.obligationId))
    .where(and(eq(s.obligationEvents.ownerUserId, scope.ownerUserId), eq(s.obligationEvents.accountId, scope.accountId), lte(s.obligationEvents.recordedSeq, cut)));
  const audits = await db.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId, scope.ownerUserId), eq(s.auditEvents.accountId, scope.accountId), lte(s.auditEvents.recordedSeq, cut)));
  const events: ObligationEvent[] = rows.map(({ event: e, origin, confirmation }) => {
    const day = parseBerlinDate(e.effectiveDate), due = e.dueDate === null ? null : parseBerlinDate(e.dueDate), bank = e.bankDate === null ? null : parseBerlinDate(e.bankDate);
    if (!day.ok || (due && !due.ok) || (bank && !bank.ok) || !parseInstant(confirmation).ok) return rejectBatch('HISTORICAL_PAYMENT_CONFLICT');
    const event: ObligationEvent = { ...e, originatingPeriodId: origin, effectiveDate: day.value, dueDate: due?.ok ? due.value : null,
      bankDate: bank?.ok ? bank.value : null, confirmedAt: confirmation, action: e.action as Action, status: e.status as ObligationEvent['status'], beforeState: e.beforeState as ObligationEvent['beforeState'], payment: null };
    if (e.action === 'PAID' || e.action === 'PARTIAL_SETTLEMENT') {
      const matches = audits.filter(a => {
        const d = a.beforeAfter;
        return d && typeof d === 'object' && 'entity' in d && exactKeys(d.entity, ['type', 'id']) && d.entity.type === 'OBLIGATION_STATE' && d.entity.id === e.id;
      });
      const doc = matches[0]?.beforeAfter;
      if (matches.length !== 1 || matches[0].budgetUpdateId !== e.budgetUpdateId || !doc || typeof doc !== 'object' || !('after' in doc)
        || !exactKeys(doc.after, ['state', 'payment', 'effectiveDate', 'positionId', 'bankDate', 'supersedesId', 'confirmedAt'])
        || encodeCanonical(doc.after.state as ObligationEvent['beforeState']) !== encodeCanonical(snapshot(event))) return rejectBatch('HISTORICAL_PAYMENT_CONFLICT');
      const p = doc.after.payment;
      if (!exactKeys(p, ['amountCents', 'source', 'bankStateAffirmed', 'unchangedBalanceAcknowledged', 'checkpointId', 'beforeRevisionId', 'afterRevisionId'])) return rejectBatch('HISTORICAL_PAYMENT_CONFLICT');
      const amount = parseCentsString(p.amountCents);
      if (!amount.ok || amount.value <= 0n || !['TRACKED_CARD', 'OUTSIDE_TRACKED_CARD'].includes(String(p.source)) || p.bankStateAffirmed !== true
        || typeof p.unchangedBalanceAcknowledged !== 'boolean' || !validUuid(p.checkpointId) || p.beforeRevisionId !== e.previousRevisionId || p.afterRevisionId !== e.id) return rejectBatch('HISTORICAL_PAYMENT_CONFLICT');
      event.payment = { ...p, amountCents: amount.value } as Payment;
    }
    return event;
  });
  return { ...history, events };
}
