import { expect, it } from 'vitest';
import { planAllocationChange } from '@/domain/transitions/planning';
import { parseTransition } from '@/domain/transitions/validation';
import { proposeFinancingDetail } from '@/domain/transitions/financing-detail';
import { periodFree } from '@/domain/transitions/planning';
import { MAX_CENTS } from '@/domain/money/money';
import type { AllocationBase,AllocationChange } from '@/domain/transitions/contracts';
import { validFundingProof } from '@/domain/transitions/funding';
import { transition as obligationTransition } from '@/domain/obligations/lifecycle';
import { transition as savingTransition } from '@/domain/savings/lifecycle';
import { prepareCommand } from '@/domain/updates/validation';

const base = { balanceCents: 10000n, allocations: [{period:'2026-09',amountCents:4000n},{period:'2026-10',amountCents:4000n},{period:'2026-12',amountCents:2000n}],
  checkpointId:'00000000-0000-4000-8000-000000000001',vectorId:'00000000-0000-4000-8000-000000000002',funding:[] };
it('HB13 T23/PG-F01 preserves future cash during fresh start',()=>{
  const p=planAllocationChange(base,{mode:'FRESH_START',observationMode:'ACTUAL_CHECK',target:'2026-11',sources:[],balanceCents:9000n,
    allocations:[{period:'2026-11',amountCents:7000n},{period:'2026-12',amountCents:2000n}],futureEdits:[],fundingRefs:[]});
  expect(p.ok).toBe(true);
});
it('HB13 PG-F03 refuses silent future sweep',()=>{
  expect(planAllocationChange(base,{mode:'FRESH_START',observationMode:'ACTUAL_CHECK',target:'2026-11',sources:[],balanceCents:9000n,
    allocations:[{period:'2026-11',amountCents:9000n}],futureEdits:[],fundingRefs:[]})).toEqual({ok:false,code:'FUTURE_ALLOCATION_REVIEW_REQUIRED'});
});
it('HB13 hostile DTO fails without throwing',()=>{expect(parseTransition({})).toEqual({ok:false,code:'INVALID_INPUT'});});

