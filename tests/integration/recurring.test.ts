import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {drizzle} from 'drizzle-orm/node-postgres';
import {eq,sql} from 'drizzle-orm';
import {createDatabase} from '@/infrastructure/db/client';
import {requireLocalDatabaseTargets} from '@/infrastructure/db/local-target';
import {createOnboardingRepository} from '@/infrastructure/db/onboarding-repository';
import {createTemplateRepository} from '@/infrastructure/db/template-repository';
import {prepareCommand} from '@/domain/updates/validation';
import {value} from '../fixtures/checkpoints';
import {checkpoint,createObligation} from '../fixtures/budget-update';
import {transitionCalendar} from '../fixtures/transition-calendar';
import {createBudgetRepository} from '@/infrastructure/db/budget-update-repository';
import {createProjectionRepository} from '@/infrastructure/db/projection-reader';
import {projectAccount} from '@/domain/forecast/budget';
import {createClosingRepository} from '@/infrastructure/db/closing-repository';
import type {Template,TemplateInput,Accept} from '@/domain/recurring/templates';
import * as s from '@/infrastructure/db/schema';
import {createHistoryIndexReader} from '@/infrastructure/db/financial-history-index';
import {createHistoryDetailReader} from '@/infrastructure/db/financial-history-detail';
import {commitBatch} from '@/infrastructure/db/commit';
import {commandDocument,acceptedObligationPayload} from '@/domain/recurring/templates';
import {summarizeVerifiedSource} from '@/features/financial-history/presentation';
import {writeObligations} from '@/infrastructure/db/obligation-writer';
let db:ReturnType<typeof createDatabase>,admin:pg.Pool,testUrl:string;
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_DB_REQUIRED');
  const targets=requireLocalDatabaseTargets(process.env),u=new URL(targets.TEST_DATABASE_URL);admin=new pg.Pool({connectionString:u.toString()});
  const name='hb020_rec_'+randomUUID().replaceAll('-','');await admin.query('CREATE DATABASE "'+name+'"');
  u.pathname='/'+name;testUrl=u.toString();db=createDatabase(testUrl);await migrate(db.db,{migrationsFolder:'./drizzle'});
});
afterAll(async()=>{await db?.close();await admin?.end();});
type Seed={revision:string;today:string;originPeriod:string;configs:Template[];offers:Template[];decisions:unknown[];placement:Accept['placement']};
async function fixture(balance='100000'){
  const owner=randomUUID();await db.db.insert(s.users).values({id:owner,emailVerified:true,googleSubject:'hb020-rec-synthetic-'+owner});
  const clock=await db.db.execute<{today:string}>(sql.raw("SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today"));
  const today=clock.rows[0].today,period=today.slice(0,7),onboarding=createOnboardingRepository(db);
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:'0',effectiveDate:today,reason:'Synthetic first actual check',
    payload:{schemaVersion:1,knowledgeCut:'0',baseCheckpointId:null,baseVectorId:null,effectiveDate:today,checkpoint:checkpoint(today,balance,{[period]:balance}),
      allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}}));
  value(await onboarding.confirm(owner,value(prepareCommand(value(await onboarding.preview(owner,command))))));
  const account=(await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,owner)))[0];
  return {scope:{ownerUserId:owner,accountId:account.id},today,period,repo:createTemplateRepository(db)};
}
type F=Awaited<ReturnType<typeof fixture>>;
async function seed(f:F,period=f.period){return value(await f.repo.load(f.scope,period)) as unknown as Seed;}
async function make(f:F,input:TemplateInput){const state=await seed(f);return value(prepareCommand({requestId:randomUUID(),expectedRevision:state.revision,effectiveDate:f.today,reason:'Synthetic template decision',payload:input}));}
async function configured(balance='100000'){
  const f=await fixture(balance),id=randomUUID();
  const c=await make(f,{schemaVersion:1,action:'CONFIG',templateId:id,expectedVersion:null,title:'Synthetic monthly bill',amountCents:'5400',enabled:true});
  value(await f.repo.commit(f.scope,c));const state=await seed(f);return {f,source:state.configs[0]};
}
async function financial(f:F){
  const client=new pg.Client({connectionString:testUrl});await client.connect();
  try{
    const result:Record<string,unknown>={};
    for(const table of ['budget_periods','historical_positions','ordering_revisions','balance_checkpoints','allocation_revisions','period_allocations',
      'obligations','obligation_events','savings_goals','savings_events','transition_decisions','budget_transfers','month_closings','report_heads']){
      result[table]=(await client.query('SELECT to_jsonb(t) row FROM '+table+' t WHERE owner_user_id=$1 ORDER BY id',[f.scope.ownerUserId])).rows;
    }
    return result;
  }finally{await client.end();}
}
async function decision(f:F,source:Template,action:'ACCEPT'|'DECLINE',period=f.period,amount='5400'){
  const state=await seed(f,period),base={schemaVersion:1 as const,templateId:source.id,templateVersion:source.version,originPeriod:period};
  return make(f,action==='ACCEPT'?{...base,action,fundingPeriod:period,amountCents:amount,placement:state.placement}:{...base,action});
}
it('HB20-T01 one outer ACCEPT receipt; exact edited full reserve; original replay and cross-outcome exclusion',async()=>{
  const {f,source}=await configured(),before=await financial(f),c=await decision(f,source,'ACCEPT',f.period,'5000');
  const receipt=value(await f.repo.commit(f.scope,c));
  expect(value(await f.repo.commit(f.scope,c))).toEqual(receipt);
  expect(await f.repo.commit(f.scope,value(prepareCommand({...c,reason:'Synthetic changed payload'})))).toMatchObject({ok:false,code:'REQUEST_PAYLOAD_CONFLICT'});
  expect(value(await f.repo.status(f.scope,c.requestId))).toEqual(receipt);
  const after=await financial(f);
  expect(after.balance_checkpoints).toEqual(before.balance_checkpoints);expect(after.allocation_revisions).toEqual(before.allocation_revisions);
  const events=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.scope.ownerUserId));
  expect(events).toHaveLength(1);expect(events[0]).toMatchObject({outstandingCents:5000n,originalCents:5000n,reserveFull:true,dueDate:null,status:'UNPAID'});
  expect((await seed(f)).offers).toEqual([]);
  const decline=await decision(f,source,'DECLINE');
  expect(await f.repo.commit(f.scope,decline)).toMatchObject({ok:false,code:'TEMPLATE_ALREADY_ACCEPTED'});
  const updates=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.scope.ownerUserId));
  expect(updates.map(u=>u.kind)).toEqual(['BUDGET_UPDATE','TEMPLATE_CONFIG','TEMPLATE_ACCEPT']);
});
it('HB20-T02 durable DECLINE is financial no-change; replay, ignore/read, disable/re-enable and next month',async()=>{
  const {f,source}=await configured(),before=await financial(f),c=await decision(f,source,'DECLINE');
  const receipt=value(await f.repo.commit(f.scope,c));expect(value(await f.repo.commit(f.scope,c))).toEqual(receipt);
  expect(await financial(f)).toEqual(before);expect((await seed(f)).offers).toEqual([]);
  expect(value(await f.repo.commit(f.scope,await decision(f,source,'DECLINE')))).toEqual(receipt);
  expect(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT'))).toMatchObject({ok:false,code:'TEMPLATE_ALREADY_DECLINED'});
  let current=source;
  for(const enabled of [false,true]){
    value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:source.id,expectedVersion:current.version,
      title:source.title,amountCents:'5400',enabled})));
    current=(await seed(f)).configs[0];expect((await seed(f)).offers).toEqual([]);
  }
  const year=Number(f.period.slice(0,4)),month=Number(f.period.slice(5)),next=month===12?(year+1)+'-01':year+'-'+String(month+1).padStart(2,'0');
  expect((await seed(f,next)).offers).toHaveLength(1);
  const unchanged=await financial(f);await seed(f,next);expect(await financial(f)).toEqual(unchanged);
});
async function lockedRace(f:F,commands:import('@/domain/updates/contracts').PreparedCommand[],loserCode:string|null){
  const clients=[new pg.Client({connectionString:testUrl}),new pg.Client({connectionString:testUrl})];await Promise.all(clients.map(c=>c.connect()));
  const pids=await Promise.all(clients.map(async c=>(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid));expect(new Set(pids).size).toBe(2);
  let entered!:()=>void,release!:()=>void,paused=false;
  const ready=new Promise<void>(r=>{entered=r;}),wait=new Promise<void>(r=>{release=r;}),query=clients[0].query.bind(clients[0]);
  Object.defineProperty(clients[0],'query',{value:async(...args:unknown[])=>{
    const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'',result=await Reflect.apply(query,clients[0],args);
    if(!paused&&typeof text==='string'&&text.includes('from "accounts"')&&text.includes('for update')){paused=true;entered();await wait;}return result;
  }});
  const first=createTemplateRepository({db:drizzle(clients[0],{schema:s})}).commit(f.scope,commands[0]);
  let second:ReturnType<ReturnType<typeof createTemplateRepository>['commit']>|null=null;
  try{
    await ready;second=createTemplateRepository({db:drizzle(clients[1],{schema:s})}).commit(f.scope,commands[1]);
    let blocked=false;
    try{
      for(let i=0;i<150;i++){const r=await admin.query("SELECT $1::int=ANY(pg_blocking_pids($2::int)) blocked",[pids[0],pids[1]]);
        if(r.rows[0].blocked){blocked=true;break;}await new Promise(r=>setTimeout(r,10));}
      expect(blocked).toBe(true);expect(await f.repo.status(f.scope,commands[0].requestId)).toEqual({ok:true,value:null});
    }finally{release();}
    const results=await Promise.all([first,second]);expect(results[0].ok).toBe(true);if(loserCode===null)expect(results[1]).toEqual(results[0]);else expect(results[1]).toMatchObject({ok:false,code:loserCode});return results;
  }finally{release();await Promise.allSettled(second?[first,second]:[first]);await Promise.all(clients.map(c=>c.end()));}
}
it.each([['ACCEPT','DECLINE',false],['DECLINE','ACCEPT',false],['DECLINE','DECLINE',false],['ACCEPT','ACCEPT',false],['ACCEPT','ACCEPT',true]] as const)(
  'HB20-T01 F-016 controlled winner %s excludes %s on independent backend PIDs, different amount=%s',async(a,b,differentAmount)=>{
    const {f,source}=await configured(),commands=[await decision(f,source,a),await decision(f,source,b,f.period,differentAmount?'5000':'5400')];
    await lockedRace(f,commands,a==='DECLINE'&&b==='DECLINE'?null:a==='ACCEPT'?'TEMPLATE_ALREADY_ACCEPTED':'TEMPLATE_ALREADY_DECLINED');expect((await seed(f)).decisions).toHaveLength(1);
    expect((await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.scope.ownerUserId))).length).toBe(a==='ACCEPT'?1:0);
  });
