import { parseEuroDecimal, formatEuroDecimal, parseCentsString } from '@/domain/money/money-codec';
import { parsePeriod } from '@/domain/periods/period';
import type { CanonicalValue, CommitReceipt } from '@/domain/updates/contracts';
import type { BudgetResult } from '@/domain/budget-update/ports';
import { parseBerlinDate } from '@/shared/pure/calendar';

export class FormInputError extends Error {constructor(readonly field:string,code='INVALID_INPUT'){super(code);}}

export type SeedObligation={id:string;obligationId:string;title:string;dueDate:string|null;originalCents:string;outstandingCents:string;
  status:'UNPAID'|'PAID'|'CANCELLED';isPossible:boolean;reserveFull:boolean;fundingPeriod:string};
export type SeedSaving={id:string;savingsId:string;title:string;amountCents:string;status:'ACTIVE'|'RELEASED';fundingPeriod:string};
export type UpdateSeed={revision:string;knowledgeCut:string;today:string;baseCheckpointId:string|null;baseVectorId:string|null;
  bank:{balanceCents:string;observedDate:string}|null;allocations:{period:string;amountCents:string}[];
  obligations:SeedObligation[];savings:SeedSaving[];placement:{id:string;afterPositionId:string|null}|null};
export type DraftEdit={key:string;kind:'OBLIGATION'|'SAVING';identityId:string;action:string;title:string;amount:string;period:string;dueDate:string;bankDate:string;
  isPossible:boolean;reserveFull:boolean;source:'TRACKED_CARD'|'OUTSIDE_TRACKED_CARD'};
export type UpdateForm={balance:string;observedDate:string;reuse:boolean;mode:''|'CARRY'|'FRESH_START'|'DEFER';source:string;
  allocations:{key:string;period:string;amount:string}[];edits:DraftEdit[];vectorConfirmed:boolean;bankAffirmed:boolean;unchangedAcknowledged:boolean;
  fundingConfirmed:boolean;nonCarryConfirmed:boolean;unchangedFunding:boolean;futureConfirmed:boolean;orderAcknowledged:boolean;reason:string};
export type BudgetActions={load:()=>Promise<BudgetResult<CanonicalValue>>;preview:(input:unknown)=>Promise<BudgetResult<CanonicalValue>>;
  confirm:(input:unknown)=>Promise<BudgetResult<CommitReceipt>>;status:(id:unknown)=>Promise<BudgetResult<CommitReceipt|null>>;
  history:(id?:unknown)=>Promise<BudgetResult<CanonicalValue>>};
export function euro(cents:string){const p=parseCentsString(cents);if(!p.ok)throw Error('INVALID_INPUT');const f=formatEuroDecimal(p.value);if(!f.ok)throw Error('INVALID_INPUT');return f.value;}
export function inputCents(text:string,locale:string,field='balance'){const normalized=['ru','de','en'].includes(locale)?text.replace(',','.'):text;const p=parseEuroDecimal(normalized);
  if(!p.ok||p.value<0n)throw new FormInputError(field);return p.value.toString();}
export function initialForm(seed:UpdateSeed):UpdateForm{return {balance:seed.bank?euro(seed.bank.balanceCents):'',observedDate:seed.today,reuse:false,mode:'',source:'',
  allocations:seed.allocations.length?seed.allocations.map((a,i)=>({key:'a'+i,period:a.period,amount:euro(a.amountCents)})):[{key:'a0',period:seed.today.slice(0,7),amount:''}],
  edits:[],vectorConfirmed:false,bankAffirmed:false,unchangedAcknowledged:false,fundingConfirmed:false,nonCarryConfirmed:false,unchangedFunding:false,futureConfirmed:false,orderAcknowledged:false,reason:''};}
