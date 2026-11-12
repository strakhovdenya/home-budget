import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {eq,sql} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/node-postgres';
import {createBudgetRepository} from '@/infrastructure/db/budget-update-repository';
import {commitBatch} from '@/infrastructure/db/commit';
import {writeObligations} from '@/infrastructure/db/obligation-writer';
import {acceptedObligationPayload} from '@/domain/recurring/templates';
import {transitionCalendar} from '../fixtures/transition-calendar';
import {createProjectionRepository} from '@/infrastructure/db/projection-reader';
import {projectAccount} from '@/domain/forecast/budget';
import {createDatabase} from '@/infrastructure/db/client';
import {requireLocalDatabaseTargets} from '@/infrastructure/db/local-target';
import {createOnboardingRepository} from '@/infrastructure/db/onboarding-repository';
import {prepareCommand} from '@/domain/updates/validation';
import {value} from '../fixtures/checkpoints';
import {checkpoint} from '../fixtures/budget-update';
import * as s from '@/infrastructure/db/schema';

let db:ReturnType<typeof createDatabase>,admin:pg.Pool,testUrl:string;
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_DB_REQUIRED');
  const targets=requireLocalDatabaseTargets(process.env),u=new URL(targets.TEST_DATABASE_URL);
  admin=new pg.Pool({connectionString:u.toString()});
  const name='hb020_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;
  testUrl=u.toString();db=createDatabase(testUrl);await migrate(db.db,{migrationsFolder:'./drizzle'});
});
afterAll(async()=>{await db?.close();await admin?.end();});
async function fixture(){
  const owner=randomUUID();await db.db.insert(s.users).values({id:owner,emailVerified:true,googleSubject:'hb020-synthetic-'+owner});
  const clock=await db.db.execute<{today:string}>(sql.raw("SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today"));
  const day=clock.rows[0].today,period=day.slice(0,7);
  const command=value(prepareCommand({requestId:randomUUID(),expectedRevision:'0',effectiveDate:day,reason:'Synthetic initial actual observation',
    payload:{schemaVersion:1,knowledgeCut:'0',baseCheckpointId:null,baseVectorId:null,effectiveDate:day,
      checkpoint:checkpoint(day,'100000',{[period]:'100000'}),allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}}));
  return {owner,command,repo:createOnboardingRepository(db)};
}
it('HB20-A01 HB20-A02 HB20-A07 preview writes nothing; one confirmation creates real account/C/V/receipt/audit',async()=>{
  const f=await fixture(),review=value(await f.repo.preview(f.owner,f.command));
  expect(await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner))).toEqual([]);
  const confirmed=value(prepareCommand(review)),receipt=value(await f.repo.confirm(f.owner,confirmed));
  const accounts=await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner));
  expect(accounts).toHaveLength(1);expect(accounts[0]).toMatchObject({displayName:'Home Budget',currency:'EUR',recordedSeq:1n,aggregateRevision:1n});
  const updates=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.owner));
  expect(updates).toHaveLength(1);expect(updates[0].result).toEqual(receipt);
  const cps=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.ownerUserId,f.owner));
  expect(cps).toHaveLength(1);expect(cps[0].balanceCents).toBe(100000n);
  expect(await f.repo.status(f.owner,confirmed.requestId)).toEqual({ok:true,value:receipt});
});
it('HB20-A04 HB20-A09 same-key original replay; changed payload conflicts; different key cannot initialize twice',async()=>{
  const f=await fixture(),c=value(prepareCommand(value(await f.repo.preview(f.owner,f.command))));
  const first=value(await f.repo.confirm(f.owner,c));
  expect(value(await f.repo.confirm(f.owner,c))).toEqual(first);
  expect(await f.repo.confirm(f.owner,value(prepareCommand({...c,reason:'changed'})))).toMatchObject({ok:false,code:'REQUEST_PAYLOAD_CONFLICT'});
  expect(await f.repo.confirm(f.owner,value(prepareCommand({...c,requestId:randomUUID()})))).toMatchObject({ok:false,code:'ALREADY_INITIALIZED'});
});
it('HB20-A03 invalid sum and foreign owner leave no account',async()=>{
  const f=await fixture(),p=f.command.payload as Record<string,unknown>,cp=p.checkpoint as Record<string,unknown>;
  const invalid=value(prepareCommand({...f.command,payload:{...p,checkpoint:{...cp,balanceCents:'90000'}}}));
  expect(await f.repo.preview(f.owner,invalid)).toMatchObject({ok:false});
  expect(await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner))).toEqual([]);
  expect(await f.repo.preview(randomUUID(),f.command)).toMatchObject({ok:false,code:'FORBIDDEN'});
});

