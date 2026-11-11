import 'server-only';
import {and,eq,sql,getTableColumns} from 'drizzle-orm';
import type {AnyPgColumn} from 'drizzle-orm/pg-core';
import {createHash} from 'node:crypto';
import type {AuthorizedScope} from '@/domain/updates/contracts';
import type {Basis, HistoryError, HistoryResult} from '@/domain/history/contracts';
import {parseBasis, requestCopy} from '@/domain/history/validation';
import {exactKeys} from '@/domain/checkpoints/validation';
import {validUuid, parseReceipt} from '@/domain/updates/validation';
import {parseBerlinDate} from '@/shared/pure/calendar';
import {encodeCanonical, normalizeValue} from '@/domain/updates/canonical-value';
import {ForecastFailure} from '@/domain/forecast/validation';
import {projectAccount} from '@/domain/forecast/budget';
import {selectObligationState,calculatePeriodReserves} from '@/domain/obligations/history';
import {selectSavingState,calculatePeriodSavings} from '@/domain/savings/history';
import {readProjectionContext} from './projection-reader';
import {databaseToday, jsonDocument} from './transition-state';
import {ClosingReadBudget,validateOriginal,json,documentHash} from './closing-reader';
import {ClosingFailure} from '@/domain/closing/serialization';
import {BatchFailure} from './commit';
import type {createDatabase} from './client';
import * as s from './schema';
import {requireHistoryEntry, HistoryFailure} from './financial-history-index';
import {originalEvidence} from './budget-update-repository';
import {parseTransition} from '@/domain/transitions/validation';
import {parseInstant} from '@/shared/pure/instant';

