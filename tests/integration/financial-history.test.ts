import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {and,eq,desc,sql} from 'drizzle-orm';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {createDatabase} from '@/infrastructure/db/client';
import {requireLocalDatabaseTargets} from '@/infrastructure/db/local-target';
import {commitBatch} from '@/infrastructure/db/commit';
import {writeBankCheckpoint} from '@/infrastructure/db/checkpoint-writer';
import {createHistoryIndexReader} from '@/infrastructure/db/financial-history-index';
import {prepareCommand} from '@/domain/updates/validation';
import type {AuthorizedScope} from '@/domain/updates/contracts';
import {value} from '../fixtures/checkpoints';
import * as s from '@/infrastructure/db/schema';
import {transitionCalendar} from '../fixtures/transition-calendar';
let db:ReturnType<typeof createDatabase>,admin:pg.Pool,cal:ReturnType<typeof transitionCalendar>;
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_TARGET_REQUIRED');
  const u=new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin=new pg.Pool({connectionString:u.toString()});
  const name='hb0192_'+randomUUID().replaceAll('-','');await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;
  db=createDatabase(u.toString());await migrate(db.db,{migrationsFolder:'./drizzle'});
  const clock=await db.db.execute<{date:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS date`);cal=transitionCalendar(clock.rows[0].date);
});
afterAll(async()=>{await db?.close();await admin?.end();});
async function fixture(){const f={ownerUserId:randomUUID(),accountId:randomUUID()};await db.db.insert(s.users).values({id:f.ownerUserId});await db.db.insert(s.accounts).values({...f,id:f.accountId,displayName:'Synthetic HBH registry'});return f;}
async function checkpoint(f:AuthorizedScope){
  const [a]=await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
  const [order]=await db.db.select().from(s.orderingRevisions).where(and(eq(s.orderingRevisions.accountId,f.accountId),eq(s.orderingRevisions.historicalDate,cal.pastDay(20)))).orderBy(desc(s.orderingRevisions.recordedSeq)).limit(1);
  const members=(order?.manifest as {positionIds:string[]}|undefined)?.positionIds;
  const payload={observedDate:cal.pastDay(20),observedAt:null,balanceCents:'80000',allocations:[{period:cal.past,amountCents:'60000'},{period:cal.target,amountCents:'20000'}],correction:null,
    placement:order?{expectedOrderingRevisionId:order.id,afterPositionId:members!.at(-1),beforePositionId:null}:null};
  return commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision,effectiveDate:cal.pastDay(20),reason:'Synthetic confirmed HBH bank check',payload}))},writeBankCheckpoint);
}
async function baseline(){const tables=await db.db.execute<{name:string}>(sql`SELECT tablename name FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);const out=[];
  for(const {name} of tables.rows){if(!/^[a-z_]+$/.test(name))throw Error('UNEXPECTED_TABLE');out.push([name,(await db.db.execute(sql`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) rows FROM ${sql.raw(name)} t`)).rows]);}return out;}