async function snapshot(owner:string){
  const c=new pg.Client({connectionString:testUrl});await c.connect();
  try{
    const result:Record<string,unknown>={users:(await c.query('SELECT to_jsonb(u) row FROM users u WHERE id=$1',[owner])).rows};
    const tables=['accounts','budget_periods','budget_updates','audit_events','historical_positions','ordering_revisions','balance_checkpoints',
      'allocation_revisions','period_allocations','obligations','obligation_events','savings_goals','savings_events',
      'transfer_proposals','transition_decisions','budget_transfers','transfer_proposal_cancellations','month_closings','report_heads'];
    for(const table of tables)result[table]=(await c.query('SELECT to_jsonb(t) AS row FROM '+table+' t WHERE owner_user_id=$1 ORDER BY id',[owner])).rows;
    return result;
  }finally{await c.end();}
}
it('HB20-A07 explicit actual zero remains known zero with a complete vector',async()=>{
  const f=await fixture(),p=f.command.payload as Record<string,unknown>,cp=p.checkpoint as {observedDate:string};
  const command=value(prepareCommand({...f.command,payload:{...p,checkpoint:checkpoint(cp.observedDate,'0',{[cp.observedDate.slice(0,7)]:'0'})}}));
  const c=value(prepareCommand(value(await f.repo.preview(f.owner,command))));
  value(await f.repo.confirm(f.owner,c));
  expect((await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.ownerUserId,f.owner)))[0].balanceCents).toBe(0n);
});
it.each([{same:false,changed:false},{same:true,changed:false},{same:false,changed:true}])('HB20-A05 independent backend PIDs and controlled owner-lock barrier %j',async({same,changed})=>{
  const f=await fixture(),a=value(prepareCommand(value(await f.repo.preview(f.owner,f.command)))),
    raw=f.command.payload as Record<string,unknown>,second=changed?{...raw,checkpoint:checkpoint(f.command.effectiveDate,'90000',{[f.command.effectiveDate.slice(0,7)]:'90000'})}:raw,
    b=same?a:value(prepareCommand(value(await f.repo.preview(f.owner,value(prepareCommand({...f.command,requestId:randomUUID(),payload:second}))))));
  const clients=[new pg.Client({connectionString:testUrl}),new pg.Client({connectionString:testUrl})];
  await Promise.all(clients.map(c=>c.connect()));
  const pids=await Promise.all(clients.map(async c=>(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid));
  expect(new Set(pids).size).toBe(2);
  let release!:()=>void,entered!:()=>void;
  const wait=new Promise<void>(r=>{release=r;}),ready=new Promise<void>(r=>{entered=r;});
  const blocker=db.db.transaction(async tx=>{await tx.select().from(s.users).where(eq(s.users.id,f.owner)).for('update');entered();await wait;});
  await ready;
  const pending=clients.map((c,i)=>createOnboardingRepository({db:drizzle(c,{schema:s})}).confirm(f.owner,i===0?a:b));
  let overlapped=false;
  try{
    for(let i=0;i<150;i++){
      const r=await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0",[pids]);
      if(r.rows[0].n===2){overlapped=true;break;}await new Promise(r=>setTimeout(r,10));
    }
    expect(await f.repo.status(f.owner,a.requestId)).toEqual({ok:true,value:null});
  }finally{release();await blocker;}
  try{
    expect(overlapped).toBe(true);
    const results=await Promise.all(pending);
    if(same)expect(results[0]).toEqual(results[1]);
    else{expect(results.filter(r=>r.ok)).toHaveLength(1);expect(results.find(r=>!r.ok)).toMatchObject({code:'ALREADY_INITIALIZED'});}
    const rows=await snapshot(f.owner);
    expect(rows.accounts).toHaveLength(1);expect(rows.budget_updates).toHaveLength(1);
    expect(rows.balance_checkpoints).toHaveLength(1);expect(rows.allocation_revisions).toHaveLength(1);
  }finally{await Promise.all(clients.map(c=>c.end()));}
});
it.each(['BEFORE','DEFERRED'])('HB20-A06 %s audit failure rolls back the entire initial account and facts',async timing=>{
  const f=await fixture(),c=value(prepareCommand(value(await f.repo.preview(f.owner,f.command)))),before=await snapshot(f.owner);
  await db.db.execute(sql.raw("CREATE FUNCTION hb020_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'HB020_SYNTHETIC' USING ERRCODE='23514'; END $$"));
  await db.db.execute(sql.raw(timing==='BEFORE'?
    'CREATE TRIGGER hb020_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION hb020_failure()':
    'CREATE CONSTRAINT TRIGGER hb020_failure AFTER INSERT ON audit_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb020_failure()'));
  try{expect(await f.repo.confirm(f.owner,c)).toMatchObject({ok:false,code:'TRANSACTION_FAILED'});expect(await snapshot(f.owner)).toEqual(before);}
  finally{await db.db.execute(sql.raw('DROP TRIGGER hb020_failure ON audit_events'));await db.db.execute(sql.raw('DROP FUNCTION hb020_failure()'));}
  value(await f.repo.confirm(f.owner,c));
});
it('HB20-A06 real COMMIT acknowledgement loss recovers original receipt from a fresh connection without writes',async()=>{
  const f=await fixture(),c=value(prepareCommand(value(await f.repo.preview(f.owner,f.command)))),client=new pg.Client({connectionString:testUrl});
  await client.connect();const query=client.query.bind(client);let lost=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{
    const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'';
    const result=await Reflect.apply(query,client,args);
    if(!lost&&typeof text==='string'&&text.trim().toLowerCase()==='commit'){lost=true;throw Object.assign(Error('HB020_SYNTHETIC_ACK_LOSS'),{code:'ECONNRESET'});}
    return result;
  }});
  try{expect(await createOnboardingRepository({db:drizzle(client,{schema:s})}).confirm(f.owner,c)).toMatchObject({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});expect(lost).toBe(true);}
  finally{await client.end();}
  const before=await snapshot(f.owner),receipt=value(await f.repo.status(f.owner,c.requestId));
  expect(receipt).not.toBeNull();expect(value(await f.repo.confirm(f.owner,c))).toEqual(receipt);
  expect(await snapshot(f.owner)).toEqual(before);
});


