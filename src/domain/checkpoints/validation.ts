import { normalizeValue } from '@/domain/updates/canonical-value';
import { validUuid } from '@/domain/updates/validation';
import { parseCentsString } from '@/domain/money/money-codec';
import { sumCents, validateCents } from '@/domain/money/money';
import { parsePeriod } from '@/domain/periods/period';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { berlinDateOfInstant, parseInstant } from '@/shared/pure/instant';
import type { Result } from '@/shared/pure/result';
import type { Allocation, CheckpointInput, CheckpointErrorCode, Placement } from './contracts';

export function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
export function parseCheckpoint(input: unknown): Result<CheckpointInput, CheckpointErrorCode> {
  const bad = { ok: false, code: 'INVALID_CHECKPOINT' } as const;
  let v: unknown;
  try { v = normalizeValue(input); } catch { return bad; }
  if (!exactKeys(v, ['observedDate', 'observedAt', 'balanceCents', 'allocations', 'correction', 'placement'])) return bad;
  const date = parseBerlinDate(v.observedDate);
  const at = v.observedAt === null ? null : parseInstant(v.observedAt);
  const balance = typeof v.balanceCents === 'string' ? parseCentsString(v.balanceCents) : validateCents(v.balanceCents);
  if (!date.ok || (at && !at.ok)) return bad;
  if (!balance.ok) return { ok: false, code: balance.code === 'MONEY_RANGE' ? 'MONEY_RANGE' : 'INVALID_CHECKPOINT' };
  if (balance.value < 0n) return { ok: false, code: 'OVERDRAFT_POLICY_REQUIRED' };
  if (at?.ok) {
    const berlin = berlinDateOfInstant(at.value);
    if (!berlin.ok || berlin.value !== date.value) return bad;
  }
  if (!Array.isArray(v.allocations)) return bad;
  const allocations: Allocation[] = [], seen = new Set<string>();
  for (const row of v.allocations) {
    if (!exactKeys(row, ['period', 'amountCents'])) return bad;
    const period = parsePeriod(row.period);
    const amount = typeof row.amountCents === 'string' ? parseCentsString(row.amountCents) : validateCents(row.amountCents);
    if (!period.ok) return bad;
    if (!amount.ok) return { ok: false, code: amount.code === 'MONEY_RANGE' ? 'MONEY_RANGE' : 'INVALID_CHECKPOINT' };
    if (amount.value < 0n) return { ok: false, code: 'NEGATIVE_CASH_ALLOCATION' };
    if (seen.has(period.value)) return { ok: false, code: 'DUPLICATE_PERIOD' };
    seen.add(period.value); allocations.push(Object.freeze({ period: period.value, amountCents: amount.value }));
  }
  const sum = sumCents(allocations.map(a => a.amountCents));
  if (!sum.ok) return { ok: false, code: 'MONEY_RANGE' };
  if (sum.value !== balance.value) return { ok: false, code: 'ALLOCATION_SUM_MISMATCH' };
  let correction: CheckpointInput['correction'] = null;
  if (v.correction !== null) {
    if (!exactKeys(v.correction, ['checkpointId', 'allocationRevisionId', 'reposition']) || !validUuid(v.correction.checkpointId)
      || !validUuid(v.correction.allocationRevisionId) || typeof v.correction.reposition !== 'boolean') return bad;
    correction = Object.freeze({ checkpointId: v.correction.checkpointId.toLowerCase(), allocationRevisionId: v.correction.allocationRevisionId.toLowerCase(), reposition: v.correction.reposition });
  }
  let placement: Placement | null = null;
  if (v.placement !== null) {
    if (!exactKeys(v.placement, ['expectedOrderingRevisionId', 'afterPositionId', 'beforePositionId'])) return bad;
    const p = v.placement;
    for (const key of ['expectedOrderingRevisionId', 'afterPositionId', 'beforePositionId']) if (p[key] !== null && !validUuid(p[key])) return bad;
    placement = Object.freeze({ expectedOrderingRevisionId: typeof p.expectedOrderingRevisionId === 'string' ? p.expectedOrderingRevisionId.toLowerCase() : null,
      afterPositionId: typeof p.afterPositionId === 'string' ? p.afterPositionId.toLowerCase() : null,
      beforePositionId: typeof p.beforePositionId === 'string' ? p.beforePositionId.toLowerCase() : null });
  }
  return { ok: true, value: Object.freeze({ observedDate: date.value, observedAt: at?.ok ? at.value : null, balanceCents: balance.value,
    allocations: Object.freeze(allocations.sort((a, b) => a.period.localeCompare(b.period))), correction, placement }) };
}
