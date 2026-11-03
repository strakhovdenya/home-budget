import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import type { BudgetContext, BudgetDraft, CandidatePlan } from '@/domain/budget-update/contracts';
import { selectState } from '@/domain/checkpoints/history';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { savingAuditAfter } from '@/domain/savings/evidence';
import { snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { persistCheckpointPlan } from './checkpoint-persistence';
import { transitionReportImpact } from './transition-reports';
import { jsonDocument } from './transition-state';
import { rejectBatch, type BatchContext, type Transaction } from './commit';
import * as s from './schema';

/** Persist ONLY the fully validated aggregate plan, on the existing account-locked transaction. */
export async function persistBudgetPlan(tx:Transaction,batch:BatchContext,context:BudgetContext,draft:BudgetDraft,plan:CandidatePlan,proposalId:string|null):Promise<AuditDescriptor[]> {
  const scope=context.scope,base={...scope,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq};
  // Stable planned period IDs must exist before either the checkpoint or lifecycle helpers use them.
  const existing=new Set(context.periods.map(p=>p.id));
  for(const p of plan.periods)if(!existing.has(p.id))await tx.insert(s.budgetPeriods).values({...scope,...p});
  const before=selectState(context.history,context.today);if(!before.ok)return rejectBatch(before.code);
  const audits:AuditDescriptor[]=[];
  if(plan.checkpointPlan)audits.push(...await persistCheckpointPlan(tx,batch,context.history,plan.checkpointPlan,before.value,false));
  else{
    const position=plan.history.positions.find(p=>p.id===plan.positionId)!,order=plan.history.orderings.find(o=>o.recordedSeq===batch.recordedSeq&&o.positionIds.includes(plan.positionId))!;
    await tx.insert(s.historicalPositions).values({...base,id:position.id,historicalDate:position.historicalDate,kind:'ALLOCATION'});
    await tx.insert(s.orderingRevisions).values({...base,id:order.id,historicalDate:order.historicalDate,previousRevisionId:order.previousRevisionId,
      manifest:{schemaVersion:1,positionIds:order.positionIds},dependencies:{schemaVersion:1,edges:order.edges}});
    const v=plan.history.vectors.find(v=>v.id===plan.vectorId)!;
    await tx.insert(s.allocationRevisions).values({...base,...v,changeKind:draft.allocationChange!.mode,confirmedAt:batch.recordedAt});
    for(const a of v.allocations)await tx.insert(s.periodAllocations).values({...scope,id:crypto.randomUUID(),allocationRevisionId:v.id,
      periodId:plan.periods.find(p=>p.period===a.period)!.id,amountCents:a.amountCents});
    const active=selectState(plan.history,context.today);if(!active.ok)return rejectBatch(active.code);
    await tx.update(s.accounts).set({activeAllocationRevisionId:active.value.vector?.id??null}).where(and(eq(s.accounts.id,scope.accountId),eq(s.accounts.ownerUserId,scope.ownerUserId)));
    audits.push({entityType:'DAY_ORDERING',entityId:order.id,before:{revisionId:order.previousRevisionId},after:jsonDocument(order)},
      {entityType:'ALLOCATION_REVISION',entityId:v.id,before:before.value.vector?jsonDocument(before.value.vector):null,after:jsonDocument(v)},
      {entityType:'BANK_HEAD',entityId:scope.accountId,before:{allocationRevisionId:context.activeVectorId},after:{allocationRevisionId:active.value.vector?.id??null}});
  }
  for(const e of plan.obligations){
    if(e.action==='CREATE')await tx.insert(s.obligations).values({...base,id:e.obligationId,originatingPeriodId:e.originatingPeriodId});
    const {payment,fundingProof,originatingPeriodId,...row}=e;void originatingPeriodId;
    await tx.insert(s.obligationEvents).values({...base,...row});
    audits.push({entityType:'OBLIGATION_STATE',entityId:e.id,before:e.beforeState,after:{state:obligationSnapshot(e),payment:payment?{...payment}:null,
      effectiveDate:e.effectiveDate,positionId:e.positionId,bankDate:e.bankDate,supersedesId:e.supersedesId,confirmedAt:e.confirmedAt}});
    if(fundingProof)audits.push({entityType:'FUNDING_TRANSFER',entityId:e.id,before:e.beforeState,after:{state:obligationSnapshot(e),proof:{...fundingProof}}});
  }
  for(const e of plan.savings){
    if(e.action==='CREATE')await tx.insert(s.savingsGoals).values({...base,id:e.savingsId,originatingPeriodId:e.originatingPeriodId});
    const {fundingProof,originatingPeriodId,confirmedIncreaseAmount,confirmedReleasedAmount,...row}=e;void originatingPeriodId;void confirmedIncreaseAmount;void confirmedReleasedAmount;
    await tx.insert(s.savingsEvents).values({...base,...row});
    audits.push({entityType:'SAVINGS_STATE',entityId:e.id,before:e.beforeState,after:savingAuditAfter(e)});
    if(fundingProof)audits.push({entityType:'FUNDING_TRANSFER',entityId:e.id,before:e.beforeState,after:{state:savingSnapshot(e),proof:{...fundingProof}}});
  }
  const change=draft.allocationChange;
  if(change&&change.mode!=='REDISTRIBUTE'){
    if(!proposalId)return rejectBatch('STALE_PROPOSAL');
    const decisionId=[...plan.obligations,...plan.savings].find(e=>e.transitionDecisionId)?.transitionDecisionId??crypto.randomUUID();
    const targetPeriodId=plan.periods.find(p=>p.period===change.target)?.id;
    if(!targetPeriodId)return rejectBatch('HISTORICAL_FUNDING_CONFLICT');
    const funding=[...plan.obligations,...plan.savings].flatMap(e=>e.fundingProof?[e.fundingProof]:[]);
    const sourcePeriodIds=plan.sourcePeriodIds;
    await tx.insert(s.transitionDecisions).values({...base,id:decisionId,proposalId,mode:change.mode,observationMode:change.observationMode,
      beforeAllocationRevisionId:draft.baseVectorId,afterAllocationRevisionId:plan.vectorId,positionId:plan.positionId,confirmedAt:batch.recordedAt,
      reason:batch.command.reason,manifest:jsonDocument({schemaVersion:1,targetPeriodId,sourcePeriodIds,funding,review:plan.review})});
    audits.push({entityType:'TRANSITION_DECISION',entityId:decisionId,before:null,after:jsonDocument({mode:change.mode,observationMode:change.observationMode,funding,review:plan.review})});
    if(change.mode==='CARRY'){const transfer={...base,id:crypto.randomUUID(),proposalId,decisionId,
      sourcePeriodId:plan.periods.find(p=>p.period===change.sources[0])!.id,targetPeriodId,beforeAllocationRevisionId:draft.baseVectorId!,
      afterAllocationRevisionId:plan.vectorId,confirmedAt:batch.recordedAt,fundingManifest:jsonDocument(funding)};
      await tx.insert(s.budgetTransfers).values(transfer);
      audits.push({entityType:'BUDGET_TRANSFER',entityId:transfer.id,before:null,after:jsonDocument(transfer)});
    }
  }
  const oldO={...context.history,events:context.obligations},oldS={...context.history,savings:context.savings};
  audits.push(...await transitionReportImpact(tx,scope,oldO,{...plan.history,events:[...context.obligations,...plan.obligations]},oldS,{...plan.history,savings:[...context.savings,...plan.savings]}));
  audits.push({entityType:'BUDGET_UPDATE_REVIEW',entityId:batch.id,before:null,after:jsonDocument({schemaVersion:1,
    command:{expectedRevision:batch.command.expectedRevision,effectiveDate:batch.command.effectiveDate,reason:batch.command.reason,payload:batch.command.payload},
    review:plan.review,checkpointId:plan.checkpointId,vectorId:plan.vectorId,proposalId})});
  return audits;
}
