import { expect, it } from 'vitest';
import { emptyContext, applied, checkpoint, draft, createObligation, createSaving, coordinates } from './fixtures/budget-update';
import { date, value } from './fixtures/checkpoints';
import { parseBudgetDraft } from '@/domain/budget-update/validation';
import { planBudgetUpdate } from '@/domain/budget-update/planning';
import { proposeSavingRelease } from '@/domain/savings/proposal';
import { transition as obligationTransition } from '@/domain/obligations/lifecycle';
import { transition as savingTransition } from '@/domain/savings/lifecycle';
import { createManagement } from '@/features/management/read-management';
import type { ManagementReader } from '@/domain/management/contracts';
import { projectAccount } from '@/domain/forecast/budget';
import { state, obligation, saving } from './fixtures/forecast';

function fixture(amount='30000', future=false) {
  const c=emptyContext();
  return applied(c,value(planBudgetUpdate(c,value(parseBudgetDraft(draft(c,checkpoint('2026-11-02','100000',{'2026-11':'80000','2026-12':'20000'}),
    [createObligation(amount),...(future?[createObligation('50000','2026-12')]:[])],[createSaving('10000')]))),coordinates())));
}
function change(c:ReturnType<typeof fixture>, action:string, kind='O', amount?:string, extra:object={}) {
  const e=kind==='O'?c.obligations[0]:c.savings[0];
  return {action,identityId:kind==='O'?c.obligations[0].obligationId:c.savings[0].savingsId,expectedRevisionId:e.id,
    data:{...(amount?{amountCents:amount}:{}),...extra},...(kind==='O'?{bankDate:null,payment:['PAID','PARTIAL_SETTLEMENT'].includes(action)?{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:true}:null}:{})};
}
function plan(c:ReturnType<typeof fixture>, os:unknown[]=[],ss:unknown[]=[],bank='100000',nov='80000',reuse=true) {
  const d=draft(c,checkpoint('2026-11-03',bank,{'2026-11':nov,'2026-12':'20000'}),os,ss);
  const raw=reuse?{...d,checkpoint:null,allocationChange:{schemaVersion:1,intent:'ALLOCATION_ONLY',mode:'REDISTRIBUTE',observationMode:'REUSE_CONFIRMED',
    target:'2026-11',sources:[],balanceCents:bank,allocations:d.checkpoint.allocations,futureEdits:[],fundingRefs:[],expectedCheckpointRevisionId:d.baseCheckpointId,
    expectedAllocationRevisionId:d.baseVectorId,effectiveDate:d.effectiveDate,checkpoint:null,placement:null,consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:false,fundingConfirmed:false,nonCarryConfirmed:false}}}:d;
  const parsed=parseBudgetDraft(raw);return parsed.ok?planBudgetUpdate(c,parsed.value,coordinates(c.recordedSeq+1n)):parsed;
}
function amounts(p:ReturnType<typeof plan>,expected:object){const r=value(p).review as unknown as {projection:{periods:unknown[];safe:unknown}};expect(r.projection.periods[0]).toMatchObject(expected);return r;}
it('HB18-U01 ordinary CREATE reserves full amount without bank debit',()=>{amounts(plan(fixture(),[createObligation('12000')]),{reserved:'42000',savings:'10000',free:'28000'});});
it('HB18-U02 possible reservation is explicit full or zero',()=>{const c=fixture();for(const full of [false,true])amounts(plan(c,[{...createObligation('12000'),data:{...createObligation('12000').data,isPossible:true,reserveFull:full}}]),{reserved:full?'42000':'30000',free:full?'28000':'40000'});});
it('HB18-U03 amount AMEND retains settled portion and refuses implicit zero settlement',()=>{const c=fixture(),o={...c.obligations[0],outstandingCents:20000n};expect(value(obligationTransition(o,'AMEND',{originalCents:35000n})).outstandingCents).toBe(25000n);expect(obligationTransition(o,'AMEND',{originalCents:10000n}).ok).toBe(false);});
it('HB18-U04 partial payment has one actual checkpoint and full remainder',()=>{const c=fixture(),p=value(plan(c,[change(c,'PARTIAL_SETTLEMENT','O','10000')],[],'90000','70000',false));expect(p.history.checkpoints).toHaveLength(2);expect(p.obligations[0]).toMatchObject({outstandingCents:20000n,reserveFull:true});amounts({ok:true,value:p},{free:'40000',reserved:'20000'});});
it('HB18-U05 paid changed/equal balances require actual affirmation and separate equal ack',()=>{const c=fixture(),paid=change(c,'PAID','O','30000');amounts(plan(c,[paid],[],'70000','50000',false),{free:'40000',reserved:'0'});amounts(plan(c,[paid],[],'100000','80000',false),{free:'70000'});expect(plan(c,[{...paid,payment:{...paid.payment,unchangedBalanceAcknowledged:false}}],[],'100000','80000',false)).toMatchObject({ok:false,code:'PAYMENT_CONFIRMATION_REQUIRED'});expect(plan(c,[paid])).toMatchObject({ok:false,code:'PAYMENT_CONFIRMATION_REQUIRED'});});
it('HB18-U06 cancelled retains unpaid amount, releases reserve and is terminal',()=>{const c=fixture(),p=value(plan(c,[change(c,'CANCELLED')]));expect(p.obligations[0]).toMatchObject({status:'CANCELLED',outstandingCents:30000n,payment:null,reserveFull:false});amounts({ok:true,value:p},{free:'70000'});expect(obligationTransition(p.obligations[0],'AMEND',{title:'New'})).toMatchObject({ok:false,code:'TERMINAL_OBLIGATION'});});
it('HB18-U07 invalid payments/reserves and outside-card requirements refuse',()=>{const c=fixture();for(const amount of ['0','30000','30001'])expect(plan(c,[change(c,'PARTIAL_SETTLEMENT','O',amount)],[],'100000','80000',false).ok).toBe(false);expect(obligationTransition(c.obligations[0],'AMEND',{reserveFull:false}).ok).toBe(false);const outside={...change(c,'PARTIAL_SETTLEMENT','O','10000'),payment:{source:'OUTSIDE_TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:true}};amounts(plan(c,[outside],[],'100000','80000',false),{free:'50000'});expect(plan(c,[outside],[],'90000','70000',false)).toMatchObject({ok:false,code:'PAYMENT_CONFIRMATION_REQUIRED'});});
it('HB18-U08 savings CREATE reduces free without changing bank',()=>{amounts(plan(fixture(),[],[createSaving('5000')]),{savings:'15000',free:'35000'});});
it('HB18-U09 savings AMEND title only',()=>{const c=fixture();amounts(plan(c,[],[change(c,'AMEND','S',undefined,{title:'New'})]),{savings:'10000',free:'40000'});expect(savingTransition(c.savings[0],'AMEND',{amountCents:15000n}).ok).toBe(false);});
it('HB18-U10 increase is incremental with exact evidence',()=>{const c=fixture(),p=value(plan(c,[],[change(c,'INCREASE','S','5000')]));expect(p.savings[0]).toMatchObject({amountCents:15000n,confirmedIncreaseAmount:5000n,confirmedReleasedAmount:null});amounts({ok:true,value:p},{free:'35000'});});
it('HB18-U11 partial release has exact evidence and retains observation',()=>{const c=fixture(),p=value(plan(c,[],[change(c,'PARTIAL_RELEASE','S','4000')]));expect(p.history.checkpoints).toEqual(c.history.checkpoints);expect(p.savings[0]).toMatchObject({amountCents:6000n,confirmedReleasedAmount:4000n});amounts({ok:true,value:p},{free:'44000'});});
it('HB18-U12 full release is terminal and no new cash',()=>{const c=fixture(),p=value(plan(c,[],[change(c,'FULL_RELEASE','S','10000')]));amounts({ok:true,value:p},{free:'50000',savings:'0'});expect(savingTransition(p.savings[0],'INCREASE',{amountCents:1n})).toMatchObject({ok:false,code:'TERMINAL_SAVING'});});
it('HB18-U13 deficit proposal is read-only, full release can leave negative free',()=>{const c=fixture('85000'),before=structuredClone(c);expect(value(proposeSavingRelease(c.savings[0],c.savings[0].fundingPeriodId,-15000n,c.recordedSeq,c.revision)).suggestedRelease).toBe(10000n);expect(c).toEqual(before);amounts(plan(c,[],[change(c,'FULL_RELEASE','S','10000')]),{free:'-5000',reserved:'85000'});for(const [action,amount]of [['PARTIAL_RELEASE','10000'],['FULL_RELEASE','9999'],['FULL_RELEASE','10001']])expect(plan(c,[],[change(c,action,'S',amount)]).ok).toBe(false);});
it('HB18-U14 D36 protects future shortage without adding future cash or double reserving',()=>{const c=fixture('30000',true),r=amounts(plan(c,[],[change(c,'PARTIAL_RELEASE','S','4000')]),{free:'44000'});expect(r.projection.safe).toMatchObject({safeAvailable:'14000',safeDailyLimit:'500'});expect(proposeSavingRelease(c.savings[0],c.periods.find(p=>p.period==='2026-12')!.id,-30000n,c.recordedSeq,c.revision).ok).toBe(false);});
it('HB18-P05 boundary captures query before auth and refuses foreign owner before reader',async()=>{let finish!:()=>void;const waiting=new Promise<void>(r=>{finish=r;});let captured:unknown;const reader={history:async(_s:unknown,q:unknown)=>{captured=q;return {ok:true,value:{}};}} as unknown as ManagementReader;const c=fixture();const api=createManagement(async()=>{await waiting;return c.scope;},reader);const q={kind:'OBLIGATION',identityId:c.obligations[0].obligationId,cursor:null};const call=api.history(c.scope.accountId,q);q.identityId='foreign';finish();await call;expect(captured).toMatchObject({identityId:c.obligations[0].obligationId});const denied=createManagement(async()=>{throw Error('FORBIDDEN');},reader);expect(await denied.list(c.scope.accountId)).toMatchObject({ok:false,code:'FORBIDDEN'});});
it('HB18-B07 Berlin age oracle dates are calendar dates',()=>{
  const base=state(100000n,{'2026-11':80000n,'2026-12':20000n},[{...obligation(30000n),effectiveDate:date('2026-11-01')}],[{...saving(10000n),effectiveDate:date('2026-11-01')}]);
  for(const [day,age,reminder,limit,remainder]of [['2026-11-08',6,false,1739n,3n],['2026-11-09',7,true,1818n,4n]]as const){
    const snapshot={...base,checkpoint:{...base.checkpoint,observedDate:date('2026-11-02')},allocationEffectiveDate:date('2026-11-02'),provenance:{...base.provenance,historicalThroughDate:date(day)}};
    const result=value(projectAccount(snapshot,date(day)));expect(result.kind).toBe('ACCOUNT_ESTIMATE');if(result.kind!=='ACCOUNT_ESTIMATE')throw Error('unavailable');
    expect(result.freshness).toMatchObject({ageDays:age,showReminder:reminder});expect(result.currentLiquidity).toMatchObject({safeDailyLimit:limit,safeRemainder:remainder});
  }
});
