import { describe, expect, it } from 'vitest';
import { parseCheckpoint } from '@/domain/checkpoints/validation';
import { planConfirmation } from '@/domain/checkpoints/confirmation';
import { correctionTips, indexHistory, selectState, validateHistoricalStates } from '@/domain/checkpoints/history';
import { MAX_CENTS } from '@/domain/money/money';
import { parseInstant, berlinDateOfInstant } from '@/shared/pure/instant';
import { appendPlacement, date, emptyHistory, id, ids, input, instant, observe, value } from './fixtures/checkpoints';

describe('HB10-V complete confirmed cash (BR-01/03/05/11)', () => {
  it.each(['0', '1', '10000', MAX_CENTS.toString()])('accepts exact balance %s including empty zero', balance => {
    const allocations = balance === '0' ? [] : [{ period: '2026-10', amountCents: balance }];
    expect(value(parseCheckpoint(input('2026-10-05', balance, { allocations }))).balanceCents).toBe(BigInt(balance));
  });
  it('keeps future cash distinct; neither infers operations nor requires reserves <= B', () => {
    const v = value(parseCheckpoint(input('2026-10-05', '10000', { allocations: [{ period: '2026-10', amountCents: '6000' }, { period: '2026-12', amountCents: '4000' }] })));
    expect(v.allocations.map(a => a.amountCents)).toEqual([6000n, 4000n]);
  });
  it.each([
    [{ balanceCents: '-1', allocations: [] }, 'OVERDRAFT_POLICY_REQUIRED'],
    [{ balanceCents: (MAX_CENTS + 1n).toString() }, 'MONEY_RANGE'],
    [{ balanceCents: 1 }, 'INVALID_CHECKPOINT'],
    [{ balanceCents: '1.01' }, 'INVALID_CHECKPOINT'],
    [{ allocations: [{ period: '2026-10', amountCents: '49999' }] }, 'ALLOCATION_SUM_MISMATCH'],
    [{ allocations: [{ period: '2026-10', amountCents: '50001' }] }, 'ALLOCATION_SUM_MISMATCH'],
    [{ allocations: [{ period: '2026-10', amountCents: '-1' }, { period: '2026-11', amountCents: '50001' }] }, 'NEGATIVE_CASH_ALLOCATION'],
    [{ balanceCents: MAX_CENTS, allocations: [{ period: '2026-10', amountCents: MAX_CENTS }, { period: '2026-11', amountCents: 1n }] }, 'MONEY_RANGE'],
    [{ allocations: [{ period: '2026-10', amountCents: '25000' }, { period: '2026-10', amountCents: '25000' }] }, 'DUPLICATE_PERIOD'],
    [{ observedDate: '2026-02-29' }, 'INVALID_CHECKPOINT'],
    [{ allocations: [{ period: '0000-01', amountCents: '50000' }] }, 'INVALID_CHECKPOINT'],
    [{ actorId: id() }, 'INVALID_CHECKPOINT'],
  ])('rejects invalid input %#', (override, code) => expect(parseCheckpoint(input('2026-10-05', '50000', override))).toEqual({ ok: false, code }));
  it('copies and freezes nested amounts before callers mutate input', () => {
    const raw = input(), parsed = value(parseCheckpoint(raw));
    raw.allocations[0].amountCents = '1';
    expect(parsed.allocations[0].amountCents).toBe(50000n);
    expect(Object.isFrozen(parsed.allocations[0])).toBe(true);
  });
  it('rejects accessors without invoking them and sparse arrays', () => {
    let calls = 0;
    expect(parseCheckpoint({ ...input(), get balanceCents() { calls++; return '50000'; } }).ok).toBe(false);
    expect(calls).toBe(0);
    expect(parseCheckpoint(input('2026-10-05', '0', { allocations: Array(1) })).ok).toBe(false);
  });
  it.each(['0001-01-01', '0099-12-31', '1600-02-29', '2028-02-29', '9999-12-31'])('valid Gregorian date %s', day => expect(parseCheckpoint(input(day)).ok).toBe(true));
});