async function unchanged<T>(read:()=>Promise<T>){const before=await baseline();const result=await read();expect(await baseline()).toEqual(before);return result;}
it('HBH-001/006 registry census pages 20/20/5, independent child census and concurrent append are read only',async()=>{
  const f=await fixture();for(let i=0;i<45;i++)await checkpoint(f);
  const independent=(await db.db.select({id:s.budgetUpdates.id,seq:s.budgetUpdates.recordedSeq}).from(s.budgetUpdates).where(eq(s.budgetUpdates.accountId,f.accountId))).sort((a,b)=>a.seq>b.seq?-1:1);
  const reader=createHistoryIndexReader(db),first=value(await unchanged(()=>reader.open(f,null)));
  expect(first.items).toHaveLength(20);expect(first.sourceValidity).toBe('VALID');
  // Separate pool connection is used by commitBatch between the independent read transactions.
  await checkpoint(f);
  const second=value(await unchanged(()=>reader.page(f,{schemaVersion:1,basis:first.basis,fromLastSeq:null,lastSeq:first.nextLastSeq})));
  const third=value(await unchanged(()=>reader.page(f,{schemaVersion:1,basis:first.basis,fromLastSeq:first.nextLastSeq,lastSeq:second.nextLastSeq})));
  expect([first.items.length,second.items.length,third.items.length]).toEqual([20,20,5]);expect(third.nextLastSeq).toBeNull();
  const items=[...first.items,...second.items,...third.items];expect(items.map(e=>({id:e.id,seq:BigInt(e.recordedSeq)}))).toEqual(independent);
  const children=await db.db.execute<{id:string}>(sql`SELECT c.id FROM balance_checkpoints c JOIN budget_updates u ON u.id=c.budget_update_id
    WHERE c.account_id=${f.accountId} AND u.recorded_seq<=45 ORDER BY c.id`);
  expect(items.flatMap(e=>e.sources.filter(x=>x.kind==='BANK_CHECKPOINT').map(x=>x.id)).sort()).toEqual(children.rows.map(c=>c.id).sort());
  expect(value(await unchanged(()=>reader.open(f,null))).items[0].recordedSeq).toBe('46');
  expect(value(await unchanged(()=>reader.page(f,{schemaVersion:1,basis:first.basis,fromLastSeq:null,lastSeq:null})))).toEqual(first);
  for(const boundary of ['1','44','999'])expect(await unchanged(()=>reader.page(f,{schemaVersion:1,basis:first.basis,fromLastSeq:null,lastSeq:boundary}))).toMatchObject({ok:false,code:'INVALID_INPUT'});
});
it('HBH-001/006 empty account remains unobserved and foreign anchors refuse without writes',async()=>{
  const f=await fixture(),foreign=await fixture(),reader=createHistoryIndexReader(db);
  const empty=value(await unchanged(()=>reader.open(f,null)));expect(empty.items).toEqual([]);expect(empty.basis.knowledgeCut).toBe('0');
  await checkpoint(f);const page=value(await unchanged(()=>reader.open(f,null)));
  expect(await unchanged(()=>reader.page(foreign,{schemaVersion:1,basis:page.basis,fromLastSeq:null,lastSeq:null}))).toMatchObject({ok:false,code:'INVALID_INPUT'});
});

it('HBH-002 PG selected original daily state uses retained batch K and has no write',async()=>{
  const f=await fixture();const receipt=await checkpoint(f),reader=createHistoryIndexReader(db),first=value(await unchanged(()=>reader.open(f,null)));
  await checkpoint(f);
  const {createHistoryDetailReader}=await import('@/infrastructure/db/financial-history-detail');
  const detail=value(await unchanged(()=>createHistoryDetailReader(db).read(f,{schemaVersion:1,basis:first.basis,batchId:receipt.updateId,dayH:cal.pastEnd,perspective:'ORIGINAL',offset:0})));
  expect(detail).toMatchObject({precision:'DAY',dayH:cal.pastEnd,knowledgeCut:'1',endBalance:null,snapshot:{checkpoint:{balance:'80000',observedDate:cal.pastDay(20)}}});
});

