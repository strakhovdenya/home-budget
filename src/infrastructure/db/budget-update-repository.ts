import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, desc, sql } from 'drizzle-orm';
import { normalizeValue, encodeCanonical } from '@/domain/updates/canonical-value';
import { prepareCommand, parseReceipt, validUuid } from '@/domain/updates/validation';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parseBudgetDraft } from '@/domain/budget-update/validation';
import { planBudgetUpdate } from '@/domain/budget-update/planning';
import type { BudgetContext, BudgetDraft } from '@/domain/budget-update/contracts';
import type { AuthorizedScope, PreparedCommand, CommitReceipt } from '@/domain/updates/contracts';
import type { AllocationRevision } from '@/domain/checkpoints/contracts';
import { sameDocument } from '@/domain/transitions/planning';
import { selectObligationState } from '@/domain/obligations/history';
import { selectSavingState } from '@/domain/savings/history';
import { selectState } from '@/domain/checkpoints/history';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { readProjectionContext } from './projection-reader';
import { transitionReportImpact } from './transition-reports';
import { jsonDocument } from './transition-state';
import { loadBudgetContext } from './budget-update-reader';
import { persistBudgetPlan } from './budget-update-writer';
import { commitBatch, BatchFailure, rejectBatch, type Transaction } from './commit';
import * as s from './schema';
import { budgetPresentation } from './budget-update-presentation';

function wire(value:unknown){const doc=jsonDocument(value);if(Buffer.byteLength(JSON.stringify(doc),'utf8')>1024*1024)return rejectBatch('STORAGE_ERROR');return doc;}
function hash(v:unknown){return createHash('sha256').update(encodeCanonical(normalizeValue(v))).digest('hex');}
function coordinates(scope:AuthorizedScope,requestId:string,seq:bigint,batchId:string,now:string){return {seq,batchId,now,id:(key:string)=>{
  const h=hash({scope,requestId,key});return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}};}
function commandDocument(c:PreparedCommand){return wire({expectedRevision:c.expectedRevision,effectiveDate:c.effectiveDate,reason:c.reason,payload:c.payload});}
function parsed(command:PreparedCommand){const payload=command.payload;
  if(!exactKeys(payload,['schemaVersion','draft','review','proposalId'])||payload.schemaVersion!==1
    ||(payload.proposalId!==null&&!validUuid(payload.proposalId)))return rejectBatch('INVALID_INPUT');
  const draft=parseBudgetDraft(payload.draft);if(!draft.ok)return rejectBatch(draft.code);
  if(draft.value.effectiveDate!==command.effectiveDate)return rejectBatch('INVALID_INPUT');return {draft:draft.value,payload};}
