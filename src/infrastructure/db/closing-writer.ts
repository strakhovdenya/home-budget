import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { parseClosingInput } from '@/domain/closing/validation';
import { fail } from '@/domain/closing/serialization';
import type { PreparedCommand, AuthorizedScope } from '@/domain/updates/contracts';
import { closingCandidate, validateOriginal, ownedReport, documentHash, json, type Account, ClosingReadBudget } from './closing-reader';
import { rejectBatch, type Transaction, type BatchContext } from './commit';
import { databaseToday } from './transition-state';
import * as s from './schema';

export async function closingReview(tx:Transaction,scope:AuthorizedScope,account:Account,command:PreparedCommand,b:ClosingReadBudget){
  const input=parseClosingInput(command.payload),clock=await databaseToday(tx);
  if(command.effectiveDate!==clock.today)return rejectBatch('STALE_REVISION');
  if(input.period>=clock.today.slice(0,7))fail('PERIOD_NOT_ENDED');
  if(account.aggregateRevision!==command.expectedRevision||input.knowledgeCut!==account.recordedSeq.toString())return rejectBatch('STALE_REVISION');
  const [period]=await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId,scope.ownerUserId),eq(s.budgetPeriods.accountId,scope.accountId),eq(s.budgetPeriods.period,input.period)));
  const [head]=period?await tx.select().from(s.reportHeads).where(and(eq(s.reportHeads.ownerUserId,scope.ownerUserId),eq(s.reportHeads.accountId,scope.accountId),eq(s.reportHeads.periodId,period.id))):[];
  if((head?.closingId??null)!==input.expectedHeadId)fail('STALE_REPORT_HEAD');
  if(input.operation==='INITIAL'&&head)fail('REPORT_ALREADY_CLOSED');
  if(input.operation==='REVISION'&&!head)fail('STALE_REPORT_HEAD');
  let previous=null;
  if(head){const retained=await ownedReport(tx,scope,head.closingId);
    const [update]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.id,retained.budgetUpdateId)));
    if(!update)fail('REPORT_PROOF_INVALID');previous=(await validateOriginal(tx,scope,account,update,b)).result;
  }
  if((previous?.report.version??null)!==input.expectedHeadVersion)fail('STALE_REPORT_HEAD');
  if((previous?.report.version??0)>=1000)fail('REPORT_LIMIT_EXCEEDED');
  const candidate=await closingCandidate(tx,scope,account,input.period,account.recordedSeq,b);
  if(candidate.basis.historicalThroughDate!==input.historicalThroughDate)fail('REPORT_PROOF_INVALID');
  const before=previous?documentHash(previous.document,b):null,after=documentHash(candidate.document,b);
  if(before===after)fail('NO_REPORT_CHANGE');
  function refs(basis:typeof candidate.basis){return [{type:'CHECKPOINT',id:basis.lastCheckpointId},{type:'ALLOCATION',id:basis.historicalAllocationRevisionId},
    ...basis.obligationRevisionIds.map(id=>({type:'OBLIGATION_STATE',id})),...basis.savingsRevisionIds.map(id=>({type:'SAVINGS_STATE',id})),
    ...basis.orderingRevisionRefs.map(id=>({type:'ORDERING',id}))].filter((x):x is {type:string;id:string}=>x.id!==null);}
  const oldRefs=previous?refs(previous.basis):[],newRefs=refs(candidate.basis),key=(r:{type:string;id:string})=>r.type+':'+r.id;
  const oldKeys=new Set(oldRefs.map(key)),newKeys=new Set(newRefs.map(key));
  const changedRefs=previous?[...oldRefs.filter(r=>!newKeys.has(key(r))),...newRefs.filter(r=>!oldKeys.has(key(r)))].sort((a,c)=>key(a).localeCompare(key(c))):[];
  if(previous&&!changedRefs.length)fail('REPORT_PROOF_INVALID');
  const diff={before,after,changeEvidenceRefs:changedRefs};
  const digest=documentHash({schemaVersion:1,scope,requestId:command.requestId,expectedRevision:command.expectedRevision.toString(),effectiveDate:command.effectiveDate,reason:command.reason,
    operation:input.operation,period:input.period,historicalThroughDate:input.historicalThroughDate,knowledgeCut:input.knowledgeCut,
    expectedHeadId:input.expectedHeadId,expectedHeadVersion:input.expectedHeadVersion,snapshotSchemaVersion:1,selectionContractVersion:1,diff},b);
  return {input,period,head,previous,candidate,diff,digest,budget:b};
}
export async function persistClosing(tx:Transaction,batch:BatchContext,scope:AuthorizedScope,review:Awaited<ReturnType<typeof closingReview>>){
  if(review.digest!==review.input.reviewDigest)fail('REPORT_PROOF_INVALID');
  let periodId=review.period?.id;
  if(!periodId){periodId=randomUUID();await tx.insert(s.budgetPeriods).values({...scope,id:periodId,period:review.input.period});}
  const id=randomUUID(),basis=review.candidate.basis,version=(review.previous?.report.version??0)+1;
  const cents=(v:string|null)=>v===null?null:BigInt(v);
  await tx.insert(s.monthClosings).values({...scope,id,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq,periodId,version,previousVersionId:review.head?.closingId??null,
    historicalThroughDate:basis.historicalThroughDate,closedAt:batch.recordedAt,closedBy:scope.ownerUserId,evidenceRecordedCutoffSeq:batch.account.recordedSeq,evidenceRecordedCutoffAt:batch.recordedAt,
    reason:batch.command.reason,changeEvidenceRefs:review.previous?review.diff.changeEvidenceRefs:[],
    lastCheckpointId:basis.lastCheckpointId,lastBankObservedDate:basis.lastBankObservedDate,lastBankObservedAt:basis.lastBankObservedAt,
    lastObservedBalanceCents:cents(basis.lastObservedBalanceCents),historicalAllocationRevisionId:basis.historicalAllocationRevisionId,allocationEffectiveDate:basis.allocationEffectiveDate,
    endCheckpointId:basis.endCheckpointId,endBalanceCents:cents(basis.endBalanceCents),bankDataCompleteness:basis.bankDataCompleteness,operationDetailStatus:basis.operationDetailStatus,
    historicalAllocatedCents:cents(basis.historicalAllocatedCents),historicalReservedCents:BigInt(basis.historicalReservedCents),historicalSavingsCents:BigInt(basis.historicalSavingsCents),
    historicalFreeCents:cents(basis.historicalFreeCents),snapshotSchemaVersion:1,selectionContractVersion:1,snapshotJson:basis.snapshot,
    sourceManifest:review.candidate.sourceManifest,orderingRevisionRefs:basis.orderingRevisionRefs});
  const headId=review.head?.id??randomUUID();
  if(review.head)await tx.update(s.reportHeads).set({closingId:id,correctionPending:false}).where(and(eq(s.reportHeads.ownerUserId,scope.ownerUserId),eq(s.reportHeads.accountId,scope.accountId),eq(s.reportHeads.id,headId)));
  else await tx.insert(s.reportHeads).values({...scope,id:headId,periodId,closingId:id});
  const command=json({requestId:batch.command.requestId,expectedRevision:batch.command.expectedRevision.toString(),effectiveDate:batch.command.effectiveDate,reason:batch.command.reason,payload:batch.command.payload});
  const audits=[{entityType:'REPORT_VERSION',entityId:id,before:review.diff.before,after:json({schemaVersion:1,reportId:id,version,previousVersionId:review.head?.closingId??null,
    digest:review.diff.after,reviewDigest:review.digest,diff:review.diff,command,knowledgeCut:batch.account.recordedSeq.toString(),cutoffAt:batch.recordedAt})},
  {entityType:'REPORT_HEAD',entityId:headId,before:review.head?{closingId:review.head.closingId,correctionPending:review.head.correctionPending}:null,after:{closingId:id,correctionPending:false}}];
  if(review.budget.metadataBytes+Buffer.byteLength(JSON.stringify(audits),'utf8')+1024>1048576)fail('REPORT_LIMIT_EXCEEDED');
  return audits;
}