it('HBH-001/002/003 PG legacy transition, exact K0/K2 daily oracle and immutable v1/v2',async()=>{
  const {transitionCalendar}=await import('../fixtures/transition-calendar');
  const clock=await db.db.execute<{day:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS day`),cal=transitionCalendar(clock.rows[0].day);
  const {writeObligations}=await import('@/infrastructure/db/obligation-writer');
  const {writeSavings}=await import('@/infrastructure/db/savings-writer');
  const {createClosingRepository}=await import('@/infrastructure/db/closing-repository');
  const {createProposalRepository}=await import('@/infrastructure/db/transfer-proposal-repository');
  const {createHistoryDetailReader}=await import('@/infrastructure/db/financial-history-detail');
  const f=await fixture();
  const account=async()=> (await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId)))[0];
  async function command(payload:unknown,date:string,reason='Synthetic approved HBH fixture'){return value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account()).aggregateRevision,effectiveDate:date,reason,payload}));}
  await commitBatch(db.db,{scope:f,kind:'OBLIGATION_CREATE',command:await command({changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:cal.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
    data:{title:'Synthetic HBH obligation',dueDate:null,originalCents:'20000',isPossible:false,reserveFull:true,originatingPeriod:cal.past,fundingPeriod:cal.past}}]},cal.pastDay(2))},writeObligations);
  await commitBatch(db.db,{scope:f,kind:'SAVING_CREATE',command:await command({changes:[{key:'s',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:cal.pastDay(3),placement:null,bankCheck:null,
    data:{title:'Synthetic HBH saving',amountCents:'10000',originatingPeriod:cal.past,fundingPeriod:cal.past}}]},cal.pastDay(3))},writeSavings);
  async function observe(date:string,balance:string,allocations:Record<string,string>){return commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:await command({observedDate:date,observedAt:null,balanceCents:balance,allocations:Object.entries(allocations).map(([period,amountCents])=>({period,amountCents})),placement:null,correction:null},date)},writeBankCheckpoint);}
  const original=await observe(cal.pastDay(20),'80000',{[cal.past]:'60000',[cal.target]:'20000'});
  const closing=createClosingRepository(db);
  async function close(operation='INITIAL',headId:string|null=null,headVersion:number|null=null){
    const preview=value(await closing.preview(f,await command({schemaVersion:1,operation,period:cal.past,expectedHeadId:headId,expectedHeadVersion:headVersion},cal.today,operation==='INITIAL'?'Synthetic R1 initial version':'Synthetic R1 corrected version'))) as {command:unknown};
    return value(await closing.confirm(f,value(prepareCommand(preview.command))));
  }
  const report1=await close(),[v1]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  const [o]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId));
  const [saving]=await db.db.select().from(s.savingsEvents).where(eq(s.savingsEvents.accountId,f.accountId));
  const [cp]=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));
  const transition={schemaVersion:1,intent:'TRANSITION',mode:'FRESH_START',observationMode:'ACTUAL_CHECK',target:cal.target,sources:[],balanceCents:'100000',
    allocations:[{period:cal.target,amountCents:'80000'},{period:cal.future,amountCents:'20000'}],futureEdits:[{period:cal.future,beforeAmountCents:'0',afterAmountCents:'20000',explicitConsent:true}],
    fundingRefs:[{kind:'OBLIGATION',identityId:o.obligationId,revisionId:o.id},{kind:'SAVING',identityId:saving.savingsId,revisionId:saving.id}],
    expectedCheckpointRevisionId:cp.id,expectedAllocationRevisionId:(await account()).activeAllocationRevisionId,effectiveDate:cal.today,
    checkpoint:{observedDate:cal.today,observedAt:null,balanceCents:'100000',allocations:[{period:cal.target,amountCents:'80000'},{period:cal.future,amountCents:'20000'}],placement:null,correction:null},placement:null,
    consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}};
  const proposals=createProposalRepository(db),prepared=value(await proposals.prepare(f,await command(transition,cal.today))) as {proposalId:string;proposalIdentity:string;input:unknown;review:unknown};
  const moved=value(await proposals.confirm(f,await command({proposalId:prepared.proposalId,proposalIdentity:prepared.proposalIdentity,input:prepared.input,review:prepared.review},cal.today)));
  const head=await account();
  const correction=await observe(cal.pastEnd,'76000',{[cal.past]:'56000',[cal.target]:'20000'});
  const report2=await close('REVISION',v1.id,1);
  const index=createHistoryIndexReader(db),page=value(await unchanged(()=>index.open(f,null)));
  expect(page.sourceValidity).toBe('VALID');expect(page.items.find(x=>x.id===moved.updateId)?.sourceStatus).toBe('VALID');
  expect(page.items.find(x=>x.id===report1.updateId)?.sources.some(x=>x.kind==='MONTH_CLOSING')).toBe(true);
  expect(value(await unchanged(()=>index.open(f,cal.past))).items.some(x=>x.id===report1.updateId)).toBe(true);
  expect(value(await unchanged(()=>index.open(f,cal.target))).items.some(x=>x.id===report1.updateId)).toBe(false);
  const details=createHistoryDetailReader(db),q={schemaVersion:1,basis:page.basis,batchId:original.updateId,dayH:cal.pastEnd,perspective:'ORIGINAL',offset:0};
  const old=value(await unchanged(()=>details.read(f,q))),later=value(await unchanged(()=>details.read(f,{...q,perspective:'LATER'})));
  expect(old).toMatchObject({knowledgeRecordedAt:page.items.find(x=>x.id===original.updateId)!.recordedAt});
  expect(later).toMatchObject({knowledgeRecordedAt:page.items[0].recordedAt});
  expect(old).toMatchObject({knowledgeCut:original.recordedSeq,endBalance:null,snapshot:{checkpoint:{balance:'80000'}},periods:expect.arrayContaining([{period:cal.past,allocated:'60000',reserved:'20000',savings:'10000',free:'30000',deficit:'0'}])});
  expect(later).toMatchObject({endBalance:'76000',snapshot:{checkpoint:{balance:'76000'}},periods:expect.arrayContaining([{period:cal.past,allocated:'56000',reserved:'20000',savings:'10000',free:'26000',deficit:'0'}])});
  const reportReads=[];
  for(const [i,receipt] of [report1,report2].entries()){
    const result=value(await unchanged(()=>details.read(f,{...q,batchId:receipt.updateId,perspective:'REPORT'})));
    expect(result).toMatchObject({precision:'REPORT',reportMeta:{version:i+1,reason:i===0?'Synthetic R1 initial version':'Synthetic R1 corrected version',previousVersionId:i===0?null:v1.id,
      dayH:cal.pastEnd,knowledgeCut:i===0?original.recordedSeq:correction.recordedSeq,createdAt:page.items.find(e=>e.id===receipt.updateId)!.recordedAt},
      report:{endBalanceCents:i===0?null:'76000',historicalAllocatedCents:i===0?'60000':'56000',historicalReservedCents:'20000',historicalSavingsCents:'10000',historicalFreeCents:i===0?'30000':'26000'}});
    reportReads.push(result);
  }
  // Explicit v1 is byte-for-byte stable after reading v2, including provenance.
  expect(value(await unchanged(()=>details.read(f,{...q,batchId:report1.updateId,perspective:'REPORT'})))).toEqual(reportReads[0]);
  expect((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,v1.id)))[0]).toEqual(v1);
  expect((await account()).activeAllocationRevisionId).toBe(head.activeAllocationRevisionId);
  const [funded]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId)).orderBy(desc(s.obligationEvents.recordedSeq)).limit(1);
  const [order]=await db.db.select().from(s.orderingRevisions).where(and(eq(s.orderingRevisions.accountId,f.accountId),eq(s.orderingRevisions.historicalDate,cal.today))).orderBy(desc(s.orderingRevisions.recordedSeq)).limit(1);
  const placement={expectedOrderingRevisionId:order.id,afterPositionId:(order.manifest as {positionIds:string[]}).positionIds.at(-1),beforePositionId:null};
  const paid=await commitBatch(db.db,{scope:f,kind:'OBLIGATION_PAID',command:await command({changes:[{key:'payment',action:'PAID',obligationId:funded.obligationId,expectedStateRevisionId:funded.id,correctionId:null,previousChangeKey:null,
    effectiveDate:cal.today,bankDate:cal.today,placement:null,bankCheck:{observedDate:cal.today,observedAt:null,balanceCents:'80000',allocations:[{period:cal.target,amountCents:'60000'},{period:cal.future,amountCents:'20000'}],placement,correction:null},
    paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:null},data:{amountCents:'20000'}}]},cal.today)},writeObligations);
  const afterPay=value(await unchanged(()=>index.open(f,null)));
  const paymentState=value(await unchanged(()=>details.read(f,{...q,basis:afterPay.basis,batchId:paid.updateId,dayH:cal.today})));
  expect(paymentState).toMatchObject({snapshot:{checkpoint:{balance:'80000'},obligations:[{identityId:o.obligationId,originPeriod:cal.past,fundingPeriod:cal.target,status:'PAID',outstanding:'0'}]},
    periods:expect.arrayContaining([{period:cal.target,allocated:'60000',reserved:'0',savings:'10000',free:'50000',deficit:'0'}])});
  const octoberAfterPay=value(await unchanged(()=>details.read(f,{...q,basis:afterPay.basis,perspective:'LATER'})));
  expect(octoberAfterPay).toMatchObject({snapshot:{checkpoint:{balance:'76000'}},periods:expect.arrayContaining([{period:cal.past,allocated:'56000',reserved:'20000',savings:'10000',free:'26000',deficit:'0'}])});
  expect(afterPay.items.flatMap(e=>e.sources.map(x=>x.kind+':'+x.id+':'+x.recordedSeq)).sort()).toEqual(await independentChildren(f,BigInt(afterPay.basis.knowledgeCut)));
  expect(value(await unchanged(()=>details.read(f,{...q,basis:afterPay.basis,batchId:moved.updateId,perspective:'SOURCE'})))).toMatchObject({precision:'SOURCE',source:{id:moved.updateId}});

});


it('HBH-001/006 unsupported and missing source stay visible, details and filtered membership refuse read only',async()=>{
  const {createHistoryDetailReader}=await import('@/infrastructure/db/financial-history-detail');
  const f=await fixture();await checkpoint(f);
  for(const kind of ['UNKNOWN_HISTORY_KIND','BANK_CHECKPOINT']){
    const [a]=await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
    const receipt=await commitBatch(db.db,{scope:f,kind,command:value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision,effectiveDate:cal.pastDay(20),reason:'Synthetic missing-source injection',payload:{}}))},async()=>[{entityType:'SYNTHETIC_SOURCE',entityId:randomUUID(),before:null,after:{schemaVersion:1}}]);
    const reader=createHistoryIndexReader(db),page=value(await unchanged(()=>reader.open(f,null)));
    expect(page.items.find(e=>e.id===receipt.updateId)?.sourceStatus).toBe(kind==='BANK_CHECKPOINT'?'INVALID':'UNSUPPORTED');
    expect(page.sourceValidity).toBe('INVALID');
    expect(await unchanged(()=>createHistoryDetailReader(db).read(f,{schemaVersion:1,basis:page.basis,batchId:receipt.updateId,dayH:cal.pastEnd,perspective:'ORIGINAL',offset:0}))).toEqual({ok:false,code:'HISTORY_SOURCE_INVALID'});
    expect(await unchanged(()=>reader.open(f,cal.past))).toEqual({ok:false,code:'HISTORY_SOURCE_INVALID'});
  }
});

it('HBH-001/006 malformed required typed audit remains a visible source error without writes',async()=>{
  const f=await fixture();
  const receipt=await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:0n,effectiveDate:cal.pastDay(20),reason:'Synthetic malformed source audit',payload:{observedDate:cal.pastDay(20),observedAt:null,balanceCents:'80000',allocations:[{period:cal.past,amountCents:'80000'}],correction:null,placement:null}}))},async(tx,batch)=>{
    const audits=await writeBankCheckpoint(tx,batch);return audits.map(a=>a.entityType==='BANK_CHECKPOINT'?{...a,after:{...(a.after as object),balanceCents:'79999'}}:a);
  });
  const page=value(await unchanged(()=>createHistoryIndexReader(db).open(f,null)));
  expect(page.items.find(x=>x.id===receipt.updateId)?.sourceStatus).toBe('INVALID');
});

it('HBH-004 PG observed zero with full R/S differs from no observation and unknown A/F',async()=>{
  const {transitionCalendar}=await import('../fixtures/transition-calendar');
  const clock=await db.db.execute<{date:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS date`),cal=transitionCalendar(clock.rows[0].date);
  const {writeObligations}=await import('@/infrastructure/db/obligation-writer'),{writeSavings}=await import('@/infrastructure/db/savings-writer');
  const {createHistoryDetailReader}=await import('@/infrastructure/db/financial-history-detail');
  for(const zero of [false,true]){
    const f=await fixture();
    async function command(payload:unknown,date:string){const [a]=await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));return value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision,effectiveDate:date,reason:'Synthetic HBH unknown/zero branch',payload}));}
    await commitBatch(db.db,{scope:f,kind:'OBLIGATION_CREATE',command:await command({changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:cal.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
      data:{title:'Synthetic full reserve',dueDate:null,originalCents:'2000',isPossible:false,reserveFull:true,originatingPeriod:cal.past,fundingPeriod:cal.past}}]},cal.pastDay(2))},writeObligations);
    let last=await commitBatch(db.db,{scope:f,kind:'SAVING_CREATE',command:await command({changes:[{key:'s',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:cal.pastDay(3),placement:null,bankCheck:null,
      data:{title:'Synthetic retained saving',amountCents:'1000',originatingPeriod:cal.past,fundingPeriod:cal.past}}]},cal.pastDay(3))},writeSavings);
    if(zero)last=await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:await command({observedDate:cal.pastEnd,observedAt:null,balanceCents:'0',allocations:[{period:cal.past,amountCents:'0'}],placement:null,correction:null},cal.pastEnd)},writeBankCheckpoint);
    const page=value(await unchanged(()=>createHistoryIndexReader(db).open(f,null)));
    const detail=value(await unchanged(()=>createHistoryDetailReader(db).read(f,{schemaVersion:1,basis:page.basis,batchId:last.updateId,dayH:cal.pastEnd,perspective:'ORIGINAL',offset:0})));
    expect(detail).toMatchObject({endBalance:zero?'0':null,periods:expect.arrayContaining([{period:cal.past,allocated:zero?'0':null,reserved:'2000',savings:'1000',free:zero?'-3000':null,deficit:zero?'3000':null}])});
  }
});