it.each([true,false])('HB20-T01 serialized config edit/decision race, config wins=%s',async configFirst=>{
  const {f,source}=await configured(),disable=await make(f,{schemaVersion:1,action:'CONFIG',templateId:source.id,expectedVersion:source.version,
    title:source.title,amountCents:'5400',enabled:false}),accept=await decision(f,source,'ACCEPT');
  await lockedRace(f,configFirst?[disable,accept]:[accept,disable],'STALE_REVISION');
  const state=await seed(f);expect(state.decisions.length).toBe(configFirst?0:1);expect(state.configs[0].enabled).toBe(!configFirst);
});

it.each(['ACCEPT','DECLINE'] as const)('HB20-T01 original %s is recovered after real COMMIT acknowledgement loss without a second receipt',async action=>{
  const {f,source}=await configured(),command=await decision(f,source,action),client=new pg.Client({connectionString:testUrl});
  await client.connect();const query=client.query.bind(client);let lost=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{
    const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'',result=await Reflect.apply(query,client,args);
    if(!lost&&typeof text==='string'&&text.trim().toLowerCase()==='commit'){lost=true;throw Object.assign(Error('HB020_SYNTHETIC_ACK_LOSS'),{code:'ECONNRESET'});}return result;
  }});
  try{expect(await createTemplateRepository({db:drizzle(client,{schema:s})}).commit(f.scope,command)).toMatchObject({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});expect(lost).toBe(true);}
  finally{await client.end();}
  const before=await financial(f),receipt=value(await f.repo.status(f.scope,command.requestId));
  expect(receipt).not.toBeNull();expect(value(await f.repo.commit(f.scope,command))).toEqual(receipt);expect(await financial(f)).toEqual(before);
});
it.each(['ACCEPT','DECLINE'] as const)('HB20-T01 HB20-T02 deferred audit failure rolls back %s and all finance',async action=>{
  const {f,source}=await configured(),command=await decision(f,source,action),before=await financial(f),
    updates=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.scope.ownerUserId)),
    audits=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.ownerUserId,f.scope.ownerUserId)),
    account=await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.scope.accountId));
  await db.db.execute(sql.raw("CREATE FUNCTION hb020_rec_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'HB020_SYNTHETIC' USING ERRCODE='23514'; END $$"));
  await db.db.execute(sql.raw('CREATE CONSTRAINT TRIGGER hb020_rec_failure AFTER INSERT ON audit_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb020_rec_failure()'));
  try{
    expect(await f.repo.commit(f.scope,command)).toMatchObject({ok:false,code:'TRANSACTION_FAILED'});
    expect(await financial(f)).toEqual(before);
    expect(await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.scope.accountId))).toEqual(account);
    expect(await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.scope.ownerUserId))).toEqual(updates);
    expect(await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.ownerUserId,f.scope.ownerUserId))).toEqual(audits);
  }finally{await db.db.execute(sql.raw('DROP TRIGGER hb020_rec_failure ON audit_events'));await db.db.execute(sql.raw('DROP FUNCTION hb020_rec_failure()'));}
});
it('HB20-T02 audit-only controls survive month filtering, origin membership, 20-row paging and original SOURCE detail',async()=>{
  const {f,source}=await configured(),before=await financial(f);let current=source;
  for(let i=0;i<21;i++){
    value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:source.id,expectedVersion:current.version,
      title:source.title,amountCents:String(5400+i),enabled:true})));current=(await seed(f)).configs[0];
  }
  const other=transitionCalendar(f.today).past;
  const declined=value(await f.repo.commit(f.scope,await decision(f,current,'DECLINE',other)));
  const index=createHistoryIndexReader(db),page=value(await index.open(f.scope,f.period));
  expect(page.items).toHaveLength(20);expect(page.sourceValidity).toBe('VALID');expect(page.nextLastSeq).not.toBeNull();
  const second=value(await index.page(f.scope,{schemaVersion:1,basis:page.basis,fromLastSeq:null,lastSeq:page.nextLastSeq}));
  expect(second.items).toHaveLength(4);expect(second.sourceValidity).toBe('VALID');
  const origin=value(await index.open(f.scope,other));expect(origin.items.map(e=>e.id)).toContain(declined.updateId);
  const detail=value(await createHistoryDetailReader(db).read(f.scope,{schemaVersion:1,basis:page.basis,batchId:declined.updateId,
    dayH:f.today,perspective:'SOURCE',offset:0}));
  expect(detail).toMatchObject({precision:'SOURCE',template:{command:{payload:{action:'DECLINE',originPeriod:other}},mapping:null}});
  expect(await financial(f)).toEqual(before);
});
it('F-016 duplicate typed terminal evidence fails closed instead of choosing the first match',async()=>{
  const {f,source}=await configured(),decline=await decision(f,source,'DECLINE');
  value(await f.repo.commit(f.scope,decline));
  const seedNow=await seed(f),command=value(prepareCommand({...decline,requestId:randomUUID(),expectedRevision:seedNow.revision}));
  await commitBatch(db.db,{scope:f.scope,kind:'TEMPLATE_DECLINE',command},async(_tx,batch)=>[{
    entityType:'TEMPLATE_DECISION',entityId:batch.id,before:null,after:{schemaVersion:1,command:commandDocument(command),source:{...source},mapping:null},
  }]);
  expect(await f.repo.load(f.scope,f.period)).toMatchObject({ok:false,code:'STORAGE_ERROR'});
  expect(await f.repo.commit(f.scope,command)).toMatchObject({ok:false,code:'STORAGE_ERROR'});
});