export function makeBudgetCommand(seed:UpdateSeed,form:UpdateForm,locale:string,requestId:string){
  if(!parseBerlinDate(form.observedDate).ok||form.observedDate>seed.today)throw new FormInputError('observedDate');
  const allocations=form.allocations.map((a,i)=>{if(!parsePeriod(a.period).ok)throw new FormInputError('period-'+i);return {period:a.period,amountCents:inputCents(a.amount,locale,'allocation-'+i)};});
  const balanceCents=form.reuse?seed.bank?.balanceCents:inputCents(form.balance,locale);if(!balanceCents)throw Error('INVALID_INPUT');
  const target=seed.today.slice(0,7),hasPast=seed.allocations.some(a=>a.period<target&&a.amountCents!=='0')||seed.obligations.some(e=>e.status==='UNPAID'&&e.fundingPeriod<target)||seed.savings.some(e=>e.status==='ACTIVE'&&e.fundingPeriod<target);
  if(hasPast&&form.observedDate.slice(0,7)===target&&!form.mode&&!form.reuse)throw Error('TRANSITION_CONFIRMATION_REQUIRED');
  if(form.observedDate===seed.today&&seed.placement&&!form.orderAcknowledged)throw Error('ORDERING_CONFLICT');
  const dayPlacement=form.observedDate===seed.today&&seed.placement?{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}:null;
  const cp={observedDate:form.observedDate,observedAt:null,balanceCents,allocations,correction:null,placement:dayPlacement};
  const os=[],ss=[];
  for(const e of form.edits){
    const amount=()=>inputCents(e.amount,locale,'edit-'+e.key+'-amount');
    if(e.kind==='OBLIGATION'){
      const old=seed.obligations.find(o=>o.obligationId===e.identityId),create=e.action==='CREATE',paid=['PAID','PARTIAL_SETTLEMENT'].includes(e.action);
      const data=e.action==='CANCELLED'?{}:paid?{amountCents:amount()}:{title:e.title,dueDate:e.dueDate||null,originalCents:amount(),isPossible:e.isPossible,reserveFull:e.reserveFull,
        ...(create?{originatingPeriod:e.period,fundingPeriod:e.period}:{})};
      if(!create&&!old)throw Error('STALE_OBLIGATION');
      if(paid&&e.source==='OUTSIDE_TRACKED_CARD'&&!form.reason.trim())throw Error('PAYMENT_CONFIRMATION_REQUIRED');
      os.push({action:e.action,identityId:create?null:e.identityId,expectedRevisionId:create?null:old!.id,data,bankDate:paid?e.bankDate||null:null,
        payment:paid?{source:e.source,bankStateAffirmed:form.bankAffirmed,unchangedBalanceAcknowledged:form.unchangedAcknowledged}:null});
    }else{
      const old=seed.savings.find(s=>s.savingsId===e.identityId),create=e.action==='CREATE';if(!create&&!old)throw Error('STALE_SAVING');
      ss.push({action:e.action,identityId:create?null:e.identityId,expectedRevisionId:create?null:old!.id,data:e.action==='AMEND'?{title:e.title}:{amountCents:amount(),...(create?{title:e.title,originatingPeriod:e.period,fundingPeriod:e.period}:{})}});
    }
  }
  let allocationChange:unknown=null;
  if(form.mode||form.reuse){
    const mode=form.mode||'REDISTRIBUTE',sources=mode==='CARRY'?[form.source]:[];
    const changed=(p:string)=>(seed.allocations.find(a=>a.period===p)?.amountCents??'0')!==(allocations.find(a=>a.period===p)?.amountCents??'0');
    const relevant=(p:string)=>mode==='CARRY'?sources.includes(p):mode==='FRESH_START'?p<target:mode==='REDISTRIBUTE'?p<target&&changed(p):false;
    const fundingRefs=[...seed.obligations.filter(e=>e.status==='UNPAID'&&relevant(e.fundingPeriod)).map(e=>({kind:'OBLIGATION',identityId:e.obligationId,revisionId:e.id})),
      ...seed.savings.filter(e=>e.status==='ACTIVE'&&relevant(e.fundingPeriod)).map(e=>({kind:'SAVING',identityId:e.savingsId,revisionId:e.id}))];
    const future=[...new Set([...seed.allocations.map(a=>a.period),...allocations.map(a=>a.period)])].filter(p=>p>target&&changed(p));
    allocationChange={schemaVersion:1,intent:mode==='REDISTRIBUTE'?'ALLOCATION_ONLY':'TRANSITION',mode,observationMode:form.reuse?'REUSE_CONFIRMED':'ACTUAL_CHECK',target,sources,
      balanceCents,allocations,futureEdits:mode==='FRESH_START'&&form.futureConfirmed?future.map(p=>({period:p,beforeAmountCents:seed.allocations.find(a=>a.period===p)?.amountCents??'0',afterAmountCents:allocations.find(a=>a.period===p)?.amountCents??'0',explicitConsent:true})):[],fundingRefs,
      expectedCheckpointRevisionId:seed.baseCheckpointId,expectedAllocationRevisionId:seed.baseVectorId,effectiveDate:form.observedDate,
      checkpoint:form.reuse?null:cp,placement:form.reuse?dayPlacement:null,
      consent:{completeVectorConfirmed:form.vectorConfirmed,fundingUnchangedAcknowledged:form.unchangedFunding,transitionConfirmed:!!form.mode,fundingConfirmed:form.fundingConfirmed,nonCarryConfirmed:form.nonCarryConfirmed}};
  }
  return {requestId,expectedRevision:seed.revision,effectiveDate:form.observedDate,reason:form.reason.trim()||'Confirmed actual budget update',payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,
    baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:form.observedDate,checkpoint:allocationChange?null:cp,
    allocationChange,completeVectorConfirmed:form.vectorConfirmed,obligations:os,savings:ss}};
}
