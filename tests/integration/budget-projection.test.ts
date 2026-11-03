import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { commitBatch, type BatchWriter } from '@/infrastructure/db/commit';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { writeSavings } from '@/infrastructure/db/savings-writer';
import { createProjectionRepository } from '@/infrastructure/db/projection-reader';
import { projectAccount } from '@/domain/forecast/budget';
import { encodeProjection } from '@/domain/forecast/serialization';
import { prepareCommand } from '@/domain/updates/validation';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { value, day } from '../fixtures/forecast';
import { transitionCalendar } from '../fixtures/transition-calendar';
import { createProposalRepository } from '@/infrastructure/db/transfer-proposal-repository';
import { writeRedistribution } from '@/infrastructure/db/redistribution-writer';
import { loadTransitionState } from '@/infrastructure/db/transition-state';
import { auditDocuments } from '@/infrastructure/db/audit-writer';
import * as s from '@/infrastructure/db/schema';
import { identityRepository } from '@/infrastructure/auth/repository';
import { createDashboardAccountResolver } from '@/app/dashboard-account-boundary';
import { createDashboardLoader } from '@/app/dashboard-loader';
import { createProjectionReader } from '@/features/budget-projection/read-account';
vi.mock('@/infrastructure/auth/auth', () => ({ requireOwner: vi.fn(), requireOwnedAccount: vi.fn() }));

function dashboard(f: AuthorizedScope) {
  const repo = identityRepository(db);
  const resolve = createDashboardAccountResolver(async () => ({ id: f.ownerUserId }), id => repo.findAccountIdsForOwner(id));
  const reader = createProjectionReader(async selector => {
    if (typeof selector !== 'string' || !await repo.ownsAccount(f.ownerUserId, selector)) throw Error('FORBIDDEN');
    return { ownerUserId: f.ownerUserId, accountId: selector };
  }, createProjectionRepository(db));
  return createDashboardLoader(resolve, reader);
}

