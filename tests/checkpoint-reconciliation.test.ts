import { expect, it } from 'vitest';
import { reconcileInterval, type OperationEvidence, type ConfirmedOperation } from '@/domain/checkpoints/reconciliation';
import { MAX_CENTS } from '@/domain/money/money';
import { emptyHistory, id, observe, value } from './fixtures/checkpoints';

function interval(b0 = '50000', b1 = '45000') {
  const a = observe(emptyHistory(), '2026-10-05', b0), b = observe(a.history, '2026-10-10', b1), account = id();
  const evidence = (operations: readonly ConfirmedOperation[] = []): Extract<OperationEvidence, { status: 'CONFIRMED_SET' }> => ({ status: 'CONFIRMED_SET', accountId: account,
    fromCheckpointId: a.checkpoint.id, toCheckpointId: b.checkpoint.id, knowledgeCut: 2n,
    currentRevisions: operations.map(o => ({ operationId: o.operationId, revisionId: o.revisionId })), operations });
  const operation = (amountCents: bigint): ConfirmedOperation => ({ accountId: account, fromCheckpointId: a.checkpoint.id, toCheckpointId: b.checkpoint.id, operationId: id(), revisionId: id(), amountCents });
  return { a: a.checkpoint, b: b.checkpoint, account, evidence, operation };
}
it('HB10-R01 unavailable operations means unavailable K/U, not confirmed zero', () => {
  const f = interval();
  expect(value(reconcileInterval(f.account, 2n, f.a, f.b, { status: 'NOT_AVAILABLE' }))).toEqual({ deltaCents: -5000n, knownCents: null, unexplainedCents: null, evidenceStatus: 'NOT_AVAILABLE', grossCompleteness: 'NOT_ASSERTED' });
});
it('HB10-R02 explicit empty set is distinct from unavailable source', () => {
  const f = interval();
  expect(value(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence()))).toMatchObject({ knownCents: 0n, unexplainedCents: -5000n, grossCompleteness: 'NOT_ASSERTED' });
});
it('HB10-R03 F-011 explains net +110000 without touching bank/vector or proving gross completeness', () => {
  const f = interval('40000', '150000'), before = { ...f.b };
  const r = value(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([f.operation(120000n), f.operation(-10000n)])));
  expect(r).toMatchObject({ deltaCents: 110000n, knownCents: 110000n, unexplainedCents: 0n, grossCompleteness: 'NOT_ASSERTED' });
  expect(f.b).toEqual(before);
});
it('HB10-R04 duplicate identity/revision counts once, conflicting revision proof rejects', () => {
  const f = interval(), op = f.operation(-3000n);
  expect(value(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([op, op])))).toMatchObject({ knownCents: -3000n, unexplainedCents: -2000n });
  expect(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([op, { ...op, revisionId: id() }]))).toEqual({ ok: false, code: 'EVIDENCE_CONFLICT' });
  const lower = { ...op, operationId: 'aaaaaaaa-0000-4000-8000-000000000001', revisionId: 'bbbbbbbb-0000-4000-8000-000000000002' };
  const upper = { ...lower, operationId: lower.operationId.toUpperCase(), revisionId: lower.revisionId.toUpperCase() };
  expect(value(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([lower, upper])))).toMatchObject({ knownCents: -3000n, unexplainedCents: -2000n });
});
it('HB10-R05 explicit authoritative current revision selects one revision, never sums both', () => {
  const f = interval(), op = f.operation(-3000n), current = { ...op, revisionId: id(), amountCents: -3500n };
  const evidence = { ...f.evidence([op, current]), currentRevisions: [{ operationId: op.operationId, revisionId: current.revisionId }] };
  expect(value(reconcileInterval(f.account, 2n, f.a, f.b, evidence))).toMatchObject({ knownCents: -3500n, unexplainedCents: -1500n });
});
it.each(['accountId', 'fromCheckpointId', 'toCheckpointId'] as const)('HB10-R06 rejects foreign/ambiguous interval %s', key => {
  const f = interval(), op = { ...f.operation(-3000n), [key]: id() };
  expect(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([op]))).toEqual({ ok: false, code: 'EVIDENCE_CONFLICT' });
});
it('HB10-R07 rejects missing current proof, stale K and different amount for identical revision', () => {
  const f = interval(), op = f.operation(-3000n), e = f.evidence([op]);
  expect(reconcileInterval(f.account, 3n, f.a, f.b, e).ok).toBe(false);
  expect(reconcileInterval(f.account, 2n, f.a, f.b, { ...e, currentRevisions: [] }).ok).toBe(false);
  expect(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([op, { ...op, amountCents: -3001n }])).ok).toBe(false);
  expect(reconcileInterval(f.account, 1n, f.a, f.b, { status: 'NOT_AVAILABLE' }).ok).toBe(false);
});
it('HB10-R08 F-018 explicit interval split preserves D/K/U without inferred operation assignment', () => {
  for (const [from, to, known, unexplained] of [['50000', '48000', -1500n, -500n], ['48000', '45000', -1000n, -2000n]] as const) {
    const f = interval(from, to), r = value(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([f.operation(known)])));
    expect(r).toMatchObject({ knownCents: known, unexplainedCents: unexplained });
    expect(r.evidenceStatus === 'CONFIRMED_SET' && r.knownCents + r.unexplainedCents).toBe(r.deltaCents);
  }
});
it('HB10-R09 checks signed int64 operands, intermediate K and U overflow', () => {
  const f = interval('0', MAX_CENTS.toString());
  expect(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([f.operation(-1n)]))).toEqual({ ok: false, code: 'MONEY_RANGE' });
  expect(reconcileInterval(f.account, 2n, f.a, f.b, f.evidence([f.operation(MAX_CENTS), f.operation(1n), f.operation(-1n)]))).toEqual({ ok: false, code: 'MONEY_RANGE' });
  expect(reconcileInterval(f.account, 2n, { ...f.a, balanceCents: MAX_CENTS + 1n }, f.b, { status: 'NOT_AVAILABLE' })).toEqual({ ok: false, code: 'MONEY_RANGE' });
});
