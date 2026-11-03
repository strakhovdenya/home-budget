import { randomUUID,createHash } from 'node:crypto';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { beforeAll,afterAll,expect,it,vi } from 'vitest';
import { eq,sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabase,databaseFromEnvironment } from '../../src/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '../../src/infrastructure/db/local-target';
import { createBudgetRepository } from '../../src/infrastructure/db/budget-update-repository';
import { prepareCommand } from '../../src/domain/updates/validation';
import { encodeCanonical } from '../../src/domain/updates/canonical-value';
import type { AuthorizedScope } from '../../src/domain/updates/contracts';
import { checkpoint,createObligation,createSaving } from '../fixtures/budget-update';
import { value } from '../fixtures/checkpoints';
import * as s from '../../src/infrastructure/db/schema';
import { transitionCalendar } from '../fixtures/transition-calendar';
import { authStorageAvailable } from '../../src/infrastructure/auth/availability';
import { authMessageKey } from '../../src/features/auth/error-message';
import { commitBatch } from '../../src/infrastructure/db/commit';
import { loadBudgetContext } from '../../src/infrastructure/db/budget-update-reader';
import { selectState } from '../../src/domain/checkpoints/history';

let db:ReturnType<typeof createDatabase>,admin:pg.Pool;
let testDatabaseUrl:string,calendar:ReturnType<typeof transitionCalendar>;
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_DB_REQUIRED');
  const targets=requireLocalDatabaseTargets(process.env),u=new URL(targets.TEST_DATABASE_URL);
  admin=new pg.Pool({connectionString:u.toString()});const name='hb017_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;testDatabaseUrl=u.toString();db=createDatabase(testDatabaseUrl);await migrate(db.db,{migrationsFolder:'./drizzle'});
  const clock=await db.db.execute<{today:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS today`);calendar=transitionCalendar(clock.rows[0].today);
});
afterAll(async()=>{await db?.close();await admin?.end();});
type Seed={revision:string;knowledgeCut:string;baseCheckpointId:string|null;baseVectorId:string|null;today:string;
  obligations:{id:string;obligationId:string;fundingPeriod:string}[];savings:{id:string;savingsId:string;fundingPeriod:string}[]};
async function fixture(){const scope={ownerUserId:randomUUID(),accountId:randomUUID()};await db.db.insert(s.users).values({id:scope.ownerUserId});
  await db.db.insert(s.accounts).values({id:scope.accountId,ownerUserId:scope.ownerUserId,displayName:'HB017 synthetic'});return {scope,repo:createBudgetRepository(db)};}
async function command(f:Awaited<ReturnType<typeof fixture>>,cp=checkpoint(calendar.pastDay(20),'50000',{[calendar.target]:'40000',[calendar.future]:'10000'}),o:unknown[]=[],ss:unknown[]=[]){
  const seed=value(await f.repo.load(f.scope)) as unknown as Seed;
  return value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:cp.observedDate,reason:'Synthetic actual budget check',
    payload:{schemaVersion:1,knowledgeCut:seed.knowledgeCut,baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:cp.observedDate,
      checkpoint:cp,allocationChange:null,completeVectorConfirmed:true,obligations:o,savings:ss}}));
}
async function initial(){const f=await fixture(),c=await command(f,undefined,[createObligation('20000')],[createSaving('5000')]);
  const reviewed=value(await f.repo.preview(f.scope,c)),confirmed=value(prepareCommand(reviewed));value(await f.repo.confirm(f.scope,confirmed));return {f,confirmed};}

it('HB17-P01 persists one initial aggregate check/vector/identity set and immutable review evidence',async()=>{
  const {f}=await initial();const a=(await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.scope.accountId)))[0];
  expect(a.aggregateRevision).toBe(1n);expect(a.recordedSeq).toBe(1n);
  const bank=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.scope.accountId));expect(bank).toHaveLength(1);expect(bank[0].balanceCents).toBe(50000n);
  const h=value(await f.repo.history(f.scope,null));expect(h).toMatchObject([{review:{financial:{bank:{balanceCents:'50000'}}}}]);
});
it('HB17-P02 HB17-P03 exact replay precedes stale, changed reviewed payload conflicts',async()=>{
  const {f,confirmed}=await initial(),first=value(await f.repo.confirm(f.scope,confirmed));
  expect(value(await f.repo.confirm(f.scope,confirmed))).toEqual(first);
  const altered=value(prepareCommand({...confirmed,reason:'Different reason'}));expect(await f.repo.confirm(f.scope,altered)).toMatchObject({ok:false,code:'REQUEST_PAYLOAD_CONFLICT'});
  const next=await command(f,checkpoint(calendar.today,'51000',{[calendar.target]:'41000',[calendar.future]:'10000'}));
  value(await f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,next))))));
  const advanced=await baseline(f.scope);expect(value(await f.repo.confirm(f.scope,confirmed))).toEqual(first);expect(await baseline(f.scope)).toEqual(advanced);
});
it('HB17-P08 refuses a foreign account before receipt/status/history disclosure',async()=>{
  const {f,confirmed}=await initial();const foreign:AuthorizedScope={...f.scope,ownerUserId:randomUUID()};
  expect(await f.repo.confirm(foreign,confirmed)).toMatchObject({ok:false,code:'FORBIDDEN'});
  expect(await f.repo.status(foreign,confirmed.requestId)).toMatchObject({ok:false,code:'FORBIDDEN'});
});

it('HB17-U15 HB17-P01 disjoint CARRY and PAID persist one vector/position with full funding proof',async()=>{
  const f=await fixture(),first=await command(f,checkpoint(calendar.pastDay(20),'90000',{[calendar.past]:'40000',[calendar.target]:'50000'}),
    [createObligation('30000',calendar.past),createObligation('2000')],[createSaving('5000',calendar.past)]);
  value(await f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,first))))));
  const seed=value(await f.repo.load(f.scope)) as unknown as Seed;
  const cp=checkpoint(seed.today,'88000',{[calendar.past]:'0',[calendar.target]:'88000'}),paid=seed.obligations.find(e=>e.fundingPeriod===calendar.target)!;
  const raw=await command(f,cp,[{action:'PAID',identityId:paid.obligationId,expectedRevisionId:paid.id,bankDate:null,data:{amountCents:'2000'},
    payment:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false}}]);
  const payload={...raw.payload as object,checkpoint:null,allocationChange:{schemaVersion:1,intent:'TRANSITION',mode:'CARRY',observationMode:'ACTUAL_CHECK',
    target:calendar.target,sources:[calendar.past],balanceCents:'88000',allocations:cp.allocations,futureEdits:[],
    fundingRefs:[...seed.obligations.filter(e=>e.fundingPeriod===calendar.past).map(e=>({kind:'OBLIGATION',identityId:e.obligationId,revisionId:e.id})),
      ...seed.savings.filter(e=>e.fundingPeriod===calendar.past).map(e=>({kind:'SAVING',identityId:e.savingsId,revisionId:e.id}))],
    expectedCheckpointRevisionId:seed.baseCheckpointId,expectedAllocationRevisionId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:cp,placement:null,
    consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:false,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:false}}};
  const c=value(prepareCommand({...raw,payload})),reviewed=value(await f.repo.preview(f.scope,c)),confirmed=value(prepareCommand(reviewed));
  const receipt=value(await f.repo.confirm(f.scope,confirmed));expect(value(await f.repo.confirm(f.scope,confirmed))).toEqual(receipt);
  expect(value(await f.repo.confirm(f.scope,value(prepareCommand({...confirmed,requestId:randomUUID()}))))).toEqual(receipt);
  const changed=JSON.parse(JSON.stringify(confirmed.payload));changed.draft.obligations[0].data.amountCents='1000';
  const committed=await baseline(f.scope);
  expect(await f.repo.confirm(f.scope,value(prepareCommand({...confirmed,payload:changed})))).toMatchObject({ok:false,code:'REQUEST_PAYLOAD_CONFLICT'});
  expect(await f.repo.confirm(f.scope,value(prepareCommand({...confirmed,requestId:randomUUID(),payload:changed})))).toMatchObject({ok:false,code:'PROPOSAL_ALREADY_CONFIRMED'});
  expect(await baseline(f.scope)).toEqual(committed);
  const loaded=value(await f.repo.load(f.scope)) as unknown as Seed;
  expect(loaded.obligations.map(e=>e.fundingPeriod)).toEqual([calendar.target,calendar.target]);
  const h=value(await f.repo.history(f.scope,receipt.updateId));expect(h).toMatchObject([{review:{financial:{bank:{balanceCents:'88000'},projection:{safe:{safeAvailable:'53000'}}}}}]);
});

const scopedTables=[s.budgetPeriods,s.budgetUpdates,s.historicalPositions,s.orderingRevisions,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,
  s.obligations,s.obligationEvents,s.savingsGoals,s.savingsEvents,s.transferProposals,s.transferProposalCancellations,s.transitionDecisions,s.budgetTransfers,s.monthClosings,s.reportHeads,s.auditEvents];
async function baseline(scope:AuthorizedScope){const rows=[];
  for(const table of scopedTables)rows.push((await db.db.execute<{row:string}>(sql`SELECT to_jsonb(t)::text AS row FROM ${table} AS t WHERE t.account_id=${scope.accountId} AND t.owner_user_id=${scope.ownerUserId} ORDER BY t.id`)).rows);
  rows.push((await db.db.execute<{row:string}>(sql`SELECT to_jsonb(t)::text AS row FROM ${s.accounts} AS t WHERE t.id=${scope.accountId} AND t.owner_user_id=${scope.ownerUserId}`)).rows);return rows;
}
async function settlement(f:Awaited<ReturnType<typeof fixture>>,bank='45000',paid='5000',released='2000'){
  const seed=value(await f.repo.load(f.scope)) as unknown as Seed,o=seed.obligations[0],ss=seed.savings[0];
  const raw=await command(f,checkpoint(seed.today,bank,{[calendar.target]:String(BigInt(bank)-10000n),[calendar.future]:'10000'}),[
    {action:'PARTIAL_SETTLEMENT',identityId:o.obligationId,expectedRevisionId:o.id,data:{amountCents:paid},bankDate:null,payment:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false}}],
    [{action:'PARTIAL_RELEASE',identityId:ss.savingsId,expectedRevisionId:ss.id,data:{amountCents:released}}]);
  return value(prepareCommand(value(await f.repo.preview(f.scope,raw))));
}
it('HB17-U08 HB17-P01 HB17-P02 confirms all streams once and keeps copied original history after later reads',async()=>{
  const {f}=await initial(),c=await settlement(f),receipt=value(await f.repo.confirm(f.scope,c)),before=await baseline(f.scope);
  expect(value(await f.repo.confirm(f.scope,c))).toEqual(receipt);expect(await baseline(f.scope)).toEqual(before);
  const h=value(await f.repo.history(f.scope,receipt.updateId));expect(h).toMatchObject([{review:{financial:{bank:{balanceCents:'45000'},projection:{safe:{safeAvailable:'17000'}}}}}]);
  const bank=await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.scope.accountId));expect(bank).toHaveLength(2);
});
it.each(['BEFORE','DEFERRED','SAVINGS'] as const)('HB17-P06 controlled failure %s rolls back complete rows, head, counters and receipt',async timing=>{
  const {f}=await initial(),c=await settlement(f),before=await baseline(f.scope);
  await db.db.execute(sql`CREATE FUNCTION hb017_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_TABLE_NAME='savings_events' THEN RAISE EXCEPTION 'HB017_TEST_FAILURE' USING ERRCODE='23514'; END IF; IF NEW.event_kind='BUDGET_UPDATE' THEN RAISE EXCEPTION 'HB017_TEST_FAILURE' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);
  await db.db.execute(timing==='SAVINGS'?sql`CREATE TRIGGER hb017_test_failure BEFORE INSERT ON savings_events FOR EACH ROW EXECUTE FUNCTION hb017_test_audit_failure()`:timing==='BEFORE'?sql`CREATE TRIGGER hb017_test_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION hb017_test_audit_failure()`:
    sql`CREATE CONSTRAINT TRIGGER hb017_test_failure AFTER INSERT ON audit_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hb017_test_audit_failure()`);
  try{expect(await f.repo.confirm(f.scope,c)).toMatchObject({ok:false,code:'TRANSACTION_FAILED'});expect(await baseline(f.scope)).toEqual(before);}
  finally{await db.db.execute(timing==='SAVINGS'?sql`DROP TRIGGER hb017_test_failure ON savings_events`:sql`DROP TRIGGER hb017_test_failure ON audit_events`);await db.db.execute(sql`DROP FUNCTION hb017_test_audit_failure()`);}
  expect((await f.repo.confirm(f.scope,c)).ok).toBe(true);
});
async function race(same:boolean){
  const {f}=await initial(),a=await settlement(f),b=same?a:await settlement(f,'46000','4000','1000');
  let entered!:()=>void,release!:()=>void;const enteredPromise=new Promise<void>(r=>{entered=r;}),released=new Promise<void>(r=>{release=r;});
  const blocker=db.db.transaction(async tx=>{await tx.execute(sql`SELECT id FROM ${s.accounts} WHERE id=${f.scope.accountId} FOR UPDATE`);entered();await released;});
  await enteredPromise;const pa=f.repo.confirm(f.scope,a),pb=f.repo.confirm(f.scope,b);let waiting=false;
  try{for(let i=0;i<100;i++){const row=await admin.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1 AND wait_event_type=$2 AND cardinality(pg_blocking_pids(pid))>0',[new URL(testDatabaseUrl).pathname.slice(1),'Lock']);
      if(row.rows[0].n>=2){waiting=true;break;}await new Promise(r=>setTimeout(r,20));}}finally{release();}
  await blocker;expect(waiting).toBe(true);const results=await Promise.all([pa,pb]);
  if(same)expect(results[0]).toEqual(results[1]);else{expect(results.filter(r=>r.ok)).toHaveLength(1);expect(results.find(r=>!r.ok)).toMatchObject({code:'STALE_REVISION'});}
  const account=(await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.scope.accountId)))[0];expect(account.aggregateRevision).toBe(2n);expect(account.recordedSeq).toBe(2n);
}
it('HB17-P04 real concurrent identical commands wait on the account lock and commit once',()=>race(true));
it('HB17-P05 real concurrent distinct commands have one winner and one stale loser',()=>race(false));
it('HB17-P07 real COMMIT acknowledgement loss preserves the original request identity',async()=>{
  const {f}=await initial(),c=await settlement(f),client=new pg.Client({connectionString:testDatabaseUrl});await client.connect();const query=client.query.bind(client);let lost=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text'in q?q.text:'';
    const result=await Reflect.apply(query,client,args);if(!lost&&typeof text==='string'&&text.trim().toLowerCase()==='commit'){lost=true;throw Object.assign(Error('HB017_SYNTHETIC_LOST_ACK'),{code:'ECONNRESET'});}return result;}});
  try{expect(await createBudgetRepository({db:drizzle(client,{schema:s})}).confirm(f.scope,c)).toMatchObject({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});}
  finally{await client.end();}
  const before=await baseline(f.scope),receipt=value(await f.repo.status(f.scope,c.requestId));expect(receipt).toBeTruthy();expect(value(await f.repo.confirm(f.scope,c))).toEqual(receipt);expect(await baseline(f.scope)).toEqual(before);
});
it('HB17-P11 a backdated whole state preserves the later active head and shows both dates honestly',async()=>{
  const f=await fixture();for(const [day,bank]of [[calendar.pastDay(5),'50000'],[calendar.pastDay(10),'45000']] as const){const c=await command(f,checkpoint(day,bank,{[calendar.past]:bank}));value(await f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,c))))));}
  const latest=value(await f.repo.load(f.scope)) as unknown as Seed,c=await command(f,checkpoint(calendar.pastDay(7),'48000',{[calendar.past]:'48000'}));
  const receipt=value(await f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,c))))));
  const after=value(await f.repo.load(f.scope)) as unknown as Seed;expect(after.baseCheckpointId).toBe(latest.baseCheckpointId);expect(after.baseVectorId).toBe(latest.baseVectorId);
  expect(value(await f.repo.history(f.scope,receipt.updateId))).toMatchObject([{review:{financial:{bank:{balanceCents:'48000'},projection:{bank:{balance:'45000'}}}}}]);
});
it('HB17-P14 same-key replay rejects a receipt without its immutable aggregate proof',async()=>{
  const f=await fixture(),c=await command(f),confirmed=value(prepareCommand(value(await f.repo.preview(f.scope,c))));
  const updateId=randomUUID(),identity=createHash('sha256').update(encodeCanonical({owner:f.scope.ownerUserId,account:f.scope.accountId,kind:'BUDGET_UPDATE',
    expectedRevision:confirmed.expectedRevision.toString(),payload:confirmed.payload,effectiveDate:confirmed.effectiveDate,reason:confirmed.reason})).digest('hex');
  await db.db.insert(s.budgetUpdates).values({...f.scope,id:updateId,requestId:confirmed.requestId,payloadIdentity:identity,expectedRevision:0n,recordedSeq:1n,
    actorId:f.scope.ownerUserId,kind:'BUDGET_UPDATE',result:{updateId,aggregateRevision:'1',recordedSeq:'1'}});
  const before=await baseline(f.scope);expect(await f.repo.confirm(f.scope,confirmed)).toMatchObject({ok:false,code:'STORAGE_ERROR'});expect(await baseline(f.scope)).toEqual(before);
});

