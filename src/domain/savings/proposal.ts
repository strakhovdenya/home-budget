import { negateCents, validateCents } from '@/domain/money/money';
import type { SavingEvent } from './contracts';
import { validState } from './lifecycle';
/** Read-only suggestion for one explicitly selected identity, never a financial write. */
export function proposeSavingRelease(saving: SavingEvent, periodId: string, free: bigint, knowledgeCut: bigint, aggregateRevision: bigint) {
  if (!validState(saving) || saving.status !== 'ACTIVE' || saving.fundingPeriodId !== periodId || !validateCents(free).ok) return { ok: false, code: 'INVALID_SAVING' } as const;
  const deficit = free < 0n ? negateCents(free) : { ok: true as const, value: 0n };
  if (!deficit.ok) return { ok: false, code: 'MONEY_RANGE' } as const;
  return { ok: true, value: { savingsId: saving.savingsId, revisionId: saving.id, knowledgeCut, aggregateRevision,
    suggestedRelease: deficit.value < saving.amountCents ? deficit.value : saving.amountCents } } as const;
}