type BudgetSeed={revision:string;knowledgeCut:string;baseCheckpointId:string|null;baseVectorId:string|null;placement:{id:string;afterPositionId:string|null}|null};
async function budgetChange(f:F,balance:string,allocations:Record<string,string>,obligations:unknown[]=[],day=f.today){
  const repository=createBudgetRepository(db),seed=value(await repository.load(f.scope)) as unknown as BudgetSeed;
  const cp={...checkpoint(day,balance,allocations),placement:day===f.today&&seed.placement?{
    expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}:null};
  const c=value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:day,reason:'Synthetic explicit budget lifecycle check',
    payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:day,
      checkpoint:cp,allocationChange:null,completeVectorConfirmed:true,obligations,savings:[]}}));
  return value(await repository.confirm(f.scope,value(prepareCommand(value(await repository.preview(f.scope,c))))));
}
async function projection(f:F){
  const read=value(await createProjectionRepository(db).read(f.scope));return value(projectAccount(read.snapshot,read.asOfDate));
}
it('HB20-T03 old M debt and a separately accepted P payment retain identity and full reserves; D36 oracle 59200 then 60600',async()=>{
  const f=await fixture(),cal=transitionCalendar(f.today),allocations={[cal.past]:'0',[cal.target]:'70000',[cal.future]:'30000'};
  await budgetChange(f,'100000',allocations,[createObligation('5400',cal.past)]);
  const [old]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.scope.ownerUserId));
  const id=randomUUID();value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:id,expectedVersion:null,
    title:'Synthetic new monthly bill',amountCents:'5400',enabled:true})));
  const source=(await seed(f)).configs[0];expect((await seed(f)).offers).toHaveLength(1);
  const debtBefore=await financial(f);value(await f.repo.commit(f.scope,await decision(f,source,'DECLINE',cal.past)));expect(await financial(f)).toEqual(debtBefore);
  expect((await seed(f)).offers).toHaveLength(1);
  value(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT')));
  const after=await projection(f);expect(after).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:100000n},currentLiquidity:{safeAvailable:59200n}});
  if(after.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_PROJECTION');
  expect(after.periods.find(p=>p.period===cal.past)).toMatchObject({reserved:5400n,free:-5400n});
  expect(after.periods.find(p=>p.period===cal.target)).toMatchObject({allocated:70000n,reserved:5400n,free:64600n});
  const events=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.scope.ownerUserId));expect(events).toHaveLength(2);
  expect(new Set(events.map(e=>e.obligationId)).size).toBe(2);expect(events.find(e=>e.id===old.id)).toEqual(old);
  await budgetChange(f,'100000',allocations,[{action:'PARTIAL_SETTLEMENT',identityId:old.obligationId,expectedRevisionId:old.id,bankDate:null,
    data:{amountCents:'1400'},payment:{source:'OUTSIDE_TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:true}}]);
  const partial=await projection(f);expect(partial).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:100000n},currentLiquidity:{safeAvailable:60600n}});
  if(partial.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_PROJECTION');
  expect(partial.periods.find(p=>p.period===cal.past)).toMatchObject({reserved:4000n,free:-4000n});
});
it('HB20-T03 full reserve may exceed B/A: B1000 R5400 F-4400 safe zero without changing the bank check',async()=>{
  const {f,source}=await configured('1000'),before=await financial(f);
  value(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT')));
  const after=await projection(f);expect(after).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:1000n},currentLiquidity:{safeAvailable:0n,safeDailyLimit:0n}});
  if(after.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_PROJECTION');
  expect(after.periods.find(p=>p.period===f.period)).toMatchObject({allocated:1000n,reserved:5400n,free:-4400n});
  expect((await financial(f)).balance_checkpoints).toEqual(before.balance_checkpoints);
});
it.each(['PAID','CANCELLED'] as const)('F-016 accepted business key remains terminal after ordinary %s lifecycle',async action=>{
  const {f,source}=await configured();value(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT')));
  const [event]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.scope.ownerUserId));
  const balance=action==='PAID'?'94600':'100000';
  await budgetChange(f,balance,{[f.period]:balance},[{action,identityId:event.obligationId,expectedRevisionId:event.id,bankDate:null,
    data:action==='PAID'?{amountCents:'5400'}:{},payment:action==='PAID'?{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false}:null}]);
  const before=await financial(f);expect((await seed(f)).offers).toEqual([]);
  expect(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT'))).toMatchObject({ok:false,code:'TEMPLATE_ALREADY_ACCEPTED'});
  expect(await f.repo.commit(f.scope,await decision(f,source,'DECLINE'))).toMatchObject({ok:false,code:'TEMPLATE_ALREADY_ACCEPTED'});
  expect(await financial(f)).toEqual(before);
});
it('HB20-T02 controls and a later accepted payment preserve immutable closing v1/v2 and report heads',async()=>{
  const f=await fixture(),cal=transitionCalendar(f.today),closing=createClosingRepository(db);
  async function close(operation:'INITIAL'|'REVISION',headId:string|null,version:number|null){
    const state=await seed(f),c=value(prepareCommand({requestId:randomUUID(),expectedRevision:state.revision,effectiveDate:f.today,reason:'Synthetic explicit closing',
      payload:{schemaVersion:1,operation,period:cal.past,expectedHeadId:headId,expectedHeadVersion:version}}));
    const reviewed=value(await closing.preview(f.scope,c)) as unknown as {command:unknown};return value(await closing.confirm(f.scope,value(prepareCommand(reviewed.command))));
  }
  await close('INITIAL',null,null);
  const [v1]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.ownerUserId,f.scope.ownerUserId));
  await budgetChange(f,'90000',{[cal.past]:'90000'},[],cal.pastEnd);
  await close('REVISION',v1.id,1);
  const versions=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.ownerUserId,f.scope.ownerUserId)).orderBy(s.monthClosings.version);
  expect(versions).toHaveLength(2);expect(versions[0]).toEqual(v1);
  const heads=await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.ownerUserId,f.scope.ownerUserId)),templateId=randomUUID();
  value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId,expectedVersion:null,title:'Synthetic closing regression',amountCents:'5400',enabled:true})));
  const source=(await seed(f)).configs[0];value(await f.repo.commit(f.scope,await decision(f,source,'DECLINE',cal.past)));
  value(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT',cal.target)));
  expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.ownerUserId,f.scope.ownerUserId)).orderBy(s.monthClosings.version)).toEqual(versions);
  expect(await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.ownerUserId,f.scope.ownerUserId))).toEqual(heads);
  for(const version of [1,2])value(await closing.load(f.scope,{period:cal.past,version,offset:0,digest:null}));
});


