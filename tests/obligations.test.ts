import { expect, it } from 'vitest';
import { transition, snapshot } from '@/domain/obligations/lifecycle';
import { calculatePeriodReserves, validateLifecycleHistory, selectObligationState } from '@/domain/obligations/history';
import { parseObligationBatch } from '@/domain/obligations/validation';
import { date, id, emptyHistory, value } from './fixtures/checkpoints';
import type { ObligationEvent } from '@/domain/obligations/contracts';
import { MAX_CENTS } from '@/domain/money/money';
import { createObligationStateReader } from '@/features/obligations/read-obligations';

const state = () => ({ title: 'Synthetic rent', dueDate: null, originalCents: 20000n, outstandingCents: 20000n,
  status: 'UNPAID' as const, isPossible: false, reserveFull: true, fundingPeriodId: id(), originatingPeriodId: id() });
it('HB11-01/06/07 ordinary full reserve, partial and paid without bank arithmetic', () => {
  const s = state();
  const p = value(transition(s, 'PARTIAL_SETTLEMENT', { amountCents: 5000n }));
  expect(p.outstandingCents).toBe(15000n); expect(p.reserveFull).toBe(true);
  expect(value(transition(p, 'PAID', { amountCents: 15000n })).outstandingCents).toBe(0n);
  expect(transition(p, 'PAID', { amountCents: 20000n })).toEqual({ ok: false, code: 'INVALID_OBLIGATION' });
});
it('HB11-08/10 cancellation preserves unpaid amount and is terminal', () => {
  const c = value(transition(state(), 'CANCELLED', {}));
  expect(c.outstandingCents).toBe(20000n); expect(c.reserveFull).toBe(false);
  expect(transition(c, 'AMEND', { title: 'Other' })).toEqual({ ok: false, code: 'TERMINAL_OBLIGATION' });
});
it('HB11-11/M2/M3 amend retains settlements and immutable metadata', () => {
  const s = { ...state(), outstandingCents: 15000n };
  const a = value(transition(s, 'AMEND', { originalCents: 25000n, title: 'Updated', dueDate: date('2026-11-05') }));
  expect(a.outstandingCents).toBe(20000n); expect(s.title).toBe('Synthetic rent');
  expect(value(transition(a, 'AMEND', { dueDate: null })).dueDate).toBe(null);
  expect(transition(s, 'AMEND', { originalCents: 5000n }).ok).toBe(false);
});
it('HB11-02..05 possible reservation is explicit all or none', () => {
  const s = { ...state(), isPossible: true, reserveFull: false };
  expect(value(transition(s, 'AMEND', { reserveFull: true })).reserveFull).toBe(true);
  expect(transition(s, 'AMEND', { isPossible: false, reserveFull: false }).ok).toBe(false);
});
it('HB11-20a/22a history rejects changed meaning of a later confirmed payment', () => {
  let h = emptyHistory(); const s = state(), obligationId = id();
  const make = (seq: bigint, day: string, action: ObligationEvent['action'], amount: bigint | null, outstanding: bigint): ObligationEvent => {
    const positionId = id(); h = { ...h, positions: [...h.positions, { id: positionId, historicalDate: date(day), recordedSeq: seq }] };
    h = { ...h, orderings: [...h.orderings, { id: id(), historicalDate: date(day), previousRevisionId: null, positionIds: [positionId], edges: [], recordedSeq: seq }] };
    return { ...s, id: id(), obligationId, logicalFactId: id(), supersedesId: null, previousRevisionId: null, beforeState: null,
      positionId, effectiveDate: date(day), bankDate: null, confirmedAt: '2026-10-12T12:00:00.000000Z', recordedSeq: seq,
      action, outstandingCents: outstanding, status: action === 'PAID' ? 'PAID' : 'UNPAID', reserveFull: action !== 'PAID', payment: amount === null ? null : {
        amountCents: amount, source: 'TRACKED_CARD', bankStateAffirmed: true, unchangedBalanceAcknowledged: false, checkpointId: id(), beforeRevisionId: null, afterRevisionId: null } };
  };
  const create = make(1n, '2026-10-02', 'CREATE', null, 20000n);
  const paid = make(2n, '2026-10-10', 'PAID', 20000n, 0n);
  const partial = make(3n, '2026-10-05', 'PARTIAL_SETTLEMENT', 5000n, 15000n);
  paid.previousRevisionId = create.id; paid.beforeState = snapshot(create);
  paid.payment = { ...paid.payment!, beforeRevisionId: create.id, afterRevisionId: paid.id };
  partial.payment = { ...partial.payment!, beforeRevisionId: create.id, afterRevisionId: partial.id };
  h = { ...h, checkpoints: [paid, partial].map(e => ({ id: e.payment!.checkpointId, logicalFactId: e.payment!.checkpointId, supersedesId: null, positionId: e.positionId, observedDate: e.effectiveDate, observedAt: null, balanceCents: 30000n, recordedSeq: e.recordedSeq })) };
  partial.previousRevisionId = create.id; partial.beforeState = snapshot(create);
  const history = { ...h, knowledgeCut: 3n, events: [create, paid, partial] };
  expect(validateLifecycleHistory(history)).toEqual({ ok: false, code: 'HISTORICAL_PAYMENT_CONFLICT' });
  expect(value(selectObligationState({ ...history, knowledgeCut: 2n }, date('2026-10-10'))).states[0].status).toBe('PAID');
});
it('HB11-M4 rejects unknown fields and blank titles', () => {
  expect(parseObligationBatch({ changes: [] }).ok).toBe(false);
});
const raw = (data: Record<string, unknown> = {}) => ({ changes: [{ key: 'a', action: 'CREATE', obligationId: null,
  expectedStateRevisionId: null, correctionId: null, previousChangeKey: null, effectiveDate: '2026-10-02', bankDate: null,
  placement: null, bankCheck: null, paymentConfirmation: null, data: { title: 'Rent', dueDate: null, originalCents: '20000',
    isPossible: false, reserveFull: true, originatingPeriod: '2026-10', fundingPeriod: '2026-11', ...data } }] });