// Independent physical-table census; it neither calls the reader's dispatcher nor
// derives registry membership from child sources.
async function independentChildren(f:AuthorizedScope,cut:bigint){
  const families=[['balance_checkpoints','BANK_CHECKPOINT'],['allocation_revisions','ALLOCATION_REVISION'],['obligations','OBLIGATION_IDENTITY'],['obligation_events','OBLIGATION_STATE'],['savings_goals','SAVING_IDENTITY'],['savings_events','SAVINGS_STATE'],['transition_decisions','TRANSITION_DECISION'],['budget_transfers','BUDGET_TRANSFER'],['ordering_revisions','DAY_ORDERING'],['historical_positions','POSITION'],['month_closings','MONTH_CLOSING'],['audit_events','AUDIT']] as const;
  const refs:string[]=[];
  for(const [table,kind]of families){const rows=await db.db.execute<{id:string;seq:string}>(sql`SELECT id::text,recorded_seq::text seq FROM ${sql.raw(table)} WHERE owner_user_id=${f.ownerUserId} AND account_id=${f.accountId} AND recorded_seq<=${cut}`);for(const row of rows.rows)refs.push(kind+':'+row.id+':'+row.seq);}
  const allocations=await db.db.execute<{id:string;seq:string}>(sql`SELECT p.id::text,v.recorded_seq::text seq FROM period_allocations p,allocation_revisions v
    WHERE p.allocation_revision_id=v.id AND p.owner_user_id=${f.ownerUserId} AND p.account_id=${f.accountId} AND v.owner_user_id=${f.ownerUserId} AND v.account_id=${f.accountId} AND v.recorded_seq<=${cut}`);
  for(const row of allocations.rows)refs.push('PERIOD_ALLOCATION:'+row.id+':'+row.seq);return refs.sort();
}
it('HBH-006 fixed-cut shape, source membership and invalid page ranks refuse without writes',async()=>{
  const f=await fixture();for(let i=0;i<45;i++)await checkpoint(f);
  const index=createHistoryIndexReader(db),first=value(await unchanged(()=>index.open(f,null)));
  const bad=[{schemaVersion:1,basis:{...first.basis,knowledgeCut:'44'},fromLastSeq:null,lastSeq:null},
    {schemaVersion:1,basis:first.basis,fromLastSeq:'44',lastSeq:'24'},
    {schemaVersion:1,basis:{...first.basis,indexAnchor:randomUUID()},fromLastSeq:null,lastSeq:null},
    {schemaVersion:2,basis:first.basis,fromLastSeq:null,lastSeq:null}];
  for(const q of bad)expect(await unchanged(()=>index.page(f,q as never))).toMatchObject({ok:false,code:'INVALID_INPUT'});
  expect(await unchanged(()=>index.open(f,cal.future))).toMatchObject({ok:true,value:{items:[]}});
});