it.each(['rows','bytes'])('HB20-T01 bounded complete storage preflight refuses %s before typed-history materialization',async mode=>{
  const {f}=await configured(),account=(await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.scope.accountId)))[0],count=mode==='rows'?2049:1;
  const rows=Array.from({length:count},(_,i)=>{const seq=account.recordedSeq+BigInt(i+1),id=randomUUID();return {...f.scope,id,requestId:randomUUID(),
    payloadIdentity:'0'.repeat(64),expectedRevision:seq-1n,recordedSeq:seq,actorId:f.scope.ownerUserId,kind:'TEMPLATE_CONFIG',
    result:{updateId:id,recordedSeq:seq.toString(),aggregateRevision:seq.toString()}};});
  for(let i=0;i<rows.length;i+=200)await db.db.insert(s.budgetUpdates).values(rows.slice(i,i+200));
  if(mode==='bytes')await db.db.insert(s.auditEvents).values({...f.scope,id:randomUUID(),budgetUpdateId:rows[0].id,recordedSeq:rows[0].recordedSeq,
    eventKind:'TEMPLATE_CONFIG',effectiveDate:f.today,reason:'Synthetic oversized source',beforeAfter:{syntheticOversized:'x'.repeat(5*1024*1024)}});
  await db.db.update(s.accounts).set({recordedSeq:account.recordedSeq+BigInt(count),aggregateRevision:account.aggregateRevision+BigInt(count)}).where(eq(s.accounts.id,f.scope.accountId));
  const before=await financial(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let materialized=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{
    const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'';
    if(typeof text==='string'&&text.includes('from "budget_updates"'))materialized=true;
    return Reflect.apply(query,client,args);
  }});
  try{expect(await createTemplateRepository({db:drizzle(client,{schema:s})}).load(f.scope,f.period)).toMatchObject({ok:false,code:'STORAGE_ERROR'});expect(materialized).toBe(false);}
  finally{await client.end();}
  expect(await financial(f)).toEqual(before);
});


