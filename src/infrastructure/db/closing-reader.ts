import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, lte, sql, getTableColumns, inArray } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { Json } from '@/domain/closing/contracts';
import { canonicalDocument, operationBudget, chainBudget, fail } from '@/domain/closing/serialization';
import { makeClosing } from '@/domain/closing/projection';
import { parsePeriod,endOfMonth } from '@/domain/periods/period';
import { selectObligationState } from '@/domain/obligations/history';
import { selectSavingState } from '@/domain/savings/history';
import { readProjectionContext,closingPeriodPredicate } from './projection-reader';
import { canonicalPayload, rejectBatch, type Transaction } from './commit';
import { prepareCommand,parseReceipt } from '@/domain/updates/validation';
import { parseClosingInput } from '@/domain/closing/validation';
import { exactKeys } from '@/domain/checkpoints/validation';
import * as s from './schema';

export const hashText=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
export const documentHash=(v:unknown,b?:ClosingReadBudget)=>hashText(b?b.canonical(v):canonicalDocument(v));
export function json(v:unknown):Json {return JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x)) as Json;}
export type Account=typeof s.accounts.$inferSelect;
export type Report=typeof s.monthClosings.$inferSelect;
type ChainLink=Readonly<{id:string;version:number;previous:string|null;updateId:string;seq:bigint;reasonLength:number;schema:number;selection:number}>;
export class ClosingReadBudget {
  work=0;rows=0n;bytes=0n;roots=0;metadataBytes=0;readonly cuts=new Map<string,Awaited<ReturnType<typeof readProjectionContext>>>();
  readonly chains=new Map<string,readonly ChainLink[]>();
  charge(n:number){this.work=operationBudget([],this.work+n);}
  canonical(v:unknown){return canonicalDocument(v,()=>this.charge(1));}
}
/** Counts the complete source set before calling existing quadratic historical validators. */
async function sourceAdmission(tx:Transaction,scope:AuthorizedScope,cut:bigint,b:ClosingReadBudget){
  const tables=[s.balanceCheckpoints,s.allocationRevisions,s.historicalPositions,s.orderingRevisions,s.obligations,s.obligationEvents,s.savingsGoals,s.savingsEvents,s.auditEvents,s.transitionDecisions];
  let work=0n,sourceRows=0n;
  for(const t of tables){
    const pred=and(eq(t.ownerUserId,scope.ownerUserId),eq(t.accountId,scope.accountId),lte(t.recordedSeq,cut));
    const r=await tx.execute<{n:string;bytes:string;nodes:string}>(sql`SELECT count(*)::text n,coalesce(sum(octet_length(to_jsonb(${t})::text)),0)::text bytes,
      coalesce(sum(length(to_jsonb(${t})::text)-length(translate(to_jsonb(${t})::text,'{}[]:,',''))+1),0)::text nodes FROM ${t} WHERE ${pred}`);
    b.rows+=BigInt(r.rows[0].n);b.bytes+=BigInt(r.rows[0].bytes);
    sourceRows+=BigInt(r.rows[0].n);
    // Conservative descriptor traversal admission, including punctuation inside strings.
    b.charge(Number(r.rows[0].nodes)*12);
    if(t!==s.auditEvents&&t!==s.transitionDecisions&&t!==s.obligations&&t!==s.savingsGoals)work+=BigInt(r.rows[0].n);
  }
  for(const t of [s.periodAllocations,s.budgetPeriods]){
    const pred=and(eq(t.ownerUserId,scope.ownerUserId),eq(t.accountId,scope.accountId),t===s.periodAllocations
      ?sql`EXISTS(SELECT 1 FROM ${s.allocationRevisions} WHERE ${s.allocationRevisions.id}=${s.periodAllocations.allocationRevisionId} AND ${s.allocationRevisions.recordedSeq}<=${cut})`:closingPeriodPredicate(scope,cut));
    const r=await tx.execute<{n:string;bytes:string}>(sql`SELECT count(*)::text n,coalesce(sum(octet_length(to_jsonb(${t})::text)),0)::text bytes FROM ${t} WHERE ${pred}`);
    b.rows+=BigInt(r.rows[0].n);b.bytes+=BigInt(r.rows[0].bytes);
    sourceRows+=BigInt(r.rows[0].n);
    if(t===s.budgetPeriods&&BigInt(r.rows[0].n)>1200n)fail('REPORT_LIMIT_EXCEEDED');
  }
  if(work>2000n||b.rows>20000n||b.bytes>8388608n)fail('REPORT_LIMIT_EXCEEDED');
  // One primitive W² plus V for repeated existing validators. Assembly and the
  // retained-source selections call indexHistory ten times; 32 W² bounds their
  // day scans, anchor/predecessor scans, lifecycle scans and sorting together.
  // Allocation/period and audit scans are charged separately, before JS loads.
  b.charge(Number(32n*work*work+sourceRows*work));
}
export async function closingCandidate(tx:Transaction,scope:AuthorizedScope,account:Account,period:string,cut:bigint,b:ClosingReadBudget){
  const p=parsePeriod(period);if(!p.ok)fail('REPORT_PROOF_INVALID');const h=endOfMonth(p.value),key=`${h}/${cut}`;
  if(!b.cuts.has(key)){if(b.cuts.size>=2)fail('REPORT_LIMIT_EXCEEDED');await sourceAdmission(tx,scope,cut,b);b.cuts.set(key,await readProjectionContext(tx,scope,account,h,cut,{kind:'HISTORICAL_CLOSING'}));}
  // Admission for the three bounded snapshot copy/validation/codec walks in makeClosing.
  b.charge(300000);
  const context=b.cuts.get(key)!,basis=makeClosing(context.snapshot,period);
  const os=selectObligationState(context.obligationHistory,h),ss=selectSavingState(context.savingHistory,h);
  if(!os.ok)return rejectBatch(os.code);if(!ss.ok)return rejectBatch(ss.code);
  // Readers already prove entire lifecycle suffixes and independent identity/funding/payment/savings evidence.
  // Bank/vector/order audits are additionally checked against retained typed facts here.
  type Evidence={id:string;budgetUpdateId:string;recordedSeq:string;document:Json};
  const checkedAudits=new Map<string,Evidence>();
  function audit(type:string,id:string,expected:unknown,kind:'BANK'|'VECTOR'|'ORDER'|'STATE'):Evidence{
    const prior=checkedAudits.get(type+':'+id);if(prior)return prior;
    const found=context.audits.filter(a=>{b.charge(1);const d=a.beforeAfter as {entity?:{type?:unknown;id?:unknown}};return d?.entity?.type===type&&d.entity.id===id;});
    if(found.length!==1)fail('REPORT_PROOF_INVALID');
    const row=found[0],doc=row.beforeAfter;
    if(!exactKeys(doc,['schemaVersion','eventIndex','entity','before','after'])||doc.schemaVersion!==1||!Number.isSafeInteger(doc.eventIndex)||(doc.eventIndex as number)<0
      ||!exactKeys(doc.entity,['type','id'])||doc.entity.type!==type||doc.entity.id!==id||!doc.after||typeof doc.after!=='object'||Array.isArray(doc.after))fail('REPORT_PROOF_INVALID');
    if(kind!=='STATE'){
      const e=expected as Record<string,unknown>,after=doc.after as Record<string,unknown>;
      if(kind==='ORDER'&&((after.date??after.historicalDate)!==e.historicalDate
        ||(after.date!==undefined&&after.historicalDate!==undefined&&after.date!==after.historicalDate)))fail('REPORT_PROOF_INVALID');
      for(const key of Object.keys(e)){
        if(kind==='ORDER'&&(key==='historicalDate'||key==='recordedSeq'))continue;
        if(b.canonical(json(after[key]))!==b.canonical(json(e[key])))fail('REPORT_PROOF_INVALID');
      }
      const seq=(expected as {recordedSeq?:bigint}).recordedSeq;
      if(seq!==undefined&&row.recordedSeq!==seq)fail('REPORT_PROOF_INVALID');
    }
    const result={id:row.id,budgetUpdateId:row.budgetUpdateId,recordedSeq:row.recordedSeq.toString(),document:json(row.beforeAfter)};
    checkedAudits.set(type+':'+id,result);return result;
  }
  for(const c of context.history.checkpoints)audit('BANK_CHECKPOINT',c.id,{id:c.id,logicalFactId:c.logicalFactId,supersedesId:c.supersedesId,recordedSeq:c.recordedSeq,
    positionId:c.positionId,observedDate:c.observedDate,observedAt:c.observedAt,balanceCents:c.balanceCents},'BANK');
  for(const v of context.history.vectors)audit('ALLOCATION_REVISION',v.id,{id:v.id,logicalFactId:v.logicalFactId,supersedesId:v.supersedesId,recordedSeq:v.recordedSeq,
    positionId:v.positionId,checkpointId:v.checkpointId,previousRevisionId:v.previousRevisionId,effectiveDate:v.effectiveDate,allocations:v.allocations},'VECTOR');
  for(const o of context.history.orderings)audit('DAY_ORDERING',o.id,{historicalDate:o.historicalDate,recordedSeq:o.recordedSeq,positionIds:o.positionIds,edges:o.edges},'ORDER');
  const bank=context.history.checkpoints.find(c=>c.id===basis.lastCheckpointId);
  const vector=context.history.vectors.find(v=>v.id===basis.historicalAllocationRevisionId);
  const evidence:ReturnType<typeof audit>[]=[];
  if(bank)evidence.push(audit('BANK_CHECKPOINT',bank.id,{id:bank.id,logicalFactId:bank.logicalFactId,supersedesId:bank.supersedesId,recordedSeq:bank.recordedSeq,
    positionId:bank.positionId,observedDate:bank.observedDate,observedAt:bank.observedAt,balanceCents:bank.balanceCents},'BANK'));
  if(vector)evidence.push(audit('ALLOCATION_REVISION',vector.id,{id:vector.id,logicalFactId:vector.logicalFactId,supersedesId:vector.supersedesId,recordedSeq:vector.recordedSeq,
    positionId:vector.positionId,checkpointId:vector.checkpointId,previousRevisionId:vector.previousRevisionId,effectiveDate:vector.effectiveDate,allocations:vector.allocations},'VECTOR'));
  for(const orderId of basis.orderingRevisionRefs){
    const o=context.history.orderings.find(o=>o.id===orderId);if(!o)fail('REPORT_PROOF_INVALID');
    evidence.push(audit('DAY_ORDERING',o.id,{historicalDate:o.historicalDate,positionIds:o.positionIds,edges:o.edges},'ORDER'));
  }
  for(const e of os.value.states)evidence.push(audit('OBLIGATION_STATE',e.id,{},'STATE'));
  for(const e of ss.value.states)evidence.push(audit('SAVINGS_STATE',e.id,{},'STATE'));
  const neededBatches=new Set([...os.value.states,...ss.value.states].filter(e=>e.action==='FUNDING_TRANSFER').map(e=>e.budgetUpdateId));
  const fundingAudits=context.audits.filter(a=>neededBatches.has(a.budgetUpdateId)).map(a=>({id:a.id,budgetUpdateId:a.budgetUpdateId,recordedSeq:a.recordedSeq.toString(),document:json(a.beforeAfter)}));
  const sourceManifest={schemaVersion:1,checkpointId:basis.lastCheckpointId,allocationRevisionId:basis.historicalAllocationRevisionId,
    obligationRevisionIds:basis.obligationRevisionIds,savingsRevisionIds:basis.savingsRevisionIds,evidence:[...new Map([...evidence,...fundingAudits].map(e=>[e.id,e])).values()].sort((a,c)=>a.id.localeCompare(c.id))};
  const {snapshot,...scalars}=basis;
  const document=json({schemaVersion:1,period,...scalars,snapshot,sourceManifest});
  b.canonical(document);
  return {basis,document,sourceManifest};
}