it('HB20-A08 HB20-A09 legacy empty account resumes HB-017 with actual revision/null anchors and unchanged name/debt',async()=>{
  const f=await fixture(),accountId=randomUUID();await db.db.insert(s.accounts).values({id:accountId,ownerUserId:f.owner,displayName:'Synthetic legacy name'});
  const scope={ownerUserId:f.owner,accountId},period=f.command.effectiveDate.slice(0,7),source={id:randomUUID(),version:randomUUID(),title:'Synthetic retained debt',amountCents:'5400',enabled:true};
  const ordinary=acceptedObligationPayload({schemaVersion:1,action:'ACCEPT',templateId:source.id,templateVersion:source.version,originPeriod:period,
    fundingPeriod:period,amountCents:'5400',placement:null},source,f.command.effectiveDate);
  await commitBatch(db.db,{scope,kind:'OBLIGATION_CREATE',command:value(prepareCommand({...f.command,payload:ordinary}))},writeObligations);
  const before=await snapshot(f.owner);
  expect(await f.repo.preview(f.owner,f.command)).toMatchObject({ok:false,code:'EXISTING_EMPTY_ACCOUNT'});expect(await snapshot(f.owner)).toEqual(before);
  const repo=createBudgetRepository(db),seed=value(await repo.load(scope)) as unknown as {revision:string;knowledgeCut:string;baseCheckpointId:null;baseVectorId:null;placement:{id:string;afterPositionId:string|null}};
  expect(seed).toMatchObject({revision:'1',knowledgeCut:'1',baseCheckpointId:null,baseVectorId:null});
  const raw=f.command.payload as Record<string,unknown>,cp=raw.checkpoint as Record<string,unknown>;
  const command=value(prepareCommand({...f.command,requestId:randomUUID(),expectedRevision:seed.revision,payload:{...raw,knowledgeCut:seed.knowledgeCut,
    checkpoint:{...cp,placement:{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}}}}));
  value(await repo.confirm(scope,value(prepareCommand(value(await repo.preview(scope,command))))));
  const accounts=await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner));expect(accounts).toHaveLength(1);
  expect(accounts[0]).toMatchObject({id:accountId,displayName:'Synthetic legacy name',aggregateRevision:2n,recordedSeq:2n});
  expect((await db.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.ownerUserId,f.owner)))[0].outstandingCents).toBe(5400n);
});
it('HB20-A09 ambiguous discovery refuses without creating or repairing an account',async()=>{
  const f=await fixture(),review=value(prepareCommand(value(await f.repo.preview(f.owner,f.command))));
  await db.db.insert(s.accounts).values([1,2].map(i=>({id:randomUUID(),ownerUserId:f.owner,displayName:'Synthetic existing '+i})));
  const before=await snapshot(f.owner);expect(await f.repo.confirm(f.owner,review)).toMatchObject({ok:false,code:'ACCOUNT_SELECTION_REQUIRED'});
  expect(await snapshot(f.owner)).toEqual(before);
});
it('HB20-A01 storage failures remain errors rather than proved absence',async()=>{
  const f=await fixture(),closed=createDatabase(testUrl);await closed.close();const repository=createOnboardingRepository(closed);
  expect(await repository.preview(f.owner,f.command)).toEqual({ok:false,code:'STORAGE_ERROR'});
  expect(await repository.status(f.owner,f.command.requestId)).toEqual({ok:false,code:'STORAGE_ERROR'});
  expect(await f.repo.status(f.owner,f.command.requestId)).toEqual({ok:true,value:null});
});
it.each(['sum','negative','duplicate','fraction','overflow','date','future','instant','consent','bigint'] as const)(
  'HB20-A03 invalid %s rolls back the entire first confirmation with exact no-write oracle',async mode=>{
    const f=await fixture(),review=value(await f.repo.preview(f.owner,f.command)) as unknown as {payload:{review:unknown}};
    const raw=f.command.payload as Record<string,unknown>,cp=raw.checkpoint as Record<string,unknown>,period=f.command.effectiveDate.slice(0,7);
    let draft:Record<string,unknown>&{checkpoint:Record<string,unknown>}={...raw,checkpoint:{...cp}};
    if(mode==='sum')draft.checkpoint.balanceCents='90000';
    if(mode==='negative')draft.checkpoint.allocations=[{period,amountCents:'-1'}];
    if(mode==='duplicate')draft.checkpoint.allocations=[{period,amountCents:'50000'},{period,amountCents:'50000'}];
    if(mode==='fraction')draft.checkpoint.balanceCents='100000.5';
    if(mode==='bigint')draft.checkpoint.balanceCents=100000n;
    if(mode==='overflow')draft.checkpoint.balanceCents='9223372036854775808';
    if(mode==='date')draft.checkpoint.observedDate='2026-02-30';
    if(mode==='future')draft={...draft,effectiveDate:'9999-12-31',checkpoint:{...draft.checkpoint,observedDate:'9999-12-31'}};
    if(mode==='instant')draft.checkpoint.observedAt='2026-01-01T00:00:00Z';
    if(mode==='consent')draft={...draft,completeVectorConfirmed:false};
    const invalid=value(prepareCommand({...f.command,effectiveDate:draft.effectiveDate,payload:{schemaVersion:1,draft,review:review.payload.review,proposalId:null}})),
      before=await snapshot(f.owner);
    expect(await f.repo.confirm(f.owner,invalid)).toMatchObject({ok:false});expect(await snapshot(f.owner)).toEqual(before);
  });