it.each(['version','mapping','timestamp'])('HB20-T01 rejects corrupted original %s evidence and refuses later decisions without writes',async fault=>{
  const {f,source}=await configured(),command=await decision(f,source,'ACCEPT'),input=command.payload as unknown as Accept;
  const expected=acceptedObligationPayload(input,source,f.today),innerPayload=fault==='mapping'?
    acceptedObligationPayload({...input,amountCents:'4000'},source,f.today):expected;
  const inner=value(prepareCommand({...command,payload:innerPayload}));
  await commitBatch(db.db,{scope:f.scope,kind:'TEMPLATE_ACCEPT',command},async(tx,batch)=>{
    const recordedAt=fault==='timestamp'?new Date(Date.parse(batch.recordedAt)+1000).toISOString().slice(0,-1)+'000Z':batch.recordedAt;
    const audits=await writeObligations(tx,{...batch,recordedAt,command:inner}),[event]=await tx.select().from(s.obligationEvents).where(eq(s.obligationEvents.budgetUpdateId,batch.id));
    return [...audits,{entityType:'TEMPLATE_DECISION',entityId:batch.id,before:null,after:{schemaVersion:1,command:commandDocument(command),
      source:fault==='version'?{...source,version:randomUUID()}:{...source},
      mapping:{inner:commandDocument(inner),obligationId:event.obligationId,eventId:event.id,positionId:event.positionId}}}];
  });
  const before=await financial(f),updates=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.scope.ownerUserId));
  expect(await f.repo.status(f.scope,command.requestId)).toMatchObject({ok:false,code:'STORAGE_ERROR'});
  expect(await f.repo.commit(f.scope,command)).toMatchObject({ok:false,code:'STORAGE_ERROR'});
  expect(await financial(f)).toEqual(before);expect(await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.scope.ownerUserId))).toEqual(updates);
});


