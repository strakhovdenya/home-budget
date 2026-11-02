import { validateCents, subtractCents } from '@/domain/money/money';
import type { Result } from '@/shared/pure/result';
import type { CanonicalValue } from '@/domain/updates/contracts';
import { parseBerlinDate } from '@/shared/pure/calendar';
import type { Action, ObligationState, ObligationEvent, ObligationErrorCode } from './contracts';

export function validState(s: ObligationState): boolean {
  return typeof s.title === 'string' && s.title === s.title.trim() && [...s.title].length > 0 && [...s.title].length <= 200
    && (s.dueDate === null || parseBerlinDate(s.dueDate).ok)
    && validateCents(s.originalCents).ok && validateCents(s.outstandingCents).ok && s.originalCents > 0n
    && s.outstandingCents >= 0n && s.outstandingCents <= s.originalCents
    && typeof s.isPossible === 'boolean' && typeof s.reserveFull === 'boolean'
    && ((s.status === 'UNPAID' && s.outstandingCents > 0n && (s.isPossible || s.reserveFull))
      || (s.status === 'PAID' && s.outstandingCents === 0n && !s.reserveFull)
      || (s.status === 'CANCELLED' && !s.reserveFull));
}
/** Canonical full business state; exact revision pins all temporal provenance. */
export function snapshot(e: ObligationEvent): CanonicalValue {
  return { schemaVersion: 1, revisionId: e.id, obligationId: e.obligationId, originatingPeriodId: e.originatingPeriodId,
    fundingPeriodId: e.fundingPeriodId, title: e.title, dueDate: e.dueDate, originalCents: e.originalCents.toString(),
    outstandingCents: e.outstandingCents.toString(), status: e.status, isPossible: e.isPossible, reserveFull: e.reserveFull };
}
export function transition(before: ObligationState, action: Exclude<Action, 'CREATE'>, data: Readonly<Record<string, CanonicalValue>>): Result<ObligationState, ObligationErrorCode> {
  const bad = { ok: false, code: 'INVALID_OBLIGATION' } as const;
  if (!validState(before)) return bad;
  if (before.status !== 'UNPAID') return { ok: false, code: 'TERMINAL_OBLIGATION' };
  before = { originatingPeriodId: before.originatingPeriodId, fundingPeriodId: before.fundingPeriodId, title: before.title,
    dueDate: before.dueDate, originalCents: before.originalCents, outstandingCents: before.outstandingCents,
    status: before.status, isPossible: before.isPossible, reserveFull: before.reserveFull };
  let after: ObligationState;
  if (action === 'FUNDING_TRANSFER') {
    if(Object.keys(data).length!==1||typeof data.fundingPeriodId!=='string'||data.fundingPeriodId===before.fundingPeriodId)return bad;
    after={...before,fundingPeriodId:data.fundingPeriodId};
  } else if (action === 'AMEND') {
    const allowed = ['title', 'dueDate', 'originalCents', 'isPossible', 'reserveFull'];
    if (!Object.keys(data).length || Object.keys(data).some(k => !allowed.includes(k))) return bad;
    const original = data.originalCents ?? before.originalCents;
    if (typeof original !== 'bigint' || !validateCents(original).ok) return bad;
    const settled = subtractCents(before.originalCents, before.outstandingCents);
    if (!settled.ok) return bad;
    const outstanding = subtractCents(original, settled.value);
    if (!outstanding.ok) return bad;
    after = { ...before, ...data, originalCents: original, outstandingCents: outstanding.value } as ObligationState;
    if (data.isPossible !== undefined && data.isPossible !== before.isPossible && typeof data.reserveFull !== 'boolean') return bad;
  } else if (action === 'CANCELLED') {
    if (Object.keys(data).length) return bad;
    after = { ...before, status: 'CANCELLED', reserveFull: false };
  } else {
    if (Object.keys(data).length !== 1 || typeof data.amountCents !== 'bigint' || !validateCents(data.amountCents).ok) return bad;
    const amount = data.amountCents;
    if (amount <= 0n || (action === 'PAID' ? amount !== before.outstandingCents : amount >= before.outstandingCents)) return bad;
    after = { ...before, outstandingCents: before.outstandingCents - amount,
      status: action === 'PAID' ? 'PAID' : 'UNPAID', reserveFull: action === 'PAID' ? false : before.reserveFull };
  }
  return validState(after) ? { ok: true, value: Object.freeze(after) } : bad;
}