it('HB20-A05 shared owner/account lock order prevents first-confirmation replay versus ordinary-write FK deadlock',async()=>{
  const f=await fixture(),initial=value(prepareCommand(value(await f.repo.preview(f.owner,f.command)))),receipt=value(await f.repo.confirm(f.owner,initial));
  const [account]=await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner)),scope={ownerUserId:f.owner,accountId:account.id},
    repository=createBudgetRepository(db),seed=value(await repository.load(scope)) as unknown as {revision:string;knowledgeCut:string;baseCheckpointId:string;baseVectorId:string;placement:{id:string;afterPositionId:string}};
  const day=f.command.effectiveDate,cp={...checkpoint(day,'90000',{[day.slice(0,7)]:'90000'}),placement:{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}};
  const ordinary=value(prepareCommand(value(await repository.preview(scope,value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:day,
    reason:'Synthetic actual subsequent observation',payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,
      effectiveDate:day,checkpoint:cp,allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}}))))));
  const clients=[new pg.Client({connectionString:testUrl}),new pg.Client({connectionString:testUrl})];await Promise.all(clients.map(c=>c.connect()));
  const pids=await Promise.all(clients.map(async c=>(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid));expect(new Set(pids).size).toBe(2);
  let enter!:()=>void,release!:()=>void,paused=false;const ready=new Promise<void>(r=>{enter=r;}),wait=new Promise<void>(r=>{release=r;}),query=clients[0].query.bind(clients[0]);
  Object.defineProperty(clients[0],'query',{value:async(...args:unknown[])=>{
    const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'',result=await Reflect.apply(query,clients[0],args);
    if(!paused&&typeof text==='string'&&text.includes('from "accounts"')&&text.includes('for update')){paused=true;enter();await wait;}return result;
  }});
  const write=createBudgetRepository({db:drizzle(clients[0],{schema:s})}).confirm(scope,ordinary);await ready;
  const replay=createOnboardingRepository({db:drizzle(clients[1],{schema:s})}).confirm(f.owner,initial);
  try{
    let overlap=false;for(let i=0;i<150;i++){const r=await admin.query('SELECT $1::int=ANY(pg_blocking_pids($2::int)) blocked',[pids[0],pids[1]]);
      if(r.rows[0].blocked){overlap=true;break;}await new Promise(r=>setTimeout(r,10));}
    expect(overlap).toBe(true);
  }finally{release();}
  try{
    const results=await Promise.all([write,replay]);expect(results[0].ok).toBe(true);expect(results[1]).toEqual({ok:true,value:receipt});
    const saved=await repository.load(scope);expect(saved).toMatchObject({ok:true,value:{revision:'2',bank:{balanceCents:'90000'}}});
    expect(await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner))).toHaveLength(1);
  }finally{await Promise.all(clients.map(c=>c.end()));}
});