let db: ReturnType<typeof createDatabase>, admin: pg.Pool;
let calendar: ReturnType<typeof transitionCalendar>;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw Error('LOCAL_TARGET_REQUIRED');
  const u = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: u.toString() });
  const name = 'hb014_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"'); u.pathname = '/' + name;
  db = createDatabase(u.toString()); await migrate(db.db, { migrationsFolder: './drizzle' });
});
beforeEach(async () => {
  const clock = await db.db.execute<{ date: string }>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD') AS date`);
  calendar = transitionCalendar(clock.rows[0].date);
});
afterAll(async () => { await db?.close(); await admin?.end(); });
async function account(f: AuthorizedScope) { return (await db.db.select().from(s.accounts).where(eq(s.accounts.id, f.accountId)))[0]; }
async function fixture() {
  const f = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await db.db.insert(s.users).values({ id: f.ownerUserId });
  await db.db.insert(s.accounts).values({ id: f.accountId, ownerUserId: f.ownerUserId, displayName: 'Synthetic projection' }); return f;
}
async function batch(f: AuthorizedScope, payload: unknown, date: string, writer: BatchWriter) {
  return commitBatch(db.db, { scope: f, kind: 'HB014_FIXTURE', command: value(prepareCommand({ requestId: randomUUID(),
    expectedRevision: (await account(f)).aggregateRevision, effectiveDate: date, reason: 'Synthetic HB014 confirmation', payload })) }, writer);
}
async function bank(f: AuthorizedScope, amount = '10000', allocations = [{ period: calendar.target, amountCents: amount }], date = calendar.pastDay(1)) {
  await batch(f, { observedDate: date, observedAt: null, balanceCents: amount, allocations, correction: null, placement: null }, date, writeBankCheckpoint);
}
async function obligation(f: AuthorizedScope, amount = '20000', funding = calendar.future, possible = false, selected = true) {
  await batch(f, { changes: [{ key: 'o', action: 'CREATE', obligationId: null, expectedStateRevisionId: null, correctionId: null, previousChangeKey: null,
    effectiveDate: calendar.pastDay(2), bankDate: null, placement: null, bankCheck: null, paymentConfirmation: null,
    data: { title: 'Synthetic obligation', dueDate: null, originalCents: amount, isPossible: possible, reserveFull: selected, originatingPeriod: calendar.past, fundingPeriod: funding } }] }, calendar.pastDay(2), writeObligations);
}
async function saving(f: AuthorizedScope, amount = '5000', funding = calendar.target, writer: BatchWriter = writeSavings) {
  await batch(f, { changes: [{ key: 's', action: 'CREATE', savingsId: null, expectedStateRevisionId: null, correctionId: null, previousChangeKey: null,
    effectiveDate: calendar.pastDay(3), placement: null, bankCheck: null,
    data: { title: 'Synthetic saving', amountCents: amount, originatingPeriod: calendar.past, fundingPeriod: funding } }] }, calendar.pastDay(3), writer);
}
async function baseline(f: AuthorizedScope) {
  const tables = [s.budgetUpdates,s.budgetPeriods,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,s.historicalPositions,s.orderingRevisions,
    s.obligations,s.obligationEvents,s.savingsGoals,s.savingsEvents,s.auditEvents,s.transferProposals,s.transitionDecisions,s.budgetTransfers,
    s.transferProposalCancellations,s.monthClosings,s.reportHeads];
  return { account: await account(f), rows: await Promise.all(tables.map(t => db.db.select().from(t).where(eq(t.accountId,f.accountId)).orderBy(t.id))) };
}
async function read(f: AuthorizedScope) {
  const before = await baseline(f), r = await createProjectionRepository(db).read(f);
  expect(await baseline(f)).toEqual(before);
  if (!r.ok) throw Error(r.code);
  const projected = value(projectAccount(r.value.snapshot, r.value.asOfDate));
  value(encodeProjection(projected)); return projected;
}
it('HB14-018/044 PG persisted owner oracle, coherent provenance and repeated read has no writes', async () => {
  const f = await fixture(); await bank(f); await obligation(f);
  const r = await read(f); expect(r.kind).toBe('ACCOUNT_ESTIMATE');
  if (r.kind !== 'ACCOUNT_ESTIMATE') throw Error('estimate');
  expect(r.currentLiquidity).toMatchObject({ protectedTotal: 20000n, safeAvailable: 0n, obligationShortfall: 10000n });
  expect(r.provenance.knowledgeCut).toBe(2n); expect(await read(f)).toEqual(r);
});
it('HB14-028/047 PG no observation differs from genuine zero and known earmarks survive', async () => {
  const f = await fixture(); await obligation(f, '1000', calendar.target);
  const r = await read(f); expect(r.kind === 'UNAVAILABLE' && r.reason).toBe('NO_OBSERVATION');
  await bank(f,'0',[]); const z = await read(f);
  expect(z.kind === 'ACCOUNT_ESTIMATE' && z.currentLiquidity).toMatchObject({ safeAvailable:0n, budgetDeficit:1000n });
});
it.each([false,true])('HB14-010/011 PG possible selection=%s is full or zero', async selected => {
  const f=await fixture(); await bank(f); await obligation(f,'20000',calendar.future,true,selected);
  const r=await read(f); expect(r.kind==='ACCOUNT_ESTIMATE' && r.currentLiquidity.safeAvailable).toBe(selected?0n:10000n);
});
it('HB14-008/052/053 PG retained savings and full reserve are not capped',async()=>{
  const f=await fixture();await bank(f,'15000');await obligation(f,'20000',calendar.target);await saving(f);
  const r=await read(f);expect(r.kind==='ACCOUNT_ESTIMATE' && r.currentLiquidity).toMatchObject({budgetFree:-10000n,budgetDeficit:10000n,totalSavings:5000n,protectedTotal:25000n});
});
it('HB14-045 PG foreign/unknown scope returns no facts',async()=>{
  const f=await fixture(); await bank(f); const before=await baseline(f);
  expect(await createProjectionRepository(db).read({...f,ownerUserId:randomUUID()})).toEqual({ok:false,code:'FORBIDDEN'});
  expect(await createProjectionRepository(db).read({...f,accountId:randomUUID()})).toEqual({ok:false,code:'FORBIDDEN'});
  expect(await baseline(f)).toEqual(before);
});
it('HB14-043/056 PG old H/K selects old vector despite new active pointer',async()=>{
  const f=await fixture();await bank(f);const first=await account(f);
  await bank(f,'9000',[{period:calendar.target,amountCents:'9000'}],calendar.pastDay(4));
  for(const selection of [{through:calendar.pastDay(1),knowledgeCut:null},{through:calendar.today,knowledgeCut:first.recordedSeq}]){
    const before=await baseline(f),r=value(await createProjectionRepository(db).readAt(f,selection));
    expect(r.snapshot.kind==='ACTIVE_COMPLETE' && r.snapshot.checkpoint.balance).toBe(10000n);expect(await baseline(f)).toEqual(before);
  }
});

