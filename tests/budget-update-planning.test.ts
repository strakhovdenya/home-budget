import { expect, it } from 'vitest';
import { parseBudgetDraft,cashVectorGap } from '../src/domain/budget-update/validation';
import { planBudgetUpdate } from '../src/domain/budget-update/planning';
import { coordinates, fixtureD, fixtureC, fixtureF, transitionDraft, draft, checkpoint, payment, release, emptyContext } from './fixtures/budget-update';
import { value } from './fixtures/checkpoints';

it('HB17-U05 rejects an incomplete cash vector and unsafe aggregate fields', () => {
  expect(parseBudgetDraft({ schemaVersion: 1, actorId: 'forged' }).ok).toBe(false);
  const context=fixtureD();
  for(const [balance,a]of [['50000',{'2026-11':'49999'}],['50000',{'2026-11':'55000','2026-12':'-5000'}],['-1',{'2026-11':'-1'}]] as const)
    expect(parseBudgetDraft(draft(context,checkpoint('2026-11-03',balance,a))).ok).toBe(false);
});

it('HB17-U01 previews the full observed state without operation requirements or inferred expenses',()=>{
  const context=fixtureD(),before=structuredClone(context);
  const plan=value(planBudgetUpdate(context,value(parseBudgetDraft(draft(context,checkpoint('2026-11-03','47000',{'2026-11':'37000','2026-12':'10000'})))),coordinates(2n)));
  expect(plan.review).toMatchObject({bank:{balanceCents:'47000'},projection:{safe:{safeAvailable:'12000',safeDailyLimit:'428',safeRemainder:'16'}}});
  expect(context).toEqual(before);expect(plan.obligations).toHaveLength(0);expect(plan.savings).toHaveLength(0);
});
it('HB17-U02 and HB17-U07 preserve an actual zero and exact one-cent floor',()=>{
  for(const b of ['0','1','9223372036854775807']){const context=emptyContext();
    const plan=value(planBudgetUpdate(context,value(parseBudgetDraft(draft(context,checkpoint('2026-11-03',b,{'2026-11':b})))),coordinates()));
    expect(plan.review).toMatchObject({bank:{balanceCents:b}});
    if(b==='1')expect(plan.review).toMatchObject({projection:{safe:{safeDailyLimit:'0',safeRemainder:'1'}}});}
});
it('HB17-U03 equal actual amount still creates one new observation',()=>{
  const context=fixtureD(),p=value(planBudgetUpdate(context,value(parseBudgetDraft(draft(context))),coordinates(2n)));
  expect(p.history.checkpoints).toHaveLength(context.history.checkpoints.length+1);
  expect(p.history.checkpoints.at(-1)?.observedDate).toBe('2026-11-03');
});
it('HB17-U08 atomic partial payment plus another identity release never debits the observed bank twice',()=>{
  const context=fixtureD(),raw=draft(context,checkpoint('2026-11-03','45000',{'2026-11':'35000','2026-12':'10000'}),[payment(context)],[release(context)]);
  const p=value(planBudgetUpdate(context,value(parseBudgetDraft(raw)),coordinates(2n)));
  expect(p.obligations[0].outstandingCents).toBe(15000n);expect(p.savings[0].amountCents).toBe(3000n);
  expect(p.review).toMatchObject({bank:{balanceCents:'45000'},projection:{safe:{safeAvailable:'17000',safeDailyLimit:'607',safeRemainder:'4'}}});
  expect(p.obligations[0].payment?.checkpointId).toBe(p.checkpointId);expect(p.obligations[0].positionId).toBe(p.savings[0].positionId);
});
it('HB17-U09 unchanged paid balance requires independent explicit affirmation',()=>{
  const context=fixtureD();
  expect(planBudgetUpdate(context,value(parseBudgetDraft(draft(context,undefined,[payment(context)]))),coordinates(2n)))
    .toMatchObject({ok:false,code:'PAYMENT_CONFIRMATION_REQUIRED'});
  const p=value(planBudgetUpdate(context,value(parseBudgetDraft(draft(context,undefined,[payment(context,'5000',true)]))),coordinates(2n)));
  expect(p.review).toMatchObject({bank:{balanceCents:'50000'},projection:{safe:{safeAvailable:'20000'}}});
});
it('HB17-U10 external payment cannot waive the conservative unchanged-bank evidence contract',()=>{
  const context=fixtureD(),p=payment(context,'5000',true);p.payment.source='OUTSIDE_TRACKED_CARD';
  const d=draft(context,checkpoint('2026-11-03','45000',{'2026-11':'35000','2026-12':'10000'}),[p]);
  expect(planBudgetUpdate(context,value(parseBudgetDraft(d)),coordinates(2n))).toMatchObject({ok:false,code:'PAYMENT_CONFIRMATION_REQUIRED'});
});
it('HB17-P09 refuses an obsolete knowledge cut without changing the original input',()=>{
  const context=fixtureD(),d=draft(context);d.knowledgeCut='0';
  expect(planBudgetUpdate(context,value(parseBudgetDraft(d)),coordinates(2n))).toMatchObject({ok:false,code:'STALE_REVISION'});
});
it('HB17-U04 HB17-U12 redistribution and carry reuse the real observation without refreshing its date',()=>{
  const context=fixtureC();
  const raw=transitionDraft(context,'CARRY','90000',{'2026-10':'0','2026-11':'90000'},['2026-10'],false);
  const p=value(planBudgetUpdate(context,value(parseBudgetDraft(raw)),coordinates(2n)));
  expect(p.checkpointPlan).toBeNull();expect(p.history.checkpoints).toEqual(context.history.checkpoints);
  expect(p.review).toMatchObject({bank:{observedDate:'2026-10-28'},projection:{safe:{safeAvailable:'53000',safeDailyLimit:'1892',safeRemainder:'24'}}});
});
it('HB17-U13 HB17-U16 fresh start releases another current saving while retaining full old funding once',()=>{
  const context=fixtureF(),raw=transitionDraft(context,'FRESH_START','9000',{'2026-09':'0','2026-10':'0','2026-11':'7000','2026-12':'2000'},[],true,[],[release(context,'100',1)]);
  const p=value(planBudgetUpdate(context,value(parseBudgetDraft(raw)),coordinates(2n)));
  expect(p.review).toMatchObject({bank:{balanceCents:'9000'},projection:{safe:{safeAvailable:'1900',safeDailyLimit:'67',safeRemainder:'24'}}});
  expect(p.savings.filter(e=>e.action==='FUNDING_TRANSFER')).toHaveLength(1);expect(p.savings.filter(e=>e.action==='PARTIAL_RELEASE')).toHaveLength(1);
});
it('HB17-U15 carry and a different obligation payment share one real bank observation',()=>{
  const context=fixtureC(),raw=transitionDraft(context,'CARRY','88000',{'2026-10':'0','2026-11':'88000'},['2026-10'],true,[payment(context,'2000',false,1)]);
  const p=value(planBudgetUpdate(context,value(parseBudgetDraft(raw)),coordinates(2n)));
  expect(p.obligations.map(e=>e.action).sort()).toEqual(['FUNDING_TRANSFER','PAID']);
  expect(new Set([...p.obligations,...p.savings].map(e=>e.positionId)).size).toBe(1);
  expect(p.review).toMatchObject({bank:{balanceCents:'88000'},projection:{safe:{safeAvailable:'53000'}}});
});
it.each(['PAID','CANCELLED','PARTIAL_SETTLEMENT','AMEND'])('HB17-U14 refuses %s on a transferred obligation before terminal state can hide overlap',action=>{
  const context=fixtureC(),edit={...payment(context,'30000'),action,data:action==='CANCELLED'?{}:action==='AMEND'?{title:'Changed'}:{amountCents:action==='PAID'?'30000':'5000'},payment:['PAID','PARTIAL_SETTLEMENT'].includes(action)?payment(context,'30000').payment:null};
  const raw=transitionDraft(context,'CARRY','90000',{'2026-10':'0','2026-11':'90000'},['2026-10'],true,[edit]);
  expect(planBudgetUpdate(context,value(parseBudgetDraft(raw)),coordinates(2n))).toMatchObject({ok:false,code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED'});
});
it.each(['AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE'])('HB17-U14 refuses %s on a fresh-start transferred saving',action=>{
  const context=fixtureF(),edit={...release(context,'500'),action,data:action==='AMEND'?{title:'Changed'}:{amountCents:action==='PARTIAL_RELEASE'?'100':'500'}};
  const raw=transitionDraft(context,'FRESH_START','9000',{'2026-11':'7000','2026-12':'2000'},[],true,[],[edit]);
  expect(planBudgetUpdate(context,value(parseBudgetDraft(raw)),coordinates(2n))).toMatchObject({ok:false,code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED'});
});
it('HB17-U06 expected receipts cannot inflate cash; received future cash protects that month once',()=>{
  const c=fixtureD();expect(parseBudgetDraft(draft(c,checkpoint('2026-11-03','50000',{'2026-11':'40000','2026-12':'15000'}))).ok).toBe(false);
  const p=value(planBudgetUpdate(c,value(parseBudgetDraft(draft(c,checkpoint('2026-11-03','55000',{'2026-11':'40000','2026-12':'15000'})))),coordinates(2n)));
  expect(p.review).toMatchObject({projection:{safe:{safeAvailable:'15000'}}});
});
it('HB17-U11 cancellation and savings increase preserve authoritative card cash',()=>{
  const c=fixtureD(),o=c.obligations[0],s=c.savings[0],d=draft(c,undefined,[{action:'CANCELLED',identityId:o.obligationId,expectedRevisionId:o.id,data:{},bankDate:null,payment:null}],
    [{action:'INCREASE',identityId:s.savingsId,expectedRevisionId:s.id,data:{amountCents:'3000'}}]);
  const p=value(planBudgetUpdate(c,value(parseBudgetDraft(d)),coordinates(2n)));expect(p.review).toMatchObject({bank:{balanceCents:'50000'},projection:{safe:{safeAvailable:'32000',safeDailyLimit:'1142',safeRemainder:'24'}}});
  expect(p.obligations[0].status).toBe('CANCELLED');expect(p.savings[0].amountCents).toBe(8000n);
});
it('HB17-X02 exact allocation gap feedback never invents an allocation or rounds invalid money',()=>{
  const c=fixtureD();expect(cashVectorGap(draft(c,checkpoint('2026-11-03','50000',{'2026-11':'30000','2026-12':'10000'})))).toBe('10000');
  expect(cashVectorGap(draft(c,checkpoint('2026-11-03','50000',{'2026-11':'50001'})))).toBe('-1');
  expect(cashVectorGap(draft(c))).toBeNull();expect(cashVectorGap({checkpoint:{balanceCents:'1e3',allocations:[]}})).toBeNull();
});