it('F-016 terminal DECLINE older than thirty config updates is never lost by a latest-page lookup',async()=>{
  const {f,source}=await configured(),decline=await decision(f,source,'DECLINE'),receipt=value(await f.repo.commit(f.scope,decline)),before=await financial(f);
  let current=source;
  for(let i=0;i<30;i++){
    value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:source.id,expectedVersion:current.version,
      title:source.title,amountCents:String(5400+i),enabled:true})));current=(await seed(f)).configs[0];
  }
  expect((await seed(f)).offers).toEqual([]);
  expect(value(await f.repo.status(f.scope,decline.requestId))).toEqual(receipt);
  expect(value(await f.repo.commit(f.scope,await decision(f,current,'DECLINE')))).toEqual(receipt);
  expect(await f.repo.commit(f.scope,await decision(f,current,'ACCEPT'))).toMatchObject({ok:false,code:'TEMPLATE_ALREADY_DECLINED'});
  expect(await financial(f)).toEqual(before);
});


async function allOwned(f:F){
  const facts=await financial(f),client=new pg.Client({connectionString:testUrl});await client.connect();
  try{
    const controls:Record<string,unknown>={};
    for(const table of ['accounts','budget_updates','audit_events'])
      controls[table]=(await client.query('SELECT to_jsonb(t) row FROM '+table+' t WHERE owner_user_id=$1 ORDER BY id',[f.scope.ownerUserId])).rows;
    return {facts,controls};
  }finally{await client.end();}
}
it.each(['2024-02','2026-03','2026-10','2027-01'])('HB20-T01 D57 context %s creates equal-period full reserve with current-day history and unchanged bank',async period=>{
  const {f,source}=await configured(),before=await financial(f),command=await decision(f,source,'ACCEPT',period,'5000');
  const receipt=value(await f.repo.commit(f.scope,command));
  const [identity]=await db.db.select().from(s.obligations).where(eq(s.obligations.ownerUserId,f.scope.ownerUserId));
  const [event]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.scope.ownerUserId));
  const periods=await db.db.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.ownerUserId,f.scope.ownerUserId));
  expect(periods.find(p=>p.id===identity.originatingPeriodId)?.period).toBe(period);
  expect(periods.find(p=>p.id===event.fundingPeriodId)?.period).toBe(period);
  expect(event).toMatchObject({effectiveDate:f.today,outstandingCents:5000n,originalCents:5000n,reserveFull:true,status:'UNPAID',bankDate:null,dueDate:null});
  const after=await financial(f);
  for(const table of ['balance_checkpoints','allocation_revisions','period_allocations','transition_decisions','budget_transfers','month_closings','report_heads'])
    expect(after[table]).toEqual(before[table]);
  const view=await projection(f);expect(view).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:100000n},currentLiquidity:{safeAvailable:95000n}});
  if(view.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_PROJECTION');
  expect(view.periods.find(p=>p.period===period)).toMatchObject({reserved:5000n,free:period===f.period?95000n:-5000n});
  expect(view.currentLiquidity).toMatchObject({safeDailyLimit:95000n/BigInt(view.currentLiquidity.kind==='SAFE_ESTIMATE'?view.currentLiquidity.days:1)});
  expect(value(await f.repo.status(f.scope,command.requestId))).toEqual(receipt);
  expect(value(await f.repo.commit(f.scope,command))).toEqual(receipt);
  expect((await seed(f,period)).offers).toHaveLength(0);expect((await seed(f)).offers).toHaveLength(period===f.period?0:1);
  const basis=value(await createHistoryIndexReader(db).open(f.scope,period));
  expect(basis.items.map(i=>i.id)).toContain(receipt.updateId);
  const detail=value(await createHistoryDetailReader(db).read(f.scope,{schemaVersion:1,basis:basis.basis,batchId:receipt.updateId,dayH:f.today,perspective:'SOURCE',offset:0}));
  expect(detail).toMatchObject({template:{command:{payload:{originPeriod:period,fundingPeriod:period}},mapping:{inner:{payload:{changes:[{data:{originatingPeriod:period,fundingPeriod:period}}]}}}}});
});
it.each(['funding','origin','malformed','stale'])('HB20-T01 D57 forged %s proposal has complete no-write oracle',async mode=>{
  const {f,source}=await configured(),command=await decision(f,source,'ACCEPT');
  const payload={...command.payload as unknown as Accept};
  if(mode==='funding')payload.fundingPeriod=transitionCalendar(f.today).future;
  if(mode==='origin')payload.originPeriod=transitionCalendar(f.today).past;
  if(mode==='malformed')payload.originPeriod=payload.fundingPeriod='2026-13';
  if(mode==='stale')payload.templateVersion=randomUUID();
  const forged=value(prepareCommand({...command,payload})),before=await allOwned(f);
  expect(await f.repo.commit(f.scope,forged)).toMatchObject({ok:false,code:mode==='stale'?'STALE_TEMPLATE':'INVALID_INPUT'});
  expect(await allOwned(f)).toEqual(before);
});
it('HB20-T01 D57 original verifier rejects typed cross-month proof even if ordinary CREATE is otherwise valid',async()=>{
  const {f,source}=await configured(),good=await decision(f,source,'ACCEPT');
  const input=good.payload as unknown as Accept,command=value(prepareCommand({...good,payload:{...input,originPeriod:transitionCalendar(f.today).past}}));
  const inner=value(prepareCommand({...good,payload:acceptedObligationPayload(input,source,f.today)}));
  await commitBatch(db.db,{scope:f.scope,kind:'TEMPLATE_ACCEPT',command},async(tx,batch)=>{
    const audits=await writeObligations(tx,{...batch,command:inner});
    const [event]=await tx.select().from(s.obligationEvents).where(eq(s.obligationEvents.budgetUpdateId,batch.id));
    return [...audits,{entityType:'TEMPLATE_DECISION',entityId:batch.id,before:null,after:{schemaVersion:1,command:commandDocument(command),source:{...source},
      mapping:{inner:commandDocument(inner),obligationId:event.obligationId,eventId:event.id,positionId:event.positionId}}}];
  });
  const before=await allOwned(f);
  expect(await f.repo.status(f.scope,command.requestId)).toMatchObject({ok:false,code:'STORAGE_ERROR'});
  expect(await f.repo.commit(f.scope,good)).toMatchObject({ok:false});
  expect(await allOwned(f)).toEqual(before);
});

