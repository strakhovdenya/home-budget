import { expect, it } from 'vitest';
import { transition, validState } from '@/domain/savings/lifecycle';
import { calculatePeriodSavings } from '@/domain/savings/history';
import { selectSavingState } from '@/domain/savings/history';
import { parseSavingBatch } from '@/domain/savings/validation';
import { proposeSavingRelease } from '@/domain/savings/proposal';
import { MAX_CENTS } from '@/domain/money/money';
import { date, value } from './fixtures/checkpoints';
import type { SavingEvent, SavingHistory } from '@/domain/savings/contracts';

const state = { originatingPeriodId: 'oct', fundingPeriodId: 'oct', title: 'Synthetic savings', amountCents: 5000n, status: 'ACTIVE' as const };
it('HB12-S01..S09 exact voluntary lifecycle never posts bank cash', () => {
  expect(validState(state)).toBe(true);
  expect(transition(state, 'INCREASE', { amountCents: 3000n })).toMatchObject({ ok: true, value: { amountCents: 8000n } });
  expect(transition(state, 'PARTIAL_RELEASE', { amountCents: 2000n })).toMatchObject({ ok: true, value: { amountCents: 3000n } });
  expect(transition(state, 'FULL_RELEASE', { amountCents: 5000n })).toMatchObject({ ok: true, value: { status: 'RELEASED', amountCents: 0n } });
  expect(transition(state, 'PARTIAL_RELEASE', { amountCents: 6000n }).ok).toBe(false);
  expect(validState({ ...state, amountCents: 0n })).toBe(false);
});
it('HB12-S11/S18 savings above cash remain full and identities count once', () => {
  const e = { ...state, savingsId: 's' };
  expect(calculatePeriodSavings([e])).toMatchObject({ ok: true });
  expect(calculatePeriodSavings([e, e]).ok).toBe(false);
  const oversized = value(calculatePeriodSavings([{ ...e, amountCents: 15000n }]));
  expect(10000n - oversized.get('oct')!).toBe(-5000n);
});

const root: SavingEvent = { ...state, id: 'c', savingsId: 's', logicalFactId: 'c', supersedesId: null, previousRevisionId: null,
  beforeState: null, positionId: 'p', effectiveDate: date('2026-10-02'), confirmedAt: '2026-10-02T10:00:00.000000Z',
  recordedSeq: 1n, budgetUpdateId: 'b', action: 'CREATE', confirmedIncreaseAmount: null, confirmedReleasedAmount: null };
const history: SavingHistory = { knowledgeCut: 1n, checkpoints: [], vectors: [], positions: [{id:'p',historicalDate:root.effectiveDate,recordedSeq:1n}],
  orderings: [{id:'o',historicalDate:root.effectiveDate,recordedSeq:1n,previousRevisionId:null,positionIds:['p'],edges:[]}], savings:[root] };
it('HB12-S12..S15 proposal is read-only, explicit and period scoped',()=>{
  const saved=structuredClone(root);
  expect(proposeSavingRelease(root,'oct',-3000n,1n,1n)).toMatchObject({ok:true,value:{suggestedRelease:3000n}});
  expect(proposeSavingRelease(root,'oct',-8000n,1n,1n)).toMatchObject({ok:true,value:{suggestedRelease:5000n}});
  expect(proposeSavingRelease(root,'oct',1000n,1n,1n)).toMatchObject({ok:true,value:{suggestedRelease:0n}});
  expect(proposeSavingRelease(root,'dec',-3000n,1n,1n).ok).toBe(false);expect(root).toEqual(saved);
  const after=value(transition(root,'PARTIAL_RELEASE',{amountCents:3000n}));expect(10000n-8000n-after.amountCents).toBe(0n);
});
it('HB12-S16/S17/S40 period sums exact, duplicate identity and total overflow reject',()=>{
  const rows=[root,{...root,savingsId:'s2',amountCents:3000n},{...root,savingsId:'s3',fundingPeriodId:'dec',amountCents:7000n}];
  expect([...value(calculatePeriodSavings(rows))]).toEqual([['oct',8000n],['dec',7000n]]);
  expect(calculatePeriodSavings([{...root,amountCents:MAX_CENTS},{...root,savingsId:'s2',fundingPeriodId:'dec',amountCents:1n}])).toEqual({ok:false,code:'MONEY_RANGE'});
  expect(transition({...state,amountCents:MAX_CENTS},'INCREASE',{amountCents:1n})).toEqual({ok:false,code:'MONEY_RANGE'});
});
it('HB12-S23/S42/S43 H/K and calendar rollover retain identity/funding with no bank observation',()=>{
  expect(value(selectSavingState(history,date('2026-10-01'))).states).toEqual([]);
  const selected=value(selectSavingState(history,date('2026-11-01')));expect(selected.states).toEqual([root]);
  expect(selected.states[0].fundingPeriodId).toBe('oct');expect(history.savings).toEqual([root]);
});
it.each(['INCREASE','PARTIAL_RELEASE','FULL_RELEASE','AMEND'] as const)('HB12 terminal ordinary %s refuses',action=>{
  expect(transition({...state,status:'RELEASED',amountCents:0n},action,action==='AMEND'?{title:'New'}:{amountCents:1n})).toEqual({ok:false,code:'TERMINAL_SAVING'});
});
const command={key:'a',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,
  effectiveDate:'2026-10-02',data:{title:'Synthetic',amountCents:'5000',originatingPeriod:'2026-10',fundingPeriod:'2026-10'},placement:null,bankCheck:null};
it.each([5000,'5.5','05000','-1','0','9223372036854775808'])('HB12 invalid money DTO %s',amount=>{
  expect(parseSavingBatch({changes:[{...command,data:{...command.data,amountCents:amount}}]}).ok).toBe(false);
});
it('HB12 title Unicode boundary, unknown fields, dates and no implicit funding change',()=>{
  expect(parseSavingBatch({changes:[{...command,data:{...command.data,title:'😀'.repeat(200)}}]}).ok).toBe(true);
  expect(parseSavingBatch({changes:[{...command,data:{...command.data,title:'😀'.repeat(201)}}]}).ok).toBe(false);
  expect(parseSavingBatch({changes:[{...command,actorId:'untrusted'}]}).ok).toBe(false);
  expect(parseSavingBatch({changes:[{...command,effectiveDate:'2026-02-30'}]}).ok).toBe(false);
  expect(parseSavingBatch({changes:[{...command,action:'AMEND',savingsId:'00000000-0000-4000-8000-000000000001',data:{fundingPeriod:'2026-11'}}]}).ok).toBe(false);
});
