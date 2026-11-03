import { planConfirmation } from '@/domain/checkpoints/confirmation';
import { planPosition } from '@/domain/checkpoints/placement';
import { indexHistory, selectState, validateHistoricalStates, correctionTips } from '@/domain/checkpoints/history';
import { selectObligationState, validateLifecycleHistory } from '@/domain/obligations/history';
import { selectSavingState, validateSavingHistory } from '@/domain/savings/history';
import { transition as obligationTransition, validState as validObligation, snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { transition as savingTransition, validState as validSaving, snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { planAllocationChange } from '@/domain/transitions/planning';
import { assembleSnapshot } from '@/domain/forecast/assembly';
import { projectAccount } from '@/domain/forecast/budget';
import { parseInstant } from '@/shared/pure/instant';
import { MAX_CENTS } from '@/domain/money/money';
import type { CanonicalValue } from '@/domain/updates/contracts';
import type { ObligationEvent, ObligationState } from '@/domain/obligations/contracts';
import type { SavingEvent, SavingState } from '@/domain/savings/contracts';
import type { FundingState, FundingProof } from '@/domain/transitions/contracts';
import type { Result } from '@/shared/pure/result';
import type { BudgetContext, BudgetDraft, BudgetError, CandidateCoordinates, CandidatePlan } from './contracts';

class Refusal extends Error { constructor(readonly code:BudgetError){super(code);} }
function checked<T>(r:Result<T,BudgetError>):T {if(!r.ok)throw new Refusal(r.code);return r.value;}
function fail(code:BudgetError):never {throw new Refusal(code);}
function wire(value:unknown):CanonicalValue {return JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v));}