it('HB14-059 actual repeatable-read snapshot stays entirely before concurrent bank commit',async()=>{
  const f=await fixture();await bank(f);await obligation(f,'2000',calendar.target);await saving(f,'1000');
  let captured!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>{captured=r;}),gate=new Promise<void>(r=>{release=r;});
  const transaction=db.db.transaction.bind(db.db);
  // Instrument only the scheduling of real SQL, preserving the production isolation config and all actual results.
  const spy=vi.spyOn(db.db,'transaction').mockImplementation((callback,config)=>transaction(async tx=>{
    const execute=tx.execute.bind(tx);let calls=0;
    tx.execute=((...args:Parameters<typeof tx.execute>)=>Promise.resolve(execute(...args)).then(async result=>{
      if(++calls===2){captured();await gate;}return result;
    })) as typeof tx.execute;
    return callback(tx);
  },config));
  const pending=createProjectionRepository(db).read(f);
  try{
    await entered;spy.mockRestore();await bank(f,'9000',[{period:calendar.target,amountCents:'9000'}],calendar.pastDay(4));release();
    const first=value(await pending),old=value(projectAccount(first.snapshot,first.asOfDate));
    expect(old.kind==='ACCOUNT_ESTIMATE'&&old.bank.balance).toBe(10000n);
    expect(old.kind==='ACCOUNT_ESTIMATE'&&old.currentLiquidity).toMatchObject({totalReserved:2000n,totalSavings:1000n,safeAvailable:7000n});
    const next=await read(f);expect(next.kind==='ACCOUNT_ESTIMATE'&&next.bank.balance).toBe(9000n);
    expect(next.kind==='ACCOUNT_ESTIMATE'&&next.provenance.knowledgeCut).toBe(4n);
  }finally{release();spy.mockRestore();}
});
it('HB14 identity completeness PG orphan committed identity is refused, not an empty reserve set',async()=>{
  const f=await fixture();await bank(f);const [update]=await db.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.accountId,f.accountId));
  const [p]=await db.db.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId,f.accountId));
  await db.db.insert(s.obligations).values({...f,id:randomUUID(),budgetUpdateId:update.id,recordedSeq:update.recordedSeq,originatingPeriodId:p.id});
  const before=await baseline(f);expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'HISTORICAL_STATE_CONFLICT'});expect(await baseline(f)).toEqual(before);
});
it('HB14 current-pointer mismatch PG refuses while historical H remains readable',async()=>{
  const f=await fixture();await bank(f);await db.db.update(s.accounts).set({activeAllocationRevisionId:null}).where(eq(s.accounts.id,f.accountId));
  const before=await baseline(f);expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'HISTORICAL_STATE_CONFLICT'});expect(await baseline(f)).toEqual(before);
});
it.each(['SAVINGS_STATE','OBLIGATION_STATE'])('HB14-060 PG duplicate mandatory %s evidence refuses',async type=>{
  const f=await fixture();await bank(f);if(type==='SAVINGS_STATE')await saving(f);else await obligation(f);
  const audits=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.accountId,f.accountId));
  const audit=audits.find(a=>(a.beforeAfter as {entity?:{type?:string}}).entity?.type===type)!;
  await db.db.insert(s.auditEvents).values({...audit,id:randomUUID()});
  const before=await baseline(f),result=await createProjectionRepository(db).read(f);expect(result.ok).toBe(false);
  if(!result.ok)expect(result.code).toBe(type==='SAVINGS_STATE'?'HISTORICAL_SAVINGS_CONFLICT':'HISTORICAL_PAYMENT_CONFLICT');expect(await baseline(f)).toEqual(before);
});
it('HB14-060 PG preflight rejects oversized audit before loading its JSON',async()=>{
  const f=await fixture();await bank(f);const [audit]=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.accountId,f.accountId));
  await db.db.insert(s.auditEvents).values({...audit,id:randomUUID(),beforeAfter:{syntheticPadding:'x'.repeat(8388608)}});
  const before=await baseline(f);expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'PROJECTION_LIMIT_EXCEEDED'});expect(await baseline(f)).toEqual(before);
});
it('HB14-060 PG exact period cap and cap+1 have no truncation',async()=>{
  const f=await fixture();await bank(f);
  await db.db.insert(s.budgetPeriods).values(Array.from({length:1199},(_,i)=>({...f,id:randomUUID(),period:`${String(1000+Math.floor(i/12))}-${String(i%12+1).padStart(2,'0')}`})));
  expect((await read(f)).kind).toBe('ACCOUNT_ESTIMATE');
  await db.db.insert(s.budgetPeriods).values({...f,id:randomUUID(),period:'0900-01'});
  const before=await baseline(f);expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'PROJECTION_LIMIT_EXCEEDED'});expect(await baseline(f)).toEqual(before);
});

