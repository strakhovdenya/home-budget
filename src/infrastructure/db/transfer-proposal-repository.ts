import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { encodeCanonical, normalizeValue } from '@/domain/updates/canonical-value';
import { parseReceipt, validUuid } from '@/domain/updates/validation';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parseTransition } from '@/domain/transitions/validation';
import { sameDocument } from '@/domain/transitions/planning';
import { parseBerlinDate } from '@/shared/pure/calendar';
import type { AuthorizedScope, PreparedCommand, CommitReceipt } from '@/domain/updates/contracts';
import type { ProposalRepository } from '@/domain/transitions/ports';
import { databaseToday, loadTransitionState, reviewTransition, jsonDocument } from './transition-state';
import { confirmationDocument, writeTransition } from './transition-writer';
import { ensurePeriod } from './allocation-writer';
import { BatchFailure, commitBatch, rejectBatch, type Transaction } from './commit';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as s from './schema';
function hash(value:unknown){return createHash('sha256').update(encodeCanonical(normalizeValue(value))).digest('hex');}
function canonicalScope(scope:AuthorizedScope):AuthorizedScope{if(!validUuid(scope.ownerUserId)||!validUuid(scope.accountId))return rejectBatch('FORBIDDEN');return {ownerUserId:scope.ownerUserId.toLowerCase(),accountId:scope.accountId.toLowerCase()};}
async function lockedAccount(tx:Transaction,scope:AuthorizedScope){const [a]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId))).for('update');if(!a)return rejectBatch('FORBIDDEN');return a;}
async function proposal(tx:Transaction,scope:AuthorizedScope,id:string){if(!validUuid(id))return rejectBatch('INVALID_INPUT');const [p]=await tx.select().from(s.transferProposals).where(and(eq(s.transferProposals.ownerUserId,scope.ownerUserId),eq(s.transferProposals.accountId,scope.accountId),eq(s.transferProposals.id,id))).for('update');if(!p)return rejectBatch('FORBIDDEN');return p;}
async function outcome(tx:Transaction,id:string){return {decisions:await tx.select().from(s.transitionDecisions).where(eq(s.transitionDecisions.proposalId,id)),cancellations:await tx.select().from(s.transferProposalCancellations).where(eq(s.transferProposalCancellations.proposalId,id))};}
async function cancellationResult(tx:Transaction,c:{id:string;proposalId:string}){const [row]=await tx.select({at:sql<string>`to_char(${s.transferProposalCancellations.cancelledAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.transferProposalCancellations).where(eq(s.transferProposalCancellations.id,c.id));return jsonDocument({cancellationId:c.id,proposalId:c.proposalId,cancelledAt:row.at});}
/** Called only under commitBatch's owned account lock, before new-request stale checks. */
async function replayProposal(tx:Transaction,scope:AuthorizedScope,command:PreparedCommand,identity:string):Promise<CommitReceipt|null>{
  const payload=command.payload;if(!payload||typeof payload!=='object'||Array.isArray(payload)||!('proposalId' in payload)||!validUuid(payload.proposalId))return rejectBatch('INVALID_INPUT');
  const p=await proposal(tx,scope,payload.proposalId),o=await outcome(tx,p.id);
  if(o.cancellations.length)return rejectBatch('PROPOSAL_CANCELLED');if(!o.decisions.length)return null;if(o.decisions.length!==1)return rejectBatch('STORAGE_ERROR');
  const d=o.decisions[0];
  const [u]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.id,d.budgetUpdateId)));
  const audits=await tx.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),eq(s.auditEvents.budgetUpdateId,d.budgetUpdateId)));
  const proofs=audits.filter(a=>{const v=a.beforeAfter as {entity?:{type?:string;id?:string}};return v?.entity?.type==='TRANSITION_CONFIRMATION'&&v.entity.id===p.id;});
  const doc=proofs[0]?.beforeAfter as {after?:unknown};
  if(!u||u.actorId!==scope.ownerUserId||u.kind!=='PERIOD_TRANSITION'||u.recordedSeq!==d.recordedSeq||u.expectedRevision!==p.expectedRevision||proofs.length!==1||proofs[0].recordedSeq!==u.recordedSeq
    ||!exactKeys(doc?.after,['schemaVersion','confirmation','proposalIdentity','decisionId','checkpointId','vectorId','funding']))return rejectBatch('STORAGE_ERROR');
  const evidence=doc.after;
  if(evidence.schemaVersion!==1||evidence.proposalIdentity!==p.payloadIdentity||evidence.decisionId!==d.id||evidence.vectorId!==d.afterAllocationRevisionId)return rejectBatch('STORAGE_ERROR');
  // Validate the stored document's original identity before comparing an adversarial retry.
  const original=evidence.confirmation;
  if(!exactKeys(original,['expectedRevision','effectiveDate','reason','payload'])||hash({owner:scope.ownerUserId,account:scope.accountId,kind:u.kind,...original})!==u.payloadIdentity)return rejectBatch('STORAGE_ERROR');
  const receipt=parseReceipt(u.result);if(!receipt.ok||receipt.value.updateId!==u.id||receipt.value.recordedSeq!==u.recordedSeq.toString()||receipt.value.aggregateRevision!==(u.expectedRevision+1n).toString())return rejectBatch('STORAGE_ERROR');
  const originalDate=parseBerlinDate(original.effectiveDate);if(!originalDate.ok)return rejectBatch('STORAGE_ERROR');
  // Replay verifies original coordinates. Today's calendar is intentionally never consulted.
  const state=await loadTransitionState(tx,scope,u.recordedSeq,originalDate.value).catch(()=>rejectBatch('STORAGE_ERROR'));
  const vector=state.oh.vectors.find(v=>v.id===d.afterAllocationRevisionId);
  if(!vector||vector.recordedSeq!==u.recordedSeq||vector.checkpointId!==evidence.checkpointId||vector.positionId!==d.positionId)return rejectBatch('STORAGE_ERROR');
  if(!exactKeys(original.payload,['proposalId','proposalIdentity','input','review']))return rejectBatch('STORAGE_ERROR');
  const originalInput=parseTransition(original.payload.input),prepared=p.proposal as {input?:unknown;review?:unknown;expectedRevision?:unknown;effectiveDate?:unknown;reason?:unknown};
  if(!originalInput.ok||!sameDocument(prepared.input,original.payload.input)||!sameDocument(prepared.review,original.payload.review)||prepared.expectedRevision!==u.expectedRevision.toString()
    ||prepared.effectiveDate!==original.effectiveDate||prepared.reason!==original.reason||original.payload.proposalId!==p.id||original.payload.proposalIdentity!==p.payloadIdentity
    ||originalInput.value.mode!==d.mode||originalInput.value.observationMode!==d.observationMode||!sameDocument(jsonDocument(vector.allocations),jsonDocument(originalInput.value.allocations)))return rejectBatch('STORAGE_ERROR');
  const anchor=state.oh.checkpoints.find(c=>c.id===vector.checkpointId);if(!anchor||anchor.balanceCents!==originalInput.value.balanceCents||(d.observationMode==='ACTUAL_CHECK'?anchor.recordedSeq!==u.recordedSeq:anchor.id!==p.baseCheckpointId))return rejectBatch('STORAGE_ERROR');
  if(!Array.isArray(evidence.funding)||!sameDocument((d.manifest as {funding:unknown}).funding,evidence.funding))return rejectBatch('STORAGE_ERROR');
  for(const f of evidence.funding){if(!f||typeof f!=='object'||Array.isArray(f)||!('afterRevisionId' in f))return rejectBatch('STORAGE_ERROR');const e=[...state.oh.events,...state.sh.savings].find(e=>e.id===f.afterRevisionId);if(!e||!sameDocument(e.fundingProof,f))return rejectBatch('STORAGE_ERROR');}
  const transfers=await tx.select().from(s.budgetTransfers).where(eq(s.budgetTransfers.decisionId,d.id));
  if(d.mode==='CARRY'?transfers.length!==1||transfers[0].proposalId!==p.id||transfers[0].afterAllocationRevisionId!==vector.id:transfers.length!==0)return rejectBatch('STORAGE_ERROR');
  if(u.payloadIdentity!==identity||!sameDocument(original,confirmationDocument(command)))return rejectBatch('PROPOSAL_ALREADY_CONFIRMED');
  return receipt.value;
}
export function createProposalRepository(database:{db:NodePgDatabase<typeof s>}):ProposalRepository{
  async function safe<T>(fn:()=>Promise<T>){try{return {ok:true as const,value:await fn()};}catch(e){return {ok:false as const,code:e instanceof BatchFailure?e.code:'STORAGE_ERROR' as const};}}
  return {
    prepare:(scope,command)=>safe(()=>database.db.transaction(async tx=>{
      scope=canonicalScope(scope);
      const a=await lockedAccount(tx,scope);if(a.aggregateRevision!==command.expectedRevision)return rejectBatch('STALE_REVISION');
      const input=parseTransition(command.payload);if(!input.ok)return rejectBatch(input.code);if(input.value.mode==='REDISTRIBUTE')return rejectBatch('INVALID_INPUT');
      if(command.effectiveDate!==input.value.effectiveDate)return rejectBatch('INVALID_INPUT');
      const clock=await databaseToday(tx),state=await loadTransitionState(tx,scope,a.recordedSeq,clock.today);
      if(state.base.vectorId!==a.activeAllocationRevisionId)return rejectBatch('HISTORICAL_STATE_CONFLICT');
      const reviewed=reviewTransition(state,input.value,clock.today),id=randomUUID();
      const document=jsonDocument({schemaVersion:1,expectedRevision:command.expectedRevision,effectiveDate:command.effectiveDate,reason:command.reason,input:command.payload,review:reviewed.review});
      const identity=hash({owner:scope.ownerUserId,account:scope.accountId,document});
      const targetPeriodId=await ensurePeriod(tx,scope,input.value.target),sourcePeriodId=input.value.mode==='CARRY'?await ensurePeriod(tx,scope,input.value.sources[0]):null;
      await tx.insert(s.transferProposals).values({...scope,id,expectedRevision:a.aggregateRevision,baseCheckpointId:state.base.checkpointId,baseAllocationRevisionId:state.base.vectorId,targetPeriodId,sourcePeriodId,
        payloadIdentity:identity,proposal:document,mode:input.value.mode,observationMode:input.value.observationMode});
      return jsonDocument({proposalId:id,proposalIdentity:identity,status:'PROPOSED',input:command.payload,review:reviewed.review});
    })),
    read:(scope,id)=>safe(()=>database.db.transaction(async tx=>{
      scope=canonicalScope(scope);
      const a=await lockedAccount(tx,scope),p=await proposal(tx,scope,id),o=await outcome(tx,p.id),clock=await databaseToday(tx);
      const target=(await tx.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.id,p.targetPeriodId)))[0];
      const status=o.cancellations.length?'CANCELLED':o.decisions.length?'CONFIRMED':a.aggregateRevision!==p.expectedRevision||target.period!==clock.today.slice(0,7)?'STALE':'PROPOSED';
      return jsonDocument({proposalId:p.id,proposalIdentity:p.payloadIdentity,status,document:p.proposal});
    })),
    confirm:(scope,command)=>safe(()=>{scope=canonicalScope(scope);return commitBatch(database.db,{scope,kind:'PERIOD_TRANSITION',command,replay:(tx,_account,identity)=>replayProposal(tx,scope,command,identity)},writeTransition);}),
    cancel:(scope,raw)=>safe(()=>database.db.transaction(async tx=>{
      scope=canonicalScope(scope);
      const v=normalizeValue(raw);if(!exactKeys(v,['controlRequestId','proposalId','expectedProposalPayloadIdentity','reason','cancellationConfirmed'])||!validUuid(v.controlRequestId)||!validUuid(v.proposalId)||typeof v.reason!=='string'||!v.reason.trim()||v.reason.length>1000||v.cancellationConfirmed!==true||typeof v.expectedProposalPayloadIdentity!=='string')return rejectBatch('INVALID_INPUT');
      await lockedAccount(tx,scope);
      const document=jsonDocument({action:'CANCEL_PROPOSAL',schemaVersion:1,...scope,actorId:scope.ownerUserId,proposalId:v.proposalId,expectedProposalPayloadIdentity:v.expectedProposalPayloadIdentity,reason:v.reason,cancellationConfirmed:true}),identity=hash(document);
      const [prior]=await tx.select().from(s.transferProposalCancellations).where(and(eq(s.transferProposalCancellations.ownerUserId,scope.ownerUserId),eq(s.transferProposalCancellations.accountId,scope.accountId),eq(s.transferProposalCancellations.controlRequestId,v.controlRequestId)));
      if(prior){if(prior.payloadIdentity!==identity||!sameDocument(prior.document,document))return rejectBatch('REQUEST_PAYLOAD_CONFLICT');return cancellationResult(tx,prior);}
      const p=await proposal(tx,scope,v.proposalId);if(p.payloadIdentity!==v.expectedProposalPayloadIdentity)return rejectBatch('STALE_PROPOSAL');
      const o=await outcome(tx,p.id);if(o.decisions.length)return rejectBatch('PROPOSAL_ALREADY_CONFIRMED');
      if(o.cancellations.length){const c=o.cancellations[0];if(c.payloadIdentity!==identity||!sameDocument(c.document,document))return rejectBatch('PROPOSAL_ALREADY_CANCELLED');return cancellationResult(tx,c);}
      const clock=await databaseToday(tx),id=randomUUID();
      await tx.insert(s.transferProposalCancellations).values({...scope,id,proposalId:p.id,controlRequestId:v.controlRequestId,actorId:scope.ownerUserId,payloadIdentity:identity,document,cancelledAt:clock.now,reason:v.reason});
      return cancellationResult(tx,{id,proposalId:p.id});
    })),
  };
}