it.each([{title:''},{title:' '},{title:'😀'.repeat(201)},{originalCents:20000},{originalCents:'1.5'},{originalCents:'9223372036854775808'},
  {dueDate:'2026-02-30'},{reservedAmount:'5000'},{reserveFull:1}])('HB11-M4 strict DTO negative %j', data => {
  expect(parseObligationBatch(raw(data)).ok).toBe(false);
});
it('HB11-M1 title uses Unicode code points; due and funding are independent', () => {
  const parsed=value(parseObligationBatch(raw({title:'  '+'😀'.repeat(200)+'  ',dueDate:'2027-01-05'})));
  expect([...String(parsed[0].data.title)]).toHaveLength(200); expect(parsed[0].data.dueDate).toBe('2027-01-05');
  expect(parsed[0].data.fundingPeriod).toBe('2026-11');
});
it('HB11-13/14/32/33 reserve identity uniqueness and checked arithmetic', () => {
  const e={...state(),obligationId:id()} as ObligationEvent;
  expect([...value(calculatePeriodReserves([e])).values()]).toEqual([20000n]);
  expect(calculatePeriodReserves([e,e])).toEqual({ok:false,code:'INVALID_OBLIGATION'});
  const max={...e,originalCents:MAX_CENTS,outstandingCents:MAX_CENTS};
  expect([...value(calculatePeriodReserves([max])).values()]).toEqual([MAX_CENTS]);
  expect(calculatePeriodReserves([max,{...e,obligationId:id(),originalCents:1n,outstandingCents:1n}])).toEqual({ok:false,code:'MONEY_RANGE'});
  expect([...value(calculatePeriodReserves([{...max,isPossible:true,reserveFull:false}])).values()]).toEqual([0n]);
});
it.each([0n,-1n,20000n,20001n])('HB11-06 invalid partial amount %s', amountCents => {
  expect(transition(state(),'PARTIAL_SETTLEMENT',{amountCents}).ok).toBe(false);
});
it('HB11 read boundary snapshots query before authorization yields', async () => {
  const query={through:'2026-10-02',knowledgeCut:'2'};
  const reader=createObligationStateReader(async()=>{query.through='bad';return {ownerUserId:id(),accountId:id()};},{read:async(_scope,through,cut)=>{
    expect(through).toBe('2026-10-02');expect(cut).toBe(2n);return {ok:true,value:{states:[],reserves:new Map(),knowledgeCut:2n,orderingRevisionIds:[]}};
  }});
  expect((await reader(id(),query)).ok).toBe(true);
});