async function transitionInput(f:AuthorizedScope,mode:'CARRY'|'FRESH_START'|'DEFER'|'REDISTRIBUTE',actual:string|null=null){
  const a=await account(f),st=await db.db.transaction(tx=>loadTransitionState(tx,f,a.recordedSeq,day(calendar.today)));
  const allocations=[{period:calendar.target,amountCents:actual===null?'88000':(BigInt(actual)-1000n).toString()},{period:calendar.future,amountCents:'1000'}];
  if(mode==='DEFER')return {st,p:{schemaVersion:1,intent:'TRANSITION',mode,observationMode:'REUSE_CONFIRMED',target:calendar.target,sources:[],
    balanceCents:st.base.balanceCents.toString(),allocations:st.base.allocations.map(x=>({period:x.period,amountCents:x.amountCents.toString()})),fundingRefs:[],futureEdits:[],
    expectedCheckpointRevisionId:st.base.checkpointId,expectedAllocationRevisionId:st.base.vectorId,effectiveDate:calendar.today,placement:null,checkpoint:null,
    consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}}};
  return {st,p:{schemaVersion:1,intent:mode==='REDISTRIBUTE'?'ALLOCATION_ONLY':'TRANSITION',mode,observationMode:actual===null?'REUSE_CONFIRMED':'ACTUAL_CHECK',target:calendar.target,
    sources:mode==='CARRY'?[calendar.past]:[],balanceCents:actual??st.base.balanceCents.toString(),allocations,
    fundingRefs:st.base.funding.filter(x=>x.period<calendar.target).map(({kind,identityId,revisionId})=>({kind,identityId,revisionId})),futureEdits:[],
    expectedCheckpointRevisionId:st.base.checkpointId,expectedAllocationRevisionId:st.base.vectorId,effectiveDate:calendar.today,placement:null,
    checkpoint:actual===null?null:{observedDate:calendar.today,observedAt:null,balanceCents:actual,allocations,correction:null,placement:null},
    consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}}};
}
it.each(['CARRY','FRESH_START','DEFER','REDISTRIBUTE'] as const)('HB14-015/016/017/041/061 PG genuine HB13 %s full lineage',async mode=>{
  const f=await fixture();await bank(f,'89000',[{period:calendar.past,amountCents:'40000'},{period:calendar.target,amountCents:'48000'},{period:calendar.future,amountCents:'1000'}]);
  await obligation(f,'30000',calendar.past);await saving(f,'5000',calendar.past);
  const {st,p}=await transitionInput(f,mode,mode==='FRESH_START'?'9000':null);
  if(mode==='REDISTRIBUTE')await batch(f,p,calendar.today,writeRedistribution);
  else{
    const repo=createProposalRepository(db),command=value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account(f)).aggregateRevision,effectiveDate:calendar.today,reason:'Synthetic transition review',payload:p}));
    const proposal=value(await repo.prepare(f,command)) as Record<string,unknown>;
    value(await repo.confirm(f,value(prepareCommand({...command,requestId:randomUUID(),payload:{proposalId:proposal.proposalId,proposalIdentity:proposal.proposalIdentity,input:proposal.input,review:proposal.review}}))));
  }
  const out=await read(f);if(out.kind!=='ACCOUNT_ESTIMATE')throw Error('estimate');
  const safe=mode==='FRESH_START'?0n:mode==='DEFER'?48000n:53000n;
  expect(out.currentLiquidity.safeAvailable).toBe(safe);expect(out.currentLiquidity.totalReserved).toBe(30000n);expect(out.currentLiquidity.totalSavings).toBe(5000n);
  expect(out.provenance.obligationSources).toHaveLength(1);expect(out.provenance.savingSources).toHaveLength(1);
  expect(out.provenance.obligationSources[0].identityId).toBe(st.obligations[0].obligationId);
  expect(out.provenance.obligationSources[0].fundingPeriod).toBe(mode==='DEFER'||mode==='REDISTRIBUTE'?calendar.past:calendar.target);
  expect(out.bank.revisionId===st.base.checkpointId).toBe(mode!=='FRESH_START');
});
it('HB14-013/012 PG actual partial then paid and explicit savings release do not double debit',async()=>{
  const f=await fixture();await bank(f,'40000');await obligation(f,'30000',calendar.target);await saving(f,'5000');
  for(const [action,amount,balance,date] of [['PARTIAL_SETTLEMENT','10000','30000',calendar.pastDay(5)],['PAID','20000','10000',calendar.pastDay(6)]] as const){
    const a=await account(f),st=await db.db.transaction(tx=>loadTransitionState(tx,f,a.recordedSeq,day(calendar.today))),o=st.obligations[0];
    await batch(f,{changes:[{key:'p',action,obligationId:o.obligationId,expectedStateRevisionId:o.id,correctionId:null,previousChangeKey:null,effectiveDate:date,bankDate:null,placement:null,
      bankCheck:{observedDate:date,observedAt:null,balanceCents:balance,allocations:[{period:calendar.target,amountCents:balance}],correction:null,placement:null},
      paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:null},data:{amountCents:amount}}]},date,writeObligations);
    const r=await read(f);expect(r.kind==='ACCOUNT_ESTIMATE'&&r.bank.balance).toBe(BigInt(balance));expect(r.kind==='ACCOUNT_ESTIMATE'&&r.currentLiquidity.safeAvailable).toBe(5000n);
  }
  const a=await account(f),st=await db.db.transaction(tx=>loadTransitionState(tx,f,a.recordedSeq,day(calendar.today))),saved=st.savings[0];
  await batch(f,{changes:[{key:'release',action:'PARTIAL_RELEASE',savingsId:saved.savingsId,expectedStateRevisionId:saved.id,correctionId:null,previousChangeKey:null,
    effectiveDate:calendar.pastDay(7),placement:null,bankCheck:null,data:{amountCents:'2000'}}]},calendar.pastDay(7),writeSavings);
  const released=await read(f);expect(released.kind==='ACCOUNT_ESTIMATE'&&released.bank.balance).toBe(10000n);
  expect(released.kind==='ACCOUNT_ESTIMATE'&&released.currentLiquidity.safeAvailable).toBe(7000n);
});
it('HB14-060 PG missing mandatory savings audit is corruption, never incomplete/zero',async()=>{
  const f=await fixture();await bank(f);
  await saving(f,'5000',calendar.target,async(tx,b)=>(await writeSavings(tx,b)).filter(a=>a.entityType!=='SAVINGS_STATE'));
  const before=await baseline(f);expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'HISTORICAL_SAVINGS_CONFLICT'});expect(await baseline(f)).toEqual(before);
});
it('HB14-060 PG malformed obligation audit schema refuses even with exact financial snapshots',async()=>{
  const f=await fixture();await bank(f);
  const payload={changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,
    effectiveDate:calendar.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
    data:{title:'Synthetic audit schema',dueDate:null,originalCents:'1000',isPossible:false,reserveFull:true,originatingPeriod:calendar.past,fundingPeriod:calendar.target}}]};
  await batch(f,payload,calendar.pastDay(2),async(tx,b)=>{
    const audits=await writeObligations(tx,b),descriptor=audits.find(a=>a.entityType==='OBLIGATION_STATE')!;
    await tx.insert(s.auditEvents).values({...f,id:randomUUID(),budgetUpdateId:b.id,recordedSeq:b.recordedSeq,eventKind:'SYNTHETIC_BAD_SCHEMA',
      effectiveDate:b.command.effectiveDate,reason:'Synthetic malformed evidence',beforeAfter:{...auditDocuments([descriptor])[0],schemaVersion:2}});
    return audits.filter(a=>a!==descriptor);
  });
  const before=await baseline(f);expect(await createProjectionRepository(db).read(f)).toEqual({ok:false,code:'HISTORICAL_PAYMENT_CONFLICT'});expect(await baseline(f)).toEqual(before);
});
it('HB14 H before identity creation excludes it without treating its complete later chain as missing',async()=>{
  const f=await fixture();await bank(f);await obligation(f);await saving(f);
  const before=await baseline(f),out=value(await createProjectionRepository(db).readAt(f,{through:calendar.pastDay(1),knowledgeCut:null}));
  expect(out.snapshot.kind==='ACTIVE_COMPLETE'&&out.snapshot.obligations).toEqual([]);expect(out.snapshot.kind==='ACTIVE_COMPLETE'&&out.snapshot.savings).toEqual([]);
  expect(await baseline(f)).toEqual(before);
});
it('HB14-061 PG preserved future F fixture reads exact current/future earmarks',async()=>{
  const f=await fixture();await bank(f,'10000',[{period:calendar.older,amountCents:'4000'},{period:calendar.past,amountCents:'4000'},{period:calendar.future,amountCents:'2000'}],calendar.olderDay(20));
  for(const [date,funding,amount] of [[calendar.olderDay(21),calendar.older,'3000'],[calendar.olderDay(22),calendar.past,'1000'],[calendar.olderDay(23),calendar.target,'500']]){
    await batch(f,{changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:date,bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,
      data:{title:'Synthetic F obligation',dueDate:null,originalCents:amount,isPossible:false,reserveFull:true,originatingPeriod:funding,fundingPeriod:funding}}]},date,writeObligations);
  }
  for(const [date,funding,amount] of [[calendar.olderDay(24),calendar.older,'500'],[calendar.olderDay(25),calendar.target,'200'],[calendar.olderDay(26),calendar.future,'700']]){
    await batch(f,{changes:[{key:'s',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:date,placement:null,bankCheck:null,
      data:{title:'Synthetic F retained',amountCents:amount,originatingPeriod:funding,fundingPeriod:funding}}]},date,writeSavings);
  }
  const {st,p}=await transitionInput(f,'FRESH_START','9000');
  p.allocations=[{period:calendar.target,amountCents:'7000'},{period:calendar.future,amountCents:'2000'}];
  if(!p.checkpoint)throw Error('actual check');p.checkpoint.allocations=p.allocations;
  const repo=createProposalRepository(db),command=value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account(f)).aggregateRevision,effectiveDate:calendar.today,reason:'Synthetic FRESH_START future preservation',payload:p}));
  const proposal=value(await repo.prepare(f,command)) as Record<string,unknown>;
  value(await repo.confirm(f,value(prepareCommand({...command,requestId:randomUUID(),payload:{proposalId:proposal.proposalId,proposalIdentity:proposal.proposalIdentity,input:proposal.input,review:proposal.review}}))));
  const r=await read(f);expect(r.kind==='ACCOUNT_ESTIMATE'&&r.currentLiquidity).toMatchObject({budgetFree:1800n,protectedTotal:7200n,safeAvailable:1800n});
  if(r.kind!=='ACCOUNT_ESTIMATE')throw Error('estimate');expect(r.provenance.savingSources).toHaveLength(3);
  const future=st.savings.find(e=>e.amountCents===700n)!;
  expect(r.provenance.savingSources.find(e=>e.identityId===future.savingsId)?.revisionId).toBe(future.id);
  expect(r.provenance.savingSources.filter(e=>e.transitionDecisionId!==null)).toHaveLength(1);
  expect(r.provenance.obligationSources.filter(e=>e.transitionDecisionId!==null)).toHaveLength(2);
});
it('HB14-054 F-009 PG immutable report bytes/head/flags survive repeated projection',async()=>{
  const f=await fixture();await bank(f,'10000',[{period:calendar.past,amountCents:'10000'}]);
  const a=await account(f),h=await db.db.transaction(tx=>loadTransitionState(tx,f,a.recordedSeq,day(calendar.today))),p=h.periods.find(p=>p.period===calendar.past)!,closingId=randomUUID();
  await batch(f,{},calendar.today,async(tx,b)=>{
    await tx.insert(s.monthClosings).values({...f,id:closingId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,periodId:p.id,version:1,historicalThroughDate:calendar.pastEnd,
      closedAt:b.recordedAt,closedBy:f.ownerUserId,evidenceRecordedCutoffSeq:h.oh.knowledgeCut,evidenceRecordedCutoffAt:b.recordedAt,reason:'Synthetic read isolation report',changeEvidenceRefs:[],
      lastCheckpointId:h.base.checkpointId,lastBankObservedDate:calendar.pastDay(1),lastBankObservedAt:null,lastObservedBalanceCents:10000n,historicalAllocationRevisionId:h.base.vectorId,
      allocationEffectiveDate:calendar.pastDay(1),endCheckpointId:null,endBalanceCents:null,bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'NOT_PROVIDED',historicalAllocatedCents:10000n,
      historicalReservedCents:0n,historicalSavingsCents:0n,historicalFreeCents:10000n,snapshotSchemaVersion:1,selectionContractVersion:1,snapshotJson:{synthetic:true,A:'10000',F:'10000'},
      sourceManifest:{obligationRevisionIds:[],savingsRevisionIds:[]},orderingRevisionRefs:h.bank.orderingRevisionIds});
    await tx.insert(s.reportHeads).values({...f,id:randomUUID(),periodId:p.id,closingId,correctionPending:true});
    return [{entityType:'SYNTHETIC_CLOSE',entityId:closingId,before:null,after:{synthetic:true}}];
  });
  const r=await read(f);expect(r.kind==='ACCOUNT_ESTIMATE'&&r.currentLiquidity.safeAvailable).toBe(0n);expect(await read(f)).toEqual(r);
  const before = await baseline(f);
  expect(before.rows.at(-1)).toHaveLength(1);
  for (const query of [{}, { period: calendar.past }, { period: calendar.future }]) {
    const view = await dashboard(f)(query);
    expect(view.kind).toBe('READY');
    if (view.kind !== 'READY') throw Error('ready');
    if ('period' in query) expect(view.safe).toBeNull();
    expect(JSON.stringify(view)).not.toContain(f.accountId);
    expect(await baseline(f)).toEqual(before);
  }
});

