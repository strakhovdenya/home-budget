import { normalizeValue } from '@/domain/updates/canonical-value';
import { exactKeys, parseCheckpoint } from '@/domain/checkpoints/validation';
import { validUuid } from '@/domain/updates/validation';
import { parsePeriod } from '@/domain/periods/period';
import { parseCentsString } from '@/domain/money/money-codec';
import { sumCents } from '@/domain/money/money';
import type { Result } from '@/shared/pure/result';
import type { UpdateErrorCode } from '@/domain/updates/contracts';
import type { TransitionInput, FundingRef, FutureEdit } from './contracts';
/** Every money field on this wire contract is a canonical decimal string. */
export function parseTransition(raw:unknown):Result<TransitionInput,UpdateErrorCode>{
  const bad={ok:false,code:'INVALID_INPUT'} as const;
  let v:unknown;try{v=normalizeValue(raw);}catch{return bad;}
  if(!exactKeys(v,['schemaVersion','intent','mode','observationMode','target','sources','balanceCents','allocations','futureEdits','fundingRefs','expectedCheckpointRevisionId','expectedAllocationRevisionId','effectiveDate','checkpoint','placement','consent']))return bad;
  if(v.schemaVersion!==1||!['REDISTRIBUTE','CARRY','FRESH_START','DEFER'].includes(String(v.mode))||!['ACTUAL_CHECK','REUSE_CONFIRMED'].includes(String(v.observationMode))||!parsePeriod(v.target).ok)return bad;
  if(v.intent!==(v.mode==='REDISTRIBUTE'?'ALLOCATION_ONLY':'TRANSITION'))return {ok:false,code:'TRANSITION_CONFIRMATION_REQUIRED'};
  if(!validUuid(v.expectedCheckpointRevisionId)||!validUuid(v.expectedAllocationRevisionId))return bad;
  if(!Array.isArray(v.sources)||v.sources.some(p=>!parsePeriod(p).ok)||!Array.isArray(v.allocations)||v.allocations.some(a=>!exactKeys(a,['period','amountCents'])))return bad;
  const rawBalance=parseCentsString(v.balanceCents);if(!rawBalance.ok)return {ok:false,code:rawBalance.code==='MONEY_RANGE'?'MONEY_RANGE':'INVALID_INPUT'};
  // Reuse HB-010 exact amount/date/placement/instant validation without requiring a fictitious persisted check.
  const amounts=v.allocations.map(a=>parseCentsString((a as Record<string,unknown>).amountCents));
  if(amounts.some(a=>!a.ok))return {ok:false,code:amounts.some(a=>!a.ok&&a.code==='MONEY_RANGE')?'MONEY_RANGE':'INVALID_INPUT'};
  if(amounts.some(a=>a.ok&&a.value<0n))return {ok:false,code:'NEGATIVE_CASH_ALLOCATION'};
  const sum=sumCents(amounts.map(a=>a.ok?a.value:0n));if(!sum.ok)return {ok:false,code:'MONEY_RANGE'};
  // Validate shape/ranges first; state-dependent preservation and exact actual sum are checked by the planner.
  const cp=parseCheckpoint({observedDate:v.effectiveDate,observedAt:null,balanceCents:sum.value.toString(),allocations:v.allocations,correction:null,placement:v.placement});
  if(!cp.ok)return cp;
  const balance=parseCentsString(v.balanceCents);if(!balance.ok)return bad;if(balance.value<0n)return {ok:false,code:'OVERDRAFT_POLICY_REQUIRED'};
  if(!exactKeys(v.consent,['completeVectorConfirmed','fundingUnchangedAcknowledged','transitionConfirmed','fundingConfirmed','nonCarryConfirmed'])||Object.values(v.consent).some(x=>typeof x!=='boolean'))return bad;
  if(v.consent.completeVectorConfirmed!==true||(v.mode==='REDISTRIBUTE'?v.consent.fundingUnchangedAcknowledged!==true:v.consent.transitionConfirmed!==true)
    ||(['CARRY','FRESH_START'].includes(String(v.mode))&&v.consent.fundingConfirmed!==true)||(v.mode==='FRESH_START'&&v.consent.nonCarryConfirmed!==true))return {ok:false,code:'TRANSITION_CONFIRMATION_REQUIRED'};
  if(!Array.isArray(v.fundingRefs)||!Array.isArray(v.futureEdits))return bad;
  const fundingRefs:FundingRef[]=[],futureEdits:FutureEdit[]=[];
  for(const r of v.fundingRefs){if(!exactKeys(r,['kind','identityId','revisionId'])||!['OBLIGATION','SAVING'].includes(String(r.kind))||!validUuid(r.identityId)||!validUuid(r.revisionId))return bad;fundingRefs.push(r as FundingRef);}
  for(const e of v.futureEdits){if(!exactKeys(e,['period','beforeAmountCents','afterAmountCents','explicitConsent'])||!parsePeriod(e.period).ok||e.explicitConsent!==true)return bad;
    const before=parseCentsString(e.beforeAmountCents),after=parseCentsString(e.afterAmountCents);if(!before.ok||!after.ok||before.value<0n||after.value<0n)return bad;
    futureEdits.push({period:String(e.period),beforeAmountCents:before.value,afterAmountCents:after.value,explicitConsent:true});}
  let actual:TransitionInput['checkpoint']=null;
  if(v.observationMode==='ACTUAL_CHECK'){
    if(!exactKeys(v.checkpoint,['observedDate','observedAt','balanceCents','allocations','correction','placement'])||v.checkpoint.balanceCents!==v.balanceCents)return bad;
    const p=parseCheckpoint({...v.checkpoint,balanceCents:sum.value.toString()});if(!p.ok)return p;
    if(p.value.correction||p.value.observedDate!==cp.value.observedDate||JSON.stringify(v.allocations)!==JSON.stringify(v.checkpoint.allocations)||v.placement!==null)return bad;
    actual={...p.value,balanceCents:balance.value};
  }else if(v.checkpoint!==null)return bad;
  if(v.mode==='REDISTRIBUTE'&&v.observationMode!=='REUSE_CONFIRMED')return bad;
  return {ok:true,value:{...v,mode:v.mode as TransitionInput['mode'],intent:v.intent as TransitionInput['intent'],observationMode:v.observationMode as TransitionInput['observationMode'],
    schemaVersion:1,target:String(v.target),sources:v.sources as string[],expectedCheckpointRevisionId:v.expectedCheckpointRevisionId,expectedAllocationRevisionId:v.expectedAllocationRevisionId,balanceCents:balance.value,allocations:cp.value.allocations,effectiveDate:cp.value.observedDate,
    checkpoint:actual,placement:cp.value.placement,fundingRefs,futureEdits,consent:v.consent as TransitionInput['consent']}};
}