/** SQL returns only bounded metadata; never materialize every ancestor's JSON report. */
export async function closingChain(tx:Transaction,scope:AuthorizedScope,periodId:string,b:ClosingReadBudget):Promise<readonly ChainLink[]>{
  const cacheKey=scope.ownerUserId+'/'+scope.accountId+'/'+periodId,cached=b.chains.get(cacheKey);if(cached)return cached;
  const scoped=(t:{ownerUserId:AnyPgColumn;accountId:AnyPgColumn})=>and(eq(t.ownerUserId,scope.ownerUserId),eq(t.accountId,scope.accountId));
  const r=await tx.select({id:s.monthClosings.id,version:s.monthClosings.version,previous:s.monthClosings.previousVersionId,
    updateId:s.monthClosings.budgetUpdateId,seq:s.monthClosings.recordedSeq,reasonLength:sql<number>`length(trim(${s.monthClosings.reason}))`,
    schema:s.monthClosings.snapshotSchemaVersion,selection:s.monthClosings.selectionContractVersion}).from(s.monthClosings)
    .where(and(scoped(s.monthClosings),eq(s.monthClosings.periodId,periodId))).orderBy(s.monthClosings.version).limit(1001);
  chainBudget(r.length,0);
  const metaBytes=Buffer.byteLength(JSON.stringify(json(r)),'utf8');
  chainBudget(r.length,metaBytes);
  for(let i=0;i<r.length;i++){b.charge(1);const v=r[i];if(v.version!==i+1||v.previous!==(r[i-1]?.id??null)||v.reasonLength<1)fail('REPORT_PROOF_INVALID');
    if(v.schema!==1||v.selection!==1)fail('UNSUPPORTED_REPORT_VERSION');}
  if(r.length){
    const [period]=await tx.select({period:s.budgetPeriods.period}).from(s.budgetPeriods).where(and(scoped(s.budgetPeriods),eq(s.budgetPeriods.id,periodId)));
    const [currentHead]=await tx.select({id:s.reportHeads.id,closingId:s.reportHeads.closingId}).from(s.reportHeads).where(and(scoped(s.reportHeads),eq(s.reportHeads.periodId,periodId)));
    if(!period||!currentHead||currentHead.closingId!==r.at(-1)?.id)fail('REPORT_PROOF_INVALID');
    const ids=r.map(x=>x.updateId),predicate=and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),inArray(s.auditEvents.budgetUpdateId,ids));
    const size=await tx.execute<{bytes:string}>(sql`SELECT coalesce(sum(octet_length(${s.auditEvents.beforeAfter}::text)),0)::text bytes FROM ${s.auditEvents} WHERE ${predicate}`);
    b.metadataBytes=metaBytes+Number(size.rows[0].bytes);chainBudget(r.length,b.metadataBytes);
    b.charge(b.metadataBytes);
    const audits=await tx.select().from(s.auditEvents).where(predicate).limit(2001);
    if(audits.length!==r.length*2)fail('REPORT_PROOF_INVALID');
    const updates=await tx.select().from(s.budgetUpdates)
      .where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),inArray(s.budgetUpdates.id,ids)));
    const byBatch=new Map(updates.map(x=>[x.id,x]));
    const grouped=new Map<string,typeof audits>();
    for(const audit of audits){b.charge(1);const list=grouped.get(audit.budgetUpdateId)??[];list.push(audit);grouped.set(audit.budgetUpdateId,list);}
    let priorDigest:string|null=null,headIdentity:string|null=null,priorSeq=0n;
    for(const v of r){b.charge(1);const entries=grouped.get(v.updateId)??[],u=byBatch.get(v.updateId);
      const docs=entries.map(x=>x.beforeAfter);
      for(const d of docs)if(!exactKeys(d,['schemaVersion','eventIndex','entity','before','after'])||d.schemaVersion!==1||!exactKeys(d.entity,['type','id']))fail('REPORT_PROOF_INVALID');
      const version=docs.find(x=>(x as {entity:{type:string}}).entity.type==='REPORT_VERSION') as {eventIndex:number;entity:{id:string};before:unknown;after:Record<string,unknown>}|undefined;
      const head=docs.find(x=>(x as {entity:{type:string}}).entity.type==='REPORT_HEAD') as {eventIndex:number;entity:{id:string};before:unknown;after:Record<string,unknown>}|undefined;
      if(!u||u.kind!=='MONTH_CLOSE'||u.recordedSeq!==v.seq||v.seq<=priorSeq||u.actorId!==scope.ownerUserId||entries.length!==2
        ||entries.some(x=>x.recordedSeq!==v.seq||x.eventKind!=='MONTH_CLOSE')||!version||version.eventIndex!==0||version.entity.id!==v.id
        ||!exactKeys(version.after,['schemaVersion','reportId','version','previousVersionId','digest','reviewDigest','diff','command','knowledgeCut','cutoffAt'])
        ||version.after.schemaVersion!==1||version.after.reportId!==v.id||version.after.version!==v.version||version.after.previousVersionId!==v.previous
        ||typeof version.after.digest!=='string'||!(/^[a-f0-9]{64}$/).test(version.after.digest)||version.before!==priorDigest
        ||!head||head.eventIndex!==1||!exactKeys(head.after,['closingId','correctionPending'])||head.after.closingId!==v.id||head.after.correctionPending!==false
        ||head.entity.id!==currentHead.id||(headIdentity!==null&&head.entity.id!==headIdentity))fail('REPORT_PROOF_INVALID');
      if(v.version===1?head.before!==null:!exactKeys(head.before,['closingId','correctionPending'])||head.before.closingId!==v.previous||typeof head.before.correctionPending!=='boolean')fail('REPORT_PROOF_INVALID');
      const command=prepareCommand(version.after.command),receipt=parseReceipt(u.result),diff=version.after.diff;
      if(!command.ok||!receipt.ok||!exactKeys(diff,['before','after','changeEvidenceRefs'])||diff.before!==priorDigest||diff.after!==version.after.digest)fail('REPORT_PROOF_INVALID');
      const c=command.value,p=parseClosingInput(c.payload);
      if(c.requestId!==u.requestId||c.expectedRevision!==u.expectedRevision||c.reason!==entries[0].reason||entries.some(x=>x.reason!==c.reason||x.effectiveDate!==c.effectiveDate)
        ||p.period!==period.period||p.expectedHeadId!==v.previous||p.expectedHeadVersion!==(v.version===1?null:v.version-1)||p.operation!==(v.version===1?'INITIAL':'REVISION')
        ||p.knowledgeCut!==(v.seq-1n).toString()||version.after.knowledgeCut!==p.knowledgeCut||version.after.reviewDigest!==p.reviewDigest
        ||receipt.value.updateId!==u.id||receipt.value.recordedSeq!==v.seq.toString()||receipt.value.aggregateRevision!==(u.expectedRevision+1n).toString()
        ||hashText(canonicalPayload({owner:scope.ownerUserId,account:scope.accountId,kind:'MONTH_CLOSE',expectedRevision:c.expectedRevision.toString(),payload:c.payload,effectiveDate:c.effectiveDate,reason:c.reason}))!==u.payloadIdentity)fail('REPORT_PROOF_INVALID');
      const digest=documentHash({schemaVersion:1,scope,requestId:c.requestId,expectedRevision:c.expectedRevision.toString(),effectiveDate:c.effectiveDate,reason:c.reason,
        operation:p.operation,period:p.period,historicalThroughDate:p.historicalThroughDate,knowledgeCut:p.knowledgeCut,expectedHeadId:p.expectedHeadId,expectedHeadVersion:p.expectedHeadVersion,snapshotSchemaVersion:1,selectionContractVersion:1,diff},b);
      if(digest!==p.reviewDigest)fail('REPORT_PROOF_INVALID');
      headIdentity=head.entity.id;priorDigest=version.after.digest;priorSeq=v.seq;
    }
  }
  b.chains.set(cacheKey,r);return r;
}
export async function ownedReport(tx:Transaction,scope:AuthorizedScope,id:string):Promise<Report>{
  if(!(/^[0-9a-f-]{36}$/i).test(id))return rejectBatch('FORBIDDEN');
  const size=await tx.execute<{bytes:string}>(sql`SELECT (octet_length(snapshot_json::text)+octet_length(source_manifest::text)+octet_length(ordering_revision_refs::text)+octet_length(change_evidence_refs::text))::text bytes FROM ${s.monthClosings} WHERE owner_user_id=${scope.ownerUserId} AND account_id=${scope.accountId} AND id=${id}`);
  if(!size.rows.length)return rejectBatch('FORBIDDEN');if(BigInt(size.rows[0].bytes)>16777216n)fail('REPORT_LIMIT_EXCEEDED');
  const [report]=await tx.select({...getTableColumns(s.monthClosings),closedAt:sql<string>`to_char(${s.monthClosings.closedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    evidenceRecordedCutoffAt:sql<string>`to_char(${s.monthClosings.evidenceRecordedCutoffAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    lastBankObservedAt:sql<string|null>`to_char(${s.monthClosings.lastBankObservedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`}).from(s.monthClosings).where(and(eq(s.monthClosings.ownerUserId,scope.ownerUserId),eq(s.monthClosings.accountId,scope.accountId),eq(s.monthClosings.id,id)));
  if(!report) return rejectBatch('FORBIDDEN');return report;
}
export async function validateReport(tx:Transaction,scope:AuthorizedScope,account:Account,c:Report,b:ClosingReadBudget){
  if(++b.roots>2)fail('REPORT_LIMIT_EXCEEDED');
  const [period]=await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId,scope.ownerUserId),eq(s.budgetPeriods.accountId,scope.accountId),eq(s.budgetPeriods.id,c.periodId)));
  if(!period||c.snapshotSchemaVersion!==1||c.selectionContractVersion!==1)fail('UNSUPPORTED_REPORT_VERSION');
  if(c.evidenceRecordedCutoffSeq>=c.recordedSeq||c.evidenceRecordedCutoffSeq>account.recordedSeq)fail('REPORT_PROOF_INVALID');
  const built=await closingCandidate(tx,scope,account,period.period,c.evidenceRecordedCutoffSeq,b),basis=built.basis;
  for(const key of ['historicalThroughDate','lastCheckpointId','lastBankObservedDate','lastBankObservedAt','lastObservedBalanceCents','historicalAllocationRevisionId','allocationEffectiveDate',
    'endCheckpointId','endBalanceCents','bankDataCompleteness','operationDetailStatus','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents'] as const){
    const value=c[key];if((typeof value==='bigint'?value.toString():value)!==basis[key])fail('REPORT_PROOF_INVALID');
  }
  if(b.canonical(c.snapshotJson)!==b.canonical(basis.snapshot)||b.canonical(c.sourceManifest)!==b.canonical(built.sourceManifest)
    ||b.canonical(c.orderingRevisionRefs)!==b.canonical(basis.orderingRevisionRefs))fail('REPORT_PROOF_INVALID');
  const chain=await closingChain(tx,scope,c.periodId,b);b.charge(chain.length);if(!chain.some(r=>r.id===c.id))fail('REPORT_PROOF_INVALID');
  const audits=await tx.select().from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),eq(s.auditEvents.budgetUpdateId,c.budgetUpdateId))).limit(3);
  const version=audits.filter(a=>(a.beforeAfter as {entity?:{type?:string;id?:string}})?.entity?.type==='REPORT_VERSION'&&(a.beforeAfter as {entity:{id:string}}).entity.id===c.id);
  if(audits.length!==2||version.length!==1)fail('REPORT_PROOF_INVALID');
  const doc=version[0].beforeAfter as {after?:{digest?:unknown;reportId?:unknown;command?:unknown}};
  if(doc.after?.digest!==documentHash(built.document,b)||doc.after.reportId!==c.id||!doc.after.command)fail('REPORT_PROOF_INVALID');
  return {...built,report:c,chain,command:doc.after.command};
}