it('HB16-A06/C06/D07 PG account discovery and projection recheck ownership and leave every scoped row unchanged', async () => {
  const f = await fixture(); await bank(f); await obligation(f); await saving(f);
  const before = await baseline(f), load = dashboard(f);
  const view = await load({}); expect(view.kind === 'READY' && view.safe?.safeAvailable).toBe('0');
  expect(await load({})).toEqual(view);
  const repo = identityRepository(db);
  const resolve = createDashboardAccountResolver(async () => ({ id: f.ownerUserId }), id => repo.findAccountIdsForOwner(id));
  const selected = await resolve(); expect(selected.kind).toBe('ACCOUNT');
  // Simulate stale ownership authorization while keeping real SQL storage reads.
  const reader = createProjectionReader(async selector => {
    if (!await repo.ownsAccount(randomUUID(), String(selector))) throw Error('FORBIDDEN');
    return f;
  }, createProjectionRepository(db));
  expect(await createDashboardLoader(async () => selected, reader)({})).toEqual({ kind: 'FORBIDDEN' });
  expect(await createDashboardLoader(async () => selected, createProjectionReader(async () => ({...f,ownerUserId:randomUUID()}), createProjectionRepository(db)))({})).toEqual({kind:'FORBIDDEN'});
  expect(await baseline(f)).toEqual(before);
});
