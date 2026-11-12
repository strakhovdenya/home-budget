import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { Basis, Entry, HistoryError, HistoryIndexReader, HistoryResult, Page, PageQuery, SourceRef, SourceKind } from '@/domain/history/contracts';
import { month, parsePageQuery } from '@/domain/history/validation';
import { validUuid, parseReceipt } from '@/domain/updates/validation';
import { LIMITS } from '@/domain/forecast/contracts';
import { databaseToday } from './transition-state';
import type { createDatabase } from './client';
import type { Transaction } from './commit';
import * as s from './schema';
import {verifyTemplateHistory} from './template-repository';

export class HistoryFailure extends Error {constructor(readonly code:HistoryError){super(code);}}
function fail(code:HistoryError):never{throw new HistoryFailure(code);}
type Root={id:string;kind:string;seq:string;recordedAt:string;receiptValid:boolean};
type Metadata=SourceRef & {batchId:string;valid:boolean;entityType:string|null;entityId:string|null;eventIndex:string|null;membershipPeriod:string|null};
// Static identifiers only. Every dynamic value enters a parameterized SQL fragment.
const sources = [
  ['obligations','OBLIGATION_IDENTITY',null,'NULL','NULL','NULL',null],
  ['savings_goals','SAVING_IDENTITY',null,'NULL','NULL','NULL',null],
  ['period_allocations','PERIOD_ALLOCATION','effective_date','position_id','NULL','NULL',null],
  ['balance_checkpoints','BANK_CHECKPOINT','observed_date','position_id','supersedes_id','NULL',null],
  ['allocation_revisions','ALLOCATION_REVISION','effective_date','position_id','supersedes_id','previous_revision_id','change_kind'],
  ['obligation_events','OBLIGATION_STATE','effective_date','position_id','supersedes_id','previous_revision_id','action'],
  ['savings_events','SAVINGS_STATE','effective_date','position_id','supersedes_id','previous_revision_id','action'],
  ['transition_decisions','TRANSITION_DECISION',null,'position_id','NULL','NULL','mode'],
  ['budget_transfers','BUDGET_TRANSFER',null,'NULL','NULL','NULL',null],
  ['ordering_revisions','DAY_ORDERING','historical_date','NULL','NULL','previous_revision_id',null],
  ['historical_positions','POSITION','historical_date','id','NULL','NULL','kind'],
  ['month_closings','MONTH_CLOSING','historical_through_date','NULL','NULL','previous_version_id',null],
  ['audit_events','AUDIT','effective_date','NULL','NULL','NULL','event_kind'],
] as const;
const knownKinds = new Set(['TEMPLATE_CONFIG','TEMPLATE_ACCEPT','TEMPLATE_DECLINE','BANK_CHECKPOINT','BUDGET_UPDATE','PERIOD_TRANSITION','ALLOCATION_ONLY','MONTH_CLOSE',
  ...['CREATE','AMEND','PARTIAL_SETTLEMENT','PAID','CANCELLED','CORRECTION_SET'].map(a=>'OBLIGATION_'+a),
  ...['CREATE','AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE','CORRECTION_SET','ACTUAL_CHECK'].map(a=>'SAVING_'+a)]);