type Request={schemaVersion:1;basis:Basis;batchId:string;dayH:string;perspective:'ORIGINAL'|'LATER'|'REPORT'|'SOURCE';offset:number};
function parse(raw:unknown):Request{
  const v=requestCopy(raw);
  if(!exactKeys(v,['schemaVersion','basis','batchId','dayH','perspective','offset'])||v.schemaVersion!==1||!validUuid(v.batchId)
    ||!parseBerlinDate(v.dayH).ok||!['ORIGINAL','LATER','REPORT','SOURCE'].includes(String(v.perspective))
    ||!Number.isSafeInteger(v.offset)||(v.offset as number)<0||(v.offset as number)%100!==0)throw Error('INVALID_INPUT');
  return {...v,basis:parseBasis(v.basis)} as Request;
}
class Failure extends Error{constructor(readonly code:HistoryError){super(code);}}
function fail(code:HistoryError):never{throw new Failure(code);}
function hash(v:unknown){return createHash('sha256').update(encodeCanonical(normalizeValue(v))).digest('hex');}
export function createHistoryDetailReader(database:ReturnType<typeof createDatabase>){
  return {read:async(scope:AuthorizedScope,raw:unknown):Promise<HistoryResult<ReturnType<typeof jsonDocument>>>=>{
    let q:Request;try{q=parse(raw);}catch{return {ok:false,code:'INVALID_INPUT'};}
    try{
      if(!validUuid(scope.ownerUserId)||!validUuid(scope.accountId))fail('FORBIDDEN');
      const result=await database.db.transaction(async tx=>{
        await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);
        const [account]=await tx.select().from(s.accounts).where(and(eq(s.accounts.id,scope.accountId),eq(s.accounts.ownerUserId,scope.ownerUserId)));
        if(!account)fail('FORBIDDEN');
        const lock=await tx.execute<{locked:boolean}>(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${scope.accountId},19019)) locked`);
        if(!lock.rows[0].locked)fail('RETRYABLE_STORAGE_ERROR');
        const clock=await databaseToday(tx),cut=BigInt(q.basis.knowledgeCut);
        if(cut>account.recordedSeq||q.basis.today>clock.today||q.basis.capturedAt>clock.now||q.dayH>q.basis.today)fail('INVALID_INPUT');
        const scoped=(t:{ownerUserId:AnyPgColumn;accountId:AnyPgColumn})=>and(eq(t.ownerUserId,scope.ownerUserId),eq(t.accountId,scope.accountId));
        const [anchor]=await tx.select({recordedSeq:s.budgetUpdates.recordedSeq,recordedAt:sql<string>`to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.budgetUpdates).where(and(scoped(s.budgetUpdates),eq(s.budgetUpdates.id,q.basis.indexAnchor??'00000000-0000-4000-8000-000000000000')));
        const anchorTime=anchor?parseInstant(anchor.recordedAt):null;
        if(!anchor||anchor.recordedSeq!==cut||!anchorTime?.ok||anchorTime.value>q.basis.capturedAt)fail('INVALID_INPUT');
        const [batch]=await tx.select({...getTableColumns(s.budgetUpdates),recordedAt:sql<string>`to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.budgetUpdates).where(and(scoped(s.budgetUpdates),eq(s.budgetUpdates.id,q.batchId)));
        if(!batch||batch.recordedSeq>cut)fail('FORBIDDEN');
        const entry=await requireHistoryEntry(tx,scope,batch,q.basis);
        const receipt=parseReceipt(batch.result);
        if(!receipt.ok||receipt.value.updateId!==batch.id||receipt.value.recordedSeq!==batch.recordedSeq.toString()||receipt.value.aggregateRevision!==(batch.expectedRevision+1n).toString())fail('HISTORY_SOURCE_INVALID');
        // Bound bytes before decoding selected audit JSON.
        const admission=await tx.execute<{bytes:string;n:string}>(sql`SELECT coalesce(sum(octet_length(to_jsonb(a)::text)),0)::text bytes,count(*)::text n
          FROM audit_events a WHERE a.owner_user_id=${scope.ownerUserId} AND a.account_id=${scope.accountId} AND a.budget_update_id=${batch.id}`);
        if(BigInt(admission.rows[0].bytes)>8388608n||BigInt(admission.rows[0].n)>20000n)fail('HISTORY_LIMIT_EXCEEDED');
        const audits=await tx.select().from(s.auditEvents).where(and(scoped(s.auditEvents),eq(s.auditEvents.budgetUpdateId,batch.id))).orderBy(s.auditEvents.id);
        if(!audits.length||audits.some(a=>a.recordedSeq!==batch.recordedSeq))fail('HISTORY_SOURCE_INVALID');
        for(const a of audits){const d=a.beforeAfter;if(!exactKeys(d,['schemaVersion','eventIndex','entity','before','after'])||d.schemaVersion!==1||!exactKeys(d.entity,['type','id'])||!validUuid(d.entity.id))fail('HISTORY_SOURCE_INVALID');}
        if(q.offset>=audits.length&&q.offset!==0)fail('INVALID_INPUT');
        // Metadata admission is not an original confirmation proof. Validate the
        // selected source before any perspective can disclose its financial state.
        const aggregate=batch.kind==='BUDGET_UPDATE'||audits.some(a=>(a.beforeAfter as {entity?:{type?:string}})?.entity?.type==='BUDGET_UPDATE_REVIEW');
        const proof=aggregate?await originalEvidence(tx,scope,batch):null;
        if(!aggregate&&batch.kind==='PERIOD_TRANSITION')await legacyProof(tx,scope,batch,audits);
        const budget=new ClosingReadBudget();
        const report=batch.kind==='MONTH_CLOSE'?await validateOriginal(tx,scope,account,batch,budget):null;
        if(q.perspective==='SOURCE'&&proof){
          return jsonDocument({schemaVersion:1,basis:q.basis,batchId:q.batchId,perspective:'SOURCE',precision:'SOURCE',dayH:q.dayH,offset:q.offset,source:entry,
            evidence:[...proof.audits].sort((a,b)=>a.id.localeCompare(b.id)).slice(q.offset,q.offset+100),original:proof.evidence,nextOffset:q.offset+100<proof.audits.length?q.offset+100:null});
        }
        if(q.perspective==='REPORT'||q.perspective==='SOURCE'&&batch.kind==='MONTH_CLOSE'){
          if(!report)fail('INVALID_INPUT');
          if(q.offset!==0)fail('INVALID_INPUT');
          const context=budget.cuts.get(`${report.result.report.historicalThroughDate}/${report.result.report.evidenceRecordedCutoffSeq}`);
          if(!context)fail('HISTORY_SOURCE_INVALID');
          const projected=projectAccount(context.snapshot,report.result.report.historicalThroughDate);if(!projected.ok)fail('HISTORY_SOURCE_INVALID');
          const periods=projected.value.kind==='ACCOUNT_ESTIMATE'?projected.value.periods.map(({period,allocated,reserved,savings,free,deficit})=>({period,allocated,reserved,savings,free,deficit})):unknownPeriodAmounts(context,context.snapshot.provenance.historicalThroughDate);
          // Report precision, H and K always come from the immutable version.
          return jsonDocument({schemaVersion:1,basis:q.basis,batchId:q.batchId,perspective:q.perspective,precision:'REPORT',dayH:q.dayH,offset:q.offset,periods,reportMeta:{id:report.result.report.id,version:report.result.report.version,reason:report.result.report.reason,previousVersionId:report.result.report.previousVersionId,createdAt:report.result.report.closedAt,cutoffAt:report.result.report.evidenceRecordedCutoffAt,knowledgeCut:report.result.report.evidenceRecordedCutoffSeq.toString(),dayH:report.result.report.historicalThroughDate,digest:documentHash(report.result.document,budget)},
            report:report.result.document,receipt:report.receipt});
        }
        let stateCut=q.perspective==='ORIGINAL'||q.perspective==='SOURCE'?batch.recordedSeq:cut;
        if(q.perspective==='ORIGINAL'&&report)stateCut=report.result.report.evidenceRecordedCutoffSeq;
        const [knowledge]=stateCut===0n?[]:await tx.select({at:sql<string>`to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.budgetUpdates).where(and(scoped(s.budgetUpdates),eq(s.budgetUpdates.recordedSeq,stateCut)));
        if(stateCut!==0n&&!knowledge)fail('HISTORY_SOURCE_INVALID');
        const knowledgeRecordedAt=knowledge?.at??null;
        const h=parseBerlinDate(q.dayH);if(!h.ok)fail('INVALID_INPUT');
        const context=await readProjectionContext(tx,scope,account,h.value,stateCut),snapshot=context.snapshot;
        // The existing context owns daily selection, funding/payment and identity validation.
        // Full source audits below prove bank/vector facts independently of present pointers.
        const byEntity=new Map<string,typeof context.audits>();
        for(const a of context.audits){const d=a.beforeAfter as {entity?:{type?:string;id?:string}};const key=d?.entity?.type+':'+d?.entity?.id;const xs=byEntity.get(key)??[];xs.push(a);byEntity.set(key,xs);}
        function matches(type:string,id:string,expected:Record<string,unknown>){
          const found=byEntity.get(type+':'+id)??[],doc=found[0]?.beforeAfter;
          if(found.length!==1||!exactKeys(doc,['schemaVersion','eventIndex','entity','before','after'])||doc.schemaVersion!==1||!doc.after||typeof doc.after!=='object'||Array.isArray(doc.after))fail('HISTORY_SOURCE_INVALID');
          const after=doc.after as Record<string,unknown>;
          for(const [key,value] of Object.entries(expected))if(hash(after[key])!==hash(json(value)))fail('HISTORY_SOURCE_INVALID');
        }
        for(const c of context.history.checkpoints)matches('BANK_CHECKPOINT',c.id,{id:c.id,logicalFactId:c.logicalFactId,supersedesId:c.supersedesId,recordedSeq:c.recordedSeq,positionId:c.positionId,observedDate:c.observedDate,observedAt:c.observedAt,balanceCents:c.balanceCents});
        for(const v of context.history.vectors)matches('ALLOCATION_REVISION',v.id,{id:v.id,logicalFactId:v.logicalFactId,supersedesId:v.supersedesId,recordedSeq:v.recordedSeq,positionId:v.positionId,checkpointId:v.checkpointId,previousRevisionId:v.previousRevisionId,effectiveDate:v.effectiveDate,allocations:v.allocations});
        if(q.perspective==='SOURCE')return jsonDocument({schemaVersion:1,basis:q.basis,batchId:q.batchId,perspective:'SOURCE',precision:'SOURCE',dayH:q.dayH,offset:q.offset,source:entry,
          evidence:audits.slice(q.offset,q.offset+100),periodReferences:context.periods,nextOffset:q.offset+100<audits.length?q.offset+100:null});
        const projected=projectAccount(snapshot,h.value);if(!projected.ok)fail(projected.code==='PROJECTION_LIMIT_EXCEEDED'?'HISTORY_LIMIT_EXCEEDED':'HISTORY_SOURCE_INVALID');
        const p=projected.value;
        const periods=p.kind==='ACCOUNT_ESTIMATE'?p.periods.map(({period,allocated,reserved,savings,free,deficit})=>({period,allocated,reserved,savings,free,deficit})):null;
        const visibleAudits=audits.filter(a=>!['BUDGET_UPDATE_REVIEW','TRANSITION_CONFIRMATION'].includes(String((a.beforeAfter as {entity?:{type?:string}})?.entity?.type)));
        if(q.offset>=visibleAudits.length&&q.offset!==0)fail('INVALID_INPUT');
        if(snapshot.kind==='NO_OBSERVATION'){
          const known=unknownPeriodAmounts(context,h.value);
          return jsonDocument({schemaVersion:1,basis:q.basis,batchId:q.batchId,perspective:q.perspective,precision:'DAY',offset:q.offset,dayH:q.dayH,knowledgeCut:stateCut,knowledgeRecordedAt,
            snapshot,periods:known,source:entry,periodReferences:context.periods,endBalance:null,evidence:visibleAudits.slice(q.offset,q.offset+100),nextOffset:q.offset+100<visibleAudits.length?q.offset+100:null});
        }
        const evidence=visibleAudits.slice(q.offset,q.offset+100).map(a=>({id:a.id,recordedSeq:a.recordedSeq,effectiveDate:a.effectiveDate,document:a.beforeAfter}));
        if(q.offset>=audits.length&&q.offset!==0)fail('INVALID_INPUT');
        return jsonDocument({schemaVersion:1,basis:q.basis,batchId:q.batchId,perspective:q.perspective,precision:'DAY',offset:q.offset,dayH:q.dayH,knowledgeCut:stateCut,knowledgeRecordedAt,
          snapshot,periods,source:entry,periodReferences:context.periods,sourceRecordedAt:batch.recordedAt,endBalance:snapshot.kind==='ACTIVE_COMPLETE'&&snapshot.checkpoint.observedDate===q.dayH?snapshot.checkpoint.balance:null,
          evidence,nextOffset:q.offset+100<visibleAudits.length?q.offset+100:null});
      },{isolationLevel:'repeatable read',accessMode:'read only'});
      if(Buffer.byteLength(JSON.stringify(result),'utf8')>1048576)fail('HISTORY_LIMIT_EXCEEDED');
      return {ok:true,value:result};
    }catch(e){const code=e instanceof Failure||e instanceof HistoryFailure?e.code:e instanceof ForecastFailure&&e.code==='PROJECTION_LIMIT_EXCEEDED'?'HISTORY_LIMIT_EXCEEDED':e instanceof ForecastFailure||e instanceof ClosingFailure||e instanceof BatchFailure?'HISTORY_SOURCE_INVALID':'STORAGE_ERROR';return {ok:false,code};}
  }};
}