export async function planReviewedBudget(tx:Transaction,scope:AuthorizedScope,command:PreparedCommand,context:BudgetContext,draft:BudgetDraft,batchId:string,now:string){
  if(context.revision!==command.expectedRevision)return rejectBatch('STALE_REVISION');
  const result=planBudgetUpdate(context,draft,coordinates(scope,command.requestId,context.recordedSeq+1n,batchId,now));
  if(!result.ok)return rejectBatch(result.code);
  const p=result.value;
  const reports=await transitionReportImpact(tx,scope,{...context.history,events:context.obligations},{...p.history,events:[...context.obligations,...p.obligations]},
    {...context.history,savings:context.savings},{...p.history,savings:[...context.savings,...p.savings]},false);
  return {...p,review:wire({financial:p.review,reportImpact:reports,presentation:budgetPresentation(context,draft,p)})};
}
function isTransition(d:BudgetDraft){return !!d.allocationChange&&d.allocationChange.mode!=='REDISTRIBUTE';}
async function ownedAccount(tx:Transaction,scope:AuthorizedScope){const [a]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId))).for('update');if(!a)return rejectBatch('FORBIDDEN');return a;}
export async function originalEvidence(tx:Transaction,scope:AuthorizedScope,update:typeof s.budgetUpdates.$inferSelect){
  const audits=await tx.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),eq(s.auditEvents.budgetUpdateId,update.id))).limit(5001);
  if(audits.length>5000)return rejectBatch('STORAGE_ERROR');
  const matches=audits.filter(a=>{const d=a.beforeAfter as {entity?:{type?:string;id?:string}};return d?.entity?.type==='BUDGET_UPDATE_REVIEW'&&d.entity.id===update.id;});
  if(matches.length!==1)return rejectBatch('STORAGE_ERROR');const doc=matches[0].beforeAfter as {after?:unknown};
  if(!exactKeys(doc.after,['schemaVersion','command','review','checkpointId','vectorId','proposalId'])||doc.after.schemaVersion!==1)return rejectBatch('STORAGE_ERROR');
  if(hash({owner:scope.ownerUserId,account:scope.accountId,kind:update.kind,...doc.after.command as object})!==update.payloadIdentity)return rejectBatch('STORAGE_ERROR');
  const receipt=parseReceipt(update.result);if(!receipt.ok||receipt.value.updateId!==update.id||receipt.value.recordedSeq!==update.recordedSeq.toString()
    ||receipt.value.aggregateRevision!==(update.expectedRevision+1n).toString())return rejectBatch('STORAGE_ERROR');
  // Validate retained immutable coordinate mapping before any disclosure/replay.
  const [vector]=await tx.select().from(s.allocationRevisions).where(and(eq(s.allocationRevisions.ownerUserId,scope.ownerUserId),eq(s.allocationRevisions.accountId,scope.accountId),eq(s.allocationRevisions.id,String(doc.after.vectorId))));
  if(!vector||vector.budgetUpdateId!==update.id||vector.recordedSeq!==update.recordedSeq||vector.checkpointId!==doc.after.checkpointId)return rejectBatch('STORAGE_ERROR');
  const original=prepareCommand({requestId:update.requestId,...doc.after.command as object});if(!original.ok)return rejectBatch('STORAGE_ERROR');
  const p=parsed(original.value);
  if(!sameDocument(p.payload.review,doc.after.review)||p.payload.proposalId!==doc.after.proposalId)return rejectBatch('STORAGE_ERROR');
  const review=doc.after.review as {financial?:{asOfDate?:unknown};presentation?:unknown};
  const day=parseBerlinDate(review.financial?.asOfDate);if(!day.ok)return rejectBatch('STORAGE_ERROR');
  const [account]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId)));
  if(!account)return rejectBatch('FORBIDDEN');
  const time=await tx.execute<{now:string}>(sql`SELECT to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS now FROM ${s.budgetUpdates} WHERE ${s.budgetUpdates.id}=${update.id}`);
  const baseAccount={...account,recordedSeq:update.recordedSeq-1n,aggregateRevision:update.expectedRevision,activeAllocationRevisionId:p.draft.baseVectorId};
  const baseSource=await readProjectionContext(tx,scope,baseAccount,day.value,baseAccount.recordedSeq);
  const context:BudgetContext={scope,revision:update.expectedRevision,recordedSeq:baseAccount.recordedSeq,activeVectorId:p.draft.baseVectorId,today:day.value,now:time.rows[0].now,
    history:baseSource.history,obligations:baseSource.obligationHistory.events,savings:baseSource.savingHistory.savings,periods:baseSource.periods};
  const rebuilt=planBudgetUpdate(context,p.draft,coordinates(scope,update.requestId,update.recordedSeq,update.id,time.rows[0].now));
  if(!rebuilt.ok||!sameDocument(rebuilt.value.review,review.financial))return rejectBatch('STORAGE_ERROR');
  // Older accepted receipts have no presentation copy. New copies must prove
  // the same original H/K facts, never join today's state into a saved result.
  if(review.presentation!==undefined&&!sameDocument(wire(budgetPresentation(context,p.draft,rebuilt.value)),review.presentation))return rejectBatch('STORAGE_ERROR');
  const plan=rebuilt.value,active=selectState(plan.history,day.value);if(!active.ok)return rejectBatch('STORAGE_ERROR');
  const actual=await readProjectionContext(tx,scope,{...account,recordedSeq:update.recordedSeq,aggregateRevision:update.expectedRevision+1n,activeAllocationRevisionId:active.value.vector?.id??null},day.value,update.recordedSeq);
  const storedVector=actual.history.vectors.find(v=>v.id===plan.vectorId),expectedVector=plan.history.vectors.find(v=>v.id===plan.vectorId);
  const vectorProof=(v:AllocationRevision|undefined)=>v?{id:v.id,logicalFactId:v.logicalFactId,supersedesId:v.supersedesId,
    recordedSeq:v.recordedSeq,positionId:v.positionId,checkpointId:v.checkpointId,previousRevisionId:v.previousRevisionId,
    effectiveDate:v.effectiveDate,allocations:[...v.allocations].sort((a,b)=>a.period.localeCompare(b.period))}:null;
  if(!storedVector||!expectedVector||!sameDocument(vectorProof(storedVector),vectorProof(expectedVector)))return rejectBatch('STORAGE_ERROR');
  for(const e of plan.obligations){const stored=actual.obligationHistory.events.find(x=>x.id===e.id);
    if(!stored||!sameDocument(obligationSnapshot(stored),obligationSnapshot(e))||!sameDocument(stored.payment,e.payment)
      ||!sameDocument(stored.fundingProof??null,e.fundingProof??null)||stored.budgetUpdateId!==update.id)return rejectBatch('STORAGE_ERROR');}
  for(const e of plan.savings){const stored=actual.savingHistory.savings.find(x=>x.id===e.id);
    if(!stored||!sameDocument(savingSnapshot(stored),savingSnapshot(e))||stored.confirmedReleasedAmount!==e.confirmedReleasedAmount
      ||stored.confirmedIncreaseAmount!==e.confirmedIncreaseAmount||!sameDocument(stored.fundingProof??null,e.fundingProof??null)||stored.budgetUpdateId!==update.id)return rejectBatch('STORAGE_ERROR');}
  const decisions=await tx.select().from(s.transitionDecisions).where(and(eq(s.transitionDecisions.ownerUserId,scope.ownerUserId),eq(s.transitionDecisions.accountId,scope.accountId),eq(s.transitionDecisions.budgetUpdateId,update.id))).limit(2);
  const transfers=await tx.select().from(s.budgetTransfers).where(and(eq(s.budgetTransfers.ownerUserId,scope.ownerUserId),eq(s.budgetTransfers.accountId,scope.accountId),eq(s.budgetTransfers.budgetUpdateId,update.id))).limit(2);
  const change=p.draft.allocationChange;
  if(isTransition(p.draft)){
    const d=decisions[0],targetPeriodId=plan.periods.find(x=>x.period===change!.target)?.id;
    const funding=[...plan.obligations,...plan.savings].flatMap(e=>e.fundingProof?[e.fundingProof]:[]);
    const sourcePeriodIds=plan.sourcePeriodIds;
    if(decisions.length!==1||!d.proposalId||d.proposalId!==doc.after.proposalId||d.mode!==change!.mode||d.observationMode!==change!.observationMode||d.recordedSeq!==update.recordedSeq
      ||d.positionId!==plan.positionId||d.beforeAllocationRevisionId!==p.draft.baseVectorId||d.afterAllocationRevisionId!==plan.vectorId||d.reason!==original.value.reason
      ||!sameDocument(d.manifest,{schemaVersion:1,targetPeriodId,sourcePeriodIds,funding,review:doc.after.review}))return rejectBatch('STORAGE_ERROR');
    const [proposal]=await tx.select().from(s.transferProposals).where(and(eq(s.transferProposals.ownerUserId,scope.ownerUserId),eq(s.transferProposals.accountId,scope.accountId),eq(s.transferProposals.id,d.proposalId)));
    if(!proposal||proposal.payloadIdentity!==hash({scope,document:proposal.proposal})||!sameDocument((proposal.proposal as {aggregateDraft?:unknown}).aggregateDraft,p.payload.draft)
      ||!sameDocument((proposal.proposal as {review?:unknown}).review,doc.after.review))return rejectBatch('STORAGE_ERROR');
    const decisionAudits=audits.filter(a=>(a.beforeAfter as {entity?:{type?:string;id?:string}})?.entity?.type==='TRANSITION_DECISION'&&(a.beforeAfter as {entity:{id:string}}).entity.id===d.id);
    if(decisionAudits.length!==1)return rejectBatch('STORAGE_ERROR');
    if(change!.mode==='CARRY'){const t=transfers[0];if(transfers.length!==1||t.proposalId!==d.proposalId||t.decisionId!==d.id||t.recordedSeq!==update.recordedSeq
      ||t.targetPeriodId!==targetPeriodId||t.sourcePeriodId!==sourcePeriodIds[0]||t.beforeAllocationRevisionId!==p.draft.baseVectorId||t.afterAllocationRevisionId!==plan.vectorId||!sameDocument(t.fundingManifest,funding))return rejectBatch('STORAGE_ERROR');}
    else if(transfers.length)return rejectBatch('STORAGE_ERROR');
  }else if(decisions.length||transfers.length)return rejectBatch('STORAGE_ERROR');
  return {receipt:receipt.value,evidence:doc.after,audits};
}
export function createBudgetRepository(database:Readonly<{db:Parameters<typeof commitBatch>[0]}>){
  async function safe<T>(run:()=>Promise<T>){try{return {ok:true as const,value:await run()};}catch(e){return {ok:false as const,code:e instanceof BatchFailure?e.code:'STORAGE_ERROR' as const};}}
  return {
    load:(scope:AuthorizedScope)=>safe(()=>database.db.transaction(async tx=>{
      const c=await loadBudgetContext(tx,scope),bank=selectState(c.history,c.today),o=selectObligationState({...c.history,events:c.obligations},c.today),ss=selectSavingState({...c.history,savings:c.savings},c.today);
      if(!bank.ok)return rejectBatch(bank.code);if(!o.ok)return rejectBatch(o.code);if(!ss.ok)return rejectBatch(ss.code);
      const byId=new Map(c.periods.map(p=>[p.id,p.period]));
      return wire({schemaVersion:1,revision:c.revision,knowledgeCut:c.recordedSeq,today:c.today,baseCheckpointId:bank.value.checkpoint?.id??null,
        baseVectorId:bank.value.vector?.id??null,bank:bank.value.checkpoint?{balanceCents:bank.value.checkpoint.balanceCents,observedDate:bank.value.checkpoint.observedDate}:null,
        allocations:bank.value.vector?.allocations??[],obligations:o.value.states.map(e=>({id:e.id,obligationId:e.obligationId,title:e.title,dueDate:e.dueDate,
          originalCents:e.originalCents,outstandingCents:e.outstandingCents,status:e.status,isPossible:e.isPossible,reserveFull:e.reserveFull,fundingPeriod:byId.get(e.fundingPeriodId)})),
        savings:ss.value.states.map(e=>({id:e.id,savingsId:e.savingsId,title:e.title,amountCents:e.amountCents,status:e.status,fundingPeriod:byId.get(e.fundingPeriodId)})),
        placement:(()=>{const order=c.history.orderings.filter(o=>o.historicalDate===c.today).sort((a,b)=>a.recordedSeq<b.recordedSeq?-1:1).at(-1);
          return order?{id:order.id,afterPositionId:order.positionIds.at(-1)??null}:null;})()});
    },{isolationLevel:'repeatable read',accessMode:'read only'})),
    preview:(scope:AuthorizedScope,command:PreparedCommand)=>safe(async()=>{
      const d=parseBudgetDraft(command.payload);if(!d.ok)return rejectBatch(d.code);if(d.value.effectiveDate!==command.effectiveDate)return rejectBatch('INVALID_INPUT');
      const candidate=await database.db.transaction(async tx=>{
        const context=await loadBudgetContext(tx,scope);const p=await planReviewedBudget(tx,scope,command,context,d.value,command.requestId,context.now);
        return {context,plan:p};
      },{isolationLevel:'repeatable read',accessMode:'read only'});
      let proposalId:string|null=null;
      if(isTransition(d.value)){
        proposalId=coordinates(scope,command.requestId,0n,command.requestId,candidate.context.now).id('proposal');
        const id=proposalId,change=d.value.allocationChange!;
        await database.db.transaction(async tx=>{
          const account=await ownedAccount(tx,scope);if(account.aggregateRevision!==command.expectedRevision)return rejectBatch('STALE_REVISION');
          const document=wire({schemaVersion:1,expectedRevision:command.expectedRevision,effectiveDate:command.effectiveDate,reason:command.reason,
            input:change,review:candidate.plan.review,aggregateDraft:command.payload,aggregateSchemaVersion:1});
          const identity=hash({scope,document});
          const [prior]=await tx.select().from(s.transferProposals).where(eq(s.transferProposals.id,id));
          if(prior){if(prior.ownerUserId!==scope.ownerUserId||prior.accountId!==scope.accountId||prior.payloadIdentity!==identity)return rejectBatch('REQUEST_PAYLOAD_CONFLICT');return;}
          const known=new Set(candidate.context.periods.map(p=>p.id));
          for(const p of candidate.plan.periods)if(!known.has(p.id))await tx.insert(s.budgetPeriods).values({...scope,...p});
          await tx.insert(s.transferProposals).values({...scope,id,expectedRevision:command.expectedRevision,baseCheckpointId:d.value.baseCheckpointId!,baseAllocationRevisionId:d.value.baseVectorId!,
            targetPeriodId:candidate.plan.periods.find(p=>p.period===change.target)!.id,sourcePeriodId:change.mode==='CARRY'?candidate.plan.periods.find(p=>p.period===change.sources[0])!.id:null,
            payloadIdentity:identity,proposal:document,mode:change.mode,observationMode:change.observationMode});
        });
      }
      return wire({requestId:command.requestId,expectedRevision:command.expectedRevision,effectiveDate:command.effectiveDate,reason:command.reason,
        payload:{schemaVersion:1,draft:command.payload,review:candidate.plan.review,proposalId}});
    }),
    confirm:(scope:AuthorizedScope,command:PreparedCommand)=>safe(async()=>{
      const {draft,payload}=parsed(command),kind=isTransition(draft)?'PERIOD_TRANSITION':'BUDGET_UPDATE';
      return commitBatch(database.db,{scope,command,kind,verifyReplay:async(tx,_a,u)=>{await originalEvidence(tx,scope,u);},...(kind==='PERIOD_TRANSITION'?{replay:async(tx:Transaction,_a:typeof s.accounts.$inferSelect,identity:string):Promise<CommitReceipt|null>=>{
        if(payload.proposalId===null)return null;
        const [proposal]=await tx.select().from(s.transferProposals).where(and(eq(s.transferProposals.ownerUserId,scope.ownerUserId),eq(s.transferProposals.accountId,scope.accountId),eq(s.transferProposals.id,String(payload.proposalId)))).for('update');
        if(!proposal)return rejectBatch('FORBIDDEN');
        const cancelled=await tx.select().from(s.transferProposalCancellations).where(eq(s.transferProposalCancellations.proposalId,proposal.id));if(cancelled.length)return rejectBatch('PROPOSAL_CANCELLED');
        const [decision]=await tx.select().from(s.transitionDecisions).where(eq(s.transitionDecisions.proposalId,proposal.id));if(!decision)return null;
        const [u]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.id,decision.budgetUpdateId)));
        if(!u||u.kind!=='PERIOD_TRANSITION')return rejectBatch('STORAGE_ERROR');
        const original=await originalEvidence(tx,scope,u);
        if(u.payloadIdentity!==identity||!sameDocument(original.evidence.command,commandDocument(command)))return rejectBatch('PROPOSAL_ALREADY_CONFIRMED');
        return original.receipt;
      }}:{} )},async(tx,batch)=>{
        const context=await loadBudgetContext(tx,scope,batch.account),p=await planReviewedBudget(tx,scope,command,context,draft,batch.id,batch.recordedAt);
        if(!sameDocument(p.review,payload.review))return rejectBatch('STALE_PROPOSAL');
        if(isTransition(draft)){
          const [proposal]=await tx.select().from(s.transferProposals).where(and(eq(s.transferProposals.ownerUserId,scope.ownerUserId),eq(s.transferProposals.accountId,scope.accountId),eq(s.transferProposals.id,String(payload.proposalId)))).for('update');
          if(!proposal)return rejectBatch('FORBIDDEN');
          const doc=proposal.proposal as {aggregateDraft:unknown;review:unknown};
          if(!sameDocument(doc.aggregateDraft,payload.draft)||!sameDocument(doc.review,p.review))return rejectBatch('STALE_PROPOSAL');
        }else if(payload.proposalId!==null)return rejectBatch('INVALID_INPUT');
        return persistBudgetPlan(tx,batch,context,draft,p,payload.proposalId as string|null);
      });
    }),
    status:(scope:AuthorizedScope,requestId:string)=>safe(()=>database.db.transaction(async tx=>{
      await ownedAccount(tx,scope);if(!validUuid(requestId))return rejectBatch('INVALID_INPUT');
      const [u]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.requestId,requestId)));
      return u?(await originalEvidence(tx,scope,u)).receipt:null;
    })),
    history:(scope:AuthorizedScope,updateId:string|null)=>safe(()=>database.db.transaction(async tx=>{
      await ownedAccount(tx,scope);if(updateId!==null&&!validUuid(updateId))return rejectBatch('INVALID_INPUT');
      const rows=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),
        updateId?eq(s.budgetUpdates.id,updateId):undefined)).orderBy(desc(s.budgetUpdates.recordedSeq)).limit(10);
      const result=[];for(const u of rows){
        if(!['BUDGET_UPDATE','PERIOD_TRANSITION'].includes(u.kind))continue;
        // Legacy HB-013 updates have their original history contract; do not invent an aggregate review.
        const e=await tx.select({id:s.auditEvents.id}).from(s.auditEvents).where(and(eq(s.auditEvents.budgetUpdateId,u.id),
          sql`${s.auditEvents.beforeAfter}->'entity'->>'type'='BUDGET_UPDATE_REVIEW'`)).limit(2);
        if(!e.length&&u.kind==='PERIOD_TRANSITION'&&!updateId)continue;
        const proof=await originalEvidence(tx,scope,u);result.push({receipt:proof.receipt,effectiveDate:(proof.evidence.command as {effectiveDate:string}).effectiveDate,recordedAt:u.recordedAt,review:proof.evidence.review});
      }
      return wire(result);
    })),
  };
}