it.each(['verification','binding'])('HB20-A03 revalidates revoked %s under the owner lock without account creation',async field=>{
  const f=await fixture(),review=value(prepareCommand(value(await f.repo.preview(f.owner,f.command))));
  await db.db.update(s.users).set(field==='verification'?{emailVerified:false}:{googleSubject:null}).where(eq(s.users.id,f.owner));
  const before=await snapshot(f.owner);expect(await f.repo.confirm(f.owner,review)).toMatchObject({ok:false,code:'FORBIDDEN'});expect(await snapshot(f.owner)).toEqual(before);
});


it('HB20-A05 HB20-A06 rollback winner permits a different reviewed key; another owner proceeds independently',async()=>{
  const f=await fixture(),other=await fixture(),raw=f.command.payload as Record<string,unknown>,day=f.command.effectiveDate;
  const a=value(prepareCommand(value(await f.repo.preview(f.owner,f.command))));
  const secondInput=value(prepareCommand({...f.command,requestId:randomUUID(),payload:{...raw,checkpoint:checkpoint(day,'90000',{[day.slice(0,7)]:'90000'})}}));
  const b=value(prepareCommand(value(await f.repo.preview(f.owner,secondInput))));
  const independent=value(prepareCommand(value(await other.repo.preview(other.owner,other.command))));
  await db.db.execute(sql.raw("CREATE FUNCTION hb020_race_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_setting('hb020.synthetic_failure',true)='yes' THEN RAISE EXCEPTION 'HB020_SYNTHETIC_RACE_ROLLBACK' USING ERRCODE='23514'; END IF; RETURN NEW; END $$"));
  await db.db.execute(sql.raw('CREATE TRIGGER hb020_race_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION hb020_race_failure()'));
  const clients=[new pg.Client({connectionString:testUrl}),new pg.Client({connectionString:testUrl})];await Promise.all(clients.map(c=>c.connect()));
  const pids=await Promise.all(clients.map(async c=>(await c.query('SELECT pg_backend_pid() pid')).rows[0].pid));expect(new Set(pids).size).toBe(2);
  await clients[0].query("SELECT set_config('hb020.synthetic_failure',$1,false)",['yes']);
  let enter!:()=>void,release!:()=>void,paused=false;const ready=new Promise<void>(r=>{enter=r;}),wait=new Promise<void>(r=>{release=r;}),query=clients[0].query.bind(clients[0]);
  Object.defineProperty(clients[0],'query',{value:async(...args:unknown[])=>{
    const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'',result=await Reflect.apply(query,clients[0],args);
    if(!paused&&typeof text==='string'&&text.includes('from "users"')&&text.includes('for update')){paused=true;enter();await wait;}return result;
  }});
  const first=createOnboardingRepository({db:drizzle(clients[0],{schema:s})}).confirm(f.owner,a);await ready;
  const second=createOnboardingRepository({db:drizzle(clients[1],{schema:s})}).confirm(f.owner,b);
  try{
    let overlap=false;for(let i=0;i<150;i++){const r=await admin.query('SELECT $1::int=ANY(pg_blocking_pids($2::int)) blocked',[pids[0],pids[1]]);
      if(r.rows[0].blocked){overlap=true;break;}await new Promise(r=>setTimeout(r,10));}
    expect(overlap).toBe(true);expect(await f.repo.status(f.owner,a.requestId)).toEqual({ok:true,value:null});
    expect((await other.repo.confirm(other.owner,independent)).ok).toBe(true);
  }finally{release();}
  try{
    const result=await Promise.all([first,second]);expect(result[0]).toMatchObject({ok:false,code:'TRANSACTION_FAILED'});expect(result[1].ok).toBe(true);
    const saved=await snapshot(f.owner);expect(saved.accounts).toHaveLength(1);expect(saved.budget_updates).toHaveLength(1);expect(saved.balance_checkpoints).toHaveLength(1);
    const [update]=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.ownerUserId,f.owner));expect(update.requestId).toBe(b.requestId);
    expect((await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.ownerUserId,f.owner)))[0].balanceCents).toBe(90000n);
    expect(await f.repo.confirm(f.owner,a)).toMatchObject({ok:false,code:'ALREADY_INITIALIZED'});expect(await snapshot(f.owner)).toEqual(saved);
  }finally{
    await Promise.all(clients.map(c=>c.end()));await db.db.execute(sql.raw('DROP TRIGGER hb020_race_failure ON audit_events'));await db.db.execute(sql.raw('DROP FUNCTION hb020_race_failure()'));
  }
});


