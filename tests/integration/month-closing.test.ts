import { randomUUID,createHash } from 'node:crypto';
import pg from 'pg';
import { beforeAll,afterAll,expect,it } from 'vitest';
import { eq,sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { closingCandidate,closingChain,ClosingReadBudget,validateOriginal,hashText,documentHash,json } from '@/infrastructure/db/closing-reader';
import { createClosingRepository } from '@/infrastructure/db/closing-repository';
import { commitBatch,rejectBatch,canonicalPayload } from '@/infrastructure/db/commit';
import { auditDocuments } from '@/infrastructure/db/audit-writer';
import { loadObligationHistory } from '@/infrastructure/db/obligation-history';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { makeClosing } from '@/domain/closing/projection';
import { canonicalDocument } from '@/domain/closing/serialization';
import { reviewDifference } from '@/features/month-closing/review-difference';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { persistAllocation } from '@/infrastructure/db/allocation-writer';
import { loadCheckpointHistory } from '@/infrastructure/db/checkpoint-history';
import { databaseToday } from '@/infrastructure/db/transition-state';
import { parseTransition } from '@/domain/transitions/validation';
import { writeSavings } from '@/infrastructure/db/savings-writer';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { createProjectionRepository,readProjectionContext } from '@/infrastructure/db/projection-reader';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { periodBudget } from '@/domain/forecast/budget';
import type { Period } from '@/domain/periods/period';
import { shiftPeriod } from '@/domain/periods/period';
import { createBudgetRepository } from '@/infrastructure/db/budget-update-repository';
import { prepareCommand } from '@/domain/updates/validation';
import { transitionCalendar } from '../fixtures/transition-calendar';
import type { Result } from '@/shared/pure/result';
import * as s from '@/infrastructure/db/schema';

let db:ReturnType<typeof createDatabase>,admin:pg.Pool,cal:ReturnType<typeof transitionCalendar>,testUrl:string;
function value<T>(r:Result<T,string>):T{if(!r.ok)throw Error(r.code);return r.value;}
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_TARGET_REQUIRED');
  const url=new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);admin=new pg.Pool({connectionString:url.toString()});
  const name='hb019_'+randomUUID().replaceAll('-','');await admin.query('CREATE DATABASE "'+name+'"');url.pathname='/'+name;
  testUrl=url.toString();db=createDatabase(testUrl);await migrate(db.db,{migrationsFolder:'./drizzle'});
  const clock=await db.db.execute<{day:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS day`);cal=transitionCalendar(clock.rows[0].day);
});
afterAll(async()=>{await db?.close();await admin?.end();});
type Scope={ownerUserId:string;accountId:string};
async function fixture(withBank=true,withObligation=true,obligationAmount='30000'){
  const f={ownerUserId:randomUUID(),accountId:randomUUID()};await db.db.insert(s.users).values({id:f.ownerUserId});await db.db.insert(s.accounts).values({...f,id:f.accountId,displayName:'Synthetic HB019'});
  if(withObligation){const date=cal.pastDay(2);const c=value(prepareCommand({requestId:randomUUID(),expectedRevision:'0',effectiveDate:date,reason:'Synthetic full obligation',payload:{changes:[{
    key:'a',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:date,bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
    data:{title:'Synthetic bill',dueDate:null,originalCents:obligationAmount,isPossible:false,reserveFull:true,originatingPeriod:cal.past,fundingPeriod:cal.past}}]}}));await commitBatch(db.db,{scope:f,kind:'OBLIGATION',command:c},writeObligations);}
  if(withBank)await observe(f,cal.pastDay(20),'80000',[{period:cal.past,amountCents:'60000'},{period:cal.target,amountCents:'20000'}]);
  return f;
}
async function account(f:Scope){return (await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId)))[0];}
async function observe(f:Scope,date:string,balance:string,allocations:{period:string;amountCents:string}[]){const a=await account(f);return commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:date,reason:'Synthetic actual bank check',payload:{observedDate:date,observedAt:null,balanceCents:balance,allocations,placement:null,correction:null}}))},writeBankCheckpoint);}
const query=(version:number|null=null)=>({period:cal.past,version,offset:0,digest:null});
async function preview(f:Scope,operation='INITIAL',headId:string|null=null,headVersion:number|null=null,period:string=cal.past){const a=await account(f),r=value(await createClosingRepository(db).preview(f,value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.today,reason:'Synthetic explicit closing consent',payload:{schemaVersion:1,operation,period,expectedHeadId:headId,expectedHeadVersion:headVersion}})))) as unknown as {command:unknown};return value(prepareCommand(r.command));}
async function baseline(f:Scope){const tables=[s.budgetPeriods,s.budgetUpdates,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,s.obligations,s.obligationEvents,s.savingsGoals,s.savingsEvents,s.historicalPositions,s.orderingRevisions,s.transferProposals,s.transitionDecisions,s.budgetTransfers,s.transferProposalCancellations,s.auditEvents,s.monthClosings,s.reportHeads];return {user:await db.db.select().from(s.users).where(eq(s.users.id,f.ownerUserId)),account:await account(f),rows:await Promise.all(tables.map(t=>db.db.select().from(t).where(eq(t.accountId,f.accountId)).orderBy(t.id)))};}

it('HB19-B01 Atomic initial report commit',async()=>{
  const f=await fixture(),before=await account(f),fullBefore=await baseline(f),c=await preview(f),repo=createClosingRepository(db);value(await repo.confirm(f,c));
  const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({version:1,endBalanceCents:null,lastObservedBalanceCents:80000n,historicalAllocatedCents:60000n,historicalReservedCents:30000n,historicalFreeCents:30000n});
  expect((await account(f)).activeAllocationRevisionId).toBe(before.activeAllocationRevisionId);expect((await account(f)).recordedSeq).toBe(before.recordedSeq+1n);
  const after=await baseline(f);expect(after.user).toEqual(fullBefore.user);expect(after.rows.slice(2,15)).toEqual(fullBefore.rows.slice(2,15));expect(after.rows[0]).toEqual(fullBefore.rows[0]);
  expect(after.account).toEqual({...before,aggregateRevision:before.aggregateRevision+1n,recordedSeq:before.recordedSeq+1n});expect(after.rows[1]).toHaveLength(fullBefore.rows[1].length+1);expect(after.rows[15]).toHaveLength(fullBefore.rows[15].length+2);
  value(await repo.load(f,query(1)));
});
it('HB19-A04 No observation and actual zero differ',async()=>{
  const f=await fixture(false,true),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));
  const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({bankDataCompleteness:'NO_OBSERVATION',endBalanceCents:null,historicalAllocatedCents:null,historicalReservedCents:30000n,historicalFreeCents:null});value(await repo.load(f,query(1)));
});
it('HB19-R01 Cross-instance exact-content confirmation',async()=>{
  const f=await fixture(),c=await preview(f);const first=value(await createClosingRepository(db).confirm(f,c)),before=await baseline(f);
  expect(value(await createClosingRepository(db).confirm(f,c))).toEqual(first);expect(value(await createClosingRepository(db).status(f,c.requestId))).toEqual(first);expect(await baseline(f)).toEqual(before);
});
it('HB19-B11 Same request with changed payload conflicts',async()=>{
  const f=await fixture(),c=await preview(f),repo=createClosingRepository(db);value(await repo.confirm(f,c));const before=await baseline(f);
  expect(await repo.confirm(f,value(prepareCommand({...c,reason:'Different reason'})))).toEqual({ok:false,code:'REQUEST_PAYLOAD_CONFLICT'});expect(await baseline(f)).toEqual(before);
});
it('HB19-B05 Tampered review digest or cutoff',async()=>{
  const f=await fixture(),c=await preview(f),before=await baseline(f),p=c.payload as object;
  expect(await createClosingRepository(db).confirm(f,value(prepareCommand({...c,payload:{...p,reviewDigest:'f'.repeat(64)}})))).toEqual({ok:false,code:'REPORT_PROOF_INVALID'});expect(await baseline(f)).toEqual(before);
});
it('HB19-B13 Foreign account and unauthorized result isolation',async()=>{
  const f=await fixture(),other=await fixture(),c=await preview(f),before=await baseline(other);
  expect((await createClosingRepository(db).confirm(other,c)).ok).toBe(false);expect(await baseline(other)).toEqual(before);
});
it('HB19-C02 Explicit second report version',async()=>{
  const f=await fixture(),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));
  await observe(f,cal.pastEnd,'76000',[{period:cal.past,amountCents:'56000'},{period:cal.target,amountCents:'20000'}]);
  const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  value(await repo.confirm(f,await preview(f,'REVISION',old.id,1)));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);
  expect(rows[0]).toEqual(old);expect(rows[1]).toMatchObject({version:2,previousVersionId:old.id,endBalanceCents:76000n,historicalFreeCents:26000n});value(await repo.load(f,query(1)));value(await repo.load(f,query(2)));
});

it.each(['report','head','audit','deferred'] as const)('HB19-B08 %s real SQL failure rolls back reports, optional period, audits and all scoped state',async failure=>{
  const f=await fixture(false,false),c=await preview(f),before=await baseline(f),client=new pg.Client({connectionString:testUrl});await client.connect();
  const query=client.query.bind(client);let injected=false,batch:Record<string,unknown>|null=null;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{
    const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';
    const inserted=/^insert into "budget_updates" \(([^)]+)\)/.exec(text);
    if(inserted&&Array.isArray(args[1]))batch=Object.fromEntries(inserted[1].split(',').map((name,i)=>[name.trim().replaceAll('"',''),(args[1] as unknown[])[i]]));
    const table=failure==='report'?'month_closings':failure==='head'?'report_heads':'audit_events';
    if(failure!=='deferred'&&!injected&&text.startsWith('insert into "'+table+'"')){injected=true;await query('SELECT 1/0');}
    if(failure==='deferred'&&!injected&&text.trim().toLowerCase()==='commit'){
      injected=true;if(!batch)throw Error('BATCH_MAPPING_REQUIRED');
      await query('INSERT INTO obligations(id,owner_user_id,account_id,budget_update_id,recorded_seq,originating_period_id) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),f.ownerUserId,f.accountId,batch.id,batch.recorded_seq,randomUUID()]);
    }
    return Reflect.apply(query,client,args);
  }});
  try{expect(await createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c)).toEqual({ok:false,code:'TRANSACTION_FAILED'});expect(injected).toBe(true);}finally{await client.end();}
  expect(await baseline(f)).toEqual(before);value(await createClosingRepository(db).confirm(f,c));
  expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId))).toHaveLength(1);
});
it('HB19-B09 Lost successful commit acknowledgment',async()=>{
  const f=await fixture(),c=await preview(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let lost=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';const r=await Reflect.apply(query,client,args);
    if(!lost&&text.trim().toLowerCase()==='commit'){lost=true;throw Object.assign(Error('HB019_SYNTHETIC_ACK_LOSS'),{code:'ECONNRESET'});}return r;}});
  try{expect(await createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c)).toEqual({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});}finally{await client.end();}
  const before=await baseline(f),receipt=value(await createClosingRepository(db).status(f,c.requestId));expect(receipt).not.toBeNull();expect(value(await createClosingRepository(db).confirm(f,c))).toEqual(receipt);expect(await baseline(f)).toEqual(before);
});
async function concurrent(same:boolean,revision=false){
  const f=await fixture(),repo=createClosingRepository(db);let head:string|null=null;
  if(revision){value(await repo.confirm(f,await preview(f)));const [v1]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));head=v1.id;await correctReserve(f,'32000');}
  const start=await account(f),a=await preview(f,revision?'REVISION':'INITIAL',head,revision?1:null),b=same?a:await preview(f,revision?'REVISION':'INITIAL',head,revision?1:null);let entered!:()=>void,release!:()=>void;
  const ready=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);
  const blocker=db.db.transaction(async tx=>{await tx.execute(sql`SELECT id FROM ${s.accounts} WHERE id=${f.accountId} FOR UPDATE`);entered();await wait;});
  await ready;const first=createClosingRepository(db).confirm(f,a),second=createClosingRepository(db).confirm(f,b);let waiting=false;
  try{for(let n=0;n<100;n++){const r=await admin.query('SELECT count(*)::int n FROM pg_stat_activity WHERE datname=$1 AND wait_event_type=$2 AND cardinality(pg_blocking_pids(pid))>0',[new URL(testUrl).pathname.slice(1),'Lock']);if(r.rows[0].n>=2){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}}finally{release();}
  await blocker;expect(waiting).toBe(true);const results=await Promise.all([first,second]);
  if(same)expect(results[0]).toEqual(results[1]);else{expect(results.filter(r=>r.ok)).toHaveLength(1);expect(results.find(r=>!r.ok)).toMatchObject({code:'STALE_REVISION'});}
  expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId))).toHaveLength(revision?2:1);expect((await account(f)).recordedSeq).toBe(start.recordedSeq+1n);
}
it('HB19-B12 Concurrent first confirmations wait on two real connections',()=>concurrent(false));
it('HB19-B12 Concurrent exact same request returns one receipt',()=>concurrent(true));
it('HB19-C08 Concurrent v2 requests have one winner without fork',()=>concurrent(false,true));
it('HB19-C08 Concurrent same-key v2 returns one durable receipt',()=>concurrent(true,true));
it('HB19-C04 No change from advancing knowledge alone',async()=>{
  const f=await fixture(),repo=createClosingRepository(db),c=await preview(f);value(await repo.confirm(f,c));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  const before=await baseline(f);await expect(preview(f,'REVISION',r.id,1)).rejects.toThrow('NO_REPORT_CHANGE');expect(await baseline(f)).toEqual(before);
});
it('HB19-D01 separate physically existing target and virtual target read branches',async()=>{
  for(const allocated of [true,false]){
    const f=await fixture(false,true);await addSaving(f);await observe(f,cal.pastDay(20),'90000',allocated?[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'50000'}]:[{period:cal.past,amountCents:'90000'}]);
    const before=await baseline(f),r=value(await createClosingRepository(db).load(f,{...query(),period:cal.target})) as {state?:string};expect(r.state).toBe('OPEN');expect(await baseline(f)).toEqual(before);
    const periods=await db.db.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId,f.accountId));expect(periods.some(p=>p.period===cal.target)).toBe(allocated);
  }
});
it.each(['snapshot','manifest','saving-manifest','ordering','totals','receipt'] as const)('HB19-A14 retained %s corruption refuses read/status/replay without writes',async variant=>{
  const f=await fixture();if(variant==='saving-manifest')await addSaving(f);const c=await preview(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let tampered=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{
    const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';
    const table=variant==='receipt'?'budget_updates':'month_closings',columns=new RegExp('^insert into "'+table+'" \\(([^)]+)\\)').exec(text);
    if(columns&&Array.isArray(args[1])){
      const names=columns[1].split(',').map(c=>c.trim().replaceAll('"','')),params=[...args[1]];
      const key=variant==='snapshot'?'snapshot_json':variant==='manifest'||variant==='saving-manifest'?'source_manifest':variant==='ordering'?'ordering_revision_refs':variant==='receipt'?'result':'historical_reserved_cents';
      const i=names.indexOf(key);if(i<0)throw Error('FIXTURE_COLUMN_REQUIRED');
      if(variant==='totals'){params[i]='29999';params[names.indexOf('historical_free_cents')]='30001';}
      else if(variant==='manifest'||variant==='saving-manifest'){const doc=JSON.parse(String(params[i]));doc[variant==='manifest'?'obligationRevisionIds':'savingsRevisionIds']=[];params[i]=JSON.stringify(doc);}
      else if(variant==='snapshot'){const doc=JSON.parse(String(params[i]));doc.forged=true;params[i]=JSON.stringify(doc);}
      else params[i]=variant==='ordering'?'[]':'{}';
      args[1]=params;tampered=true;
    }
    return Reflect.apply(query,client,args);
  }});
  try{value(await createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c));expect(tampered).toBe(true);}finally{await client.end();}
  const before=await baseline(f),repo=createClosingRepository(db);
  expect((await repo.load(f,queryForReport())).ok).toBe(false);
  expect((await repo.status(f,c.requestId)).ok).toBe(false);expect((await repo.confirm(f,c)).ok).toBe(false);expect(await baseline(f)).toEqual(before);
});
function queryForReport(){return query(1);}
type BudgetSeed={revision:string;knowledgeCut:string;today:string;baseCheckpointId:string|null;baseVectorId:string|null;
  bank:{balanceCents:string;observedDate:string};placement:{id:string;afterPositionId:string}|null;obligations:{id:string;obligationId:string;fundingPeriod:string;status:string}[];savings:{id:string;savingsId:string;fundingPeriod:string;status:string}[]};
async function budgetSeed(f:Scope){return value(await createBudgetRepository(db).load(f)) as unknown as BudgetSeed;}
type BudgetOptions={mode:'CARRY'|'FRESH_START'|'DEFER'|null;actual:string|null;allocations:{period:string;amountCents:string}[];pay?:string|null;ack?:boolean;
  connection?:{db:Parameters<typeof commitBatch>[0]};payAction?:string;savingEdits?:unknown[];futureEdits?:unknown[];sourcePeriods?:string[];fundingRefsOverride?:unknown[];beforeConfirm?:()=>Promise<void>};
async function budget(f:Scope,options:BudgetOptions){
  const {mode,actual,allocations,pay=null,ack=false,connection=db,payAction='PAID',savingEdits=[],futureEdits=[],sourcePeriods,fundingRefsOverride}=options;
  const repo=createBudgetRepository(connection),seed=await budgetSeed(f),placement=seed.placement?{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}:null;
  const cp=actual===null?null:{observedDate:seed.today,observedAt:null,balanceCents:actual,allocations,correction:null,placement};
  const allocationChange=mode?{schemaVersion:1,intent:'TRANSITION',mode,observationMode:actual===null?'REUSE_CONFIRMED':'ACTUAL_CHECK',target:cal.target,sources:mode==='CARRY'?(sourcePeriods??[cal.past]):[],balanceCents:actual??seed.bank.balanceCents,
    allocations,futureEdits,fundingRefs:fundingRefsOverride??(mode==='DEFER'?[]:[...seed.obligations.filter(o=>o.status==='UNPAID'&&o.fundingPeriod<cal.target).map(o=>({kind:'OBLIGATION',identityId:o.obligationId,revisionId:o.id})),
    ...seed.savings.filter(s=>s.status==='ACTIVE'&&s.fundingPeriod<cal.target).map(s=>({kind:'SAVING',identityId:s.savingsId,revisionId:s.id}))]),expectedCheckpointRevisionId:seed.baseCheckpointId,expectedAllocationRevisionId:seed.baseVectorId,
    effectiveDate:seed.today,placement:actual===null?placement:null,checkpoint:cp,consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:false,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:mode==='FRESH_START'}}:null;
  const old=seed.obligations[0],command=value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:seed.today,reason:'Synthetic explicit atomic budget update',payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,
    baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:mode?null:cp,allocationChange,completeVectorConfirmed:true,
    obligations:pay?[{action:payAction,identityId:old.obligationId,expectedRevisionId:old.id,bankDate:null,data:{amountCents:pay},payment:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:ack}}]:[],savings:savingEdits}}));
  const p=value(await repo.preview(f,command)),confirmed=value(prepareCommand(p));await options.beforeConfirm?.();return {repo,confirmed,receipt:value(await repo.confirm(f,confirmed))};
}
it('HB19-C14 Retained report is stable after later payment and carry',async()=>{
  const f=await fixture(),closing=createClosingRepository(db),original=await preview(f);value(await closing.confirm(f,original));
  const [v1]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  await budget(f, {mode:'CARRY',actual:'75000',allocations:[{period:cal.target,amountCents:'75000'}]});
  expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:30000n,free:45000n});
  await budget(f, {mode:null,actual:'45000',allocations:[{period:cal.target,amountCents:'45000'}],pay:'30000'});
  const current=await budgetSeed(f);expect(current.bank.balanceCents).toBe('45000');expect(current.obligations[0].status).toBe('PAID');
  expect((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,v1.id)))[0]).toEqual(v1);value(await closing.load(f,query(1)));
  expect(value(await closing.confirm(f,original)).updateId).toBe(v1.budgetUpdateId);
});
it('HB19-D07 Exact F-009 carry and historical close',async()=>{
  const f=await fixture(false,true,'50000');await observe(f,cal.pastDay(20),'60000',[{period:cal.past,amountCents:'60000'}]);
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  expect(old).toMatchObject({historicalAllocatedCents:60000n,historicalReservedCents:50000n,historicalFreeCents:10000n,endBalanceCents:null});
  expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({allocated:0n,free:0n});
  await budget(f, {mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'60000'}]});expect((await budgetSeed(f)).bank).toMatchObject({balanceCents:'60000',observedDate:cal.pastDay(20)});
  expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:50000n,free:10000n});
  await budget(f, {mode:null,actual:'10000',allocations:[{period:cal.target,amountCents:'10000'}],pay:'50000'});
  expect((await budgetSeed(f)).bank.balanceCents).toBe('10000');expect((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,old.id)))[0]).toEqual(old);value(await repo.load(f,query(1)));
});
it.each([['CARRY','80000'],['FRESH_START','75000'],['DEFER','75000']] as const)('HB19-D04/D05/D11/D14 actual %s keeps historical close independent',async(mode,actual)=>{
  const f=await fixture();const allocations=mode==='DEFER'?[{period:cal.past,amountCents:'55000'},{period:cal.target,amountCents:'20000'}]:[{period:cal.target,amountCents:actual}];
  await budget(f, {mode:mode,actual:actual,allocations:allocations});value(await createClosingRepository(db).confirm(f,await preview(f)));
  const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({historicalAllocatedCents:60000n,historicalReservedCents:30000n,historicalFreeCents:30000n,endBalanceCents:null});
  expect((await budgetSeed(f)).bank).toMatchObject({balanceCents:actual,observedDate:cal.today});
  value(await createClosingRepository(db).load(f,query(1)));
});

async function correctReserve(f:Scope,amount:string,correctionId?:string){
  const [e]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId)).orderBy(sql`recorded_seq DESC`).limit(1);
  const a=await account(f),c=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.pastDay(2),reason:'Synthetic historical reserve correction',payload:{changes:[{
    key:'correct',action:'CREATE',obligationId:e.obligationId,expectedStateRevisionId:null,correctionId:correctionId??e.id,previousChangeKey:null,effectiveDate:cal.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
    data:{title:'Corrected synthetic bill',dueDate:null,originalCents:amount,isPossible:false,reserveFull:true,originatingPeriod:cal.past,fundingPeriod:cal.past}}]}}));
  return commitBatch(db.db,{scope:f,kind:'OBLIGATION',command:c},writeObligations);
}
it('HB19-C07 Exact F-013 reserve correction preserves bank and original report',async()=>{
  const f=await fixture(false,true,'10000');await observe(f,cal.pastEnd,'50000',[{period:cal.past,amountCents:'50000'}]);
  const repo=createClosingRepository(db),c=await preview(f);value(await repo.confirm(f,c));
  const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));const pointer=(await account(f)).activeAllocationRevisionId;
  await correctReserve(f,'12000');const [pending]=await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.accountId,f.accountId));expect(pending.correctionPending).toBe(true);expect(pending.closingId).toBe(old.id);
  value(await repo.confirm(f,await preview(f,'REVISION',old.id,1)));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);
  expect(rows[0]).toEqual(old);expect(rows[0]).toMatchObject({historicalReservedCents:10000n,historicalFreeCents:40000n,endBalanceCents:50000n});
  expect(rows[1]).toMatchObject({historicalReservedCents:12000n,historicalFreeCents:38000n,lastObservedBalanceCents:50000n,endBalanceCents:50000n});expect((await account(f)).activeAllocationRevisionId).toBe(pointer);
  value(await repo.load(f,query(1)));value(await repo.load(f,query(2)));expect(value(await repo.confirm(f,c)).updateId).toBe(old.budgetUpdateId);
});
it('HB19-C03 correction of correction produces v3 with linear immutable chain',async()=>{
  const f=await fixture(),repo=createClosingRepository(db),commands=[];
  commands.push(await preview(f));value(await repo.confirm(f,commands[0]));
  let [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));const first=old;
  for(const amount of ['32000','34000']){await correctReserve(f,amount);const c=await preview(f,'REVISION',old.id,old.version);commands.push(c);value(await repo.confirm(f,c));[old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(sql`version DESC`).limit(1);}
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);expect(rows).toHaveLength(3);expect(rows[0]).toEqual(first);
  expect(rows[2]).toMatchObject({version:3,previousVersionId:rows[1].id,historicalReservedCents:34000n,historicalFreeCents:26000n});
  for(let i=0;i<3;i++){const loaded=value(await repo.load(f,query(i+1))) as {report?:{version:number}};expect(loaded.report?.version).toBe(i+1);expect(value(await repo.confirm(f,commands[i])).updateId).toBe(rows[i].budgetUpdateId);}
  expect((value(await repo.load(f,query())) as {report:{version:number}}).report.version).toBe(3);
});
it('HB19-B02 virtual period reads and preview do not materialize any row',async()=>{
  const f=await fixture(false,false),repo=createClosingRepository(db),before=await baseline(f);value(await repo.load(f,query()));const c=await preview(f);expect(await baseline(f)).toEqual(before);
  value(await repo.confirm(f,c));expect(await db.db.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId,f.accountId))).toHaveLength(1);value(await repo.load(f,query(1)));
});
it.each(['current','future'])('HB19-B03 %s month cannot close and writes nothing',async when=>{
  const f=await fixture(),a=await account(f),before=await baseline(f),period=when==='current'?cal.target:cal.future;
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.today,reason:'Synthetic too early request',payload:{schemaVersion:1,operation:'INITIAL',period,expectedHeadId:null,expectedHeadVersion:null}}));
  expect(await createClosingRepository(db).preview(f,command)).toEqual({ok:false,code:'PERIOD_NOT_ENDED'});expect(await baseline(f)).toEqual(before);
});
it('HB19-B04 unrelated new write invalidates reviewed revision without closing',async()=>{
  const f=await fixture(),c=await preview(f);await observe(f,cal.today,'75000',[{period:cal.target,amountCents:'75000'}]);const before=await baseline(f);
  expect(await createClosingRepository(db).confirm(f,c)).toEqual({ok:false,code:'STALE_REVISION'});expect(await baseline(f)).toEqual(before);
});
it('HB19-B06 reader sees committed no-report while writer holds uncommitted report',async()=>{
  const f=await fixture(),c=await preview(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let entered!:()=>void,release!:()=>void;
  const ready=new Promise<void>(r=>entered=r),barrier=new Promise<void>(r=>release=r);let paused=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';const result=await Reflect.apply(query,client,args);
    if(!paused&&text.startsWith('insert into "month_closings"')){paused=true;entered();await barrier;}return result;}});
  const committing=createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c);
  try{await ready;const loaded=value(await createClosingRepository(db).load(f,queryForReportWithoutVersion())) as {report?:unknown;state?:string};expect(loaded.report).toBeNull();expect(loaded.state).toBe('AWAITING_CLOSE');}finally{release();}
  try{value(await committing);value(await createClosingRepository(db).load(f,queryForReport()));}finally{await client.end();}
});
function queryForReportWithoutVersion(){return query();}

it('HB19-R05 old K preserves complete future allocations and identical digest after unrelated period growth',async()=>{
  const f=await fixture(false,true);await observe(f,cal.pastDay(20),'90000',[{period:cal.past,amountCents:'60000'},{period:cal.target,amountCents:'20000'},{period:cal.future,amountCents:'10000'}]);
  const repo=createClosingRepository(db),command=await preview(f);value(await repo.confirm(f,command));
  const before=value(await repo.load(f,query(1))),bytes=value(await repo.chunk(f,query(1)));
  await db.db.execute(sql`INSERT INTO budget_periods(id,owner_user_id,account_id,period) SELECT gen_random_uuid(),${f.ownerUserId},${f.accountId},to_char(make_date(1000,1,1)+n*interval '1 month','YYYY-MM') FROM generate_series(0,1200) n`);
  const baselineAfter=await baseline(f);expect(value(await createClosingRepository(db).load(f,query(1)))).toEqual(before);expect(value(await createClosingRepository(db).chunk(f,query(1)))).toEqual(bytes);
  const chunk=bytes as {base64:string};const document=JSON.parse(Buffer.from(chunk.base64,'base64').toString('utf8'));expect(document.snapshot.allocations).toContainEqual({period:cal.future,amount:'10000'});
  expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'PROJECTION_LIMIT_EXCEEDED'});
  expect(value(await createClosingRepository(db).confirm(f,command)).updateId).toBe((before as {report:{id:string}}).report?((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)))[0].budgetUpdateId):'unreachable');
  expect(await baseline(f)).toEqual(baselineAfter);
});
it.each(['missing','foreign'])('HB19-R05 historical closing rejects %s reachable period without dropping it',async variant=>{
  const f=await fixture(),g=await fixture(),a=await account(f),before=await baseline(f);
  const period=variant==='foreign'?(await db.db.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId,g.accountId)))[0].id:randomUUID();
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.today,reason:'Synthetic malformed uncommitted source',payload:{observedDate:cal.today,observedAt:null,balanceCents:'80000',allocations:[{period:cal.target,amountCents:'80000'}],placement:null,correction:null}}));
  let reached=false;
  await expect(commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command},async(tx,batch)=>{
    await writeBankCheckpoint(tx,batch);
    const [vector]=await tx.select().from(s.allocationRevisions).where(eq(s.allocationRevisions.budgetUpdateId,batch.id));
    await tx.insert(s.periodAllocations).values({...f,id:randomUUID(),allocationRevisionId:vector.id,periodId:period,amountCents:0n});
    try{await readProjectionContext(tx,f,{...a,recordedSeq:batch.recordedSeq},value(parseBerlinDate(cal.pastEnd)),batch.recordedSeq,{kind:'HISTORICAL_CLOSING'});}
    catch(e){expect(e).toMatchObject({code:'HISTORICAL_FUNDING_CONFLICT'});reached=true;return rejectBatch('REPORT_PROOF_INVALID');}
    throw Error('PARTIAL_HISTORICAL_REPORT_MUST_NOT_BE_RETURNED');
  })).rejects.toMatchObject({code:'REPORT_PROOF_INVALID'});expect(reached).toBe(true);expect(await baseline(f)).toEqual(before);
});

it.each(['schema','event-index','head-target','head-before','head-identity','before-digest','command','review-digest'] as const)('HB19-A14/B14 retained audit %s corruption refuses disclosure and recovery',async variant=>{
  const f=await fixture(),c=await preview(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let tampered=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';
    if(text.startsWith('insert into "audit_events"')&&Array.isArray(args[1])){const params=[...args[1]];
      for(let i=0;i<params.length;i++){if(typeof params[i]!=='string'||!String(params[i]).startsWith('{'))continue;let d;try{d=JSON.parse(String(params[i]));}catch{continue;}
        const head=String(variant).startsWith('head-');if(d.entity?.type!==(head?'REPORT_HEAD':'REPORT_VERSION'))continue;
        if(variant==='schema')d.schemaVersion=2;else if(variant==='event-index')d.eventIndex=7;else if(variant==='head-target')d.after.closingId=randomUUID();else if(variant==='head-before')d.before={closingId:randomUUID(),correctionPending:false};else if(variant==='head-identity')d.entity.id=randomUUID();else if(variant==='before-digest')d.before='e'.repeat(64);else if(variant==='command')d.after.command.reason='Forged reason';else d.after.reviewDigest='e'.repeat(64);
        params[i]=JSON.stringify(d);tampered=true;
      }args[1]=params;
    }return Reflect.apply(query,client,args);}});
  try{value(await createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c));expect(tampered).toBe(true);}finally{await client.end();}
  const before=await baseline(f),repo=createClosingRepository(db);for(const result of [await repo.load(f,queryForReport()),await repo.status(f,c.requestId),await repo.confirm(f,c)])expect(result.ok).toBe(false);expect(await baseline(f)).toEqual(before);
});

it('HB19-A04 actual final-day zero is observed cash rather than unknown',async()=>{
  const f=await fixture(false,true,'1000');await observe(f,cal.pastEnd,'0',[]);const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));
  const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({endBalanceCents:0n,lastObservedBalanceCents:0n,historicalAllocatedCents:0n,historicalReservedCents:1000n,historicalFreeCents:-1000n,bankDataCompleteness:'END_DATE_OBSERVED'});value(await repo.load(f,query(1)));
});
it('HB19-A05 pre-period observation remains known for each independently closed month',async()=>{
  const f=await fixture(false,false);await observe(f,cal.olderDay(20),'10000',[{period:cal.older,amountCents:'4000'},{period:cal.past,amountCents:'6000'}]);await observe(f,cal.today,'8000',[{period:cal.target,amountCents:'8000'}]);
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f,'INITIAL',null,null,cal.older)));value(await repo.confirm(f,await preview(f)));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.historicalThroughDate);
  expect(rows.map(x=>x.historicalFreeCents)).toEqual([4000n,6000n]);for(const r of rows)expect(r).toMatchObject({lastBankObservedDate:cal.olderDay(20),lastObservedBalanceCents:10000n,endBalanceCents:null,bankDataCompleteness:'INCOMPLETE'});
  value(await repo.load(f,{...query(1),period:cal.older}));value(await repo.load(f,query(1)));expect((await budgetSeed(f)).bank.balanceCents).toBe('8000');
});
it('HB19-A09 corrected observation date resolves before H without resurrecting the old final day',async()=>{
  const f=await fixture(),last=await observe(f,cal.pastEnd,'76000',[{period:cal.past,amountCents:'56000'},{period:cal.target,amountCents:'20000'}]);
  const [c30]=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.budgetUpdateId,last.updateId));const [v30]=await db.db.select().from(s.allocationRevisions).where(eq(s.allocationRevisions.budgetUpdateId,last.updateId));
  const repo=createClosingRepository(db),original=await preview(f);value(await repo.confirm(f,original));const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  await observe(f,cal.today,'75000',[{period:cal.target,amountCents:'75000'}]);const a=await account(f),seed=await budgetSeed(f);
  const placement=cal.currentStart===cal.today&&seed.placement?{expectedOrderingRevisionId:seed.placement.id,afterPositionId:null,beforePositionId:seed.placement.afterPositionId}:null;
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.currentStart,reason:'Synthetic paired date correction',payload:{observedDate:cal.currentStart,observedAt:null,balanceCents:'76000',allocations:[{period:cal.past,amountCents:'56000'},{period:cal.target,amountCents:'20000'}],placement,correction:{checkpointId:c30.id,allocationRevisionId:v30.id,reposition:true}}}));
  await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command},writeBankCheckpoint);value(await repo.confirm(f,await preview(f,'REVISION',old.id,1)));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);expect(rows[0]).toEqual(old);expect(rows[1]).toMatchObject({lastObservedBalanceCents:80000n,historicalAllocatedCents:60000n,historicalReservedCents:30000n,historicalFreeCents:30000n,endBalanceCents:null});
  expect((await budgetSeed(f)).bank.balanceCents).toBe('75000');value(await repo.load(f,query(1)));value(await repo.load(f,query(2)));
});

it.each([2000,2001])('HB19-R04 SQL preflight rejects actual workRows %i before historical materialization',async workRows=>{
  const f=await fixture(true,false),a=await account(f),[update]=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.accountId,f.accountId)),before=await baseline(f),budget=new ClosingReadBudget();
  await expect(db.db.transaction(async tx=>{
    await tx.insert(s.historicalPositions).values(Array.from({length:workRows-4},()=>({...f,id:randomUUID(),budgetUpdateId:update.id,recordedSeq:update.recordedSeq,historicalDate:cal.pastDay(20),kind:'BANK_CHECK'})));
    const count=await tx.execute<{n:string}>(sql`SELECT ((SELECT count(*) FROM balance_checkpoints WHERE account_id=${f.accountId})+(SELECT count(*) FROM allocation_revisions WHERE account_id=${f.accountId})+(SELECT count(*) FROM historical_positions WHERE account_id=${f.accountId})+(SELECT count(*) FROM ordering_revisions WHERE account_id=${f.accountId}))::text n`);expect(Number(count.rows[0].n)).toBe(workRows);
    await closingCandidate(tx,f,a,cal.past,a.recordedSeq,budget);
  })).rejects.toMatchObject({code:'REPORT_LIMIT_EXCEEDED'});expect(budget.cuts.size).toBe(0);expect(await baseline(f)).toEqual(before);
});
it('HB19-R04 production cumulative budget accepts exact 4M then refuses the next visit',()=>{
  const b=new ClosingReadBudget();b.charge(2000000);b.charge(2000000);expect(b.work).toBe(4000000);expect(()=>b.charge(1)).toThrow('REPORT_LIMIT_EXCEEDED');
});

it.each(['missing-transfer-audit','wrong-before-revision','wrong-state-audit'] as const)('HB19-A11 full later funding closure refuses %s at new K and preserves old K',async variant=>{
  const f=await fixture(),repo=createClosingRepository(db),c=await preview(f);value(await repo.confirm(f,c));const old=value(await repo.load(f,queryForReport()));
  const client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let tampered=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';
    if(text.startsWith('insert into "audit_events"')&&Array.isArray(args[1])){const params=[...args[1]];for(let i=0;i<params.length;i++){if(typeof params[i]!=='string'||!String(params[i]).startsWith('{'))continue;let d;try{d=JSON.parse(String(params[i]));}catch{continue;}
      if(variant==='wrong-state-audit'?d.entity?.type!=='OBLIGATION_STATE':d.entity?.type!=='FUNDING_TRANSFER')continue;
      if(variant==='missing-transfer-audit')d.entity.type='SYNTHETIC_MISSING_PROOF';else if(variant==='wrong-before-revision')d.after.proof.beforeRevisionId=randomUUID();else d.after.state.outstandingCents='29999';params[i]=JSON.stringify(d);tampered=true;
    }args[1]=params;}return Reflect.apply(query,client,args);}});
  try{await budget(f, {mode:'CARRY',actual:'75000',allocations:[{period:cal.target,amountCents:'75000'}],pay:null,ack:false,connection:{db:drizzle(client,{schema:s})}});expect(tampered).toBe(true);}finally{await client.end();}
  const before=await baseline(f),loaded=value(await repo.load(f,queryForReport())) as {report:unknown;headId:unknown;versions:unknown},prior=old as typeof loaded;
  expect(loaded.report).toEqual(prior.report);expect(loaded.headId).toEqual(prior.headId);expect(loaded.versions).toEqual(prior.versions);
  expect(value(await repo.confirm(f,c)).updateId).toBe((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)))[0].budgetUpdateId);
  await expect(preview(f,'REVISION',(old as {report:{id:string}}).report.id,1)).rejects.toThrow();expect(await baseline(f)).toEqual(before);
});
it.each(['report','head','audit','deferred','ack-lost'] as const)('HB19-C13 v2 %s is atomic and original v1 survives',async failure=>{
  const f=await fixture(),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [v1]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));await correctReserve(f,'32000');
  const c=await preview(f,'REVISION',v1.id,1),before=await baseline(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let fired=false,batch:Record<string,unknown>|null=null;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';
    const inserted=/^insert into "budget_updates" \(([^)]+)\)/.exec(text);if(inserted&&Array.isArray(args[1]))batch=Object.fromEntries(inserted[1].split(',').map((name,i)=>[name.trim().replaceAll('"',''),(args[1] as unknown[])[i]]));
    const target=failure==='report'?'insert into "month_closings"':failure==='head'?'update "report_heads"':'insert into "audit_events"';
    if(!fired&&failure!=='deferred'&&failure!=='ack-lost'&&text.startsWith(target)){fired=true;await query('SELECT 1/0');}
    if(!fired&&failure==='deferred'&&text.trim().toLowerCase()==='commit'){fired=true;if(!batch)throw Error('BATCH_REQUIRED');await query('INSERT INTO obligations(id,owner_user_id,account_id,budget_update_id,recorded_seq,originating_period_id) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),f.ownerUserId,f.accountId,batch.id,batch.recorded_seq,randomUUID()]);}
    const result=await Reflect.apply(query,client,args);if(!fired&&failure==='ack-lost'&&text.trim().toLowerCase()==='commit'){fired=true;throw Object.assign(Error('SYNTHETIC_V2_ACK_LOST'),{code:'ECONNRESET'});}return result;
  }});
  try{expect(await createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c)).toEqual({ok:false,code:failure==='ack-lost'?'COMMIT_OUTCOME_UNKNOWN':'TRANSACTION_FAILED'});expect(fired).toBe(true);}finally{await client.end();}
  if(failure!=='ack-lost')expect(await baseline(f)).toEqual(before);else expect(value(await repo.status(f,c.requestId))).not.toBeNull();value(await repo.confirm(f,c));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);expect(rows).toHaveLength(2);expect(rows[0]).toEqual(v1);expect(rows[1].historicalReservedCents).toBe(32000n);value(await repo.load(f,queryForReport()));
});

async function addSaving(f:Scope,amount='5000',period:string=cal.past,date=cal.pastDay(3)){
  const a=await account(f);await commitBatch(db.db,{scope:f,kind:'SAVING',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:date,reason:'Synthetic full retained saving',payload:{changes:[{key:'saving',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:date,placement:null,bankCheck:null,data:{title:'Synthetic retained saving',amountCents:amount,originatingPeriod:period,fundingPeriod:period}}]}}))},writeSavings);
}
it('HB19-A06 full historical obligation and saving survive later carry partial payment cancellation and release',async()=>{
  const f=await fixture(false,true,'20000');await addSaving(f);await observe(f,cal.pastEnd,'50000',[{period:cal.past,amountCents:'50000'}]);
  await budget(f, {mode:'CARRY',actual:'50000',allocations:[{period:cal.target,amountCents:'50000'}]});await budget(f, {mode:null,actual:'45000',allocations:[{period:cal.target,amountCents:'45000'}],pay:'5000',ack:false,connection:db,payAction:'PARTIAL_SETTLEMENT'});
  expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:15000n,savings:5000n,free:25000n});
  const seed=await budgetSeed(f),repo=createBudgetRepository(db),placement=seed.placement?{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}:null;
  const allocationChange={schemaVersion:1,intent:'ALLOCATION_ONLY',mode:'REDISTRIBUTE',observationMode:'REUSE_CONFIRMED',target:cal.target,sources:[],balanceCents:'45000',allocations:[{period:cal.target,amountCents:'45000'}],futureEdits:[],fundingRefs:[],expectedCheckpointRevisionId:seed.baseCheckpointId,expectedAllocationRevisionId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:null,placement,consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}};
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:seed.today,reason:'Synthetic explicit cancellation and voluntary release',payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:null,allocationChange,completeVectorConfirmed:true,
    obligations:[{action:'CANCELLED',identityId:seed.obligations[0].obligationId,expectedRevisionId:seed.obligations[0].id,bankDate:null,data:{},payment:null}],savings:[{action:'PARTIAL_RELEASE',identityId:seed.savings[0].savingsId,expectedRevisionId:seed.savings[0].id,data:{amountCents:'2000'}}]}}));
  value(await repo.confirm(f,value(prepareCommand(value(await repo.preview(f,command))))));
  const closing=createClosingRepository(db);value(await closing.confirm(f,await preview(f)));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  expect(r).toMatchObject({lastObservedBalanceCents:50000n,endBalanceCents:50000n,historicalAllocatedCents:50000n,historicalReservedCents:20000n,historicalSavingsCents:5000n,historicalFreeCents:25000n});
  const snapshot=r.snapshotJson as {obligations:{status:string;outstanding:string;fundingPeriod:string}[];savings:{amount:string;fundingPeriod:string}[]};expect(snapshot.obligations[0]).toMatchObject({status:'UNPAID',outstanding:'20000',fundingPeriod:cal.past});expect(snapshot.savings[0]).toMatchObject({amount:'5000',fundingPeriod:cal.past});
  const current=await budgetSeed(f);expect(current.bank.balanceCents).toBe('45000');expect(current.obligations[0].status).toBe('CANCELLED');expect(current.savings[0].status).toBe('ACTIVE');value(await closing.load(f,query(1)));
  expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:0n,savings:3000n,free:42000n});
});
it('HB19-C11 only intersecting report is marked pending with explicit audit and no cascade',async()=>{
  const f=await fixture(),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f,'INITIAL',null,null,cal.older)));value(await repo.confirm(f,await preview(f)));
  const original=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.id),heads=await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.accountId,f.accountId));
  await correctReserve(f,'32000');const a=await account(f),after=await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.accountId,f.accountId));const affected=original.find(x=>x.historicalThroughDate===cal.pastEnd)!;
  expect(after.filter(x=>x.correctionPending).map(x=>x.closingId)).toEqual([affected.id]);for(const h of heads)expect(after.find(x=>x.id===h.id)?.closingId).toBe(h.closingId);
  expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.id)).toEqual(original);
  const audits=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.accountId,f.accountId));const marked=audits.filter(x=>x.recordedSeq===a.recordedSeq&&(x.beforeAfter as {entity?:{type:string}}).entity?.type==='REPORT_REVIEW_REQUIRED');expect(marked).toHaveLength(1);
  value(await repo.load(f,query(1)));value(await repo.load(f,{...query(1),period:cal.older}));
});
it('HB19-C12 changed copied title is meaningful evidence even when all totals are equal',async()=>{
  const f=await fixture(),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  await correctReserve(f,'30000');value(await repo.confirm(f,await preview(f,'REVISION',old.id,1)));const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);
  expect(rows[0]).toEqual(old);expect(rows[1]).toMatchObject({historicalReservedCents:30000n,historicalFreeCents:30000n,lastObservedBalanceCents:80000n,endBalanceCents:null});expect(rows[1].changeEvidenceRefs).not.toEqual([]);
  expect((rows[0].snapshotJson as {obligations:{title:string}[]}).obligations[0].title).toBe('Synthetic bill');expect((rows[1].snapshotJson as {obligations:{title:string}[]}).obligations[0].title).toBe('Corrected synthetic bill');value(await repo.load(f,query(1)));value(await repo.load(f,query(2)));
});

it('HB19-C12/E02 identical financial fields and title retain a changed digest-bound historical ref diff',async()=>{
  const f=await fixture(),repo=createClosingRepository(db);await correctReserve(f,'30000');value(await repo.confirm(f,await preview(f)));
  const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  const decode=(c:unknown)=>{const chunk=c as {base64:string;nextOffset:null;digest:string};expect(chunk.nextOffset).toBeNull();const bytes=Buffer.from(chunk.base64,'base64');expect(hashText(bytes.toString('utf8'))).toBe(chunk.digest);return JSON.parse(bytes.toString('utf8'));};
  const before=decode(value(await repo.chunk(f,{...query(1),digest:null})));await correctReserve(f,'30000');
  const command=await preview(f,'REVISION',old.id,1),after=decode(value(await repo.review(f,command,0)));
  for(const key of ['endBalanceCents','lastObservedBalanceCents','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents'])expect(after[key]).toEqual(before[key]);
  expect(after.snapshot.obligations[0].title).toBe(before.snapshot.obligations[0].title);
  const changes=reviewDifference(before,after),shown=JSON.stringify(changes);expect(changes.some(x=>x.path.includes('sourceManifest/evidence'))).toBe(true);
  for(const id of [...before.obligationRevisionIds,...after.obligationRevisionIds])expect(shown).toContain(id);
  expect(documentHash(after)).not.toBe(documentHash(before));value(await repo.confirm(f,command));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.version);expect(rows[0]).toEqual(old);
  const changed=rows[1].changeEvidenceRefs as {type:string;id:string}[];
  expect(changed.filter(x=>x.type==='OBLIGATION_STATE').map(x=>x.id).sort()).toEqual([...before.obligationRevisionIds,...after.obligationRevisionIds].sort());
  const audits=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.budgetUpdateId,rows[1].budgetUpdateId));
  const version=audits.find(x=>(x.beforeAfter as {entity:{type:string}}).entity.type==='REPORT_VERSION')!.beforeAfter as {after:{digest:string;reviewDigest:string;diff:{before:string;after:string;changeEvidenceRefs:unknown}}};
  expect(version.after).toMatchObject({digest:documentHash(after),reviewDigest:(command.payload as {reviewDigest:string}).reviewDigest,diff:{before:documentHash(before),after:documentHash(after),changeEvidenceRefs:changed}});
  value(await repo.load(f,query(1)));value(await repo.load(f,query(2)));
});

async function largeSource(f:Scope,connection:Parameters<typeof commitBatch>[0],notes:readonly number[],dates?:readonly string[],multibyte=false){
  for(let n=0;n<notes.length;n++){
    const [a]=await connection.select().from(s.accounts).where(eq(s.accounts.id,f.accountId)),day=dates?.[n]??cal.pastDay(n+3);
    const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:day,reason:'Synthetic bounded evidence source',payload:{observedDate:day,observedAt:null,balanceCents:'80000',allocations:[{period:cal.past,amountCents:'60000'},{period:cal.target,amountCents:'20000'}],placement:null,correction:null}}));
    const evidenceNote=multibyte?String.fromCharCode(0x754c).repeat(Math.floor(notes[n]/3))+'x'.repeat(notes[n]%3):'x'.repeat(notes[n]);
    await commitBatch(connection,{scope:f,kind:'BANK_CHECKPOINT',command},async(tx,batch)=>(await writeBankCheckpoint(tx,batch)).map(a=>a.entityType==='DAY_ORDERING'?{...a,after:{...a.after as object,evidenceNote}}:a));
  }
}
/** More efficient R2 profile: no discarded bank/vector histories. Every unpaid
 * identity and its ordering evidence is selected in the no-observation report. */
async function largeObligationSource(f:Scope,connection:Parameters<typeof commitBatch>[0],notes:readonly number[],dates:readonly string[]){
  for(let n=0;n<notes.length;n++){
    const [a]=await connection.select().from(s.accounts).where(eq(s.accounts.id,f.accountId)),day=dates[n];
    const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:day,reason:'Synthetic bounded selected obligation evidence',payload:{changes:[{
      key:'selected',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:day,bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
      data:{title:String.fromCharCode(0x754c).repeat(200),dueDate:null,originalCents:'1',isPossible:false,reserveFull:true,originatingPeriod:cal.older,fundingPeriod:cal.past}}]}}));
    const evidenceNote=String.fromCharCode(0x754c).repeat(Math.floor(notes[n]/3))+'x'.repeat(notes[n]%3);
    await commitBatch(connection,{scope:f,kind:'OBLIGATION',command},async(tx,batch)=>(await writeObligations(tx,batch)).map(a=>a.entityType==='DAY_ORDERING'?{...a,after:{...a.after as object,evidenceNote}}:a));
  }
}
it.each([1048576,1048577])('HB19-R03 real closing persists and cross-instance chunks reconstruct exactly %i canonical bytes',async size=>{
  const f=await fixture(false,true);let base=0;const probe=Error('SYNTHETIC_ROLLBACK_SIZE_PROBE');
  try{await db.db.transaction(async tx=>{await largeSource(f,tx as unknown as Parameters<typeof commitBatch>[0],Array(25).fill(0));const [a]=await tx.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
    const candidate=await closingCandidate(tx,f,a,cal.past,a.recordedSeq,new ClosingReadBudget());base=Buffer.byteLength(JSON.stringify(candidate.document));throw probe;
  });}catch(e){if(e!==probe)throw e;}
  expect(base).toBeGreaterThan(0);const padding=size-base,notes=Array.from({length:25},(_,i)=>Math.max(0,Math.min(60000,padding-i*60000)));expect(notes.reduce((a,b)=>a+b,0)).toBe(padding);
  await largeSource(f,db.db,notes);const repo=createClosingRepository(db),command=await preview(f);value(await repo.confirm(f,command));
  const loaded=value(await createClosingRepository(db).load(f,queryForReport())) as {report:{digest:string;totalBytes:number;historicalFreeCents:string;endBalanceCents:null}};expect(loaded.report.totalBytes).toBe(size);expect(loaded.report).toMatchObject({historicalFreeCents:'30000',endBalanceCents:null});
  const parts:Buffer[]=[];let offset=0;for(let n=0;n<64;n++){
    const chunk=value(await createClosingRepository(db).chunk(f,{...queryForReport(),offset,digest:loaded.report.digest})) as {base64:string;nextOffset:number|null;totalBytes:number;digest:string;offset:number};
    expect(Buffer.byteLength(JSON.stringify(chunk))).toBeLessThanOrEqual(1048576);const bytes=Buffer.from(chunk.base64,'base64');expect(bytes.length).toBeLessThanOrEqual(131072);expect(chunk.offset).toBe(offset);parts.push(bytes);offset+=bytes.length;if(chunk.nextOffset===null)break;expect(chunk.nextOffset).toBe(offset);
  }
  const all=Buffer.concat(parts);expect(all.length).toBe(size);expect(createHash('sha256').update(all).digest('hex')).toBe(loaded.report.digest);const document=JSON.parse(all.toString('utf8'));expect(document.historicalFreeCents).toBe('30000');
},60000);

// Owner retired exact8MiB PG acceptance. Reuse the already measured R2 profile
// as a negative source-limit proof, without new size calibration or fixture search.
it('HB19-R03 measured R2 source overflow refuses preview and confirm with complete PostgreSQL rollback',async()=>{
  const f=await fixture(false,false),dates=[...Array.from({length:28},(_,i)=>cal.olderDay(i+1)),...Array.from({length:19},(_,i)=>cal.pastDay(i+1))],padding=8246626;
  const notes=dates.map((_,i)=>Math.max(0,Math.min(180000,padding-i*180000)));expect(notes.reduce((a,b)=>a+b,0)).toBe(padding);
  await largeObligationSource(f,db.db,notes,dates);const a=await account(f),before=await baseline(f),repo=createClosingRepository(db),budget=new ClosingReadBudget();
  await expect(db.db.transaction(tx=>closingCandidate(tx,f,a,cal.past,a.recordedSeq,budget),{isolationLevel:'repeatable read',accessMode:'read only'})).rejects.toMatchObject({code:'REPORT_LIMIT_EXCEEDED'});
  expect(budget.bytes).toBeGreaterThan(8388608n);expect(budget.cuts.size).toBe(0);expect(await baseline(f)).toEqual(before);
  const request={requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.today,reason:'Synthetic measured source-limit refusal',payload:{schemaVersion:1,operation:'INITIAL',period:cal.past,expectedHeadId:null,expectedHeadVersion:null}};
  expect(await repo.preview(f,value(prepareCommand(request)))).toEqual({ok:false,code:'REPORT_LIMIT_EXCEEDED'});expect(await baseline(f)).toEqual(before);
  const command=value(prepareCommand({...request,payload:{...request.payload,historicalThroughDate:cal.pastEnd,knowledgeCut:a.recordedSeq.toString(),snapshotSchemaVersion:1,selectionContractVersion:1,reviewDigest:'0'.repeat(64),confirmed:true}}));
  expect(await repo.confirm(f,command)).toEqual({ok:false,code:'REPORT_LIMIT_EXCEEDED'});expect(await baseline(f)).toEqual(before);
  console.info('HB19_R03_EXPECTED_SOURCE_REFUSAL',JSON.stringify({sourceBytes:budget.bytes.toString(),sourceLimit:8388608,roots:budget.cuts.size,fullScopedBaselineUnchanged:true}));
},60000);

async function redistributeAt(f:Scope,date:string,allocations:{period:string;amountCents:string}[]){
  const a=await account(f),[c]=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId)).orderBy(sql`recorded_seq DESC`).limit(1);
  const orders=await db.db.select().from(s.orderingRevisions).where(eq(s.orderingRevisions.accountId,f.accountId)).orderBy(sql`recorded_seq DESC`),order=orders.find(o=>o.historicalDate===date),members=(order?.manifest as {positionIds:string[]}|undefined)?.positionIds;
  const raw={schemaVersion:1,intent:'ALLOCATION_ONLY',mode:'REDISTRIBUTE',observationMode:'REUSE_CONFIRMED',target:cal.target,sources:[],balanceCents:c.balanceCents.toString(),allocations,futureEdits:[],fundingRefs:[],expectedCheckpointRevisionId:c.id,expectedAllocationRevisionId:a.activeAllocationRevisionId,effectiveDate:date,checkpoint:null,placement:order?{expectedOrderingRevisionId:order.id,afterPositionId:members!.at(-1),beforePositionId:null}:null,consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:false,fundingConfirmed:false,nonCarryConfirmed:false}};
  const input=value(parseTransition(raw)),command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:date,reason:'Synthetic confirmed historical allocation',payload:raw}));
  await commitBatch(db.db,{scope:f,kind:'PERIOD_ALLOCATION',command},async(tx,batch)=>(await persistAllocation(tx,batch,await loadCheckpointHistory(tx,f,batch.account.recordedSeq),input,await databaseToday(tx))).audit);
}
it('HB19-A07 confirmed same-day bank allocation and payment select one last coherent state',async()=>{
  const f=await fixture(false,true,'10000');await observe(f,cal.pastEnd,'50000',[{period:cal.past,amountCents:'50000'}]);await redistributeAt(f,cal.pastEnd,[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'10000'}]);
  const a=await account(f),[e]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId));const [order]=await db.db.select().from(s.orderingRevisions).where(eq(s.orderingRevisions.accountId,f.accountId)).orderBy(sql`recorded_seq DESC`).limit(1),members=(order.manifest as {positionIds:string[]}).positionIds;
  const cp={observedDate:cal.pastEnd,observedAt:null,balanceCents:'40000',allocations:[{period:cal.past,amountCents:'30000'},{period:cal.target,amountCents:'10000'}],correction:null,placement:{expectedOrderingRevisionId:order.id,afterPositionId:members.at(-1),beforePositionId:null}};
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.pastEnd,reason:'Synthetic actual same-day paid confirmation',payload:{changes:[{key:'paid',action:'PAID',obligationId:e.obligationId,expectedStateRevisionId:e.id,correctionId:null,previousChangeKey:null,effectiveDate:cal.pastEnd,bankDate:cal.pastEnd,placement:null,bankCheck:cp,paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:null},data:{amountCents:'10000'}}]}}));
  await commitBatch(db.db,{scope:f,kind:'OBLIGATION',command},writeObligations);const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({endBalanceCents:40000n,historicalAllocatedCents:30000n,historicalReservedCents:0n,historicalFreeCents:30000n,lastBankObservedAt:null});value(await repo.load(f,query(1)));
  const before=await baseline(f);await expect(observe(f,cal.pastEnd,'48000',[{period:cal.past,amountCents:'38000'},{period:cal.target,amountCents:'10000'}])).rejects.toMatchObject({code:'ORDERING_CONFLICT'});expect(await baseline(f)).toEqual(before);
});
it('HB19-A10 old-anchor conflict refuses before closing can rebase the historical vector',async()=>{
  const f=await fixture(false,false);await observe(f,cal.pastDay(20),'90000',[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'50000'}]);await redistributeAt(f,cal.pastDay(28),[{period:cal.past,amountCents:'35000'},{period:cal.target,amountCents:'55000'}]);await observe(f,cal.today,'85000',[{period:cal.target,amountCents:'85000'}]);
  const repo=createClosingRepository(db),command=await preview(f);value(await repo.confirm(f,command));const before=await baseline(f);await expect(observe(f,cal.pastDay(25),'88000',[{period:cal.past,amountCents:'38000'},{period:cal.target,amountCents:'50000'}])).rejects.toMatchObject({code:'HISTORICAL_STATE_CONFLICT'});expect(await baseline(f)).toEqual(before);value(await repo.load(f,query(1)));value(await repo.confirm(f,command));
});
it('HB19-C09 obsolete correction fork consumes no receipt version or pending change',async()=>{
  const f=await fixture(),[original]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId)),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));await correctReserve(f,'32000');const before=await baseline(f);
  await expect(correctReserve(f,'34000',original.id)).rejects.toMatchObject({code:'CORRECTION_CONFLICT'});expect(await baseline(f)).toEqual(before);value(await repo.load(f,query(1)));
});

it.each(['H','K-before','K-after','reason','head','schema','selection','no-consent','client-amount','client-time'] as const)('HB19-B05 exact consent refuses altered %s before any write',async variant=>{
  const f=await fixture(),c=await preview(f),payload={...c.payload as object} as Record<string,unknown>,before=await baseline(f);let reason=c.reason;
  if(variant==='H')payload.historicalThroughDate=cal.pastDay(29);if(variant==='K-before')payload.knowledgeCut='1';if(variant==='K-after')payload.knowledgeCut='3';if(variant==='reason')reason='Altered before first commit';if(variant==='head')payload.expectedHeadId=randomUUID();if(variant==='schema')payload.snapshotSchemaVersion=2;if(variant==='selection')payload.selectionContractVersion=2;if(variant==='no-consent')payload.confirmed=false;if(variant==='client-amount')payload.amountCents='30000';if(variant==='client-time')payload.evidenceRecordedCutoffAt='2026-01-01T00:00:00Z';
  expect((await createClosingRepository(db).confirm(f,value(prepareCommand({...c,reason,payload})))).ok).toBe(false);expect(await baseline(f)).toEqual(before);
});
it('HB19-B10 original replay does not ask the current calendar even on a new connection',async()=>{
  const f=await fixture(),c=await preview(f),repo=createClosingRepository(db),receipt=value(await repo.confirm(f,c));await correctReserve(f,'32000');const [old]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));value(await repo.confirm(f,await preview(f,'REVISION',old.id,1)));const before=await baseline(f);
  const client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let calendarReads=0;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'';if(text.includes('clock_timestamp')){calendarReads++;throw Error('NEW_CALENDAR_MUST_NOT_GATE_ORIGINAL_REPLAY');}return Reflect.apply(query,client,args);}});
  try{expect(value(await createClosingRepository({db:drizzle(client,{schema:s})}).confirm(f,c))).toEqual(receipt);expect(calendarReads).toBe(0);}finally{await client.end();}expect(await baseline(f)).toEqual(before);
});
it.each(['CARRY','FRESH_START'] as const)('HB19-D10/D13 negative source free %s keeps full obligation and saving once',async mode=>{
  const f=await fixture(false,true,'9000');await addSaving(f,'2000');await observe(f,cal.pastDay(20),'10000',[{period:cal.past,amountCents:'10000'}]);await budget(f, {mode:mode,actual:'8000',allocations:[{period:cal.target,amountCents:'8000'}]});const current=value(await createBudgetRepository(db).load(f)) as {bank:{balanceCents:string};obligations:{outstandingCents:string;fundingPeriod:string}[];savings:{amountCents:string;fundingPeriod:string}[]};
  expect(current.bank.balanceCents).toBe('8000');expect(current.obligations).toHaveLength(1);expect(current.obligations[0]).toMatchObject({outstandingCents:'9000',fundingPeriod:cal.target});expect(current.savings[0]).toMatchObject({amountCents:'2000',fundingPeriod:cal.target});
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [report]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(report).toMatchObject({historicalAllocatedCents:10000n,historicalReservedCents:9000n,historicalSavingsCents:2000n,historicalFreeCents:-1000n});value(await repo.load(f,query(1)));
});

it('HB19-R05 repeated chain validation reuses only the same scope transaction proof without recharging nonexistent work',async()=>{
  const f=await fixture(),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  await db.db.transaction(async tx=>{const budget=new ClosingReadBudget(),first=await closingChain(tx,f,r.periodId,budget),work=budget.work;
    expect(first).toHaveLength(1);expect(await closingChain(tx,f,r.periodId,budget)).toBe(first);expect(budget.work).toBe(work);
    expect(await closingChain(tx,{...f,ownerUserId:randomUUID()},r.periodId,budget)).toEqual([]);expect(budget.chains.size).toBe(2);
  },{isolationLevel:'repeatable read',accessMode:'read only'});
});

it('HB19-D13 same saving release plus funding refuses; an explicit later release has its own audit',async()=>{
  const f=await fixture(false,true,'5000');await addSaving(f,'3000');await observe(f,cal.pastDay(20),'10000',[{period:cal.past,amountCents:'10000'}]);const first=await budgetSeed(f),before=await baseline(f);
  await expect(budget(f, {mode:'FRESH_START',actual:'8000',allocations:[{period:cal.target,amountCents:'8000'}],pay:null,ack:false,connection:db,payAction:'PAID',savingEdits:[{action:'PARTIAL_RELEASE',identityId:first.savings[0].savingsId,expectedRevisionId:first.savings[0].id,data:{amountCents:'2000'}}]})).rejects.toThrow('SAME_IDENTITY_COMPOUND_NOT_SUPPORTED');expect(await baseline(f)).toEqual(before);
  await budget(f, {mode:'FRESH_START',actual:'8000',allocations:[{period:cal.target,amountCents:'8000'}]});const seed=await budgetSeed(f),repo=createBudgetRepository(db),placement=seed.placement?{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}:null;
  const allocationChange={schemaVersion:1,intent:'ALLOCATION_ONLY',mode:'REDISTRIBUTE',observationMode:'REUSE_CONFIRMED',target:cal.target,sources:[],balanceCents:'8000',allocations:[{period:cal.target,amountCents:'8000'}],futureEdits:[],fundingRefs:[],expectedCheckpointRevisionId:seed.baseCheckpointId,expectedAllocationRevisionId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:null,placement,consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}};
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:seed.today,reason:'Synthetic separately chosen saving release',payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:null,allocationChange,completeVectorConfirmed:true,obligations:[],savings:[{action:'PARTIAL_RELEASE',identityId:seed.savings[0].savingsId,expectedRevisionId:seed.savings[0].id,data:{amountCents:'2000'}}]}}));
  const receipt=value(await repo.confirm(f,value(prepareCommand(value(await repo.preview(f,command))))));const current=value(await repo.load(f)) as {bank:{balanceCents:string};savings:{amountCents:string}[];obligations:{outstandingCents:string}[]};expect(current.bank.balanceCents).toBe('8000');expect(current.savings[0].amountCents).toBe('1000');expect(current.obligations[0].outstandingCents).toBe('5000');
  const releaseAudits=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.budgetUpdateId,receipt.updateId));expect(releaseAudits.filter(a=>(a.beforeAfter as {entity?:{type:string}}).entity?.type==='SAVINGS_STATE')).toHaveLength(1);
});
it('HB19-D14 DEFER then explicit REUSE CARRY preserves the actual bank date and counts target once',async()=>{
  const f=await fixture(false,true);await observe(f,cal.pastDay(20),'90000',[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'50000'}]);await budget(f, {mode:'DEFER',actual:'84000',allocations:[{period:cal.past,amountCents:'34000'},{period:cal.target,amountCents:'50000'}]});expect((await budgetSeed(f)).obligations[0].fundingPeriod).toBe(cal.past);
  const checkpoints=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));await budget(f, {mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'84000'}]});const current=value(await createBudgetRepository(db).load(f)) as {bank:{balanceCents:string;observedDate:string};allocations:{period:string;amountCents:string}[];obligations:{outstandingCents:string;fundingPeriod:string}[]};
  expect(current.bank).toEqual({balanceCents:'84000',observedDate:cal.today});expect(current.allocations).toEqual([{period:cal.target,amountCents:'84000'}]);expect(current.obligations[0]).toMatchObject({outstandingCents:'30000',fundingPeriod:cal.target});expect(await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId))).toEqual(checkpoints);
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({historicalAllocatedCents:40000n,historicalReservedCents:30000n,historicalFreeCents:10000n,endBalanceCents:null});value(await repo.load(f,query(1)));
});

async function addObligationAt(f:Scope,amount:string,period:string,date:string){const a=await account(f);await commitBatch(db.db,{scope:f,kind:'OBLIGATION',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:date,reason:'Synthetic independently funded identity',payload:{changes:[{key:'identity',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:date,bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:'Synthetic independent bill',dueDate:null,originalCents:amount,isPossible:false,reserveFull:true,originatingPeriod:period,fundingPeriod:period}}]}}))},writeObligations);}
async function liveBudgets(f:Scope){const read=value(await createProjectionRepository(db).read(f));if(read.snapshot.kind!=='ACTIVE_COMPLETE')throw Error('ACTIVE_SYNTHETIC_STATE_REQUIRED');const state=read.snapshot;return {state,budget:(period:Period)=>periodBudget(state,read.asOfDate,period)};}
it.each(['84000','90000',null] as const)('HB19-D04/D05/D06 exact T balance %s carries once and historical 40000/30000 remains',async actual=>{
  const f=await fixture(false,true);if(actual===null)await addSaving(f);await observe(f,cal.pastDay(28),'90000',[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'50000'}]);const prior=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));
  const b=await budget(f, {mode:'CARRY',actual:actual,allocations:[{period:cal.target,amountCents:actual??'90000'}]}),after=await liveBudgets(f);expect(after.budget(cal.target)).toMatchObject({allocated:BigInt(actual??'90000'),reserved:30000n,savings:actual===null?5000n:0n,free:actual==='84000'?54000n:actual===null?55000n:60000n});
  const checkpoints=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));expect(checkpoints).toHaveLength(actual===null?1:2);if(actual===null)expect(checkpoints).toEqual(prior);const saved=await baseline(f);expect(value(await b.repo.confirm(f,b.confirmed))).toEqual(b.receipt);expect(await baseline(f)).toEqual(saved);
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [report]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(report).toMatchObject({lastObservedBalanceCents:90000n,historicalAllocatedCents:40000n,historicalReservedCents:30000n,historicalSavingsCents:actual===null?5000n:0n,historicalFreeCents:actual===null?5000n:10000n});value(await repo.load(f,query(1)));
});
it('HB19-D09 target and future typed identities remain separate and count once after carry',async()=>{
  const f=await fixture(false,true);await addSaving(f);await addObligationAt(f,'2000',cal.target,cal.pastDay(4));await addSaving(f,'1000',cal.target,cal.pastDay(5));await addSaving(f,'500',cal.future,cal.pastDay(6));await observe(f,cal.pastDay(28),'89000',[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'48000'},{period:cal.future,amountCents:'1000'}]);
  await budget(f, {mode:'CARRY',actual:'89000',allocations:[{period:cal.target,amountCents:'88000'},{period:cal.future,amountCents:'1000'}]});const current=await liveBudgets(f);expect(current.budget(cal.target)).toMatchObject({reserved:32000n,savings:6000n,free:50000n});expect(current.budget(cal.future)).toMatchObject({savings:500n,free:500n});expect(current.state.obligations).toHaveLength(2);expect(current.state.savings).toHaveLength(3);
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [report]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(report).toMatchObject({historicalAllocatedCents:40000n,historicalReservedCents:30000n,historicalSavingsCents:5000n,historicalFreeCents:5000n});value(await repo.load(f,query(1)));
});
it.each([true,false])('HB19-D09 HB2-037 original future-only variant with saving=%s retains exact 53000/58000 and future1000',async saving=>{
  const f=await fixture(false,true);if(saving)await addSaving(f);await observe(f,cal.pastDay(28),'89000',[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'48000'},{period:cal.future,amountCents:'1000'}]);await budget(f, {mode:'CARRY',actual:'89000',allocations:[{period:cal.target,amountCents:'88000'},{period:cal.future,amountCents:'1000'}]});const current=await liveBudgets(f);
  expect(current.budget(cal.target).free).toBe(saving?53000n:58000n);expect(current.budget(cal.future).free).toBe(1000n);expect(current.budget(cal.target).free+current.budget(cal.future).free).toBe(saving?54000n:59000n);
  value(await createClosingRepository(db).confirm(f,await preview(f)));value(await createClosingRepository(db).load(f,query(1)));
});
it('HB19-D11 exact missed-month fresh start preserves both independently closed historical allocations',async()=>{
  const f=await fixture(false,false);await observe(f,cal.olderDay(20),'10000',[{period:cal.older,amountCents:'4000'},{period:cal.past,amountCents:'6000'}]);const updated=await budget(f, {mode:'FRESH_START',actual:'8000',allocations:[{period:cal.target,amountCents:'8000'}]});expect((await liveBudgets(f)).budget(cal.target).free).toBe(8000n);expect(await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId))).toHaveLength(2);expect(await db.db.select().from(s.budgetTransfers).where(eq(s.budgetTransfers.accountId,f.accountId))).toHaveLength(0);
  const [decision]=await db.db.select().from(s.transitionDecisions).where(eq(s.transitionDecisions.budgetUpdateId,updated.receipt.updateId));expect(decision.mode).toBe('FRESH_START');const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f,'INITIAL',null,null,cal.older)));value(await repo.confirm(f,await preview(f)));
  const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.historicalThroughDate);expect(rows.map(r=>r.historicalAllocatedCents)).toEqual([4000n,6000n]);for(const r of rows)expect(r).toMatchObject({endBalanceCents:null,lastObservedBalanceCents:10000n,lastBankObservedDate:cal.olderDay(20)});
});

it('HB19-A06 HB2-009 exact historical10000 reserve survives later actual40000 paid state',async()=>{
  const f=await fixture(false,true,'10000');await observe(f,cal.pastEnd,'50000',[{period:cal.past,amountCents:'50000'}]);await budget(f, {mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'50000'}]});await budget(f, {mode:null,actual:'40000',allocations:[{period:cal.target,amountCents:'40000'}],pay:'10000'});expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:0n,free:40000n});
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({endBalanceCents:50000n,historicalAllocatedCents:50000n,historicalReservedCents:10000n,historicalFreeCents:40000n});expect((r.snapshotJson as {obligations:{status:string}[]}).obligations[0].status).toBe('UNPAID');value(await repo.load(f,query(1)));
});
it('HB19-D10 exact negative10000 source free permits technical carry without bank reset',async()=>{
  const f=await fixture(false,true,'20000');await observe(f,cal.pastDay(28),'10000',[{period:cal.past,amountCents:'10000'}]);const before=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));await budget(f, {mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'10000'}]});expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:20000n,free:-10000n});expect(await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId))).toEqual(before);value(await createClosingRepository(db).confirm(f,await preview(f)));
});
it.each([false,true])('HB19-D12/D21 zero-cash old funding and future edit=%s preserve complete identities',async editFuture=>{
  const f=await fixture(false,false),origin=value(shiftPeriod(cal.older,-1));await addObligationAt(f,'3000',origin,cal.olderDay(2));await addSaving(f,'1000',cal.past,cal.olderDay(3));await addSaving(f,'500',cal.future,cal.olderDay(4));await observe(f,cal.olderDay(20),'10000',[{period:origin,amountCents:'0'},{period:cal.older,amountCents:'4000'},{period:cal.past,amountCents:'4000'},{period:cal.future,amountCents:'2000'}]);
  const allocations=[{period:cal.target,amountCents:editFuture?'7000':'6000'},{period:cal.future,amountCents:editFuture?'1000':'2000'}];if(editFuture){const before=await baseline(f);await expect(budget(f, {mode:'FRESH_START',actual:'8000',allocations:allocations})).rejects.toThrow('FUTURE_ALLOCATION_REVIEW_REQUIRED');expect(await baseline(f)).toEqual(before);}
  const confirmed=await budget(f, {mode:'FRESH_START',actual:'8000',allocations:allocations,pay:null,ack:false,connection:db,payAction:'PAID',savingEdits:[],futureEdits:editFuture?[{period:cal.future,beforeAmountCents:'2000',afterAmountCents:'1000',explicitConsent:true}]:[]}),current=await liveBudgets(f);
  expect(current.budget(cal.target)).toMatchObject({reserved:3000n,savings:1000n,free:editFuture?3000n:2000n});expect(current.budget(cal.future)).toMatchObject({savings:500n,free:editFuture?500n:1500n});expect(current.budget(cal.target).free+current.budget(cal.future).free).toBe(3500n);expect(current.state.obligations[0].originPeriod).toBe(origin);
  const [decision]=await db.db.select().from(s.transitionDecisions).where(eq(s.transitionDecisions.budgetUpdateId,confirmed.receipt.updateId)),[period]=await db.db.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId,f.accountId)).orderBy(s.budgetPeriods.period).limit(1);expect((decision.manifest as {sourcePeriodIds:string[]}).sourcePeriodIds).toContain(period.id);
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({lastObservedBalanceCents:10000n,historicalAllocatedCents:4000n,historicalSavingsCents:1000n,historicalFreeCents:3000n,endBalanceCents:null});value(await repo.load(f,query(1)));
});
it('HB19-D21 multiple-source carry refuses while explicit fresh start and own-H no-observation closes succeed',async()=>{
  const f=await fixture(false,false);await addObligationAt(f,'5000',cal.older,cal.olderDay(2));await addObligationAt(f,'10000',cal.past,cal.olderDay(3));await observe(f,cal.today,'90000',[{period:cal.older,amountCents:'10000'},{period:cal.past,amountCents:'30000'},{period:cal.target,amountCents:'50000'}]);const before=await baseline(f);
  await expect(budget(f, {mode:'CARRY',actual:'90000',allocations:[{period:cal.target,amountCents:'90000'}],pay:null,ack:false,connection:db,payAction:'PAID',savingEdits:[],futureEdits:[],sourcePeriods:[cal.older,cal.past]})).rejects.toThrow('OWNER_POLICY_REQUIRED');expect(await baseline(f)).toEqual(before);
  await budget(f, {mode:'FRESH_START',actual:'90000',allocations:[{period:cal.target,amountCents:'90000'}]});expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:15000n,free:75000n});const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f,'INITIAL',null,null,cal.older)));value(await repo.confirm(f,await preview(f)));
  const reports=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.historicalThroughDate);expect(reports.map(r=>r.historicalReservedCents)).toEqual([5000n,10000n]);for(const r of reports)expect(r).toMatchObject({bankDataCompleteness:'NO_OBSERVATION',endBalanceCents:null,historicalAllocatedCents:null,historicalFreeCents:null});
});

it('HB19-D12 HB2-041 original7000 outstanding5000 survives reset without charging the historical deficit',async()=>{
  const f=await fixture(false,false);await addObligationAt(f,'7000',cal.older,cal.olderDay(2));await observe(f,cal.olderDay(19),'10000',[{period:cal.older,amountCents:'4000'},{period:cal.past,amountCents:'6000'}]);const a=await account(f),[e]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId)),date=cal.olderDay(20);
  const checkpoint={observedDate:date,observedAt:null,balanceCents:'10000',allocations:[{period:cal.older,amountCents:'4000'},{period:cal.past,amountCents:'6000'}],placement:null,correction:null};
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:date,reason:'Synthetic historical outside-card partial settlement',payload:{changes:[{key:'partial',action:'PARTIAL_SETTLEMENT',obligationId:e.obligationId,expectedStateRevisionId:e.id,correctionId:null,previousChangeKey:null,effectiveDate:date,bankDate:date,placement:null,bankCheck:checkpoint,paymentConfirmation:{source:'OUTSIDE_TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:true,checkpointId:null},data:{amountCents:'2000'}}]}}));await commitBatch(db.db,{scope:f,kind:'OBLIGATION',command},writeObligations);
  const before=await baseline(f);await expect(budget(f, {mode:'FRESH_START',actual:'8000',allocations:[{period:cal.target,amountCents:'8000'}],pay:null,ack:false,connection:db,payAction:'PAID',savingEdits:[],futureEdits:[],fundingRefsOverride:[]})).rejects.toThrow('TRANSITION_CONFIRMATION_REQUIRED');expect(await baseline(f)).toEqual(before);
  await budget(f, {mode:'FRESH_START',actual:'8000',allocations:[{period:cal.target,amountCents:'8000'}]});const current=await liveBudgets(f);expect(current.budget(cal.target)).toMatchObject({reserved:5000n,free:3000n});expect(current.state.obligations[0]).toMatchObject({identityId:e.obligationId,originPeriod:cal.older,original:7000n,outstanding:5000n,status:'UNPAID'});
  const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f,'INITIAL',null,null,cal.older)));value(await repo.confirm(f,await preview(f)));const rows=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId)).orderBy(s.monthClosings.historicalThroughDate);
  expect(rows[0]).toMatchObject({historicalAllocatedCents:4000n,historicalReservedCents:5000n,historicalFreeCents:-1000n,endBalanceCents:null});expect(rows[1]).toMatchObject({historicalAllocatedCents:6000n,historicalReservedCents:0n,historicalFreeCents:6000n,endBalanceCents:null});value(await repo.load(f,{...query(1),period:cal.older}));value(await repo.load(f,query(1)));
});

it('HB19-D15 equal UUID strings in obligation and saving stay separate typed identities through close and carry',async()=>{
  const f=await fixture(false,true,'3000'),[o]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId));const client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client),replacements=new Map<string,string>();
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text'in x?String(x.text):'',columns=/^insert into "(savings_goals|savings_events)" \(([^)]+)\)/.exec(text);
    if(Array.isArray(args[1])){let params=[...args[1]];if(columns){const names=columns[2].split(',').map(c=>c.trim().replaceAll('"','')),values=/values \(([^)]+)\)/.exec(text)?.[1].split(','),slot=values?.[names.indexOf('id')].trim(),parameter=/^\$(\d+)/.exec(slot??'');if(!parameter)throw Error('TYPED_FIXTURE_ID_PARAMETER_REQUIRED');const i=Number(parameter[1])-1;replacements.set(String(params[i]),columns[1]==='savings_goals'?o.obligationId:o.id);}
      params=params.map(v=>{if(typeof v!=='string')return v;for(const [from,to]of replacements)v=v.replaceAll(from,to);return v;});args[1]=params;}return Reflect.apply(query,client,args);
  }});
  try{const a=await account(f),date=cal.pastDay(3);await commitBatch(drizzle(client,{schema:s}),{scope:f,kind:'SAVING',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:date,reason:'Synthetic typed UUID collision fixture',payload:{changes:[{key:'s',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:date,placement:null,bankCheck:null,data:{title:'Independent synthetic saving',amountCents:'2000',originatingPeriod:cal.past,fundingPeriod:cal.past}}]}}))},writeSavings);}finally{await client.end();}
  await observe(f,cal.pastDay(20),'10000',[{period:cal.past,amountCents:'10000'}]);const repo=createClosingRepository(db),command=await preview(f);value(await repo.confirm(f,command));const [r]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));expect(r).toMatchObject({historicalReservedCents:3000n,historicalSavingsCents:2000n,historicalFreeCents:5000n});expect(r.sourceManifest).toMatchObject({obligationRevisionIds:[o.id],savingsRevisionIds:[o.id]});
  await budget(f, {mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'10000'}]});expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:3000n,savings:2000n,free:5000n});value(await repo.load(f,queryForReport()));value(await repo.confirm(f,command));
});

it('HB19-D16 HB2-015 stale90000 proposal cannot rebase to85000; refreshed carry yields55000',async()=>{
  const f=await fixture(false,true);await observe(f,cal.pastDay(28),'90000',[{period:cal.past,amountCents:'40000'},{period:cal.target,amountCents:'50000'}]);let afterRival:Awaited<ReturnType<typeof baseline>>|null=null;
  await expect(budget(f,{mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'90000'}],beforeConfirm:async()=>{await observe(f,cal.today,'85000',[{period:cal.past,amountCents:'35000'},{period:cal.target,amountCents:'50000'}]);afterRival=await baseline(f);}})).rejects.toThrow('STALE_REVISION');expect(afterRival).not.toBeNull();expect(await baseline(f)).toEqual(afterRival);
  await budget(f,{mode:'CARRY',actual:null,allocations:[{period:cal.target,amountCents:'85000'}]});expect((await liveBudgets(f)).budget(cal.target)).toMatchObject({reserved:30000n,free:55000n});const repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));value(await repo.load(f,query(1)));
});

it('HB19-R05 real999/1000/1001 meaningful storage versions refuse metadata/count before roots and fully roll back',async()=>{
  const f=await fixture(),repo=createClosingRepository(db);value(await repo.confirm(f,await preview(f)));const before=await baseline(f),rollback=Error('SYNTHETIC_CHAIN_ROLLBACK');let samples=0;
  const admission:{links:number;metadataBytes:number;work:number;roots:number}[]=[];
  try{await db.db.transaction(async tx=>{
    let [a]=await tx.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));let [report]=await tx.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));const [head]=await tx.select().from(s.reportHeads).where(eq(s.reportHeads.accountId,f.accountId));
    let event=(await loadObligationHistory(tx,f,a.recordedSeq)).events[0];let document=(await closingCandidate(tx,f,a,cal.past,report.evidenceRecordedCutoffSeq,new ClosingReadBudget())).document;
    const clock=await tx.execute<{instant:string}>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') instant`),stamp=clock.rows[0].instant;
    for(let version=2;version<=1001;version++){
      const sourceId=randomUUID(),sourceSeq=a.recordedSeq+1n,sourceRevision=a.aggregateRevision+1n,amount=30000n+BigInt(version),nextEvent={...event,id:randomUUID(),supersedesId:event.id,recordedSeq:sourceSeq,budgetUpdateId:sourceId,confirmedAt:stamp,title:'Synthetic corrected chain '+version,originalCents:amount,outstandingCents:amount};
      const sourceCommand=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision.toString(),effectiveDate:cal.pastDay(2),reason:'x',payload:{changes:[{key:'a',action:'CREATE',obligationId:event.obligationId,expectedStateRevisionId:null,correctionId:event.id,previousChangeKey:null,effectiveDate:cal.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:nextEvent.title,dueDate:null,originalCents:amount.toString(),isPossible:false,reserveFull:true,originatingPeriod:cal.past,fundingPeriod:cal.past}}]}}));
      const identity=(kind:string,c:typeof sourceCommand)=>hashText(canonicalPayload({owner:f.ownerUserId,account:f.accountId,kind,expectedRevision:c.expectedRevision.toString(),payload:c.payload,effectiveDate:c.effectiveDate,reason:c.reason}));
      await tx.insert(s.budgetUpdates).values({...f,id:sourceId,recordedSeq:sourceSeq,recordedAt:stamp,requestId:sourceCommand.requestId,payloadIdentity:identity('OBLIGATION',sourceCommand),expectedRevision:a.aggregateRevision,actorId:f.ownerUserId,kind:'OBLIGATION',result:{updateId:sourceId,recordedSeq:sourceSeq.toString(),aggregateRevision:sourceRevision.toString()}});
      const {originatingPeriodId:unusedOrigin,payment:unusedPayment,fundingProof:unusedProof,...eventRow}=nextEvent;void unusedOrigin;void unusedPayment;void unusedProof;
      await tx.insert(s.obligationEvents).values({...f,...eventRow});
      const sourceDocuments=auditDocuments([{entityType:'OBLIGATION_STATE',entityId:nextEvent.id,before:obligationSnapshot(event),after:{state:obligationSnapshot(nextEvent),payment:null,effectiveDate:nextEvent.effectiveDate,positionId:nextEvent.positionId,bankDate:null,supersedesId:event.id,confirmedAt:stamp}},
        {entityType:'REPORT_REVIEW_REQUIRED',entityId:head.id,before:{closingId:report.id,correctionPending:false},after:{closingId:report.id,correctionPending:true}}]);
      const sourceAudits=sourceDocuments.map(beforeAfter=>({...f,id:randomUUID(),budgetUpdateId:sourceId,recordedSeq:sourceSeq,eventKind:'OBLIGATION',effectiveDate:cal.pastDay(2),reason:'x',beforeAfter}));await tx.insert(s.auditEvents).values(sourceAudits);
      await tx.update(s.reportHeads).set({correctionPending:true}).where(eq(s.reportHeads.id,head.id));
      const next=structuredClone(document) as {historicalReservedCents:string;historicalFreeCents:string;obligationRevisionIds:string[];snapshot:{obligations:{revisionId:string;title:string;original:string;outstanding:string}[]};sourceManifest:{obligationRevisionIds:string[];evidence:{id:string;budgetUpdateId:string;recordedSeq:string;document:{entity:{type:string}}}[]}};
      next.historicalReservedCents=amount.toString();next.historicalFreeCents=(60000n-amount).toString();next.obligationRevisionIds=[nextEvent.id];Object.assign(next.snapshot.obligations[0],{revisionId:nextEvent.id,title:nextEvent.title,original:amount.toString(),outstanding:amount.toString()});next.sourceManifest.obligationRevisionIds=[nextEvent.id];
      next.sourceManifest.evidence=next.sourceManifest.evidence.filter(e=>e.document.entity.type!=='OBLIGATION_STATE');next.sourceManifest.evidence.push({id:sourceAudits[0].id,budgetUpdateId:sourceId,recordedSeq:sourceSeq.toString(),document:sourceDocuments[0]});next.sourceManifest.evidence.sort((x,y)=>x.id.localeCompare(y.id));
      const nextDocument=json(next),changeEvidenceRefs=[{type:'OBLIGATION_STATE',id:event.id},{type:'OBLIGATION_STATE',id:nextEvent.id}].sort((x,y)=>x.id.localeCompare(y.id)),diff={before:documentHash(document),after:documentHash(nextDocument),changeEvidenceRefs},requestId=randomUUID();
      const envelope={schemaVersion:1,scope:f,requestId,expectedRevision:sourceRevision.toString(),effectiveDate:cal.today,reason:'x',operation:'REVISION',period:cal.past,historicalThroughDate:cal.pastEnd,knowledgeCut:sourceSeq.toString(),expectedHeadId:report.id,expectedHeadVersion:version-1,snapshotSchemaVersion:1,selectionContractVersion:1,diff},reviewDigest=documentHash(envelope);
      const command=value(prepareCommand({requestId,expectedRevision:sourceRevision.toString(),effectiveDate:cal.today,reason:'x',payload:{schemaVersion:1,operation:'REVISION',period:cal.past,historicalThroughDate:cal.pastEnd,knowledgeCut:sourceSeq.toString(),expectedHeadId:report.id,expectedHeadVersion:version-1,snapshotSchemaVersion:1,selectionContractVersion:1,reviewDigest,confirmed:true}})),id=randomUUID(),batchId=randomUUID(),seq=sourceSeq+1n,revision=sourceRevision+1n;
      const result={updateId:batchId,recordedSeq:seq.toString(),aggregateRevision:revision.toString()},update={...f,id:batchId,recordedSeq:seq,recordedAt:stamp,requestId,payloadIdentity:identity('MONTH_CLOSE',command),expectedRevision:sourceRevision,actorId:f.ownerUserId,kind:'MONTH_CLOSE',result};await tx.insert(s.budgetUpdates).values(update);
      const stored={...report,id,budgetUpdateId:batchId,recordedSeq:seq,version,previousVersionId:report.id,closedAt:stamp,evidenceRecordedCutoffSeq:sourceSeq,evidenceRecordedCutoffAt:stamp,reason:'x',changeEvidenceRefs,historicalReservedCents:amount,historicalFreeCents:60000n-amount,snapshotJson:next.snapshot,sourceManifest:next.sourceManifest};await tx.insert(s.monthClosings).values(stored);
      await tx.update(s.reportHeads).set({closingId:id,correctionPending:false}).where(eq(s.reportHeads.id,head.id));
      const closingDocuments=auditDocuments([{entityType:'REPORT_VERSION',entityId:id,before:diff.before,after:json({schemaVersion:1,reportId:id,version,previousVersionId:report.id,digest:diff.after,reviewDigest,diff,command:json({...command,expectedRevision:command.expectedRevision.toString()}),knowledgeCut:sourceSeq.toString(),cutoffAt:stamp})},
        {entityType:'REPORT_HEAD',entityId:head.id,before:{closingId:report.id,correctionPending:true},after:{closingId:id,correctionPending:false}}]);await tx.insert(s.auditEvents).values(closingDocuments.map(beforeAfter=>({...f,id:randomUUID(),budgetUpdateId:batchId,recordedSeq:seq,eventKind:'MONTH_CLOSE',effectiveDate:cal.today,reason:'x',beforeAfter})));
      a={...a,recordedSeq:seq,aggregateRevision:revision};await tx.update(s.accounts).set({recordedSeq:seq,aggregateRevision:revision}).where(eq(s.accounts.id,f.accountId));
      if(version===2||version===10){await validateOriginal(tx,f,a,update,new ClosingReadBudget());samples++;}
      if(version>=999){const budget=new ClosingReadBudget();await expect(closingChain(tx,f,report.periodId,budget)).rejects.toMatchObject({code:'REPORT_LIMIT_EXCEEDED'});expect(budget.cuts.size).toBe(0);expect(budget.roots).toBe(0);if(version<=1000)expect(budget.metadataBytes).toBeGreaterThan(1048576);else expect(budget.metadataBytes).toBe(0);admission.push({links:version,metadataBytes:budget.metadataBytes,work:budget.work,roots:budget.roots});}
      event=nextEvent;report=stored;document=nextDocument;
    }
    // Independent source-only reader proves the last changing lifecycle and
    // actual H/K financial snapshot. It is deliberately not a closing admission.
    const source=await readProjectionContext(tx,f,a,value(parseBerlinDate(cal.pastEnd)),report.evidenceRecordedCutoffSeq,{kind:'HISTORICAL_CLOSING'}),basis=makeClosing(source.snapshot,cal.past);
    expect(basis.historicalReservedCents).toBe('31001');expect(basis.historicalFreeCents).toBe('28999');expect(canonicalDocument(basis.snapshot)).toBe(canonicalDocument((document as {snapshot:unknown}).snapshot));throw rollback;
  });}catch(e){if(e!==rollback)throw e;}
  expect(samples).toBe(2);expect(await baseline(f)).toEqual(before);value(await repo.load(f,query(1)));console.info('HB19_CHAIN_ADMISSION',JSON.stringify(admission));
},180000);
