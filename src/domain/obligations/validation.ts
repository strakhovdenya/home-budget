import { normalizeValue } from '@/domain/updates/canonical-value';
import type { CanonicalValue } from '@/domain/updates/contracts';
import { validUuid } from '@/domain/updates/validation';
import { parseCheckpoint, exactKeys } from '@/domain/checkpoints/validation';
import { parseCentsString } from '@/domain/money/money-codec';
import { validateCents } from '@/domain/money/money';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parsePeriod } from '@/domain/periods/period';
import type { Result } from '@/shared/pure/result';
import type { Change, ObligationErrorCode } from './contracts';
export function parseObligationBatch(input: unknown): Result<readonly Change[], ObligationErrorCode> {
  const bad = { ok: false, code: 'INVALID_OBLIGATION' } as const;
  let v: unknown; try { v = normalizeValue(input); } catch { return bad; }
  if (!exactKeys(v, ['changes']) || !Array.isArray(v.changes) || v.changes.length < 1 || v.changes.length > 7) return bad;
  const changes: Change[] = [], keys = new Set<string>();
  for (const x of v.changes) {
    if (!exactKeys(x, ['key', 'action', 'obligationId', 'expectedStateRevisionId', 'correctionId', 'previousChangeKey', 'effectiveDate', 'bankDate', 'data', 'placement', 'bankCheck', 'paymentConfirmation'])) return bad;
    if (typeof x.key !== 'string' || !/^[a-z][a-z0-9_]{0,31}$/.test(x.key) || keys.has(x.key)
      || typeof x.action !== 'string' || !['CREATE', 'AMEND', 'PARTIAL_SETTLEMENT', 'PAID', 'CANCELLED'].includes(x.action)) return bad;
    for (const k of ['obligationId', 'expectedStateRevisionId', 'correctionId']) if (x[k] !== null && !validUuid(x[k])) return bad;
    if (x.previousChangeKey !== null && (typeof x.previousChangeKey !== 'string' || !keys.has(x.previousChangeKey) || x.expectedStateRevisionId !== null)) return bad;
    const day = parseBerlinDate(x.effectiveDate), bank = x.bankDate === null ? null : parseBerlinDate(x.bankDate);
    if (!day.ok || (bank && !bank.ok) || !x.data || typeof x.data !== 'object' || Array.isArray(x.data)) return bad;
    const data = { ...x.data } as Record<string, CanonicalValue>;
    const allowed = x.action === 'CREATE' ? ['title', 'dueDate', 'originalCents', 'isPossible', 'reserveFull', 'originatingPeriod', 'fundingPeriod']
      : x.action === 'AMEND' ? ['title', 'dueDate', 'originalCents', 'isPossible', 'reserveFull']
      : x.action === 'CANCELLED' ? [] : ['amountCents'];
    if (Object.keys(data).some(k => !allowed.includes(k))) return bad;
    if (x.action === 'CREATE' && !exactKeys(data, allowed)) return bad;
    if (x.action !== 'CREATE' && x.obligationId === null) return bad;
    if (x.action === 'CREATE' && !x.correctionId && x.obligationId !== null) return bad;
    for (const k of ['originalCents', 'amountCents']) if (k in data) {
      const r = typeof data[k] === 'string' ? parseCentsString(data[k]) : validateCents(data[k]);
      if (!r.ok) return bad; data[k] = r.value;
    }
    if ('title' in data) {
      if (typeof data.title !== 'string') return bad;
      data.title = data.title.trim();
      if ([...data.title].length < 1 || [...data.title].length > 200) return bad;
    }
    if ('dueDate' in data && data.dueDate !== null && !parseBerlinDate(data.dueDate).ok) return bad;
    for (const k of ['isPossible', 'reserveFull']) if (k in data && typeof data[k] !== 'boolean') return bad;
    for (const k of ['originatingPeriod', 'fundingPeriod']) if (k in data && !parsePeriod(data[k]).ok) return bad;
    const cp = x.bankCheck === null ? null : parseCheckpoint(x.bankCheck);
    if (cp && !cp.ok) return bad;
    const payment = x.action === 'PAID' || x.action === 'PARTIAL_SETTLEMENT';
    let confirmation: Change['paymentConfirmation'] = null;
    if (payment) {
      const c = x.paymentConfirmation;
      if (!exactKeys(c, ['source', 'bankStateAffirmed', 'unchangedBalanceAcknowledged', 'checkpointId'])
        || !['TRACKED_CARD', 'OUTSIDE_TRACKED_CARD'].includes(String(c.source)) || c.bankStateAffirmed !== true
        || typeof c.unchangedBalanceAcknowledged !== 'boolean' || (c.checkpointId !== null && !validUuid(c.checkpointId))) return { ok: false, code: 'PAYMENT_CONFIRMATION_REQUIRED' };
      confirmation = { source: c.source as NonNullable<Change['paymentConfirmation']>['source'], bankStateAffirmed: true,
        unchangedBalanceAcknowledged: c.unchangedBalanceAcknowledged, checkpointId: typeof c.checkpointId === 'string' ? c.checkpointId.toLowerCase() : null };
      if (!x.correctionId && (!cp || c.checkpointId !== null)) return { ok: false, code: 'PAYMENT_CONFIRMATION_REQUIRED' };
      if (x.correctionId && ((!cp && c.checkpointId === null) || (cp && c.checkpointId !== null))) return bad;
      if (cp?.ok && (cp.value.observedDate !== day.value || cp.value.correction !== null)) return bad;
    } else if (cp || x.paymentConfirmation !== null || x.bankDate !== null) return bad;
    let placement: Change['placement'] = null;
    if (x.placement !== null) {
      const p = x.placement;
      if (!exactKeys(p, ['expectedOrderingRevisionId', 'afterPositionId', 'beforePositionId'])) return bad;
      for (const k of Object.keys(p)) if (p[k] !== null && !validUuid(p[k])) return bad;
      placement = { expectedOrderingRevisionId: p.expectedOrderingRevisionId as string | null, afterPositionId: p.afterPositionId as string | null, beforePositionId: p.beforePositionId as string | null };
    }
    keys.add(x.key);
    changes.push({ key: x.key, action: x.action as Change['action'], obligationId: typeof x.obligationId === 'string' ? x.obligationId.toLowerCase() : null,
      expectedStateRevisionId: typeof x.expectedStateRevisionId === 'string' ? x.expectedStateRevisionId.toLowerCase() : null,
      correctionId: typeof x.correctionId === 'string' ? x.correctionId.toLowerCase() : null, previousChangeKey: x.previousChangeKey as string | null,
      effectiveDate: day.value, bankDate: bank?.ok ? bank.value : null, data, placement, bankCheck: cp?.ok ? cp.value : null, paymentConfirmation: confirmation });
  }
  return { ok: true, value: changes };
}