export async function validateOriginal(tx:Transaction,scope:AuthorizedScope,a:Account,u:typeof s.budgetUpdates.$inferSelect,b:ClosingReadBudget){
    if(u.kind!=='MONTH_CLOSE')return rejectBatch('FORBIDDEN');
    const reports=await tx.select({id:s.monthClosings.id}).from(s.monthClosings).where(and(eq(s.monthClosings.ownerUserId,scope.ownerUserId),eq(s.monthClosings.accountId,scope.accountId),eq(s.monthClosings.budgetUpdateId,u.id))).limit(2);
    if(reports.length!==1)fail('REPORT_PROOF_INVALID');
    const result=await validateReport(tx,scope,a,await ownedReport(tx,scope,reports[0].id),b);b.charge(12288);const command=prepareCommand(result.command);
    const receipt=parseReceipt(u.result);
    if(!command.ok||!receipt.ok)fail('REPORT_PROOF_INVALID');
    const c=command.value,p=parseClosingInput(c.payload);
    if(c.requestId!==u.requestId||c.expectedRevision!==u.expectedRevision||result.report.recordedSeq!==u.recordedSeq||receipt.value.updateId!==u.id
      ||receipt.value.recordedSeq!==u.recordedSeq.toString()||receipt.value.aggregateRevision!==(u.expectedRevision+1n).toString()
      ||p.knowledgeCut!==result.report.evidenceRecordedCutoffSeq.toString()||p.expectedHeadId!==result.report.previousVersionId||c.reason!==result.report.reason||u.actorId!==scope.ownerUserId||result.report.closedBy!==scope.ownerUserId
      ||hashText(canonicalPayload({owner:scope.ownerUserId,account:scope.accountId,kind:'MONTH_CLOSE',expectedRevision:c.expectedRevision.toString(),payload:c.payload,effectiveDate:c.effectiveDate,reason:c.reason}))!==u.payloadIdentity)fail('REPORT_PROOF_INVALID');
    const times=await tx.execute<{instant:string}>(sql`SELECT to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS instant FROM ${s.budgetUpdates} WHERE ${s.budgetUpdates.id}=${u.id}`);
    if(result.report.closedAt!==times.rows[0].instant||result.report.evidenceRecordedCutoffAt!==times.rows[0].instant)fail('REPORT_PROOF_INVALID');
    const versionAudit=await tx.select({body:s.auditEvents.beforeAfter}).from(s.auditEvents).where(and(eq(s.auditEvents.ownerUserId,scope.ownerUserId),eq(s.auditEvents.accountId,scope.accountId),eq(s.auditEvents.budgetUpdateId,u.id),sql`${s.auditEvents.beforeAfter}->'entity'->>'type'='REPORT_VERSION'`)).limit(2);
    const doc=versionAudit[0]?.body as {before:unknown;after?:{diff?:{before:unknown;after:unknown;changeEvidenceRefs:unknown};reviewDigest?:unknown;cutoffAt?:unknown}};
    const diff=doc?.after?.diff;if(!diff||doc.after?.reviewDigest!==p.reviewDigest||doc.after.cutoffAt!==times.rows[0].instant||doc.before!==diff.before||diff.after!==documentHash(result.document,b))fail('REPORT_PROOF_INVALID');
    if(b.canonical(result.report.changeEvidenceRefs)!==b.canonical(diff.changeEvidenceRefs))fail('REPORT_PROOF_INVALID');
    const digest=documentHash({schemaVersion:1,scope,requestId:c.requestId,expectedRevision:c.expectedRevision.toString(),effectiveDate:c.effectiveDate,reason:c.reason,
      operation:p.operation,period:p.period,historicalThroughDate:p.historicalThroughDate,knowledgeCut:p.knowledgeCut,expectedHeadId:p.expectedHeadId,expectedHeadVersion:p.expectedHeadVersion,snapshotSchemaVersion:1,selectionContractVersion:1,diff},b);
    if(digest!==p.reviewDigest||p.historicalThroughDate!==result.report.historicalThroughDate||p.expectedHeadVersion!==(result.report.version===1?null:result.report.version-1))fail('REPORT_PROOF_INVALID');
    return {receipt:receipt.value,result};
  }
