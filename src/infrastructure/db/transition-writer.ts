import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parseTransition } from '@/domain/transitions/validation';
import { sameDocument } from '@/domain/transitions/planning';
import type { FundingProof } from '@/domain/transitions/contracts';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { savingAuditAfter } from '@/domain/savings/evidence';
import type { ObligationEvent } from '@/domain/obligations/contracts';
import type { SavingEvent } from '@/domain/savings/contracts';
import { validateLifecycleHistory } from '@/domain/obligations/history';
import { validateSavingHistory } from '@/domain/savings/history';
import { databaseToday, loadTransitionState, reviewTransition, jsonDocument } from './transition-state';
import { ensurePeriod, persistAllocation } from './allocation-writer';
import { transitionReportImpact } from './transition-reports';
import { rejectBatch, type BatchWriter } from './commit';
import * as s from './schema';
export function confirmationDocument(command:{expectedRevision:bigint;effectiveDate:string;reason:string;payload:unknown}){return jsonDocument({expectedRevision:command.expectedRevision,effectiveDate:command.effectiveDate,reason:command.reason,payload:command.payload});}
export const writeTransition:BatchWriter=async(tx,batch)=>{
  const payload=batch.command.payload;
  if(!exactKeys(payload,['proposalId','proposalIdentity','input','review']))return rejectBatch('INVALID_INPUT');
  const scope={ownerUserId:batch.account.ownerUserId,accountId:batch.account.id};
  const [proposal]=await tx.select().from(s.transferProposals).where(and(eq(s.transferProposals.ownerUserId,scope.ownerUserId),eq(s.transferProposals.accountId,scope.accountId),eq(s.transferProposals.id,String(payload.proposalId)))).for('update');
  if(!proposal)return rejectBatch('FORBIDDEN');
  const cancelled=await tx.select().from(s.transferProposalCancellations).where(eq(s.transferProposalCancellations.proposalId,proposal.id));if(cancelled.length)return rejectBatch('PROPOSAL_CANCELLED');
  const doc=proposal.proposal as {input:unknown;review:unknown;reason:string;effectiveDate:string};
  if(proposal.payloadIdentity!==payload.proposalIdentity||!sameDocument(doc.input,payload.input)||!sameDocument(doc.review,payload.review)||doc.reason!==batch.command.reason||doc.effectiveDate!==batch.command.effectiveDate)return rejectBatch('STALE_PROPOSAL');
  const input=parseTransition(payload.input);if(!input.ok)return rejectBatch(input.code);
  const clock=await databaseToday(tx),state=await loadTransitionState(tx,scope,batch.account.recordedSeq,clock.today);
  if(state.base.vectorId!==batch.account.activeAllocationRevisionId)return rejectBatch('HISTORICAL_STATE_CONFLICT');
  const reviewed=reviewTransition(state,input.value,clock.today);if(!sameDocument(reviewed.review,doc.review))return rejectBatch('STALE_PROPOSAL');
  const p=input.value;
  // Keep exact historical suffix semantics. Unsupported compound/reposition corrections never rebase.
  const persisted=await persistAllocation(tx,batch,state.oh,p,clock),audit:AuditDescriptor[]=[...persisted.audit];
  const targetPeriodId=await ensurePeriod(tx,scope,p.target),sourcePeriods=p.mode==='CARRY'?p.sources:p.mode==='FRESH_START'?reviewed.plan.affectedPast:[];
  const sourcePeriodIds=[];for(const period of sourcePeriods)sourcePeriodIds.push(await ensurePeriod(tx,scope,period));
  const decisionId=p.mode==='REDISTRIBUTE'?null:randomUUID(),proofs:FundingProof[]=[],events:ObligationEvent[]=[],savings:SavingEvent[]=[];
  for(const f of reviewed.plan.moving){
    if(!decisionId)return rejectBatch('TRANSITION_CONFIRMATION_REQUIRED');
    const id=randomUUID(),previous=f.kind==='OBLIGATION'?state.obligations.find(e=>e.id===f.revisionId):state.savings.find(e=>e.id===f.revisionId);
    if(!previous)return rejectBatch('STALE_PROPOSAL');
    const proof:FundingProof={decisionId,budgetUpdateId:batch.id,positionId:persisted.positionId,sourcePeriodId:previous.fundingPeriodId,targetPeriodId,beforeRevisionId:previous.id,afterRevisionId:id};proofs.push(proof);
    const common={id,budgetUpdateId:batch.id,logicalFactId:id,supersedesId:null,previousRevisionId:previous.id,positionId:persisted.positionId,effectiveDate:p.effectiveDate,
      confirmedAt:batch.recordedAt,recordedSeq:batch.recordedSeq,transitionDecisionId:decisionId,fundingProof:proof,fundingPeriodId:targetPeriodId};
    const base={...scope,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq};
    if(f.kind==='OBLIGATION'){
      const old=previous as ObligationEvent,event:ObligationEvent={...old,...common,action:'FUNDING_TRANSFER',beforeState:obligationSnapshot(old),payment:null,bankDate:null};events.push(event);
      const {fundingProof:unused,payment:unusedPayment,originatingPeriodId:unusedOrigin,...row}=event;void unused;void unusedPayment;void unusedOrigin;
      await tx.insert(s.obligationEvents).values({...base,...row});
      audit.push({entityType:'OBLIGATION_STATE',entityId:id,before:event.beforeState,after:{state:obligationSnapshot(event),payment:null,effectiveDate:event.effectiveDate,positionId:event.positionId,bankDate:null,supersedesId:null,confirmedAt:event.confirmedAt}});
      audit.push({entityType:'FUNDING_TRANSFER',entityId:id,before:event.beforeState,after:{state:obligationSnapshot(event),proof:{...proof}}});
    }else{
      const old=previous as SavingEvent,event:SavingEvent={...old,...common,budgetUpdateId:batch.id,action:'FUNDING_TRANSFER',beforeState:savingSnapshot(old),confirmedIncreaseAmount:null,confirmedReleasedAmount:null};savings.push(event);
      const {fundingProof:unused,originatingPeriodId:unusedOrigin,confirmedIncreaseAmount:unusedIncrease,confirmedReleasedAmount:unusedRelease,...row}=event;void unused;void unusedOrigin;void unusedIncrease;void unusedRelease;
      await tx.insert(s.savingsEvents).values({...base,...row});
      audit.push({entityType:'SAVINGS_STATE',entityId:id,before:event.beforeState,after:savingAuditAfter(event)});
      audit.push({entityType:'FUNDING_TRANSFER',entityId:id,before:event.beforeState,after:{state:savingSnapshot(event),proof:{...proof}}});
    }
  }
  const oh={...persisted.history,events:[...state.oh.events,...events]},sh={...persisted.history,savings:[...state.sh.savings,...savings]};
  const validO=validateLifecycleHistory(oh),validS=validateSavingHistory(sh);if(!validO.ok)return rejectBatch(validO.code);if(!validS.ok)return rejectBatch(validS.code);
  if(decisionId){
    await tx.insert(s.transitionDecisions).values({...scope,id:decisionId,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq,proposalId:proposal.id,mode:p.mode,observationMode:p.observationMode,
      beforeAllocationRevisionId:state.base.vectorId,afterAllocationRevisionId:persisted.vectorId,positionId:persisted.positionId,confirmedAt:batch.recordedAt,reason:batch.command.reason,
      manifest:jsonDocument({schemaVersion:1,targetPeriodId,sourcePeriodIds,funding:proofs,review:reviewed.review})});
    audit.push({entityType:'TRANSITION_DECISION',entityId:decisionId,before:null,after:jsonDocument({mode:p.mode,observationMode:p.observationMode,review:reviewed.review,funding:proofs})});
    if(p.mode==='CARRY'){
      const transferId=randomUUID();await tx.insert(s.budgetTransfers).values({...scope,id:transferId,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq,proposalId:proposal.id,decisionId,
        sourcePeriodId:sourcePeriodIds[0],targetPeriodId,beforeAllocationRevisionId:state.base.vectorId,afterAllocationRevisionId:persisted.vectorId,confirmedAt:batch.recordedAt,fundingManifest:jsonDocument(proofs)});
      audit.push({entityType:'BUDGET_TRANSFER',entityId:transferId,before:null,after:jsonDocument({proposalId:proposal.id,decisionId,sourcePeriodIds,targetPeriodId,funding:proofs})});
    }
  }
  audit.push(...await transitionReportImpact(tx,scope,state.oh,oh,state.sh,sh));
  audit.push({entityType:'TRANSITION_CONFIRMATION',entityId:proposal.id,before:null,after:jsonDocument({schemaVersion:1,confirmation:confirmationDocument(batch.command),proposalIdentity:proposal.payloadIdentity,
    decisionId,checkpointId:persisted.checkpointId,vectorId:persisted.vectorId,funding:proofs})});
  return audit;
};