it('HBH-001 original aggregate source proof reuses the existing verifier under read-only transaction',async()=>{
  const {createBudgetRepository}=await import('@/infrastructure/db/budget-update-repository');
  const {createHistoryDetailReader}=await import('@/infrastructure/db/financial-history-detail');
  const f=await fixture(),repo=createBudgetRepository(db);
  const draft={schemaVersion:1,knowledgeCut:'0',baseCheckpointId:null,baseVectorId:null,effectiveDate:cal.pastDay(20),completeVectorConfirmed:true,
    checkpoint:{observedDate:cal.pastDay(20),observedAt:null,balanceCents:'80000',allocations:[{period:cal.past,amountCents:'80000'}],placement:null,correction:null},allocationChange:null,obligations:[],savings:[]};
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:0n,effectiveDate:cal.pastDay(20),reason:'Synthetic original aggregate proof',payload:draft}));
  const prepared=value(prepareCommand(value(await repo.preview(f,command)))),receipt=value(await repo.confirm(f,prepared));
  const first=value(await unchanged(()=>createHistoryIndexReader(db).open(f,null)));
  expect(first.sourceValidity).toBe('VALID');
  expect(value(await unchanged(()=>createHistoryDetailReader(db).read(f,{schemaVersion:1,basis:first.basis,batchId:receipt.updateId,dayH:cal.pastEnd,perspective:'SOURCE',offset:0})))).toMatchObject({precision:'SOURCE',original:{schemaVersion:1}});
});
it.each(['BUDGET_UPDATE','LEGACY_TRANSITION','MONTH_CLOSE'] as const)('HBH-002/003/006 R1 corrupt original confirmation rejects every perspective %s',async kind=>{
  const {createHistoryDetailReader}=await import('@/infrastructure/db/financial-history-detail');
  const f=await fixture();
  async function command(payload:unknown,date=cal.today){const [a]=await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));return value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision,effectiveDate:date,reason:'Synthetic R1 original confirmation',payload}));}
  let updateId:string;
  if(kind==='BUDGET_UPDATE'){
    const {createBudgetRepository}=await import('@/infrastructure/db/budget-update-repository'),repo=createBudgetRepository(db);
    const draft={schemaVersion:1,knowledgeCut:'0',baseCheckpointId:null,baseVectorId:null,effectiveDate:cal.pastDay(20),completeVectorConfirmed:true,
      checkpoint:{observedDate:cal.pastDay(20),observedAt:null,balanceCents:'80000',allocations:[{period:cal.past,amountCents:'80000'}],placement:null,correction:null},allocationChange:null,obligations:[],savings:[]};
    const prepared=value(prepareCommand(value(await repo.preview(f,await command(draft,cal.pastDay(20))))));
    updateId=value(await repo.confirm(f,prepared)).updateId;
  }else{
    await checkpoint(f);
    if(kind==='MONTH_CLOSE'){
      const {createClosingRepository}=await import('@/infrastructure/db/closing-repository'),repo=createClosingRepository(db);
      const preview=value(await repo.preview(f,await command({schemaVersion:1,operation:'INITIAL',period:cal.past,expectedHeadId:null,expectedHeadVersion:null}))) as {command:unknown};
      updateId=value(await repo.confirm(f,value(prepareCommand(preview.command)))).updateId;
    }else{
      const {createProposalRepository}=await import('@/infrastructure/db/transfer-proposal-repository');
      const [account]=await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
      const [cp]=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));
      const transition={schemaVersion:1,intent:'TRANSITION',mode:'FRESH_START',observationMode:'ACTUAL_CHECK',target:cal.target,sources:[],balanceCents:'100000',
        allocations:[{period:cal.target,amountCents:'80000'},{period:cal.future,amountCents:'20000'}],futureEdits:[{period:cal.future,beforeAmountCents:'0',afterAmountCents:'20000',explicitConsent:true}],fundingRefs:[],
        expectedCheckpointRevisionId:cp.id,expectedAllocationRevisionId:account.activeAllocationRevisionId,effectiveDate:cal.today,
        checkpoint:{observedDate:cal.today,observedAt:null,balanceCents:'100000',allocations:[{period:cal.target,amountCents:'80000'},{period:cal.future,amountCents:'20000'}],placement:null,correction:null},placement:null,
        consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}};
      const repo=createProposalRepository(db),prepared=value(await repo.prepare(f,await command(transition))) as {proposalId:string;proposalIdentity:string;input:unknown;review:unknown};
      updateId=value(await repo.confirm(f,await command({proposalId:prepared.proposalId,proposalIdentity:prepared.proposalIdentity,input:prepared.input,review:prepared.review}))).updateId;
    }
  }
  const reader=createHistoryIndexReader(db),first=value(await unchanged(()=>reader.open(f,null))),details=createHistoryDetailReader(db);
  const q={schemaVersion:1,basis:first.basis,batchId:updateId,dayH:cal.pastEnd,offset:0};
  const perspectives=kind==='MONTH_CLOSE'?['ORIGINAL','LATER','SOURCE','REPORT']:['ORIGINAL','LATER','SOURCE'];
  for(const perspective of perspectives)expect(await unchanged(()=>details.read(f,{...q,perspective}))).toMatchObject({ok:true});
  // Deliberately corrupt only the original confirmation, leaving typed financial facts
  // and metadata envelopes valid. This is synthetic storage damage, never a read write.
  const type=kind==='BUDGET_UPDATE'?'BUDGET_UPDATE_REVIEW':kind==='MONTH_CLOSE'?'REPORT_VERSION':'TRANSITION_CONFIRMATION';
  const path=kind==='BUDGET_UPDATE'?'{after,command,reason}':kind==='MONTH_CLOSE'?'{after,digest}':'{after,confirmation,reason}';
  // Test-only fault injection in this suite's new disposable database. The setting
  // is transaction-local; normal append-only protection is restored before reads.
  await db.db.transaction(async tx=>{
    await tx.execute(sql`SET LOCAL session_replication_role='replica'`);
    await tx.execute(sql`UPDATE audit_events SET before_after=jsonb_set(before_after,${path}::text[],to_jsonb(${'Synthetic corrupted proof'}::text)) WHERE owner_user_id=${f.ownerUserId} AND account_id=${f.accountId} AND budget_update_id=${updateId} AND before_after->'entity'->>'type'=${type}`);
  });
  expect((await db.db.execute<{session_replication_role:string}>(sql`SHOW session_replication_role`)).rows[0].session_replication_role).toBe('origin');
  expect(value(await unchanged(()=>reader.open(f,null))).items.find(e=>e.id===updateId)?.sourceStatus).toBe('VALID'); // metadata only
  for(const perspective of perspectives)expect(await unchanged(()=>details.read(f,{...q,perspective}))).toEqual({ok:false,code:'HISTORY_SOURCE_INVALID'});
});