async function admission(tx:Transaction,scope:AuthorizedScope,cut:bigint){
  let rows=0n,bytes=0n,work=0n;
  for(const [table,kind] of sources){
    const t=sourceTable(table);
    const r=await tx.execute<{n:string;bytes:string}>(sql`SELECT count(*)::text n,coalesce(sum(octet_length(to_jsonb(t)::text)),0)::text bytes
      FROM ${t} t WHERE t.owner_user_id=${scope.ownerUserId} AND t.account_id=${scope.accountId} AND t.recorded_seq<=${cut}`);
    const n=BigInt(r.rows[0].n);rows+=n;bytes+=BigInt(r.rows[0].bytes);
    if(!['AUDIT','TRANSITION_DECISION','BUDGET_TRANSFER','MONTH_CLOSING','OBLIGATION_IDENTITY','SAVING_IDENTITY','PERIOD_ALLOCATION'].includes(kind))work+=n;
    if(rows>BigInt(LIMITS.historyRows)||bytes>BigInt(LIMITS.storageBytes)||work*work>4000000n)fail('HISTORY_LIMIT_EXCEEDED');
  }
}
async function roots(tx:Transaction,scope:AuthorizedScope,cut:bigint,limit:number|null,last:bigint|null):Promise<Root[]>{
  const budget=await tx.execute<{bytes:string}>(sql`SELECT coalesce(sum(octet_length(to_jsonb(r)::text)),0)::text bytes FROM (
    SELECT u.id,u.kind,u.recorded_seq,u.expected_revision,u.result,u.recorded_at,u.actor_id FROM budget_updates u
    WHERE u.owner_user_id=${scope.ownerUserId} AND u.account_id=${scope.accountId} AND u.recorded_seq<=${cut}
    ${last===null?sql``:sql`AND u.recorded_seq<${last}`} ORDER BY u.recorded_seq DESC ${limit===null?sql``:sql`LIMIT ${limit}`}) r`);
  if(BigInt(budget.rows[0].bytes)>BigInt(LIMITS.storageBytes))fail('HISTORY_LIMIT_EXCEEDED');
  const r=await tx.execute<Root>(sql`SELECT u.id,u.kind,u.recorded_seq::text seq,
    to_char(u.recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') "recordedAt",
    (u.actor_id=u.owner_user_id AND u.expected_revision<9223372036854775807 AND u.result=jsonb_build_object('updateId',u.id::text,'recordedSeq',u.recorded_seq::text,
      'aggregateRevision',(u.expected_revision::numeric+1)::text)) "receiptValid"
    FROM budget_updates u WHERE u.owner_user_id=${scope.ownerUserId} AND u.account_id=${scope.accountId} AND u.recorded_seq<=${cut}
    ${last===null?sql``:sql`AND u.recorded_seq<${last}`} ORDER BY u.recorded_seq DESC ${limit===null?sql``:sql`LIMIT ${limit}`}`);
  return r.rows;
}
async function metadata(tx:Transaction,scope:AuthorizedScope,cut:bigint,ids:readonly string[]|null):Promise<Metadata[]>{
  if(ids?.length===0)return [];
  const queries=sources.map(([table,kind,date,position,supersedes,previous,action])=>{
    const col=(name:string)=>name==='NULL'?sql`NULL::text`:sql`${sql.raw('t.'+name)}::text`;
    const audit=kind==='AUDIT';
    const doc=sql`t.before_after`;
    const membership=audit?sql.raw("CASE WHEN t.before_after->'entity'->>'type'='TEMPLATE_DECISION' AND t.event_kind IN ('TEMPLATE_ACCEPT','TEMPLATE_DECLINE') THEN t.before_after->'after'->'command'->'payload'->>'originPeriod' ELSE NULL END"):sql`NULL::text`;
    // The snapshot is not assembled for a list. Typed membership and mandatory audit
    // envelopes are checked here. VALID is metadata admission only; original
    // confirmations and full retained facts are verified on selected detail.
    const valid=audit?sql`jsonb_typeof(${doc})='object' AND ${doc}->>'schemaVersion'='1'
      AND jsonb_typeof(${doc}->'entity')='object' AND ${doc}->'entity'->>'type' IS NOT NULL
      AND ${doc}->'entity'->>'id' IS NOT NULL AND jsonb_typeof(${doc}->'eventIndex')='number'
      AND (SELECT count(*) FROM jsonb_object_keys(CASE WHEN jsonb_typeof(${doc})='object' THEN ${doc} ELSE '{}'::jsonb END))=5
      AND (SELECT count(*) FROM jsonb_object_keys(CASE WHEN jsonb_typeof(${doc}->'entity')='object' THEN ${doc}->'entity' ELSE '{}'::jsonb END))=2
      AND ${doc}->>'eventIndex' ~ '^(0|[1-9][0-9]{0,15})$' AND (length(${doc}->>'eventIndex')<16 OR ${doc}->>'eventIndex'<='9007199254740991')
      AND ${doc} ? 'before' AND ${doc} ? 'after'`:
      kind==='POSITION'?sql`(SELECT count(*)=1 FROM ordering_revisions o WHERE o.owner_user_id=t.owner_user_id AND o.account_id=t.account_id AND o.historical_date=t.historical_date AND o.recorded_seq<=${cut}
        AND NOT EXISTS(SELECT 1 FROM ordering_revisions newer WHERE newer.owner_user_id=o.owner_user_id AND newer.account_id=o.account_id AND newer.historical_date=o.historical_date AND newer.recorded_seq<=${cut} AND newer.recorded_seq>o.recorded_seq)
        AND jsonb_typeof(o.manifest->'positionIds')='array' AND (SELECT count(*) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(o.manifest->'positionIds')='array' THEN o.manifest->'positionIds' ELSE '[]'::jsonb END) member WHERE member=t.id::text)=1)`:
      kind==='OBLIGATION_IDENTITY'||kind==='SAVING_IDENTITY'?sql`EXISTS(SELECT 1 FROM ${sql.raw(kind==='OBLIGATION_IDENTITY'?'obligation_events':'savings_events')} e
        WHERE ${sql.raw(kind==='OBLIGATION_IDENTITY'?'e.obligation_id':'e.savings_id')}=t.id AND e.owner_user_id=t.owner_user_id AND e.account_id=t.account_id AND e.recorded_seq=t.recorded_seq AND e.budget_update_id=t.budget_update_id AND e.action='CREATE' AND e.supersedes_id IS NULL)`:
      kind==='PERIOD_ALLOCATION'?sql`true`:sql`(SELECT count(*)=1 FROM audit_events a WHERE a.owner_user_id=t.owner_user_id AND a.account_id=t.account_id
        AND a.budget_update_id=t.budget_update_id AND a.recorded_seq=t.recorded_seq
        AND a.before_after->'entity'->>'type'=${kind==='MONTH_CLOSING'?'REPORT_VERSION':kind} AND a.before_after->'entity'->>'id'=t.id::text AND ${auditMatches(kind)})`;
    return sql`SELECT ${kind}::text kind,t.id::text id,t.budget_update_id::text "batchId",t.recorded_seq::text "recordedSeq",
      ${date?sql`${sql.raw('t.'+date)}::text`:sql`coalesce((SELECT min(a.effective_date)::text FROM audit_events a WHERE a.owner_user_id=t.owner_user_id AND a.account_id=t.account_id AND a.budget_update_id=t.budget_update_id), '')`} date,
      ${col(position)} "positionId",${col(supersedes)} "supersedesId",${col(previous)} "previousRevisionId",${action?col(action):sql`NULL::text`} action,
      coalesce((${valid}),false) valid,${audit?sql`${doc}->'entity'->>'type'`:sql`NULL::text`} "entityType",${audit?sql`${doc}->'entity'->>'id'`:sql`NULL::text`} "entityId",${audit?sql`${doc}->>'eventIndex'`:sql`NULL::text`} "eventIndex",${membership} "membershipPeriod"
      FROM ${sourceTable(table)} t WHERE t.owner_user_id=${scope.ownerUserId} AND t.account_id=${scope.accountId} AND t.recorded_seq<=${cut}
      ${ids===null?sql``:sql`AND t.budget_update_id IN (${sql.join(ids.map(id=>sql`${id}::uuid`),sql`,`)})`}`;
  });
  return (await tx.execute<Metadata>(sql.join(queries,sql` UNION ALL `))).rows;
}
function entries(rs:readonly Root[],ms:readonly Metadata[]):Entry[]{
  const byBatch=new Map<string,Metadata[]>();
  for(const m of ms){const group=byBatch.get(m.batchId)??[];group.push(m);byBatch.set(m.batchId,group);}
  return rs.map(r=>{
    const group=byBatch.get(r.id)??[],count=(k:SourceKind)=>group.filter(x=>x.kind===k).length;
    const audits=group.filter(x=>x.kind==='AUDIT');
    const typed=new Map(group.filter(x=>x.kind!=='AUDIT').map(x=>[x.kind+':'+x.id,x]));
    const auditTypes=new Set<SourceKind>(['BANK_CHECKPOINT','ALLOCATION_REVISION','OBLIGATION_STATE','SAVINGS_STATE','TRANSITION_DECISION','BUDGET_TRANSFER','DAY_ORDERING','MONTH_CLOSING']);
    let valid=r.receiptValid&&audits.length>0&&group.every(x=>x.valid&&x.recordedSeq===r.seq);
    const copiedOnce=audits.filter(a=>!['BANK_HEAD','REPORT_REVIEW_REQUIRED','REPORT_HEAD'].includes(a.entityType??''));
    if(new Set(copiedOnce.map(a=>a.entityType+':'+a.entityId)).size!==copiedOnce.length)valid=false;
    const supportedAudits=new Set(['BANK_CHECKPOINT','ALLOCATION_REVISION','OBLIGATION_STATE','SAVINGS_STATE','TRANSITION_DECISION','BUDGET_TRANSFER','DAY_ORDERING','REPORT_VERSION','FUNDING_TRANSFER','BANK_HEAD','REPORT_HEAD','REPORT_REVIEW_REQUIRED','ALLOCATION_ONLY_REVIEW','TRANSITION_CONFIRMATION','BUDGET_UPDATE_REVIEW','ACCOUNT_CREATED','TEMPLATE_CONFIG','TEMPLATE_DECISION']);
    if(audits.some(a=>!supportedAudits.has(a.entityType??'')||!validUuid(a.entityId)))valid=false;
    const indices=new Set(audits.map(a=>a.eventIndex));
    if(indices.size!==audits.length||audits.some(a=>!a.valid||a.eventIndex===null||BigInt(a.eventIndex)>=BigInt(audits.length)))valid=false;
    if(audits.filter(a=>a.entityType==='BANK_HEAD').length!==count('ALLOCATION_REVISION'))valid=false;
    for(const a of audits)if(auditTypes.has(a.entityType as SourceKind)&&!typed.has(a.entityType+':'+a.entityId))valid=false;
    if(r.kind==='BANK_CHECKPOINT')valid=valid&&count('BANK_CHECKPOINT')===1&&count('ALLOCATION_REVISION')===1;
    if(r.kind==='ALLOCATION_ONLY')valid=valid&&count('ALLOCATION_REVISION')===1;
    if(r.kind==='BUDGET_UPDATE')valid=valid&&count('ALLOCATION_REVISION')===1&&audits.filter(a=>a.entityType==='BUDGET_UPDATE_REVIEW'&&a.entityId===r.id).length===1;
    if(r.kind==='PERIOD_TRANSITION')valid=valid&&count('TRANSITION_DECISION')===1&&count('ALLOCATION_REVISION')===1
      &&audits.filter(a=>a.entityType==='BUDGET_UPDATE_REVIEW'||a.entityType==='TRANSITION_CONFIRMATION').length===1;
    if(r.kind==='TEMPLATE_CONFIG'||r.kind==='TEMPLATE_DECLINE')valid=valid&&group.length===1&&audits.length===1&&audits[0].entityType===(r.kind==='TEMPLATE_CONFIG'?'TEMPLATE_CONFIG':'TEMPLATE_DECISION');
    if(r.kind==='TEMPLATE_ACCEPT')valid=valid&&count('OBLIGATION_STATE')===1&&count('POSITION')===1&&count('DAY_ORDERING')===1&&audits.filter(a=>a.entityType==='TEMPLATE_DECISION').length===1;
    if(r.kind==='MONTH_CLOSE')valid=valid&&count('MONTH_CLOSING')===1&&audits.filter(a=>a.entityType==='REPORT_HEAD').length===1;
    if(r.kind.startsWith('OBLIGATION_'))valid=valid&&count('OBLIGATION_STATE')>0&&(r.kind==='OBLIGATION_CORRECTION_SET'||group.filter(x=>x.kind==='OBLIGATION_STATE').every(x=>x.action===r.kind.slice(11)));
    if(r.kind.startsWith('SAVING_'))valid=valid&&count('SAVINGS_STATE')>0&&(['SAVING_CORRECTION_SET','SAVING_ACTUAL_CHECK'].includes(r.kind)||group.filter(x=>x.kind==='SAVINGS_STATE').every(x=>x.action===r.kind.slice(7)));
    return {id:r.id,kind:r.kind,recordedSeq:r.seq,recordedAt:r.recordedAt,
      sourceStatus:!knownKinds.has(r.kind)?'UNSUPPORTED':valid?'VALID':'INVALID',
      sources:group.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id)).map(({kind,id,date,recordedSeq,positionId,supersedesId,previousRevisionId,action})=>({kind,id,date,recordedSeq,positionId,supersedesId,previousRevisionId,action}))};
  });
}
export function createHistoryIndexReader(database:ReturnType<typeof createDatabase>):HistoryIndexReader {
  async function read<T>(scope:AuthorizedScope,run:(tx:Transaction,a:typeof s.accounts.$inferSelect,clock:Awaited<ReturnType<typeof databaseToday>>)=>Promise<T>):Promise<HistoryResult<T>>{
    try{
      if(!validUuid(scope.ownerUserId)||!validUuid(scope.accountId))fail('FORBIDDEN');
      const value=await database.db.transaction(async tx=>{
        await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);
        const [a]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId)));
        if(!a)fail('FORBIDDEN');
        const lock=await tx.execute<{locked:boolean}>(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${scope.accountId},19019)) locked`);
        if(!lock.rows[0].locked)fail('RETRYABLE_STORAGE_ERROR');
        const result=await run(tx,a,await databaseToday(tx));
        if(Buffer.byteLength(JSON.stringify(result),'utf8')>LIMITS.wireBytes)fail('HISTORY_LIMIT_EXCEEDED');
        return result;
      },{isolationLevel:'repeatable read',accessMode:'read only'});
      return {ok:true,value};
    }catch(e){return {ok:false,code:e instanceof HistoryFailure?e.code:'STORAGE_ERROR'};}
  }
  async function page(tx:Transaction,scope:AuthorizedScope,q:PageQuery):Promise<Page>{
    const cut=BigInt(q.basis.knowledgeCut);
    await admission(tx,scope,cut);
    let all:Entry[]|null=null;
    if(q.basis.month!==null){
      const r=await roots(tx,scope,cut,LIMITS.historyRows+1,null);
      if(r.length>LIMITS.historyRows)fail('HISTORY_LIMIT_EXCEEDED');
      await verifyTemplateHistory(tx,scope,cut);
      const ms=await metadata(tx,scope,cut,null),memberships=new Map<string,Set<string>>();
      for(const m of ms)if(m.membershipPeriod!==null){const set=memberships.get(m.batchId)??new Set<string>();set.add(m.membershipPeriod);memberships.set(m.batchId,set);}
      all=entries(r,ms);
      if(all.some(e=>e.sourceStatus!=='VALID'))fail('HISTORY_SOURCE_INVALID');
      const previous=new Map(all.flatMap(e=>e.sources.map(x=>[x.kind+':'+x.id,x] as const)));
      all=all.filter(e=>memberships.get(e.id)?.has(q.basis.month!)||e.sources.some(x=>(x.kind!=='AUDIT'||['TEMPLATE_CONFIG','TEMPLATE_DECLINE'].includes(e.kind))&&(x.date.slice(0,7)===q.basis.month||x.supersedesId&&previous.get(x.kind+':'+x.supersedesId)?.date.slice(0,7)===q.basis.month)));
    }
    async function keys(last:string|null){return all?all.filter(e=>last===null||BigInt(e.recordedSeq)<BigInt(last)).slice(0,21):roots(tx,scope,cut,21,last===null?null:BigInt(last));}
    for(const boundary of [q.fromLastSeq,q.lastSeq])if(boundary!==null){
      if(all){const rank=all.findIndex(e=>e.recordedSeq===boundary)+1;if(rank===0||rank%20!==0)fail('INVALID_INPUT');}
      else {
        const rank=await tx.execute<{n:string;member:boolean}>(sql`SELECT count(*)::text n,bool_or(u.recorded_seq=${BigInt(boundary)}) member FROM budget_updates u
          WHERE u.owner_user_id=${scope.ownerUserId} AND u.account_id=${scope.accountId} AND u.recorded_seq<=${cut} AND u.recorded_seq>=${BigInt(boundary)}`);
        if(!rank.rows[0].member||BigInt(rank.rows[0].n)%20n!==0n)fail('INVALID_INPUT');
      }
    }
    if(q.lastSeq!==null){
      const preceding=await keys(q.fromLastSeq);
      const seq=(r:Root|Entry)=>'seq'in r?r.seq:r.recordedSeq;
      if(preceding.length<=20||seq(preceding[19])!==q.lastSeq)fail('INVALID_INPUT');
    }
    const selected=await keys(q.lastSeq),emitted=selected.slice(0,20);
    const items=all?emitted as Entry[]:entries(emitted as Root[],await metadata(tx,scope,cut,emitted.map(e=>e.id)));
    return {schemaVersion:1,basis:q.basis,fromLastSeq:q.fromLastSeq,lastSeq:q.lastSeq,
      nextLastSeq:selected.length>20?items.at(-1)!.recordedSeq:null,items,sourceValidity:items.every(i=>i.sourceStatus==='VALID')?'VALID':'INVALID'};
  }
  return {
    open:(scope,filter)=>read(scope,async(tx,a,clock)=>{
      if(!month(filter))fail('INVALID_INPUT');
      const anchor=(await roots(tx,scope,a.recordedSeq,1,null))[0];
      if(a.recordedSeq===0n?!!anchor:!anchor||anchor.seq!==a.recordedSeq.toString())fail('HISTORY_SOURCE_INVALID');
      const basis:Basis={schemaVersion:1,indexAnchor:anchor?.id??null,knowledgeCut:a.recordedSeq.toString(),month:filter,today:clock.today,capturedAt:clock.now};
      return page(tx,scope,{schemaVersion:1,basis,fromLastSeq:null,lastSeq:null});
    }),
    page:(scope,raw)=>{
      let q:PageQuery;try{q=parsePageQuery(raw);}catch{return Promise.resolve({ok:false,code:'INVALID_INPUT'});}
      return read(scope,async(tx,a,clock)=>{
        const cut=BigInt(q.basis.knowledgeCut);
        if(cut>a.recordedSeq||q.basis.today>clock.today||q.basis.capturedAt>clock.now)fail('INVALID_INPUT');
        if(cut!==0n){const anchor=(await roots(tx,scope,cut,1,null))[0];if(!anchor||anchor.id!==q.basis.indexAnchor||anchor.seq!==q.basis.knowledgeCut||anchor.recordedAt>q.basis.capturedAt)fail('INVALID_INPUT');}
        return page(tx,scope,q);
      });
    },
  };
}



/** Reuse exactly the index's typed membership checks inside a detail transaction. */
export async function requireHistoryEntry(tx:Transaction,scope:AuthorizedScope,batch:typeof s.budgetUpdates.$inferSelect,basis:Basis):Promise<Entry>{
  const receipt=parseReceipt(batch.result);
  const valid=receipt.ok&&receipt.value.updateId===batch.id&&receipt.value.recordedSeq===batch.recordedSeq.toString()
    &&receipt.value.aggregateRevision===(batch.expectedRevision+1n).toString()&&batch.actorId===scope.ownerUserId;
  await admission(tx,scope,BigInt(basis.knowledgeCut));
  const [entry]=entries([{id:batch.id,kind:batch.kind,seq:batch.recordedSeq.toString(),recordedAt:batch.recordedAt,receiptValid:valid}],
    await metadata(tx,scope,BigInt(basis.knowledgeCut),[batch.id]));
  if(entry.sourceStatus!=='VALID')fail('HISTORY_SOURCE_INVALID');
  if(basis.month!==null){
    const all=await metadata(tx,scope,BigInt(basis.knowledgeCut),null),byId=new Map(all.map(x=>[x.kind+':'+x.id,x]));
    if(!all.some(m=>m.batchId===batch.id&&m.membershipPeriod===basis.month)&&!entry.sources.some(x=>(x.kind!=='AUDIT'||['TEMPLATE_CONFIG','TEMPLATE_DECLINE'].includes(batch.kind))&&(x.date.slice(0,7)===basis.month||x.supersedesId&&byId.get(x.kind+':'+x.supersedesId)?.date.slice(0,7)===basis.month)))fail('INVALID_INPUT');
  }
  return entry;
}

import type { SQL } from 'drizzle-orm';

/** SQL metadata proof: compare retained typed scalars to their audit copy without
 * transferring or reconstructing financial snapshots for the twenty list rows. */
function auditMatches(kind:SourceKind):SQL {
  const object=(fields:readonly (readonly [string,SQL])[])=>sql`jsonb_build_object(${sql.join(fields.flatMap(([key,value])=>[sql`${key}::text`,value]),sql`,`)})`;
  const text=(column:string)=>sql`${sql.raw('t.'+column)}::text`;
  const field=(name:string,column:string)=>[name,text(column)] as const;
  const after=sql`a.before_after->'after'`;
  if(kind==='BANK_CHECKPOINT')return sql`${after}=${object([
    field('id','id'),field('logicalFactId','logical_fact_id'),field('supersedesId','supersedes_id'),field('recordedSeq','recorded_seq'),field('positionId','position_id'),
    field('observedDate','observed_date'),['observedAt',sql`to_char(t.observed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`],field('balanceCents','balance_cents')])}`;
  if(kind==='ALLOCATION_REVISION')return sql`${after}=${object([
    field('id','id'),field('logicalFactId','logical_fact_id'),field('supersedesId','supersedes_id'),field('recordedSeq','recorded_seq'),field('positionId','position_id'),field('checkpointId','checkpoint_id'),
    field('previousRevisionId','previous_revision_id'),field('effectiveDate','effective_date'),['allocations',sql`(SELECT coalesce(jsonb_agg(jsonb_build_object('period',p.period,'amountCents',pa.amount_cents::text) ORDER BY p.period),'[]'::jsonb)
      FROM period_allocations pa JOIN budget_periods p ON p.id=pa.period_id AND p.owner_user_id=t.owner_user_id AND p.account_id=t.account_id
      WHERE pa.allocation_revision_id=t.id AND pa.owner_user_id=t.owner_user_id AND pa.account_id=t.account_id)`]])}`;
  if(kind==='OBLIGATION_STATE'||kind==='SAVINGS_STATE'){
    const obligation=kind==='OBLIGATION_STATE';
    const state=object([['schemaVersion',sql`1`],field('revisionId','id'),field(obligation?'obligationId':'savingsId',obligation?'obligation_id':'savings_id'),
      ['originatingPeriodId',sql`(SELECT i.originating_period_id::text FROM ${sql.raw(obligation?'obligations':'savings_goals')} i WHERE i.id=${sql.raw(obligation?'t.obligation_id':'t.savings_id')}
        AND i.owner_user_id=t.owner_user_id AND i.account_id=t.account_id AND i.recorded_seq<=t.recorded_seq)`],field('fundingPeriodId','funding_period_id'),['title',sql`t.title`],['status',sql`t.status`],
      ...(obligation?[field('dueDate','due_date'),field('originalCents','original_cents'),field('outstandingCents','outstanding_cents'),['isPossible',sql`t.is_possible`] as const,['reserveFull',sql`t.reserve_full`] as const]:[field('amountCents','amount_cents')])]);
    return sql`${after}->${obligation?'state':'stateAfter'}=${state}`;
  }
  if(kind==='DAY_ORDERING')return sql`coalesce(${after}->>'date',${after}->>'historicalDate')=t.historical_date::text
    AND ${after}->'positionIds'=t.manifest->'positionIds' AND ${after}->'edges'=t.dependencies->'edges'
    AND t.manifest->>'schemaVersion'='1' AND t.dependencies->>'schemaVersion'='1'`;
  if(kind==='TRANSITION_DECISION')return sql`${after}->>'mode'=t.mode AND ${after}->>'observationMode'=t.observation_mode
    AND ${after}->'funding'=t.manifest->'funding' AND t.manifest->>'schemaVersion'='1'`;
  if(kind==='MONTH_CLOSING')return sql`${after}->>'reportId'=t.id::text AND ${after}->>'version'=t.version::text
    AND ${after}->>'knowledgeCut'=t.evidence_recorded_cutoff_seq::text AND ${after}->>'schemaVersion'='1'`;
  return sql`true`;
}



function sourceTable(table:string):SQL {
  if(table==='period_allocations')return sql`(SELECT pa.*,v.budget_update_id,v.recorded_seq,v.effective_date,v.position_id FROM period_allocations pa
    JOIN allocation_revisions v ON v.id=pa.allocation_revision_id AND v.owner_user_id=pa.owner_user_id AND v.account_id=pa.account_id)`;
  return sql.raw(table);
}