it('HB20-A07 first confirmation stores B100000 A(P70000,Q30000), future cash isolated, one real checkpoint',async()=>{
  const f=await fixture(),cal=transitionCalendar(f.command.effectiveDate),raw=f.command.payload as Record<string,unknown>,
    command=value(prepareCommand({...f.command,payload:{...raw,checkpoint:checkpoint(f.command.effectiveDate,'100000',{[cal.target]:'70000',[cal.future]:'30000'})}}));
  const receipt=value(await f.repo.confirm(f.owner,value(prepareCommand(value(await f.repo.preview(f.owner,command))))));
  const [account]=await db.db.select().from(s.accounts).where(eq(s.accounts.ownerUserId,f.owner)),scope={ownerUserId:f.owner,accountId:account.id},
    source=value(await createProjectionRepository(db).read(scope)),projected=value(projectAccount(source.snapshot,source.asOfDate));
  expect(projected).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:100000n,observedDate:f.command.effectiveDate},currentLiquidity:{safeAvailable:70000n}});
  if(projected.kind!=='ACCOUNT_ESTIMATE')throw Error('MISSING_PROJECTION');
  expect(projected.periods.find(p=>p.period===cal.target)).toMatchObject({allocated:70000n,reserved:0n,savings:0n,free:70000n});
  expect(projected.periods.find(p=>p.period===cal.future)).toMatchObject({allocated:30000n,reserved:0n,savings:0n,free:30000n});
  const rows=await snapshot(f.owner);expect(rows.budget_updates).toHaveLength(1);expect(rows.balance_checkpoints).toHaveLength(1);expect(rows.allocation_revisions).toHaveLength(1);
  expect(value(await f.repo.status(f.owner,command.requestId))).toEqual(receipt);
});