it('HB20-UX01 UX02 UX03 original Internet create/pay history and December 60+20 offers stay separate, read-only and terminal',async()=>{
  const f=await fixture(),next=transitionCalendar(f.today).future;
  await budgetChange(f,'100000',{[f.period]:'70000',[next]:'30000'});
  for(const [title,amount] of [['Internet','5000'],['Mobile','2000']]){
    value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:randomUUID(),expectedVersion:null,title,amountCents:amount,enabled:true})));
  }
  const sources=(await seed(f)).configs,internet=sources.find(s=>s.title==='Internet')!,mobile=sources.find(s=>s.title==='Mobile')!;
  const accepted=value(await f.repo.commit(f.scope,await decision(f,internet,'ACCEPT',f.period,'5000')));
  value(await f.repo.commit(f.scope,await decision(f,mobile,'DECLINE',f.period)));
  const estimate=await projection(f);expect(estimate).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:100000n},currentLiquidity:{safeAvailable:65000n}});
  if(estimate.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_ESTIMATE');
  expect(estimate.currentLiquidity.safeDailyLimit).toBe(65000n/BigInt(estimate.currentLiquidity.days));
  const [created]=await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.budgetUpdateId,accepted.updateId));
  const paid=await budgetChange(f,'95000',{[f.period]:'65000',[next]:'30000'},[{action:'PAID',identityId:created.obligationId,expectedRevisionId:created.id,bankDate:null,
    data:{amountCents:'5000'},payment:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false}}]);
  expect(await projection(f)).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:95000n},currentLiquidity:{safeAvailable:65000n}});
  value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:internet.id,expectedVersion:internet.version,title:'Internet',amountCents:'6000',enabled:true})));
  const beforeNavigation=await allOwned(f),december=await seed(f,next);
  expect(december.offers.map(s=>[s.title,s.amountCents]).sort()).toEqual([['Internet','6000'],['Mobile','2000']]);
  expect((await seed(f)).offers).toHaveLength(0);expect(await allOwned(f)).toEqual(beforeNavigation);
  const newSource=december.offers.find(s=>s.title==='Internet')!,command=await decision(f,newSource,'ACCEPT',next,'6000'),beforeAccept=await financial(f);
  const decemberReceipt=value(await f.repo.commit(f.scope,command));expect(value(await f.repo.commit(f.scope,command))).toEqual(decemberReceipt);
  expect(await f.repo.commit(f.scope,await decision(f,newSource,'ACCEPT',next,'6000'))).toMatchObject({ok:false,code:'TEMPLATE_ALREADY_ACCEPTED'});
  const current=await projection(f);if(current.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_ESTIMATE');
  expect(current.bank.balance).toBe(95000n);expect(current.periods.find(p=>p.period===next)).toMatchObject({reserved:6000n,free:24000n});
  expect(current.periods.find(p=>p.period===f.period)).toMatchObject({reserved:0n,free:65000n});
  expect((await financial(f)).balance_checkpoints).toEqual(beforeAccept.balance_checkpoints);
  expect((await financial(f)).allocation_revisions).toEqual(beforeAccept.allocation_revisions);
  expect((await seed(f,next)).offers.map(s=>s.title)).toEqual(['Mobile']);
  const basis=value(await createHistoryIndexReader(db).open(f.scope,null)).basis,reader=createHistoryDetailReader(db);
  const source=async(batchId:string)=>value(await reader.read(f.scope,{schemaVersion:1,basis,batchId,dayH:f.today,perspective:'SOURCE',offset:0}));
  const updates=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.scope.ownerUserId)),first=updates.find(u=>u.recordedSeq===1n)!;
  const readBaseline=await allOwned(f);
  const firstSummary=summarizeVerifiedSource(await source(first.id)),createdSummary=summarizeVerifiedSource(await source(accepted.updateId)),paidSummary=summarizeVerifiedSource(await source(paid.updateId));
  expect(firstSummary).toMatchObject({kind:'INITIAL',changes:expect.arrayContaining([{action:'CHECK',amount:'100000',date:f.today}])});
  expect(createdSummary.changes).toEqual([{action:'CREATE',title:'Internet',amount:'5000',period:f.period,status:'UNPAID',reserve:'5000'}]);
  expect(paidSummary.changes).toContainEqual({action:'CHECK',amount:'95000',date:f.today});
  expect(paidSummary.changes).toContainEqual({action:'PAID',title:'Internet',amount:'5000',period:f.period,status:'PAID',reserve:'0'});
  const original=value(await reader.read(f.scope,{schemaVersion:1,basis,batchId:accepted.updateId,dayH:f.today,perspective:'ORIGINAL',offset:0})) as unknown as {snapshot:{checkpoint:{balance:string};obligations:{status:string;outstanding:string}[]}};
  const later=value(await reader.read(f.scope,{schemaVersion:1,basis,batchId:accepted.updateId,dayH:f.today,perspective:'LATER',offset:0})) as unknown as typeof original;
  expect(original.snapshot.checkpoint.balance).toBe('100000');expect(original.snapshot.obligations).toContainEqual(expect.objectContaining({status:'UNPAID',outstanding:'5000'}));
  expect(later.snapshot.checkpoint.balance).toBe('95000');expect(later.snapshot.obligations).toContainEqual(expect.objectContaining({status:'PAID',outstanding:'0'}));
  expect(await allOwned(f)).toEqual(readBaseline);
});

it('HB20-UX05 terminal month labels retain original verified title after template rename',async()=>{
  const {f,source}=await configured(),next=transitionCalendar(f.today).future;
  value(await f.repo.commit(f.scope,await decision(f,source,'ACCEPT')));
  value(await f.repo.commit(f.scope,await decision(f,source,'DECLINE',next)));
  value(await f.repo.commit(f.scope,await make(f,{schemaVersion:1,action:'CONFIG',templateId:source.id,expectedVersion:source.version,title:'Renamed current template',amountCents:'6000',enabled:true})));
  const before=await allOwned(f);
  for(const period of [f.period,next]){
    const selected=await seed(f,period);expect(selected.configs[0].title).toBe('Renamed current template');
    expect(selected.decisions).toContainEqual(expect.objectContaining({title:source.title}));
  }
  expect(await allOwned(f)).toEqual(before);
});
