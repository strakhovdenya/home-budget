import { planBudgetUpdate } from '@/domain/budget-update/planning';
import { parseBudgetDraft } from '@/domain/budget-update/validation';
import type { BudgetContext, CandidatePlan } from '@/domain/budget-update/contracts';
import { date, emptyHistory, id, value } from './checkpoints';

export function coordinates(seq=1n) {
  const ids=new Map<string,string>();return {seq,batchId:id(),now:'2026-11-03T12:00:00.000000Z',id:(key:string)=>{
    if(!ids.has(key))ids.set(key,id());return ids.get(key)!;}};
}
export function emptyContext():BudgetContext {return {scope:{ownerUserId:id(),accountId:id()},revision:0n,recordedSeq:0n,activeVectorId:null,
  today:date('2026-11-03'),now:'2026-11-03T12:00:00.000000Z',history:emptyHistory(),obligations:[],savings:[],periods:[]};}
export function checkpoint(day:string,balance:string,allocations:Record<string,string>) {return {observedDate:day,observedAt:null,balanceCents:balance,
  allocations:Object.entries(allocations).map(([period,amountCents])=>({period,amountCents})),correction:null,placement:null};}
export function draft(context:BudgetContext,cp=checkpoint('2026-11-03','50000',{'2026-11':'40000','2026-12':'10000'}),obligations:unknown[]=[],savings:unknown[]=[]) {
  return {schemaVersion:1,knowledgeCut:context.recordedSeq.toString(),baseCheckpointId:context.history.checkpoints.at(-1)?.id??null,
    baseVectorId:context.activeVectorId,effectiveDate:cp.observedDate,checkpoint:cp,allocationChange:null,completeVectorConfirmed:true,obligations,savings};
}
export function createObligation(amount:string,funding='2026-11') {return {action:'CREATE',identityId:null,expectedRevisionId:null,bankDate:null,payment:null,
  data:{title:'Synthetic obligation',dueDate:null,originalCents:amount,isPossible:false,reserveFull:true,originatingPeriod:funding,fundingPeriod:funding}};}
export function createSaving(amount:string,funding='2026-11') {return {action:'CREATE',identityId:null,expectedRevisionId:null,
  data:{title:'Synthetic saving',amountCents:amount,originatingPeriod:funding,fundingPeriod:funding}};}
export function applied(context:BudgetContext,plan:CandidatePlan):BudgetContext {return {...context,history:plan.history,recordedSeq:plan.history.knowledgeCut,
  revision:context.revision+1n,activeVectorId:plan.vectorId,periods:plan.periods,obligations:[...context.obligations,...plan.obligations],savings:[...context.savings,...plan.savings]};}
export function fixtureD(){const empty=emptyContext();const initial=draft(empty,checkpoint('2026-10-30','50000',{'2026-11':'40000','2026-12':'10000'}),[createObligation('20000')],[createSaving('5000')]);
  return applied(empty,value(planBudgetUpdate(empty,value(parseBudgetDraft(initial)),coordinates())));}
export function payment(context:BudgetContext,amount='5000',ack=false,index=0){const old=context.obligations.filter(e=>e.action==='CREATE')[index];return {
  action:amount===old.outstandingCents.toString()?'PAID':'PARTIAL_SETTLEMENT',identityId:old.obligationId,expectedRevisionId:old.id,bankDate:null,
  data:{amountCents:amount},payment:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:ack}};}
export function release(context:BudgetContext,amount='2000',index=0){const old=context.savings.filter(e=>e.action==='CREATE')[index];return {
  action:'PARTIAL_RELEASE',identityId:old.savingsId,expectedRevisionId:old.id,data:{amountCents:amount}};}

export function fixtureC(){const empty=emptyContext();return applied(empty,value(planBudgetUpdate(empty,value(parseBudgetDraft(draft(empty,
  checkpoint('2026-10-28','90000',{'2026-10':'40000','2026-11':'50000'}),
  [createObligation('30000','2026-10'),createObligation('2000')],[createSaving('5000','2026-10')]))),coordinates())));}
export function fixtureF(){const empty=emptyContext();return applied(empty,value(planBudgetUpdate(empty,value(parseBudgetDraft(draft(empty,
  checkpoint('2026-09-20','10000',{'2026-09':'4000','2026-10':'4000','2026-12':'2000'}),
  [createObligation('3000','2026-09'),createObligation('1000','2026-10'),createObligation('500')],
  [createSaving('500','2026-09'),createSaving('200'),createSaving('700','2026-12')]))),coordinates())));}
export function transitionDraft(context:BudgetContext,mode:'CARRY'|'FRESH_START'|'DEFER'|'REDISTRIBUTE',balance:string,allocations:Record<string,string>,
  sources:string[]=[],actual=true,obligations:unknown[]=[],savings:unknown[]=[]){
  const cp=checkpoint('2026-11-03',balance,allocations),p=new Map(context.periods.map(p=>[p.id,p.period]));
  const moving=(period:string)=>mode==='CARRY'?sources.includes(period):mode==='FRESH_START'&&period<'2026-11';
  const fundingRefs=[...context.obligations.filter(e=>e.status==='UNPAID'&&moving(p.get(e.fundingPeriodId)!)).map(e=>({kind:'OBLIGATION',identityId:e.obligationId,revisionId:e.id})),
    ...context.savings.filter(e=>e.status==='ACTIVE'&&moving(p.get(e.fundingPeriodId)!)).map(e=>({kind:'SAVING',identityId:e.savingsId,revisionId:e.id}))];
  const base=draft(context,cp,obligations,savings);
  return {...base,checkpoint:null,allocationChange:{schemaVersion:1,intent:mode==='REDISTRIBUTE'?'ALLOCATION_ONLY':'TRANSITION',mode,
    observationMode:actual?'ACTUAL_CHECK':'REUSE_CONFIRMED',target:'2026-11',sources,balanceCents:balance,allocations:cp.allocations,futureEdits:[],fundingRefs,
    expectedCheckpointRevisionId:base.baseCheckpointId,expectedAllocationRevisionId:base.baseVectorId,effectiveDate:'2026-11-03',
    checkpoint:actual?cp:null,placement:null,consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}}};
}