/** Original HB-013 confirmation proof, without the writer's row locks or replay. */
async function legacyProof(tx:import('./commit').Transaction,scope:AuthorizedScope,batch:typeof s.budgetUpdates.$inferSelect,audits:typeof s.auditEvents.$inferSelect[]){
  const documents=audits.filter(a=>(a.beforeAfter as {entity?:{type?:string}})?.entity?.type==='TRANSITION_CONFIRMATION');
  if(documents.length!==1)fail('HISTORY_SOURCE_INVALID');
  const doc=documents[0].beforeAfter as {entity:{id:string};after:unknown};
  if(!exactKeys(doc.after,['schemaVersion','confirmation','proposalIdentity','decisionId','checkpointId','vectorId','funding'])||doc.after.schemaVersion!==1)fail('HISTORY_SOURCE_INVALID');
  const original=doc.after.confirmation;
  if(!exactKeys(original,['expectedRevision','effectiveDate','reason','payload'])||hash({owner:scope.ownerUserId,account:scope.accountId,kind:batch.kind,...original})!==batch.payloadIdentity
    ||!exactKeys(original.payload,['proposalId','proposalIdentity','input','review']))fail('HISTORY_SOURCE_INVALID');
  const payload=original.payload,input=parseTransition(payload.input);if(!input.ok)fail('HISTORY_SOURCE_INVALID');
  const [proposal]=await tx.select().from(s.transferProposals).where(and(eq(s.transferProposals.ownerUserId,scope.ownerUserId),eq(s.transferProposals.accountId,scope.accountId),eq(s.transferProposals.id,doc.entity.id)));
  const [decision]=await tx.select().from(s.transitionDecisions).where(and(eq(s.transitionDecisions.ownerUserId,scope.ownerUserId),eq(s.transitionDecisions.accountId,scope.accountId),eq(s.transitionDecisions.budgetUpdateId,batch.id)));
  if(!proposal||!decision||proposal.id!==payload.proposalId||proposal.payloadIdentity!==payload.proposalIdentity||proposal.payloadIdentity!==doc.after.proposalIdentity
    ||proposal.payloadIdentity!==hash({owner:scope.ownerUserId,account:scope.accountId,document:proposal.proposal})||decision.id!==doc.after.decisionId||decision.proposalId!==proposal.id
    ||decision.recordedSeq!==batch.recordedSeq||proposal.expectedRevision!==batch.expectedRevision||decision.mode!==input.value.mode||decision.observationMode!==input.value.observationMode)fail('HISTORY_SOURCE_INVALID');
  const prepared=proposal.proposal as {input?:unknown;review?:unknown;reason?:unknown;effectiveDate?:unknown};
  if(hash(prepared.input)!==hash(payload.input)||hash(prepared.review)!==hash(payload.review)||prepared.reason!==original.reason||prepared.effectiveDate!==original.effectiveDate)fail('HISTORY_SOURCE_INVALID');
  const [vector]=await tx.select().from(s.allocationRevisions).where(and(eq(s.allocationRevisions.ownerUserId,scope.ownerUserId),eq(s.allocationRevisions.accountId,scope.accountId),eq(s.allocationRevisions.id,decision.afterAllocationRevisionId)));
  if(!vector||vector.budgetUpdateId!==batch.id||vector.recordedSeq!==batch.recordedSeq||vector.positionId!==decision.positionId||vector.id!==doc.after.vectorId||vector.checkpointId!==doc.after.checkpointId)fail('HISTORY_SOURCE_INVALID');
  const manifest=decision.manifest as {funding?:unknown};if(hash(manifest.funding)!==hash(doc.after.funding))fail('HISTORY_SOURCE_INVALID');
}

function unknownPeriodAmounts(context:Awaited<ReturnType<typeof readProjectionContext>>,h:import('@/shared/pure/calendar').BerlinDate){
  const os=selectObligationState(context.obligationHistory,h),ss=selectSavingState(context.savingHistory,h);
  if(!os.ok||!ss.ok)fail('HISTORY_SOURCE_INVALID');
  const reserves=calculatePeriodReserves(os.value.states),savings=calculatePeriodSavings(ss.value.states);
  if(!reserves.ok||!savings.ok)fail('HISTORY_SOURCE_INVALID');
  const byId=new Map(context.periods.map(p=>[p.id,p.period]));
  return [...new Set([...reserves.value.keys(),...savings.value.keys()])].map(id=>({period:byId.get(id)!,allocated:null,reserved:reserves.value.get(id)??0n,savings:savings.value.get(id)??0n,free:null,deficit:null}));
}
