import { addCents, subtractCents, validateCents } from '@/domain/money/money';
import type { CanonicalValue } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import type { Action, SavingErrorCode, SavingEvent, SavingState } from './contracts';

export function validState(s: SavingState): boolean {
  return typeof s.title === 'string' && s.title === s.title.trim() && [...s.title].length >= 1 && [...s.title].length <= 200
    && validateCents(s.amountCents).ok && ((s.status === 'ACTIVE' && s.amountCents > 0n) || (s.status === 'RELEASED' && s.amountCents === 0n));
}
export function snapshot(e: SavingEvent): CanonicalValue {
  return { schemaVersion: 1, revisionId: e.id, savingsId: e.savingsId, originatingPeriodId: e.originatingPeriodId,
    fundingPeriodId: e.fundingPeriodId, title: e.title, amountCents: e.amountCents.toString(), status: e.status };
}
export function businessState(e: SavingState): SavingState {
  return { originatingPeriodId: e.originatingPeriodId, fundingPeriodId: e.fundingPeriodId, title: e.title, amountCents: e.amountCents, status: e.status };
}
export function transition(before: SavingState, action: Exclude<Action, 'CREATE'>, data: Readonly<Record<string, CanonicalValue>>): Result<SavingState, SavingErrorCode | 'MONEY_RANGE'> {
  const bad = { ok: false, code: 'INVALID_SAVING' } as const;
  if (!validState(before)) return bad;
  if (before.status !== 'ACTIVE') return { ok: false, code: 'TERMINAL_SAVING' };
  before = businessState(before);
  if (action === 'AMEND') {
    if (Object.keys(data).length !== 1 || typeof data.title !== 'string' || data.title === before.title) return bad;
    const after = { ...before, title: data.title };
    return validState(after) ? { ok: true, value: after } : bad;
  }
  if (Object.keys(data).length !== 1 || typeof data.amountCents !== 'bigint' || !validateCents(data.amountCents).ok || data.amountCents <= 0n) return bad;
  const amount = data.amountCents;
  if (action !== 'INCREASE' && amount > before.amountCents) return { ok: false, code: 'RELEASE_AMOUNT_EXCEEDS_SAVING' };
  if ((action === 'PARTIAL_RELEASE' && amount >= before.amountCents) || (action === 'FULL_RELEASE' && amount !== before.amountCents)) return bad;
  const result = action === 'INCREASE' ? addCents(before.amountCents, amount) : subtractCents(before.amountCents, amount);
  if (!result.ok) return { ok: false, code: 'MONEY_RANGE' };
  return { ok: true, value: { ...before, amountCents: result.value, status: action === 'FULL_RELEASE' ? 'RELEASED' : 'ACTIVE' } };
}
