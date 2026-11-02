import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseInstant } from '@/shared/pure/instant';
import type { Result } from '@/shared/pure/result';
import { parseCheckpoint } from '@/domain/checkpoints/validation';
import { planConfirmation, type ConfirmationIds } from '@/domain/checkpoints/confirmation';
import type { History } from '@/domain/checkpoints/contracts';

export function value<T, E extends string>(r: Result<T, E>): T { if (!r.ok) throw new Error(r.code); return r.value; }
export const date = (s: string) => value(parseBerlinDate(s));
export const instant = (s: string) => value(parseInstant(s));
let sequence = 1;
export function id() { return `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`; }
export function ids(): ConfirmationIds { return { checkpointId: id(), vectorId: id(), positionId: id(), orderingId: id(), oldDayOrderingId: id() }; }
export const emptyHistory = (): History => ({ knowledgeCut: 0n, checkpoints: [], vectors: [], positions: [], orderings: [] });
export const input = (day = '2026-10-05', balance: string | bigint = '50000', overrides: Record<string, unknown> = {}) => ({
  observedDate: day, observedAt: null, balanceCents: balance, allocations: [{ period: '2026-10', amountCents: balance }], correction: null, placement: null, ...overrides,
});
export function appendPlacement(h: History, day: string) {
  const o = [...h.orderings].filter(o => o.historicalDate === day).sort((a, b) => a.recordedSeq < b.recordedSeq ? -1 : 1).at(-1);
  return { expectedOrderingRevisionId: o?.id ?? null, afterPositionId: o?.positionIds.at(-1) ?? null, beforePositionId: null };
}
export function observe(h: History, day: string, balance: string | bigint, overrides: Record<string, unknown> = {}) {
  return value(planConfirmation(h, value(parseCheckpoint(input(day, balance, overrides))), h.knowledgeCut + 1n, ids(), date('2026-11-02'), instant('2026-11-02T12:00:00Z')));
}