describe('HB10-T offset instants and Berlin calendar', () => {
  it.each([
    ['2026-03-29T00:30:00Z', '2026-03-29'], ['2026-03-29T01:30:00Z', '2026-03-29'],
    ['2026-10-25T02:30:00+02:00', '2026-10-25'], ['2026-10-25T02:30:00+01:00', '2026-10-25'],
    ['2026-09-30T22:30:00Z', '2026-10-01'], ['0001-01-01T00:00:00Z', '0001-01-01'],
    ['0099-12-31T23:00:00Z', '0099-12-31'],
  ])('Berlin conversion %s', (at, day) => expect(value(berlinDateOfInstant(instant(at)))).toBe(day));
  it.each(['2026-03-29T02:30:00', '2026-10-25T02:30:00', '2026-10-25 02:30:00Z', '2026-10-25T00:00:60Z',
    '2026-10-25T00:00:00.0000001Z', '0001-01-01T00:00:00+01:00', '9999-12-31T23:59:59-01:00',
    '2026-10-25T00:00:00-00:00', '2026-10-25T00:00:00+14:01', '1900-02-29T00:00:00Z'])('rejects ambiguous/range instant %s', at => expect(parseInstant(at).ok).toBe(false));
  it('retains microseconds and normalizes equivalent offsets exactly', () => {
    const a = instant('2026-10-25T02:30:00.000001+02:00'), b = instant('2026-10-25T00:30:00.000002Z');
    expect(a).toBe('2026-10-25T00:30:00.000001Z'); expect(a < b).toBe(true);
    expect(instant('2026-10-25T01:00:00+01:00')).toBe(instant('2026-10-25T00:00:00Z'));
  });
  it('rejects UTC instant whose Berlin date differs', () => expect(parseCheckpoint(input('2026-09-30', '1', { observedAt: '2026-09-30T22:30:00Z' })).ok).toBe(false));
});

