import { addCents, subtractCents, sumCents, validateCents } from '@/domain/money/money';
import { parsePeriod } from '@/domain/periods/period';
import { encodeCanonical } from '@/domain/updates/canonical-value';
import type { UpdateErrorCode } from '@/domain/updates/contracts';
import type { Result } from '@/shared/pure/result';
import type { AllocationBase, AllocationChange, FundingRef } from './contracts';
export function sameFundingRefs(a:readonly FundingRef[],b:readonly FundingRef[]):boolean {
  const key=(r:FundingRef)=>`${r.kind}:${r.identityId}:${r.revisionId}`;
  return new Set(a.map(key)).size===a.length && a.length===b.length && a.map(key).sort().join('|')===b.map(key).sort().join('|');
}
/** Pure cash policy. It never derives operations, trims earmarks or writes a draft. */
export function planAllocationChange(base:AllocationBase,input:AllocationChange):Result<Readonly<{affectedPast:readonly string[];moving:AllocationBase['funding'];preservedFuture:readonly {period:string;amountCents:bigint}[]}>,UpdateErrorCode> {
  const fail=(code:UpdateErrorCode)=>({ok:false,code} as const);
  if(!parsePeriod(input.target).ok || !validateCents(input.balanceCents).ok) return fail('INVALID_INPUT');
  if(input.balanceCents<0n)return fail('OVERDRAFT_POLICY_REQUIRED');
  if(input.sources.some(p=>!parsePeriod(p).ok||p>=input.target)||new Set(input.sources).size!==input.sources.length)return fail('INVALID_INPUT');
  if(input.mode==='CARRY'&&input.sources.length>1)return fail('OWNER_POLICY_REQUIRED');
  if(input.mode==='CARRY'&&input.sources.length!==1)return fail('TRANSITION_CONFIRMATION_REQUIRED');
  if(input.mode!=='CARRY'&&input.sources.length)return fail('INVALID_INPUT');
  if(new Set(input.allocations.map(a=>a.period)).size!==input.allocations.length)return fail('DUPLICATE_PERIOD');
  for(const a of input.allocations){if(!parsePeriod(a.period).ok||!validateCents(a.amountCents).ok)return fail('MONEY_RANGE');if(a.amountCents<0n)return fail('NEGATIVE_CASH_ALLOCATION');}
  const before=new Map(base.allocations.map(a=>[a.period,a.amountCents])),after=new Map(input.allocations.map(a=>[a.period,a.amountCents]));
  const periods=[...new Set([...before.keys(),...after.keys(),...base.funding.map(f=>f.period)])].sort();
  const past=[...new Set([...before.keys(),...base.funding.map(f=>f.period)])].filter(p=>p<input.target).sort();
  const changed=periods.filter(p=>(before.get(p)??0n)!==(after.get(p)??0n));
  const moving=base.funding.filter(f=>input.mode==='CARRY'?input.sources.includes(f.period):input.mode==='FRESH_START'&&past.includes(f.period));
  const relevant=input.mode==='REDISTRIBUTE'?base.funding.filter(f=>f.period<input.target&&changed.includes(f.period)):input.mode==='DEFER'?[]:moving;
  if(!sameFundingRefs(input.fundingRefs,relevant))return fail('TRANSITION_CONFIRMATION_REQUIRED');
  if(input.observationMode==='REUSE_CONFIRMED'&&input.balanceCents!==base.balanceCents)return fail('HISTORICAL_STATE_CONFLICT');
  if(input.mode==='CARRY'){
    const source=input.sources[0];
    if((after.get(source)??0n)!==0n)return fail('TRANSITION_CONFIRMATION_REQUIRED');
    if(input.observationMode==='REUSE_CONFIRMED'){
      const target=addCents(before.get(input.target)??0n,before.get(source)??0n);if(!target.ok)return fail('MONEY_RANGE');
      if((after.get(input.target)??0n)!==target.value||changed.some(p=>p!==source&&p!==input.target))return fail('TRANSITION_CONFIRMATION_REQUIRED');
    }else if(changed.some(p=>p!==source&&p!==input.target))return fail('TRANSITION_CONFIRMATION_REQUIRED');
  }
  const future=periods.filter(p=>p>input.target);
  if(input.mode==='FRESH_START'){
    if(input.observationMode!=='ACTUAL_CHECK')return fail('TRANSITION_CONFIRMATION_REQUIRED');
    if(input.allocations.some(a=>a.period<input.target&&a.amountCents!==0n))return fail('TRANSITION_CONFIRMATION_REQUIRED');
    const edits=input.futureEdits;
    if(new Set(edits.map(e=>e.period)).size!==edits.length)return fail('FUTURE_ALLOCATION_REVIEW_REQUIRED');
    const futureChanged=future.filter(p=>changed.includes(p));
    if(edits.length!==futureChanged.length||edits.some(e=>!futureChanged.includes(e.period)||e.explicitConsent!==true||e.beforeAmountCents!==(before.get(e.period)??0n)||e.afterAmountCents!==(after.get(e.period)??0n)))return fail('FUTURE_ALLOCATION_REVIEW_REQUIRED');
    const retained=sumCents(future.filter(p=>!futureChanged.includes(p)).map(p=>before.get(p)??0n));
    if(!retained.ok)return fail('MONEY_RANGE');if(retained.value>input.balanceCents)return fail('PRESERVED_ALLOCATION_CONFLICT');
  }else if(input.futureEdits.length)return fail('FUTURE_ALLOCATION_REVIEW_REQUIRED');
  const sum=sumCents(input.allocations.map(a=>a.amountCents));if(!sum.ok)return fail('MONEY_RANGE');if(sum.value!==input.balanceCents)return fail('ALLOCATION_SUM_MISMATCH');
  return {ok:true,value:{affectedPast:past,moving,preservedFuture:future.filter(p=>!changed.includes(p)).map(period=>({period,amountCents:before.get(period)??0n}))}};
}
/** Preview totals only; safe/daily projections remain HB-014. */
export function periodFree(allocated:bigint,reserved:bigint,savings:bigint){const e=addCents(reserved,savings);return e.ok?subtractCents(allocated,e.value):e;}
export function sameDocument(a:unknown,b:unknown):boolean {try{return encodeCanonical(a as never)===encodeCanonical(b as never);}catch{return false;}}