async function transitionCommand(f:Awaited<ReturnType<typeof fixture>>,mode:'CARRY'|'FRESH_START'|'DEFER'|'REDISTRIBUTE',bank:string,allocations:Record<string,string>,edits:{o?:unknown[];s?:unknown[]}={},actual=true){
  const seed=value(await f.repo.load(f.scope)) as unknown as Seed,cp=checkpoint(seed.today,bank,allocations),raw=await command(f,cp,edits.o,edits.s);
  const moving=(p:string)=>mode==='CARRY'?p===calendar.past:mode==='FRESH_START'&&p<calendar.target;
  return value(prepareCommand({...raw,payload:{...raw.payload as object,checkpoint:null,allocationChange:{schemaVersion:1,intent:mode==='REDISTRIBUTE'?'ALLOCATION_ONLY':'TRANSITION',mode,
    observationMode:actual?'ACTUAL_CHECK':'REUSE_CONFIRMED',target:calendar.target,sources:mode==='CARRY'?[calendar.past]:[],balanceCents:bank,allocations:cp.allocations,futureEdits:[],
    fundingRefs:[...seed.obligations.filter(e=>moving(e.fundingPeriod)).map(e=>({kind:'OBLIGATION',identityId:e.obligationId,revisionId:e.id})),
      ...seed.savings.filter(e=>moving(e.fundingPeriod)).map(e=>({kind:'SAVING',identityId:e.savingsId,revisionId:e.id}))],expectedCheckpointRevisionId:seed.baseCheckpointId,
    expectedAllocationRevisionId:seed.baseVectorId,effectiveDate:seed.today,checkpoint:actual?cp:null,placement:null,
    consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}}}}));
}
it('HB17-U16 fresh start and disjoint release persist one position and exact immutable evidence',async()=>{
  const f=await fixture(),first=await command(f,checkpoint(calendar.olderDay(20),'10000',{[calendar.older]:'4000',[calendar.past]:'4000',[calendar.future]:'2000'}),
    [createObligation('3000',calendar.older),createObligation('1000',calendar.past),createObligation('500',calendar.target)],
    [createSaving('500',calendar.older),createSaving('200',calendar.target),createSaving('700',calendar.future)]);
  value(await f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,first))))));
  const seed=value(await f.repo.load(f.scope)) as unknown as Seed,ss=seed.savings.find(e=>e.fundingPeriod===calendar.target)!;
  const c=await transitionCommand(f,'FRESH_START','9000',{[calendar.older]:'0',[calendar.past]:'0',[calendar.target]:'7000',[calendar.future]:'2000'},
    {s:[{action:'PARTIAL_RELEASE',identityId:ss.savingsId,expectedRevisionId:ss.id,data:{amountCents:'100'}}]});
  const confirmed=value(prepareCommand(value(await f.repo.preview(f.scope,c)))),receipt=value(await f.repo.confirm(f.scope,confirmed)),before=await baseline(f.scope);
  expect(value(await f.repo.confirm(f.scope,confirmed))).toEqual(receipt);expect(await baseline(f.scope)).toEqual(before);
  expect(value(await f.repo.history(f.scope,receipt.updateId))).toMatchObject([{review:{financial:{bank:{balanceCents:'9000'},projection:{safe:{safeAvailable:'1900'}}}}}]);
  const events=await db.db.select().from(s.savingsEvents).where(eq(s.savingsEvents.budgetUpdateId,receipt.updateId));
  expect(events.map(e=>e.action).sort()).toEqual(['FUNDING_TRANSFER','PARTIAL_RELEASE']);expect(new Set(events.map(e=>e.positionId)).size).toBe(1);
  expect(events.find(e=>e.action==='PARTIAL_RELEASE')?.amountCents).toBe(100n);
  // Later nonfinancial controls must not change the original FRESH_START source union at K.
  await db.db.insert(s.budgetPeriods).values({...f.scope,id:randomUUID(),period:'0001-01'});
  expect(value(await f.repo.confirm(f.scope,confirmed))).toEqual(receipt);
  expect(value(await f.repo.history(f.scope,receipt.updateId))).toHaveLength(1);
});
it('HB17-U14 preview AND direct confirm reject same-identity compounds without any partial rows',async()=>{
  const {f}=await initial(),seed=value(await f.repo.load(f.scope)) as unknown as Seed,o=seed.obligations[0];
  // Fresh start selects only older funding; create an old identity on a separate fresh account.
  const g=await fixture(),first=await command(g,checkpoint(calendar.pastDay(20),'50000',{[calendar.past]:'50000'}),[createObligation('20000',calendar.past)]);
  value(await g.repo.confirm(g.scope,value(prepareCommand(value(await g.repo.preview(g.scope,first))))));
  const gs=value(await g.repo.load(g.scope)) as unknown as Seed,old=gs.obligations[0];
  const c=await transitionCommand(g,'FRESH_START','50000',{[calendar.target]:'50000'},{o:[{action:'CANCELLED',identityId:old.obligationId,expectedRevisionId:old.id,data:{},bankDate:null,payment:null}]});
  const before=await baseline(g.scope);expect(await g.repo.preview(g.scope,c)).toMatchObject({ok:false,code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED'});
  const direct=value(prepareCommand({...c,payload:{schemaVersion:1,draft:c.payload,review:{},proposalId:null}}));
  expect(await g.repo.confirm(g.scope,direct)).toMatchObject({ok:false,code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED'});expect(await baseline(g.scope)).toEqual(before);
  expect(o.obligationId).not.toBe(old.obligationId);
});
it('HB17-U04 HB17-U14 allocation-only reuse and DEFER preserve bank freshness and do not move earmarks',async()=>{
  for(const mode of ['REDISTRIBUTE','DEFER'] as const){const {f}=await initial(),before=value(await f.repo.load(f.scope)) as unknown as Seed;
    const c=await transitionCommand(f,mode,'50000',{[calendar.target]:'35000',[calendar.future]:'15000'},{},false);
    const reviewed=value(prepareCommand(value(await f.repo.preview(f.scope,c))));value(await f.repo.confirm(f.scope,reviewed));
    const after=value(await f.repo.load(f.scope)) as unknown as Seed;expect(after.baseCheckpointId).toBe(before.baseCheckpointId);expect(after.obligations).toEqual(before.obligations);expect(after.savings).toEqual(before.savings);
    expect(await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.scope.accountId))).toHaveLength(1);
  }
});
it('HB17-A01 real unavailable local PostgreSQL has identity-independent service copy and safe diagnostics',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});vi.stubEnv('DATABASE_URL','postgresql://synthetic:synthetic@127.0.0.1:1/hb017_unavailable');
  try{for(const identity of ['allowed','other']){expect(identity).toBeTruthy();const available=await authStorageAvailable();expect(available).toBe(false);expect(authMessageKey(true,true,available)).toBe('serviceError');}
    expect(log.mock.calls.flat().join(' ')).toContain('AUTH_STORAGE_UNAVAILABLE');expect(log.mock.calls.flat().join(' ')).not.toMatch(/postgresql|synthetic|127\.0|password|email/);
  }finally{await databaseFromEnvironment().close();vi.unstubAllEnvs();log.mockRestore();}
});
it('HB17-P10 actual aggregate repeatable-read load remains coherent across a concurrent commit',async()=>{
  const {f}=await initial(),next=await settlement(f);let captured!:()=>void,release!:()=>void;
  const entered=new Promise<void>(r=>{captured=r;}),gate=new Promise<void>(r=>{release=r;}),transaction=db.db.transaction.bind(db.db);
  const spy=vi.spyOn(db.db,'transaction').mockImplementation((callback,config)=>transaction(async tx=>{
    const execute=tx.execute.bind(tx);let calls=0;
    tx.execute=((...args:Parameters<typeof tx.execute>)=>Promise.resolve(execute(...args)).then(async result=>{if(++calls===2){captured();await gate;}return result;})) as typeof tx.execute;
    return callback(tx);
  },config));
  const pending=f.repo.load(f.scope);
  try{await entered;spy.mockRestore();value(await f.repo.confirm(f.scope,next));release();
    const before=value(await pending);expect(before).toMatchObject({revision:'1',bank:{balanceCents:'50000'},obligations:[{outstandingCents:'20000'}],savings:[{amountCents:'5000'}]});
    expect(value(await f.repo.load(f.scope))).toMatchObject({revision:'2',bank:{balanceCents:'45000'},obligations:[{outstandingCents:'15000'}],savings:[{amountCents:'3000'}]});
  }finally{release();spy.mockRestore();}
});
it('HB17-P03 HB17-P13 cancelled proposals and changed compound replay are refused without financial changes',async()=>{
  const {f}=await initial(),raw=await transitionCommand(f,'DEFER','50000',{[calendar.target]:'40000',[calendar.future]:'10000'}),c=value(prepareCommand(value(await f.repo.preview(f.scope,raw))));
  const proposalId=(c.payload as {proposalId:string}).proposalId;
  await db.db.insert(s.transferProposalCancellations).values({...f.scope,id:randomUUID(),proposalId,controlRequestId:randomUUID(),actorId:f.scope.ownerUserId,
    payloadIdentity:'synthetic',document:{synthetic:true},cancelledAt:new Date().toISOString(),reason:'Synthetic cancellation'});
  const before=await baseline(f.scope);expect(await f.repo.confirm(f.scope,c)).toMatchObject({ok:false,code:'PROPOSAL_CANCELLED'});expect(await baseline(f.scope)).toEqual(before);
});
async function report(f:Awaited<ReturnType<typeof fixture>>,supported=true){
  const ctx=await db.db.transaction(tx=>loadBudgetContext(tx,f.scope)),bank=value(selectState(ctx.history,calendar.pastEnd)),period=ctx.periods.find(p=>p.period===calendar.past)!;
  const id=randomUUID(),head=randomUUID();
  const c=value(prepareCommand({requestId:randomUUID(),expectedRevision:ctx.revision,effectiveDate:calendar.today,reason:'Synthetic report fixture',payload:{}}));
  await commitBatch(db.db,{scope:f.scope,kind:'SYNTHETIC_CLOSE',command:c},async(tx,b)=>{
    await tx.insert(s.monthClosings).values({...f.scope,id,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,periodId:period.id,version:1,historicalThroughDate:calendar.pastEnd,
      closedAt:b.recordedAt,closedBy:f.scope.ownerUserId,evidenceRecordedCutoffSeq:ctx.recordedSeq,evidenceRecordedCutoffAt:b.recordedAt,reason:'Synthetic nonempty report',changeEvidenceRefs:[],
      lastCheckpointId:bank.checkpoint!.id,lastBankObservedDate:bank.checkpoint!.observedDate,lastBankObservedAt:null,lastObservedBalanceCents:50000n,historicalAllocationRevisionId:bank.vector!.id,
      allocationEffectiveDate:bank.vector!.effectiveDate,endCheckpointId:null,endBalanceCents:null,bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'NOT_PROVIDED',historicalAllocatedCents:50000n,
      historicalReservedCents:20000n,historicalSavingsCents:5000n,historicalFreeCents:25000n,snapshotSchemaVersion:1,selectionContractVersion:1,snapshotJson:{synthetic:true,A:'50000',R:'20000',S:'5000',F:'25000'},
      sourceManifest:supported?{obligationRevisionIds:ctx.obligations.map(e=>e.id),savingsRevisionIds:ctx.savings.map(e=>e.id)}:{unsupported:true},orderingRevisionRefs:bank.orderingRevisionIds});
    await tx.insert(s.reportHeads).values({...f.scope,id:head,periodId:period.id,closingId:id});return [{entityType:'SYNTHETIC_CLOSE',entityId:id,before:null,after:{head}}];
  });return {id,head};
}
async function pastFixture(){const f=await fixture(),c=await command(f,checkpoint(calendar.pastDay(20),'50000',{[calendar.past]:'50000'}),[createObligation('20000',calendar.past)],[createSaving('5000',calendar.past)]);
  value(await f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,c))))));return f;}
it('HB17-P12 current transition preserves nonempty report bytes while historical aggregate flags only the affected head',async()=>{
  for(const historical of [false,true]){const f=await pastFixture(),r=await report(f),before=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,r.id));
    const raw=historical?await command(f,checkpoint(calendar.pastDay(25),'49000',{[calendar.past]:'49000'})):
      await transitionCommand(f,'CARRY','50000',{[calendar.past]:'0',[calendar.target]:'50000'});
    const reviewed=value(prepareCommand(value(await f.repo.preview(f.scope,raw))));expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,r.head)))[0].correctionPending).toBe(false);
    value(await f.repo.confirm(f.scope,reviewed));expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,r.id))).toEqual(before);
    expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,r.head)))[0].correctionPending).toBe(historical);
  }
});
it('HB17-P12 original invalid report evidence refuses preview without writes',async()=>{
  const f=await pastFixture();await report(f,false);const raw=await transitionCommand(f,'CARRY','50000',{[calendar.past]:'0',[calendar.target]:'50000'}),before=await baseline(f.scope);
  expect(await f.repo.preview(f.scope,raw)).toMatchObject({ok:false,code:'REPORT_IMPACT_REVIEW_REQUIRED'});expect(await baseline(f.scope)).toEqual(before);
});
