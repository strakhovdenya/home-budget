import 'server-only';
import { and,eq,sql } from 'drizzle-orm';
import { commitBatch,BatchFailure,rejectBatch,type Transaction } from './commit';
import { prepareCommand,validUuid } from '@/domain/updates/validation';
import { parseClosingInput,parseClosingQuery } from '@/domain/closing/validation';
import { ClosingFailure,fail,CLOSING_LIMITS } from '@/domain/closing/serialization';
import { calendarState } from '@/domain/closing/projection';
import type { ClosingRepository,ClosingQuery,Json } from '@/domain/closing/contracts';
import type { AuthorizedScope,UpdateErrorCode } from '@/domain/updates/contracts';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parsePeriod,endOfMonth } from '@/domain/periods/period';
import { closingReview,persistClosing } from './closing-writer';
import { ClosingReadBudget,validateOriginal,closingChain,ownedReport,validateReport,json,hashText,documentHash,type Account } from './closing-reader';
import { databaseToday } from './transition-state';
import { ForecastFailure } from '@/domain/forecast/validation';
import * as s from './schema';

function wire(value:unknown):Json{const v=json(value);if(Buffer.byteLength(JSON.stringify(v),'utf8')>CLOSING_LIMITS.wire)fail('REPORT_LIMIT_EXCEEDED');return v;}
export function createClosingRepository(database:{db:Parameters<typeof commitBatch>[0]}):ClosingRepository {
  async function safe<T>(run:()=>Promise<T>){try{return {ok:true as const,value:await run()};}catch(e){const code:UpdateErrorCode=e instanceof BatchFailure||e instanceof ClosingFailure?e.code:e instanceof ForecastFailure?(e.code==='PROJECTION_LIMIT_EXCEEDED'?'REPORT_LIMIT_EXCEEDED':'REPORT_PROOF_INVALID'):'STORAGE_ERROR';return {ok:false as const,code};}}
  async function inBatch<T>(run:()=>Promise<T>):Promise<T>{try{return await run();}catch(e){
    if(e instanceof ClosingFailure)return rejectBatch(e.code);
    if(e instanceof ForecastFailure)return rejectBatch(e.code==='PROJECTION_LIMIT_EXCEEDED'?'REPORT_LIMIT_EXCEEDED':'REPORT_PROOF_INVALID');
    throw e;
  }}
  async function read<T>(scope:AuthorizedScope,run:(tx:Transaction,a:Account,b:ClosingReadBudget)=>Promise<T>){
    return database.db.transaction(async tx=>{
      await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);
      if(!validUuid(scope.ownerUserId)||!validUuid(scope.accountId))return rejectBatch('FORBIDDEN');
      const [a]=await tx.select().from(s.accounts).where(and(eq(s.accounts.ownerUserId,scope.ownerUserId),eq(s.accounts.id,scope.accountId)));
      if(!a)return rejectBatch('FORBIDDEN');
      // Cross-instance concurrent/rate admission uses transient database locks, never financial rows.
      const lock=await tx.execute<{locked:boolean}>(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${scope.accountId},19019)) AS locked`);
      if(!lock.rows[0].locked)return rejectBatch('RETRYABLE_STORAGE_ERROR');
      await tx.execute(sql`SELECT pg_sleep(0.05)`);
      return run(tx,a,new ClosingReadBudget());
    },{isolationLevel:'repeatable read',accessMode:'read only'});
  }
  async function selected(tx:Transaction,scope:AuthorizedScope,a:Account,q:ClosingQuery,b:ClosingReadBudget){
    const clock=await databaseToday(tx),[period]=await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.ownerUserId,scope.ownerUserId),eq(s.budgetPeriods.accountId,scope.accountId),eq(s.budgetPeriods.period,q.period)));
    const [head]=period?await tx.select().from(s.reportHeads).where(and(eq(s.reportHeads.ownerUserId,scope.ownerUserId),eq(s.reportHeads.accountId,scope.accountId),eq(s.reportHeads.periodId,period.id))):[];
    const chain=period?await closingChain(tx,scope,period.id,b):[];
    if((chain.at(-1)?.id??null)!==(head?.closingId??null))fail('REPORT_PROOF_INVALID');
    if(q.version!==null)b.charge(chain.length);
    const id=q.version===null?head?.closingId:chain.find(c=>c.version===q.version)?.id;
    if(q.version!==null&&!id)return rejectBatch('FORBIDDEN');
    let report=null;
    if(id){const c=await ownedReport(tx,scope,id);const [u]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.id,c.budgetUpdateId)));
      if(!u)fail('REPORT_PROOF_INVALID');report=(await validateOriginal(tx,scope,a,u,b)).result;}
    return {clock,head,chain,report};
  }
  function summary(r:Awaited<ReturnType<typeof validateReport>>,b:ClosingReadBudget){const {snapshot,...basis}=r.basis;void snapshot;const body=b.canonical(r.document);
    return {...basis,id:r.report.id,version:r.report.version,previousVersionId:r.report.previousVersionId,knowledgeCut:r.report.evidenceRecordedCutoffSeq.toString(),reason:r.report.reason,
      digest:hashText(body),totalBytes:Buffer.byteLength(body,'utf8')};}
  function bytesChunk(doc:unknown,offset:number,expected:string|null,b:ClosingReadBudget){
    const body=Buffer.from(b.canonical(doc),'utf8'),digest=hashText(body.toString('utf8'));
    if(expected!==null&&expected!==digest)fail('REPORT_PROOF_INVALID');
    if(offset%131072!==0||offset>=body.length&&!(offset===0&&body.length===0))fail('REPORT_PROOF_INVALID');
    const end=Math.min(offset+131072,body.length);
    return wire({digest,totalBytes:body.length,offset,nextOffset:end<body.length?end:null,base64:body.subarray(offset,end).toString('base64')});
  }
  const repository:ClosingRepository={
    load:(scope,query)=>safe(()=>read(scope,async(tx,a,b)=>{const q=parseClosingQuery(query),v=await selected(tx,scope,a,q,b);
      return wire({period:q.period,today:v.clock.today,revision:a.aggregateRevision.toString(),knowledgeCut:a.recordedSeq.toString(),state:calendarState(q.period,v.clock.today,!!v.head),
        headId:v.head?.closingId??null,headVersion:v.chain.at(-1)?.version??null,correctionPending:v.head?.correctionPending??false,
        versions:v.chain.slice(q.offset,q.offset+50).map(x=>({version:x.version,id:x.id})),nextVersionOffset:q.offset+50<v.chain.length?q.offset+50:null,report:v.report?summary(v.report,b):null});})),
    preview:(scope,command)=>safe(()=>read(scope,async(tx,a,b)=>{
      const payload=command.payload;
      if(!exactKeys(payload,['schemaVersion','operation','period','expectedHeadId','expectedHeadVersion'])||payload.schemaVersion!==1||!parsePeriod(payload.period).ok)fail('REPORT_PROOF_INVALID');
      const period=parsePeriod(payload.period);if(!period.ok)fail('REPORT_PROOF_INVALID');
      const input={...payload,historicalThroughDate:endOfMonth(period.value),knowledgeCut:a.recordedSeq.toString(),snapshotSchemaVersion:1,selectionContractVersion:1,reviewDigest:'0'.repeat(64),confirmed:true};
      const prepared=prepareCommand({...command,expectedRevision:command.expectedRevision.toString(),payload:input});if(!prepared.ok)fail('REPORT_PROOF_INVALID');
      const review=await closingReview(tx,scope,a,prepared.value,b);
      return wire({command:{...json({...command,expectedRevision:command.expectedRevision.toString()}) as object,payload:{...input,reviewDigest:review.digest}},
        before:review.previous?summary(review.previous,b):null,after:{...review.candidate.basis,snapshot:undefined},
        reviewDigest:review.digest,detailDigest:documentHash(review.candidate.document,b),detailBytes:Buffer.byteLength(b.canonical(review.candidate.document),'utf8')});})),
    confirm:(scope,command)=>safe(async()=>{
      parseClosingInput(command.payload);
      return commitBatch(database.db,{scope,kind:'MONTH_CLOSE',command,verifyReplay:async(tx,a,u)=>{await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);await inBatch(()=>validateOriginal(tx,scope,a,u,new ClosingReadBudget()));}},(tx,batch)=>inBatch(async()=>{
        await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);
        const review=await closingReview(tx,scope,batch.account,command,new ClosingReadBudget());return persistClosing(tx,batch,scope,review);
      }));}),
    status:(scope,requestId)=>safe(()=>read(scope,async(tx,a,b)=>{
      if(!validUuid(requestId))return rejectBatch('INVALID_INPUT');
      const [u]=await tx.select().from(s.budgetUpdates).where(and(eq(s.budgetUpdates.ownerUserId,scope.ownerUserId),eq(s.budgetUpdates.accountId,scope.accountId),eq(s.budgetUpdates.requestId,requestId)));
      return u?(await validateOriginal(tx,scope,a,u,b)).receipt:null;
    })),
    chunk:(scope,query)=>safe(()=>read(scope,async(tx,a,b)=>{const q=parseClosingQuery(query),v=await selected(tx,scope,a,q,b);if(!v.report)return rejectBatch('FORBIDDEN');return bytesChunk(v.report.document,q.offset,q.digest,b);})),
    review:(scope,command,offset)=>safe(()=>read(scope,async(tx,a,b)=>{if(!Number.isSafeInteger(offset)||offset<0)fail('REPORT_PROOF_INVALID');const v=await closingReview(tx,scope,a,command,b);if(v.digest!==parseClosingInput(command.payload).reviewDigest)fail('REPORT_PROOF_INVALID');return bytesChunk(v.candidate.document,offset,null,b);})),
  };
  return repository;
}