describe('HB10-H chronological authority, ordering and corrections (ADR0002)', () => {
  it('C5/C10 then C7 preserves C10/V10; K=2 still reproduces the original facts', () => {
    const c5 = observe(emptyHistory(), '2026-10-05', '50000'), c10 = observe(c5.history, '2026-10-10', '45000');
    const c7 = observe(c10.history, '2026-10-07', '48000');
    expect(c7.activeVectorId).toBe(c10.vector.id);
    expect(value(selectState(c7.history, date('2026-10-07'))).checkpoint?.id).toBe(c7.checkpoint.id);
    expect(value(selectState({ ...c7.history, knowledgeCut: 2n }, date('2026-10-07'))).checkpoint?.id).toBe(c5.checkpoint.id);
    expect(c7.history.vectors.find(v => v.id === c10.vector.id)).toEqual(c10.vector);
  });
  it('same-B genuine checks are distinct; no unknown end-of-month value is fabricated', () => {
    const a = observe(emptyHistory(), '2026-10-05', '50000'), b = observe(a.history, '2026-10-06', '50000');
    expect(b.checkpoint.logicalFactId).not.toBe(a.checkpoint.logicalFactId);
    expect(value(selectState(b.history, date('2026-10-31'))).endBalanceCents).toBeNull();
    expect(value(selectState(b.history, date('2026-10-04'))).status).toBe('NO_OBSERVATION');
  });
  it('unknown same-day position rejects; explicit placement retains null time', () => {
    const a = observe(emptyHistory(), '2026-10-05', '1');
    expect(() => observe(a.history, '2026-10-05', '2')).toThrow('ORDERING_CONFLICT');
    const b = observe(a.history, '2026-10-05', '2', { placement: appendPlacement(a.history, '2026-10-05') });
    expect(b.checkpoint.observedAt).toBeNull(); expect(b.activeVectorId).toBe(b.vector.id);
  });
  it('known microsecond order rejects reversed placement and accepts between neighbors', () => {
    const a = observe(emptyHistory(), '2026-10-10', '1', { observedAt: '2026-10-10T08:00:00.000001Z' });
    const b = observe(a.history, '2026-10-10', '2', { observedAt: '2026-10-10T08:00:00.000003Z', placement: appendPlacement(a.history, '2026-10-10') });
    const middle = { expectedOrderingRevisionId: b.orders[0].id, afterPositionId: a.checkpoint.positionId, beforePositionId: b.checkpoint.positionId };
    const c = observe(b.history, '2026-10-10', '3', { observedAt: '2026-10-10T08:00:00.000002Z', placement: middle });
    expect(c.activeVectorId).toBe(b.vector.id);
    expect(() => observe(b.history, '2026-10-10', '3', { observedAt: '2026-10-10T08:00:00.000002Z', placement: appendPlacement(b.history, '2026-10-10') })).toThrow('ORDERING_CONFLICT');
  });
  it('amount correction retains logical identity and position; old K still shows old amount', () => {
    const a = observe(emptyHistory(), '2026-10-05', '50000');
    const b = observe(a.history, '2026-10-05', '51000', { correction: { checkpointId: a.checkpoint.id, allocationRevisionId: a.vector.id, reposition: false } });
    expect(b.checkpoint.logicalFactId).toBe(a.checkpoint.logicalFactId); expect(b.checkpoint.positionId).toBe(a.checkpoint.positionId);
    expect(b.history.positions).toHaveLength(1); expect(b.orders).toHaveLength(0); expect(b.vector.supersedesId).toBe(a.vector.id);
    expect(value(selectState({ ...b.history, knowledgeCut: 1n }, date('2026-10-05'))).checkpoint?.balanceCents).toBe(50000n);
    expect(() => observe(b.history, '2026-10-05', '52000', { correction: { checkpointId: a.checkpoint.id, allocationRevisionId: a.vector.id, reposition: false } })).toThrow('CORRECTION_CONFLICT');
  });
  it('date correction resolves before H; new manifests preserve old versions and never resurrect old date', () => {
    const a = observe(emptyHistory(), '2026-10-05', '50000'), b = observe(a.history, '2026-10-10', '45000');
    const c = observe(b.history, '2026-10-11', '51000', { correction: { checkpointId: a.checkpoint.id, allocationRevisionId: a.vector.id, reposition: true } });
    expect(c.orders).toHaveLength(2); expect(c.checkpoint.positionId).not.toBe(a.checkpoint.positionId);
    expect(value(selectState(c.history, date('2026-10-07'))).status).toBe('NO_OBSERVATION');
    expect(value(selectState({ ...c.history, knowledgeCut: 2n }, date('2026-10-07'))).checkpoint?.id).toBe(a.checkpoint.id);
    expect(c.history.orderings.find(o => o.id === a.orders[0].id)).toEqual(a.orders[0]);
  });
  it('old-anchor redistribution exposed by C7 is a historical conflict even when today is coherent', () => {
    const a = observe(emptyHistory(), '2026-10-05', '50000');
    const pid = id(), vid = id(), oid = id();
    const h = { ...a.history, knowledgeCut: 2n, positions: [...a.history.positions, { id: pid, historicalDate: date('2026-10-08'), recordedSeq: 2n }],
      orderings: [...a.history.orderings, { id: oid, historicalDate: date('2026-10-08'), recordedSeq: 2n, previousRevisionId: null, positionIds: [pid], edges: [] }],
      vectors: [...a.history.vectors, { ...a.vector, id: vid, logicalFactId: vid, positionId: pid, effectiveDate: date('2026-10-08'), recordedSeq: 2n, previousRevisionId: a.vector.id }] };
    const b = observe(h, '2026-10-10', '45000');
    expect(() => observe(b.history, '2026-10-07', '48000')).toThrow('HISTORICAL_STATE_CONFLICT');
  });
  it('rejects changed coordinates without reposition consent, and future observations', () => {
    const a = observe(emptyHistory(), '2026-10-05', '1');
    expect(() => observe(a.history, '2026-10-06', '2', { correction: { checkpointId: a.checkpoint.id, allocationRevisionId: a.vector.id, reposition: false } })).toThrow('CORRECTION_CONFLICT');
    expect(() => observe(emptyHistory(), '2026-11-03', '1')).toThrow('INVALID_CHECKPOINT');
    expect(() => observe(emptyHistory(), '2026-11-02', '1', { observedAt: '2026-11-02T13:00:00Z' })).toThrow('INVALID_CHECKPOINT');
  });
  it('manifest duplicate/missing members, cycle dependencies and correction forks fail closed', () => {
    const a = observe(emptyHistory(), '2026-10-05', '1'), o = a.orders[0];
    for (const positionIds of [[], [a.checkpoint.positionId, a.checkpoint.positionId], [id()]]) expect(indexHistory({ ...a.history, orderings: [{ ...o, positionIds }] }).ok).toBe(false);
    expect(indexHistory({ ...a.history, orderings: [{ ...o, edges: [{ before: a.checkpoint.positionId, after: a.checkpoint.positionId }] }] }).ok).toBe(false);
    const c = { ...a.checkpoint, supersedesId: a.checkpoint.id, recordedSeq: 2n };
    expect(correctionTips([a.checkpoint, { ...c, id: id() }, { ...c, id: id() }], 2n).ok).toBe(false);
    expect(validateHistoricalStates({ ...a.history, vectors: [] }).ok).toBe(false);
    expect(selectState(a.history, date('2026-10-05'), id())).toEqual({ ok: false, code: 'ORDERING_CONFLICT' });
    expect(indexHistory({ ...a.history, orderings: [...a.history.orderings, { ...o, id: id(), historicalDate: date('2026-10-06'), positionIds: [id()] }] }).ok).toBe(false);
  });
  it('late amount correction keeps C10 active; stale ordering revision rejects', () => {
    const a = observe(emptyHistory(), '2026-10-05', '50000'), b = observe(a.history, '2026-10-10', '45000');
    const c = observe(b.history, '2026-10-05', '51000', { correction: { checkpointId: a.checkpoint.id, allocationRevisionId: a.vector.id, reposition: false } });
    expect(c.activeVectorId).toBe(b.vector.id);
    const result = planConfirmation(c.history, value(parseCheckpoint(input('2026-10-10', '1', { placement: { expectedOrderingRevisionId: id(), afterPositionId: b.checkpoint.positionId, beforePositionId: null } }))), 4n, ids(), date('2026-11-02'), instant('2026-11-02T00:00:00Z'));
    expect(result).toEqual({ ok: false, code: 'ORDERING_CONFLICT' });
  });
  it('selection and provenance are invariant under database row return order', () => {
    const a = observe(emptyHistory(), '2026-10-10', '45000'), b = observe(a.history, '2026-10-05', '50000'), c = observe(b.history, '2026-10-07', '48000');
    const expected = value(selectState(c.history, date('2026-10-31')));
    const reversed = { ...c.history, checkpoints: [...c.history.checkpoints].reverse(), vectors: [...c.history.vectors].reverse(), positions: [...c.history.positions].reverse(), orderings: [...c.history.orderings].reverse() };
    expect(value(selectState(reversed, date('2026-10-31')))).toEqual(expected);
  });
  it('different independent facts cannot share an ambiguous observation/effective position', () => {
    const a = observe(emptyHistory(), '2026-10-05', '1');
    expect(indexHistory({ ...a.history, checkpoints: [...a.history.checkpoints, { ...a.checkpoint, id: id(), logicalFactId: id() }] }).ok).toBe(false);
    expect(indexHistory({ ...a.history, vectors: [...a.history.vectors, { ...a.vector, id: id(), logicalFactId: id() }] }).ok).toBe(false);
  });
  it('reposition cannot silently carry another stream position dependency', () => {
    const a = observe(emptyHistory(), '2026-10-05', '50000'), b = observe(a.history, '2026-10-10', '45000');
    const h = { ...b.history, orderings: b.history.orderings.map(o => o.id === b.orders[0].id ? { ...o, edges: [{ before: a.checkpoint.positionId, after: b.checkpoint.positionId }] } : o) };
    expect(() => observe(h, '2026-10-11', '51000', { correction: { checkpointId: a.checkpoint.id, allocationRevisionId: a.vector.id, reposition: true } })).toThrow('HISTORICAL_STATE_CONFLICT');
  });
  it('deterministic backdated permutations preserve each H cut and all exact bank/vector sums', () => {
    for (const days of [[5, 7, 10], [10, 5, 7], [7, 10, 5], [10, 7, 5], [7, 5, 10], [5, 10, 7]]) {
      let h = emptyHistory();
      for (const d of days) h = observe(h, `2026-10-${String(d).padStart(2, '0')}`, String(55000 - d * 1000)).history;
      for (const day of [5, 7, 10, 31]) {
        const s = value(selectState(h, date(`2026-10-${String(day).padStart(2, '0')}`)));
        expect(s.checkpoint?.observedDate).toBe(`2026-10-${String(Math.min(day, 10)).padStart(2, '0')}`);
        expect(s.vector?.allocations.reduce((sum, a) => sum + a.amountCents, 0n)).toBe(s.checkpoint?.balanceCents);
      }
    }
  });
});
