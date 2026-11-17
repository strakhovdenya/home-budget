import { describe, expect, it } from 'vitest';
import { correctionTips, indexHistory, selectState } from '@/domain/checkpoints/history';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import { parseCheckpoint } from '@/domain/checkpoints/validation';
import { reconcileInterval } from '@/domain/checkpoints/reconciliation';
import { assembleSnapshot } from '@/domain/forecast/assembly';
import { projectAccount, projectPeriod } from '@/domain/forecast/budget';
import { checkProjectionBudget } from '@/infrastructure/db/projection-reader';
import { appendPlacement, date, emptyHistory, id, ids, input, instant, observe, value } from './fixtures/checkpoints';

describe('HB22-P1 existing reader feasibility', () => {
  it('HB22-02/09 resolves a correction beyond H before the observation range', () => {
    const original = observe(emptyHistory(), '2026-10-20', '80000');
    const corrected = value(planConfirmation(original.history, value(parseCheckpoint(input('2026-11-01', '76000', {
      allocations: [{ period: '2026-10', amountCents: '76000' }],
      correction: { checkpointId: original.checkpoint.id, allocationRevisionId: original.vector.id, reposition: true },
    }))), 2n, ids(), date('2026-11-02'), instant('2026-11-02T12:00:00Z')));

    const earlier = value(selectState({ ...corrected.history, knowledgeCut: 1n }, date('2026-10-31')));
    const later = value(selectState(corrected.history, date('2026-10-31')));

    expect(earlier).toMatchObject({ status: 'OBSERVED', checkpoint: { balanceCents: 80000n } });
    expect(later).toMatchObject({ status: 'NO_OBSERVATION', endBalanceCents: null });
    expect(value(correctionTips(corrected.history.checkpoints, 2n)).map(check => check.id)).toEqual([corrected.checkpoint.id]);
  });

  it('HB22-11 distinguishes unknown from an observed zero without inventing a bank fact', () => {
    const scope = { ownerUserId: id(), accountId: id() };
    const empty = emptyHistory();
    const unknown = assembleSnapshot({
      scope, asOfDate: date('2026-10-31'), capturedSeq: 0n, capturedAggregateRevision: 0n,
      activeAllocationRevisionId: null, obligationHistory: { ...empty, events: [] },
      savingHistory: { ...empty, savings: [] }, obligationIdentities: [], savingIdentities: [], periods: [],
    });
    expect(projectAccount(unknown, '2026-10-31')).toMatchObject({ ok: true, value: { kind: 'UNAVAILABLE', reason: 'NO_OBSERVATION' } });

    const confirmed = observe(empty, '2026-10-20', '0');
    const zero = assembleSnapshot({
      scope, asOfDate: date('2026-10-31'), capturedSeq: 1n, capturedAggregateRevision: 1n,
      activeAllocationRevisionId: confirmed.vector.id, obligationHistory: { ...confirmed.history, events: [] },
      savingHistory: { ...confirmed.history, savings: [] }, obligationIdentities: [], savingIdentities: [], periods: [],
    });
    expect(projectAccount(zero, '2026-10-31')).toMatchObject({ ok: true, value: { kind: 'ACCOUNT_ESTIMATE', bank: { balance: 0n } } });
    expect(projectPeriod(zero, '2026-09-30', '2026-09').ok).toBe(false);
    expect(projectPeriod(zero, '2026-10-31', '2026-09')).toMatchObject({ ok: true, value: { budget: { allocated: 0n, reserved: 0n, savings: 0n, free: 0n } } });
  });

  it('HB22-07/09 permits a checked nonadjacent comparison and retains same-day order', () => {
    const first = observe(emptyHistory(), '2026-10-05', '80000');
    const middle = observe(first.history, '2026-10-10', '79000');
    const last = observe(middle.history, '2026-10-20', '77000');
    const order = value(indexHistory(last.history));
    expect(order.compare(first.checkpoint.positionId, last.checkpoint.positionId)).toBeLessThan(0);
    expect(reconcileInterval(id(), 3n, first.checkpoint, last.checkpoint, { status: 'NOT_AVAILABLE' })).toEqual({
      ok: true, value: { deltaCents: -3000n, grossCompleteness: 'NOT_ASSERTED', evidenceStatus: 'NOT_AVAILABLE', knownCents: null, unexplainedCents: null },
    });
    const sameDay = observe(last.history, '2026-10-20', '77000', { placement: appendPlacement(last.history, '2026-10-20') });
    expect(value(indexHistory(sameDay.history)).compare(last.checkpoint.positionId, sameDay.checkpoint.positionId)).toBeLessThan(0);
    expect(value(correctionTips(sameDay.history.checkpoints, 4n)).filter(check => check.observedDate === '2026-10-20')).toHaveLength(2);
    expect(sameDay.checkpoint.observedAt).toBeNull();
  });

  it('HB22-05 preserves exact existing source admission boundaries', () => {
    expect(() => checkProjectionBudget(20000n, 8388608n, 2000n, 1200n)).not.toThrow();
    for (const [rows, bytes, workRows, periods] of [
      [20001n, 0n, 0n, 0n], [0n, 8388609n, 0n, 0n],
      [0n, 0n, 2001n, 0n], [0n, 0n, 0n, 1201n],
    ] as const) {
      expect(() => checkProjectionBudget(rows, bytes, workRows, periods)).toThrow('PROJECTION_LIMIT_EXCEEDED');
    }
  });
});