it.each(['bytes','rows','work','wire'] as const)('HBH-006 metadata admission %s refuses honestly without writes',async guard=>{
  const f=await fixture(),receipt=await checkpoint(f);
  if(guard==='bytes')await db.db.insert(s.auditEvents).values({...f,id:randomUUID(),budgetUpdateId:receipt.updateId,recordedSeq:1n,eventKind:'BANK_CHECKPOINT',effectiveDate:cal.pastDay(20),reason:'Synthetic resource refusal',beforeAfter:{schemaVersion:1,eventIndex:4,entity:{type:'RESOURCE_FIXTURE',id:randomUUID()},before:null,after:{synthetic:'x'.repeat(8388609)}}});
  else if(guard==='work')await db.db.execute(sql`INSERT INTO historical_positions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,kind)
    SELECT gen_random_uuid(),${f.ownerUserId}::uuid,${f.accountId}::uuid,${receipt.updateId}::uuid,1,${cal.pastDay(20)}::date,'RESOURCE_FIXTURE' FROM generate_series(1,2001)`);
  else await db.db.execute(sql`INSERT INTO audit_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,event_kind,effective_date,reason,before_after)
    SELECT gen_random_uuid(),${f.ownerUserId}::uuid,${f.accountId}::uuid,${receipt.updateId}::uuid,1,'BANK_CHECKPOINT',${cal.pastDay(20)}::date,'Synthetic resource refusal',
    jsonb_build_object('schemaVersion',1,'eventIndex',i+3,'entity',jsonb_build_object('type','RESOURCE_FIXTURE','id',gen_random_uuid()::text),'before',null,'after',null)
    FROM generate_series(1,${guard==='rows'?20001:6000}) i`);
  expect(await unchanged(()=>createHistoryIndexReader(db).open(f,null))).toEqual({ok:false,code:'HISTORY_LIMIT_EXCEEDED'});
});

it('HBH-006 malformed registry int64 receipt stays a visible invalid row instead of SQL overflow',async()=>{
  const f=await fixture(),id=randomUUID();
  await db.db.insert(s.budgetUpdates).values({...f,id,requestId:randomUUID(),actorId:f.ownerUserId,payloadIdentity:'synthetic-invalid-source',kind:'BANK_CHECKPOINT',expectedRevision:9223372036854775807n,recordedSeq:1n,
    result:{updateId:id,recordedSeq:'1',aggregateRevision:'9223372036854775808'}});
  await db.db.update(s.accounts).set({recordedSeq:1n,aggregateRevision:1n}).where(eq(s.accounts.id,f.accountId));
  const index=value(await unchanged(()=>createHistoryIndexReader(db).open(f,null)));
  expect(index.items).toMatchObject([{id,sourceStatus:'INVALID'}]);expect(index.sourceValidity).toBe('INVALID');
});