const cash:AllocationBase={...base,balanceCents:89000n,allocations:[{period:'2026-10',amountCents:40000n},{period:'2026-11',amountCents:48000n},{period:'2026-12',amountCents:1000n}],funding:[{kind:'OBLIGATION',identityId:'o',revisionId:'r',period:'2026-10',state:null}]};
const carry:AllocationChange={mode:'CARRY',observationMode:'REUSE_CONFIRMED',target:'2026-11',sources:['2026-10'],balanceCents:89000n,allocations:[{period:'2026-11',amountCents:88000n},{period:'2026-12',amountCents:1000n}],futureEdits:[],fundingRefs:[{kind:'OBLIGATION',identityId:'o',revisionId:'r'}]};
it.each([
  ['T13/T14 exact CARRY',{},null],
  ['T37 multi-source',{sources:['2026-09','2026-10']},'OWNER_POLICY_REQUIRED'],
  ['T05 bad sum',{allocations:[{period:'2026-11',amountCents:88999n}]},'TRANSITION_CONFIRMATION_REQUIRED'],
  ['T06 negative A',{allocations:[{period:'2026-10',amountCents:-1n},{period:'2026-11',amountCents:89000n},{period:'2026-12',amountCents:1000n}]},'NEGATIVE_CASH_ALLOCATION'],
  ['T07 overflow',{allocations:[{period:'2026-11',amountCents:MAX_CENTS+1n}]},'MONEY_RANGE'],
  ['T38 missing identity',{fundingRefs:[]},'TRANSITION_CONFIRMATION_REQUIRED'],
  ['T53 duplicate identity',{fundingRefs:[...carry.fundingRefs,...carry.fundingRefs]},'TRANSITION_CONFIRMATION_REQUIRED'],
  ['T49 source target reversed',{sources:['2026-12']},'INVALID_INPUT'],
  ['T19 changed reused B',{balanceCents:88000n},'HISTORICAL_STATE_CONFLICT'],
  ['T21 actual changed',{observationMode:'ACTUAL_CHECK',balanceCents:84000n,allocations:[{period:'2026-11',amountCents:83000n},{period:'2026-12',amountCents:1000n}]},null],
] as const)('HB13 %s',(_,patch,code)=>{const result=planAllocationChange(cash,{...carry,...patch} as AllocationChange);if(code)expect(result).toEqual({ok:false,code});else expect(result.ok).toBe(true);});
it.each([
  ['PG-F02 explicit edit',9000n,[{period:'2026-11',amountCents:8000n},{period:'2026-12',amountCents:1000n}],[{period:'2026-12',beforeAmountCents:2000n,afterAmountCents:1000n,explicitConsent:true}],null],
  ['PG-F04 insufficient',1500n,[{period:'2026-12',amountCents:2000n}],[],'PRESERVED_ALLOCATION_CONFLICT'],
  ['PG-F05 deficit retained',1500n,[{period:'2026-11',amountCents:500n},{period:'2026-12',amountCents:1000n}],[{period:'2026-12',beforeAmountCents:2000n,afterAmountCents:1000n,explicitConsent:true}],null],
  ['PG-F03 omitted edit',9000n,[{period:'2026-11',amountCents:9000n}],[],'FUTURE_ALLOCATION_REVIEW_REQUIRED'],
] as const)('HB13 %s',(_,balanceCents,allocations,futureEdits,code)=>{const r=planAllocationChange(base,{mode:'FRESH_START',observationMode:'ACTUAL_CHECK',target:'2026-11',sources:[],balanceCents,allocations,futureEdits,fundingRefs:[]});if(code)expect(r).toEqual({ok:false,code});else expect(r.ok).toBe(true);});
it.each([[-10000n,10000n,20000n,0n],[-4000n,10000n,9000n,5000n],[53000n,88000n,30000n,5000n],[-3000n,8000n,9000n,2000n]])('HB13 T17/T18/T27 full free result %s', (free,a,r,s)=>{expect(periodFree(a,r,s)).toEqual({ok:true,value:free});});
it.each([['F-004','-3500',[{period:'2026-10',amountCents:'-2000'},{period:'2026-11',amountCents:'-1500'}]],['F-015','100000',[{period:'2026-10',amountCents:'5000'},{period:'2026-11',amountCents:'95000'}]]] as const)('HB13 T10/T12 %s details are pure',(_,amountCents,details)=>{
  const raw={checkpointRevisionId:base.checkpointId,allocationRevisionId:base.vectorId,amountCents,details},copy=structuredClone(raw),r=proposeFinancingDetail(raw);expect(r.ok).toBe(true);expect(raw).toEqual(copy);if(r.ok)expect(r.value.kind).toBe('EXPLANATORY_PROPOSAL');
});
it.each(['1.5',1,MAX_CENTS+1n,'9223372036854775808','01',null])('HB13 T07 invalid detail money %s',amountCents=>{expect(proposeFinancingDetail({checkpointRevisionId:base.checkpointId,allocationRevisionId:base.vectorId,amountCents,details:[]})).toEqual({ok:false,code:'INVALID_INPUT'});});
it('HB13 T51/T52/T56 funding is neither settlement nor release',()=>{
  const obligation={originatingPeriodId:'origin',fundingPeriodId:'old',title:'Synthetic',dueDate:null,originalCents:30000n,outstandingCents:20000n,status:'UNPAID' as const,isPossible:false,reserveFull:true};
  expect(obligationTransition(obligation,'FUNDING_TRANSFER',{fundingPeriodId:'target'})).toEqual({ok:true,value:{...obligation,fundingPeriodId:'target'}});
  expect(obligationTransition({...obligation,status:'PAID',outstandingCents:0n,reserveFull:false},'FUNDING_TRANSFER',{fundingPeriodId:'target'})).toEqual({ok:false,code:'TERMINAL_OBLIGATION'});
  const saving={originatingPeriodId:'origin',fundingPeriodId:'old',title:'Synthetic',amountCents:5000n,status:'ACTIVE' as const};expect(savingTransition(saving,'FUNDING_TRANSFER',{fundingPeriodId:'target'})).toEqual({ok:true,value:{...saving,fundingPeriodId:'target'}});
  expect(savingTransition({...saving,status:'RELEASED',amountCents:0n},'FUNDING_TRANSFER',{fundingPeriodId:'target'})).toEqual({ok:false,code:'TERMINAL_SAVING'});
  expect(validFundingProof({id:'after',budgetUpdateId:'b',previousRevisionId:'before',positionId:'p',fundingPeriodId:'new',transitionDecisionId:'d',fundingProof:{decisionId:'d',budgetUpdateId:'b',positionId:'p',sourcePeriodId:'old',targetPeriodId:'new',beforeRevisionId:'before',afterRevisionId:'after'}},{fundingPeriodId:'old'})).toBe(true);
});
it('HB13 T22/T23/T27 FRESH_START handles many missed periods without deficit postings',()=>{
  const b={...base,allocations:[{period:'2025-01',amountCents:4000n},{period:'2025-02',amountCents:4000n},{period:'2026-12',amountCents:2000n}]};
  const r=planAllocationChange(b,{mode:'FRESH_START',observationMode:'ACTUAL_CHECK',target:'2026-11',sources:[],balanceCents:9000n,allocations:[{period:'2026-11',amountCents:7000n},{period:'2026-12',amountCents:2000n}],futureEdits:[],fundingRefs:[]});expect(r).toMatchObject({ok:true,value:{affectedPast:['2025-01','2025-02']}});
});
it('HB13 T61 one cent redistribution remains exact',()=>{expect(planAllocationChange({...base,balanceCents:1n,allocations:[{period:'2026-10',amountCents:1n}]},{...carry,mode:'REDISTRIBUTE',sources:[],balanceCents:1n,allocations:[{period:'2026-12',amountCents:1n}],fundingRefs:[]})).toMatchObject({ok:true});});
it('HB13 T62 bounded commands reject the whole oversized affected set',()=>{expect(prepareCommand({requestId:base.checkpointId,expectedRevision:'1',effectiveDate:'2026-11-02',reason:'Synthetic',payload:{funding:Array.from({length:5000},()=>({id:base.vectorId}))}})).toEqual({ok:false,code:'INVALID_INPUT'});});
it('HB13 T63 checked intermediate overflow does not trim reserves',()=>{expect(periodFree(0n,MAX_CENTS,1n)).toEqual({ok:false,code:'MONEY_RANGE'});});