/** Pure aggregate composition of the existing financial selectors/lifecycles/forecast. */
export function planBudgetUpdate(context:BudgetContext,draft:BudgetDraft,c:CandidateCoordinates):Result<CandidatePlan,BudgetError> {
  try {
    const h=context.history;
    if(context.revision>=MAX_CENTS||context.recordedSeq>=MAX_CENTS||c.seq!==context.recordedSeq+1n)fail('REVISION_RANGE');
    if(draft.knowledgeCut!==context.recordedSeq||h.knowledgeCut!==context.recordedSeq)fail('STALE_REVISION');
    if(draft.effectiveDate>context.today)fail('INVALID_INPUT');
    const originalBank=checked(selectState(h,context.today));
    if((originalBank.vector?.id??null)!==context.activeVectorId||(originalBank.checkpoint?.id??null)!==draft.baseCheckpointId
      ||(originalBank.vector?.id??null)!==draft.baseVectorId)fail('HISTORICAL_STATE_CONFLICT');
    const oh={...h,events:context.obligations},sh={...h,savings:context.savings};
    const originalO=checked(selectObligationState(oh,context.today)).states,originalS=checked(selectSavingState(sh,context.today)).states;
    const periods=[...context.periods],periodById=new Map(periods.map(p=>[p.id,p.period]));
    function period(key:string){const old=periods.find(p=>p.period===key);if(old)return old.id;
      const id=c.id('period:'+key);periods.push({id,period:key});periodById.set(id,key);return id;}
    const positionId=c.id('position'),vectorId=c.id('vector'),actual=draft.checkpoint??draft.allocationChange?.checkpoint??null;
    for(const a of actual?.allocations??draft.allocationChange?.allocations??[])period(a.period);
    let moving:readonly FundingState[]=[];
    let sourcePeriodIds:readonly string[]=[];
    const input=draft.allocationChange;
    if(input){
      period(input.target);
      if(!originalBank.vector||!originalBank.checkpoint)fail('HISTORICAL_STATE_CONFLICT');
      if(input.target!==context.today.slice(0,7))fail('TARGET_PERIOD_CHANGED');
      if(input.mode!=='REDISTRIBUTE'&&draft.effectiveDate.slice(0,7)!==input.target)fail('HISTORICAL_FUNDING_CONFLICT');
      const funding:FundingState[]=[...originalO.filter(e=>e.status==='UNPAID').map(e=>({kind:'OBLIGATION' as const,identityId:e.obligationId,revisionId:e.id,period:periodById.get(e.fundingPeriodId)!,state:obligationSnapshot(e)})),
        ...originalS.filter(e=>e.status==='ACTIVE').map(e=>({kind:'SAVING' as const,identityId:e.savingsId,revisionId:e.id,period:periodById.get(e.fundingPeriodId)!,state:savingSnapshot(e)}))];
      if(funding.some(f=>!f.period))fail('HISTORICAL_FUNDING_CONFLICT');
      const allocationPlan=checked(planAllocationChange({balanceCents:originalBank.checkpoint.balanceCents,allocations:originalBank.vector.allocations,
        checkpointId:originalBank.checkpoint.id,vectorId:originalBank.vector.id,funding},input));
      moving=allocationPlan.moving;
      sourcePeriodIds=(input.mode==='CARRY'?input.sources:input.mode==='FRESH_START'?allocationPlan.affectedPast:[]).map(period);
      // The funding set is derived BEFORE payment/cancellation/release can hide an identity.
      if(moving.some(f=>f.kind==='OBLIGATION'?draft.obligations.some(e=>e.obligationId===f.identityId):draft.savings.some(e=>e.savingsId===f.identityId)))fail('SAME_IDENTITY_COMPOUND_NOT_SUPPORTED');
    }
    const instant=parseInstant(c.now);if(!instant.ok)fail('INVALID_INPUT');
    const cp=actual?checked(planConfirmation(h,actual,c.seq,{checkpointId:c.id('checkpoint'),vectorId,positionId,orderingId:c.id('order'),oldDayOrderingId:c.id('old-order')},context.today,instant.value)):null;
    let history=cp?.history??checked(planPosition(h,draft.effectiveDate,c.seq,positionId,c.id('order'),input?.placement??null)).history;
    if(!cp){if(!input||!originalBank.checkpoint||!originalBank.vector)fail('HISTORICAL_STATE_CONFLICT');
      history={...history,vectors:[...history.vectors,{id:vectorId,logicalFactId:vectorId,supersedesId:null,recordedSeq:c.seq,positionId,
        checkpointId:originalBank.checkpoint.id,previousRevisionId:originalBank.vector.id,effectiveDate:draft.effectiveDate,allocations:input.allocations}]};checked(validateHistoricalStates(history));}
    const checkpointId=cp?.checkpoint.id??originalBank.checkpoint!.id;
    const index=checked(indexHistory(history));
    const atO=checked(selectObligationState({...history,events:context.obligations},draft.effectiveDate,positionId)).states;
    const atS=checked(selectSavingState({...history,savings:context.savings},draft.effectiveDate,positionId)).states;
    const events:ObligationEvent[]=[],savings:SavingEvent[]=[];
    for(const change of draft.obligations){
      const previous=change.obligationId?atO.find(e=>e.obligationId===change.obligationId):undefined;
      if(change.action!=='CREATE'&&(!previous||previous.id!==change.expectedStateRevisionId))fail('STALE_OBLIGATION');
      if(previous&&index.compare(previous.positionId,positionId)>=0)fail('ORDERING_CONFLICT');
      const data=change.data;
      const state:ObligationState=change.action==='CREATE'?{originatingPeriodId:period(String(data.originatingPeriod)),fundingPeriodId:period(String(data.fundingPeriod)),title:String(data.title),dueDate:data.dueDate as ObligationState['dueDate'],originalCents:data.originalCents as bigint,outstandingCents:data.originalCents as bigint,status:'UNPAID',isPossible:data.isPossible as boolean,reserveFull:data.reserveFull as boolean}
        :checked(obligationTransition(previous!,change.action as Exclude<typeof change.action,'CREATE'>,data));
      if(!validObligation(state))fail('INVALID_OBLIGATION');
      if(change.bankDate&&change.bankDate>context.today)fail('INVALID_OBLIGATION');
      if(change.paymentConfirmation){
        if(!actual)fail('PAYMENT_CONFIRMATION_REQUIRED');
        const tips=checked(correctionTips(h.checkpoints,h.knowledgeCut));
        const prior=tips.filter(e=>index.compare(e.positionId,positionId)<0).sort((a,b)=>index.compare(a.positionId,b.positionId)).at(-1);
        if((prior?.balanceCents===actual.balanceCents&&!change.paymentConfirmation.unchangedBalanceAcknowledged)
          ||(change.paymentConfirmation.source==='OUTSIDE_TRACKED_CARD'&&(!prior||prior.balanceCents!==actual.balanceCents||!change.paymentConfirmation.unchangedBalanceAcknowledged)))fail('PAYMENT_CONFIRMATION_REQUIRED');
      }
      const id=c.id(change.key),identityId=previous?.obligationId??c.id('identity:'+change.key);
      events.push({...state,id,obligationId:identityId,logicalFactId:id,supersedesId:null,previousRevisionId:previous?.id??null,
        beforeState:previous?obligationSnapshot(previous):null,positionId,effectiveDate:draft.effectiveDate,bankDate:change.bankDate,
        confirmedAt:c.now,recordedSeq:c.seq,budgetUpdateId:c.batchId,action:change.action,
        payment:change.paymentConfirmation?{...change.paymentConfirmation,amountCents:data.amountCents as bigint,checkpointId,beforeRevisionId:previous!.id,afterRevisionId:id}:null});
    }
    for(const change of draft.savings){
      const previous=change.savingsId?atS.find(e=>e.savingsId===change.savingsId):undefined;
      if(change.action!=='CREATE'&&(!previous||previous.id!==change.expectedStateRevisionId))fail('STALE_SAVING');
      if(previous&&index.compare(previous.positionId,positionId)>=0)fail('ORDERING_CONFLICT');
      const data=change.data;
      const state:SavingState=change.action==='CREATE'?{originatingPeriodId:period(String(data.originatingPeriod)),fundingPeriodId:period(String(data.fundingPeriod)),title:String(data.title),amountCents:data.amountCents as bigint,status:'ACTIVE'}
        :checked(savingTransition(previous!,change.action as Exclude<typeof change.action,'CREATE'>,data));
      if(!validSaving(state))fail('INVALID_SAVING');
      const id=c.id(change.key);
      savings.push({...state,id,savingsId:previous?.savingsId??c.id('identity:'+change.key),logicalFactId:id,supersedesId:null,
        previousRevisionId:previous?.id??null,beforeState:previous?savingSnapshot(previous):null,positionId,effectiveDate:draft.effectiveDate,
        confirmedAt:c.now,recordedSeq:c.seq,budgetUpdateId:c.batchId,action:change.action,
        confirmedIncreaseAmount:change.action==='INCREASE'?data.amountCents as bigint:null,
        confirmedReleasedAmount:['PARTIAL_RELEASE','FULL_RELEASE'].includes(change.action)?data.amountCents as bigint:null});
    }
    for(const f of moving){
      const id=c.id('funding:'+f.kind+':'+f.identityId),previous=f.kind==='OBLIGATION'?originalO.find(e=>e.id===f.revisionId)!:originalS.find(e=>e.id===f.revisionId)!;
      const target=period(input!.target),decisionId=c.id('decision');
      const proof:FundingProof={decisionId,budgetUpdateId:c.batchId,positionId,sourcePeriodId:previous.fundingPeriodId,targetPeriodId:target,beforeRevisionId:previous.id,afterRevisionId:id};
      const common={id,logicalFactId:id,supersedesId:null,previousRevisionId:previous.id,positionId,effectiveDate:draft.effectiveDate,confirmedAt:c.now,
        recordedSeq:c.seq,budgetUpdateId:c.batchId,transitionDecisionId:decisionId,fundingProof:proof};
      if(f.kind==='OBLIGATION'){const old=previous as ObligationEvent;events.push({...old,...checked(obligationTransition(old,'FUNDING_TRANSFER',{fundingPeriodId:target})),...common,action:'FUNDING_TRANSFER',beforeState:obligationSnapshot(old),payment:null,bankDate:null});}
      else{const old=previous as SavingEvent;savings.push({...old,...checked(savingTransition(old,'FUNDING_TRANSFER',{fundingPeriodId:target})),...common,action:'FUNDING_TRANSFER',beforeState:savingSnapshot(old),confirmedIncreaseAmount:null,confirmedReleasedAmount:null});}
    }
    const candidateO={...history,events:[...context.obligations,...events]},candidateS={...history,savings:[...context.savings,...savings]};
    checked(validateLifecycleHistory(candidateO));checked(validateSavingHistory(candidateS));
    const current=checked(selectState(history,context.today));
    const allO=candidateO.events,allS=candidateS.savings;
    const unique=<T>(a:readonly T[],key:(x:T)=>string)=>[...new Map(a.map(x=>[key(x),x])).values()];
    const identity=(id:string,originatingPeriodId:string,recordedSeq:bigint)=>({id,...context.scope,originatingPeriodId,recordedSeq});
    const snapshot=assembleSnapshot({scope:context.scope,asOfDate:context.today,capturedSeq:c.seq,capturedAggregateRevision:context.revision+1n,
      activeAllocationRevisionId:current.vector?.id??null,obligationHistory:candidateO,savingHistory:candidateS,
      obligationIdentities:unique(allO.filter(e=>e.action==='CREATE'),e=>e.obligationId).map(e=>identity(e.obligationId,e.originatingPeriodId,e.recordedSeq)),
      savingIdentities:unique(allS.filter(e=>e.action==='CREATE'),e=>e.savingsId).map(e=>identity(e.savingsId,e.originatingPeriodId,e.recordedSeq)),
      periods:periods.map(p=>({...p,...context.scope}))});
    const projected=projectAccount(snapshot,context.today);
    if(!projected.ok)fail(projected.code==='MONEY_RANGE'?'MONEY_RANGE':'HISTORICAL_STATE_CONFLICT');
    // Review excludes generated batch time/seq; immutable source refs and every business input remain pinned.
    const review=wire({schemaVersion:1,baseCheckpointId:draft.baseCheckpointId,baseVectorId:draft.baseVectorId,
      asOfDate:context.today,effectiveDate:draft.effectiveDate,bank:{balanceCents:actual?.balanceCents??originalBank.checkpoint!.balanceCents,observedDate:actual?.observedDate??originalBank.checkpoint!.observedDate},
      allocations:actual?.allocations??input!.allocations,mode:input?.mode??'ACTUAL_CHECK',
      fundingPeriods:periods.filter(p=>[...events,...savings].some(e=>e.fundingPeriodId===p.id||(e.beforeState as {fundingPeriodId?:string}|null)?.fundingPeriodId===p.id))
        .map(p=>({id:p.id,period:p.period})).sort((a,b)=>a.period.localeCompare(b.period)),
      obligations:events.map(e=>({action:e.action,before:e.beforeState,after:obligationSnapshot(e),payment:e.payment?{amountCents:e.payment.amountCents,source:e.payment.source,bankStateAffirmed:true,unchangedBalanceAcknowledged:e.payment.unchangedBalanceAcknowledged}:null})),
      savings:savings.map(e=>({action:e.action,before:e.beforeState,after:savingSnapshot(e),confirmedIncreaseAmount:e.confirmedIncreaseAmount,confirmedReleasedAmount:e.confirmedReleasedAmount})),
      projection:projected.value.kind==='ACCOUNT_ESTIMATE'?{bank:projected.value.bank,periods:projected.value.periods,safe:projected.value.currentLiquidity,freshness:projected.value.freshness}:projected.value});
    return {ok:true,value:{history,positionId,checkpointId,vectorId,checkpointPlan:cp,obligations:events,savings,periods,review,sourcePeriodIds,placement:actual?.placement??input?.placement??null}};
  } catch(e){return {ok:false,code:e instanceof Refusal?e.code:'HISTORICAL_STATE_CONFLICT'};}
}
