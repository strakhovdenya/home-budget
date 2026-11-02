import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { commitBatch, rejectBatch, type BatchWriter } from '@/infrastructure/db/commit';
import { prepareCommand } from '@/domain/updates/validation';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { createObligationReader } from '@/infrastructure/db/obligation-reader';
import { loadObligationHistory } from '@/infrastructure/db/obligation-history';
import { snapshot } from '@/domain/obligations/lifecycle';
import { value, input, date } from '../fixtures/checkpoints';
import { selectState } from '@/domain/checkpoints/history';
import * as s from '@/infrastructure/db/schema';

let db: ReturnType<typeof createDatabase>, admin: pg.Pool;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('LOCAL_TARGET_REQUIRED');
  const u = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: u.toString() });
  const name = 'hb011_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"'); u.pathname = '/' + name;
  db = createDatabase(u.toString()); await migrate(db.db, { migrationsFolder: './drizzle' });
});
afterAll(async () => { await db?.close(); await admin?.end(); });
type Scope = { ownerUserId: string; accountId: string };
function change(action = 'CREATE', overrides: Record<string, unknown> = {}): Record<string, unknown> & { effectiveDate: string; data: Record<string, unknown> } {
  return { key: 'a', action, obligationId: null, expectedStateRevisionId: null, correctionId: null, previousChangeKey: null,
    effectiveDate: '2026-10-02', bankDate: null, placement: null, bankCheck: null, paymentConfirmation: null,
    data: action === 'CREATE' ? { title: 'Synthetic rent', dueDate: null, originalCents: '20000', isPossible: false, reserveFull: true, originatingPeriod: '2026-10', fundingPeriod: '2026-10' } : {}, ...overrides };
}
async function commit(f: Scope, revision: bigint, changes: ReturnType<typeof change>[], writer: BatchWriter = writeObligations, requestId = randomUUID()) {
  return commitBatch(db.db, { scope: f, kind: 'OBLIGATION_TEST', command: value(prepareCommand({ requestId, expectedRevision: revision,
    effectiveDate: changes[0].effectiveDate, reason: 'Synthetic explicit reviewed change', payload: { changes } })) }, writer);
}
async function fixture(balance = '50000', create = true, data: Record<string, unknown> = {}) {
  const f = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await db.db.insert(s.users).values({ id: f.ownerUserId });
  await db.db.insert(s.accounts).values({ id: f.accountId, ownerUserId: f.ownerUserId, displayName: 'Synthetic HB011' });
  await commitBatch(db.db, { scope: f, kind: 'BANK_CHECKPOINT', command: value(prepareCommand({ requestId: randomUUID(), expectedRevision: 0n,
    effectiveDate: '2026-10-01', reason: 'Synthetic actual check', payload: input('2026-10-01', balance) })) }, writeBankCheckpoint);
  if (create) await commit(f, 1n, [change('CREATE', { data: { ...change().data, ...data } })]);
  return f;
}
async function history(f: Scope) {
  const [a] = await db.db.select().from(s.accounts).where(eq(s.accounts.id, f.accountId));
  return loadObligationHistory(db.db, f, a.recordedSeq);
}
async function read(f: Scope, day = '2026-10-31', cut: string | null = null) {
  return value(await createObligationReader(db).read(f, value((await import('@/shared/pure/calendar')).parseBerlinDate(day)), cut === null ? null : BigInt(cut)));
}
async function latest(f: Scope) { return (await read(f)).states[0]; }
async function counts(f: Scope) {
  const tables = [s.budgetUpdates,s.obligationEvents,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,s.historicalPositions,s.orderingRevisions,s.auditEvents];
  const result = [];
  for (const t of tables) result.push((await db.db.select().from(t).where(eq(t.accountId,f.accountId))).length);
  const [a] = await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
  return { counts: result, revision: a.aggregateRevision, sequence: a.recordedSeq, head: a.activeAllocationRevisionId };
}
async function next(f: Scope, action: string, day: string, data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  const h = await history(f), e = await latest(f);
  return commit(f, h.knowledgeCut, [change(action, { obligationId: e.obligationId, expectedStateRevisionId: e.id, effectiveDate: day, data, ...extra })]);
}
function payment(day: string, balance: string, acknowledgment = false) {
  return { bankCheck: input(day, balance), paymentConfirmation: { source: 'TRACKED_CARD', bankStateAffirmed: true, unchangedBalanceAcknowledged: acknowledgment, checkpointId: null } };
}
it('HB11-01/06/07/19 full reserve, partial, paid: B is observed once', async () => {
  const f = await fixture(); expect([...(await read(f)).reserves.values()]).toEqual([20000n]);
  await next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},payment('2026-10-05','45000'));
  expect((await latest(f)).outstandingCents).toBe(15000n);
  await next(f,'PAID','2026-10-06',{amountCents:'15000'},payment('2026-10-06','30000'));
  expect((await latest(f)).status).toBe('PAID');
  expect((await history(f)).checkpoints.toSorted((a,b)=>a.observedDate.localeCompare(b.observedDate)).map(c=>c.balanceCents)).toEqual([50000n,45000n,30000n]);
});
it('HB11-02/03/04/05 possible all-or-none and strict partial-reserve rejection', async () => {
  const f = await fixture('50000',true,{isPossible:true,reserveFull:false});
  expect([...(await read(f)).reserves.values()]).toEqual([0n]);
  await next(f,'AMEND','2026-10-03',{reserveFull:true}); expect((await latest(f)).reserveFull).toBe(true);
  await next(f,'AMEND','2026-10-04',{reserveFull:false}); expect([...(await read(f)).reserves.values()]).toEqual([0n]);
  await expect(next(f,'AMEND','2026-10-05',{reservedAmount:'5000'})).rejects.toMatchObject({code:'INVALID_OBLIGATION'});
});
it('HB11-08/09/10 cancellation keeps outstanding; terminal ordinary writes reject', async () => {
  const f=await fixture(); await next(f,'CANCELLED','2026-10-03');
  expect(await latest(f)).toMatchObject({status:'CANCELLED',outstandingCents:20000n,reserveFull:false});
  await expect(next(f,'AMEND','2026-10-04',{title:'Other'})).rejects.toMatchObject({code:'TERMINAL_OBLIGATION'});
  const g=await fixture(); await next(g,'PAID','2026-10-05',{amountCents:'20000'},payment('2026-10-05','30000'));
  await expect(next(g,'PAID','2026-10-06',{amountCents:'20000'},payment('2026-10-06','10000'))).rejects.toMatchObject({code:'TERMINAL_OBLIGATION'});
});
it('HB11-11/M1/M2/M3/M5 amend preserves paid amount and metadata history', async () => {
  const f=await fixture(); await next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},payment('2026-10-05','45000'));
  await next(f,'AMEND','2026-10-06',{originalCents:'25000',title:'New title',dueDate:'2026-11-05'});
  expect(await latest(f)).toMatchObject({originalCents:25000n,outstandingCents:20000n,title:'New title',dueDate:'2026-11-05'});
  expect((await read(f,'2026-10-05')).states[0].title).toBe('Synthetic rent');
  await next(f,'AMEND','2026-10-07',{dueDate:null}); expect((await latest(f)).dueDate).toBe(null);
  await expect(next(f,'AMEND','2026-10-08',{originalCents:'5000'})).rejects.toMatchObject({code:'INVALID_OBLIGATION'});
});
it('HB11-12/13/14/32 reserves exceed cash and count each identity once by funding', async () => {
  const f=await fixture('10000'); const e=await latest(f);
  expect(10000n-(await read(f)).reserves.get(e.fundingPeriodId)!).toBe(-10000n);
  await commit(f,2n,[change('CREATE',{effectiveDate:'2026-10-03',data:{...change().data,originalCents:'7000',fundingPeriod:'2026-11'}})]);
  const r=await read(f); expect([...r.reserves.values()].sort()).toEqual([20000n,7000n]);
  expect(r.states).toHaveLength(2);
});
it('HB11-15 payment requires actual check; no-observation reserve is still readable', async () => {
  const f={ownerUserId:randomUUID(),accountId:randomUUID()}; await db.db.insert(s.users).values({id:f.ownerUserId});
  await db.db.insert(s.accounts).values({id:f.accountId,ownerUserId:f.ownerUserId,displayName:'Synthetic no bank'});
  await commit(f,0n,[change()]); expect([...(await read(f)).reserves.values()]).toEqual([20000n]);
  await expect(next(f,'PAID','2026-10-05',{amountCents:'20000'})).rejects.toMatchObject({code:'PAYMENT_CONFIRMATION_REQUIRED'});
});
it('HB11-16/17/18 unchanged actual balance requires acknowledgment, including outside card', async () => {
  const f=await fixture(), before=await counts(f);
  await expect(next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},payment('2026-10-05','50000'))).rejects.toMatchObject({code:'PAYMENT_CONFIRMATION_REQUIRED'});
  expect(await counts(f)).toEqual(before);
  const p=payment('2026-10-05','50000',true); p.paymentConfirmation.source='OUTSIDE_TRACKED_CARD';
  await next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},p);
  expect((await latest(f)).payment).toMatchObject({amountCents:5000n,source:'OUTSIDE_TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:true});
});
it.each([
  ['A', 'OUTSIDE_TRACKED_CARD', '42000', false, false],
  ['B', 'OUTSIDE_TRACKED_CARD', '42000', true, false],
  ['C', 'OUTSIDE_TRACKED_CARD', '50000', true, true],
  ['D', 'OUTSIDE_TRACKED_CARD', '50000', false, false],
  ['E', 'TRACKED_CARD', '45000', false, true],
] as const)('HB11-Medium-%s actual balance follows payment source',async(_case,source,balance,ack,success)=>{
  const f=await fixture(), before=await counts(f), p=payment('2026-10-05',balance,ack);
  p.paymentConfirmation.source=source;
  const submit=()=>next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},p);
  if (!success) {
    await expect(submit()).rejects.toMatchObject({code:'PAYMENT_CONFIRMATION_REQUIRED'});
    expect(await counts(f)).toEqual(before);
  } else {
    await submit();
    const h=await history(f), actual=value(selectState(h,date('2026-10-05'))), r=await read(f,'2026-10-05','3');
    expect(actual.checkpoint!.balanceCents).toBe(BigInt(balance));
    expect(r.states[0].outstandingCents).toBe(15000n);
    expect([...r.reserves.values()]).toEqual([15000n]);
    expect(await counts(f)).toMatchObject({revision:3n,sequence:3n,head:actual.vector!.id});
    expect(h.checkpoints).toHaveLength(2);
  }
});
it('HB11-Medium-F outside card without preceding confirmed bank observation rolls back',async()=>{
  const f={ownerUserId:randomUUID(),accountId:randomUUID()};
  await db.db.insert(s.users).values({id:f.ownerUserId});
  await db.db.insert(s.accounts).values({id:f.accountId,ownerUserId:f.ownerUserId,displayName:'Synthetic no prior observation'});
  await commit(f,0n,[change()]);
  const before=await counts(f), p=payment('2026-10-05','50000',true);
  p.paymentConfirmation.source='OUTSIDE_TRACKED_CARD';
  await expect(next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},p)).rejects.toMatchObject({code:'PAYMENT_CONFIRMATION_REQUIRED'});
  expect(await counts(f)).toEqual(before);
});
it('HB11-20a/20b/21/22a/22b corrected historical payment sets preserve previous K', async () => {
  const f=await fixture(), create=await latest(f);
  await next(f,'PAID','2026-10-10',{amountCents:'20000'},payment('2026-10-10','30000'));
  const paid=await latest(f), before=await counts(f);
  const partial=change('PARTIAL_SETTLEMENT',{key:'partial',obligationId:create.obligationId,expectedStateRevisionId:create.id,effectiveDate:'2026-10-05',data:{amountCents:'5000'},...payment('2026-10-05','45000')});
  await expect(commit(f,3n,[partial])).rejects.toMatchObject({code:'HISTORICAL_PAYMENT_CONFLICT'}); expect(await counts(f)).toEqual(before);
  const correction=change('PAID',{key:'paid',obligationId:create.obligationId,previousChangeKey:'partial',correctionId:paid.id,effectiveDate:'2026-10-10',data:{amountCents:'15000'},paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:paid.payment!.checkpointId}});
  await commit(f,3n,[partial,correction]);
  expect((await read(f,'2026-10-05','4')).states[0].outstandingCents).toBe(15000n);
  expect((await read(f,'2026-10-10','3')).states[0].payment!.amountCents).toBe(20000n);
  const h=await history(f), p=h.events.find(e=>e.action==='PARTIAL_SETTLEMENT')!, late=await latest(f);
  const p2=change('PARTIAL_SETTLEMENT',{key:'partial',obligationId:create.obligationId,expectedStateRevisionId:create.id,correctionId:p.id,effectiveDate:'2026-10-05',data:{amountCents:'4000'},paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:p.payment!.checkpointId}});
  const saved=await counts(f);
  await expect(commit(f,4n,[p2])).rejects.toMatchObject({code:'HISTORICAL_PAYMENT_CONFLICT'}); expect(await counts(f)).toEqual(saved);
  await commit(f,4n,[p2,{...correction,correctionId:late.id,data:{amountCents:'16000'}}]);
  expect((await read(f,'2026-10-05','5')).states[0].outstandingCents).toBe(16000n);
  expect((await read(f,'2026-10-05','4')).states[0].outstandingCents).toBe(15000n);
  expect((await latest(f)).payment!.amountCents).toBe(16000n);
});
it('HB11-23 same-day placement must be explicit', async () => {
  const f=await fixture(); await expect(next(f,'AMEND','2026-10-02',{title:'Updated'})).rejects.toMatchObject({code:'ORDERING_CONFLICT'});
  const h=await history(f), o=h.orderings.find(o=>o.historicalDate==='2026-10-02')!;
  await next(f,'AMEND','2026-10-02',{title:'Updated'},{placement:{expectedOrderingRevisionId:o.id,afterPositionId:o.positionIds[0],beforePositionId:null}});
});
it('HB11-24/25/26 stale, replay before stale, changed payload conflict', async () => {
  const f=await fixture(), e=await latest(f), requestId=randomUUID();
  const c=change('AMEND',{obligationId:e.obligationId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-03',data:{title:'Updated'}});
  const receipt=await commit(f,2n,[c],writeObligations,requestId);
  expect(await commit(f,2n,[c],writeObligations,requestId)).toEqual(receipt);
  await expect(commit(f,2n,[{...c,data:{title:'Other'}}],writeObligations,requestId)).rejects.toMatchObject({code:'REQUEST_PAYLOAD_CONFLICT'});
  await expect(commit(f,2n,[c])).rejects.toMatchObject({code:'STALE_REVISION'});
});
it('HB11-27 real concurrent lifecycle commands have one winner', async () => {
  const f=await fixture(), e=await latest(f), c=change('AMEND',{obligationId:e.obligationId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-03',data:{title:'Updated'}});
  let release!:()=>void, entered!:()=>void;
  const gate=new Promise<void>(r=>release=r), ready=new Promise<void>(r=>entered=r);
  const first=commit(f,2n,[c],async(tx,b)=>{entered();await gate;return writeObligations(tx,b);}); await ready;
  const second=commit(f,2n,[c]); release();
  const results=await Promise.allSettled([first,second]); expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'STALE_REVISION'}});
});
it('HB11-28/29 post-write refusal, audit and deferred SQL failure roll back whole payment', async () => {
  for (const fault of ['refusal','audit','sql']) {
    const f=await fixture(), e=await latest(f), before=await counts(f), c=change('PAID',{obligationId:e.obligationId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-05',data:{amountCents:'20000'},...payment('2026-10-05','30000')});
    await expect(commit(f,2n,[c],async(tx,b)=>{
      const audit=await writeObligations(tx,b);
      if(fault==='refusal') return rejectBatch('HISTORICAL_PAYMENT_CONFLICT');
      if(fault==='audit') return [];
      const [cp] = await tx.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));
      const vectorId=randomUUID();
      await tx.insert(s.allocationRevisions).values({id:vectorId,logicalFactId:vectorId,ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,
        checkpointId:cp.id,positionId:e.positionId,effectiveDate:'2026-10-06',changeKind:'TEST'});
      return audit;
    })).rejects.toThrow(); expect(await counts(f)).toEqual(before);
  }
});
it('HB11-30 foreign account cannot read or write another owner history', async () => {
  const f=await fixture(), g=await fixture(), e=await latest(f);
  await expect(commit(g,2n,[change('CANCELLED',{obligationId:e.obligationId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-03'})])).rejects.toMatchObject({code:'STALE_OBLIGATION'});
  expect(await createObligationReader(db).read({ownerUserId:g.ownerUserId,accountId:f.accountId},value((await import('@/shared/pure/calendar')).parseBerlinDate('2026-10-31')),null)).toEqual({ok:false,code:'FORBIDDEN'});
});
it('HB11 correction CREATE is legal and retains identity and original K', async () => {
  const f=await fixture(), e=await latest(f);
  await commit(f,2n,[change('CREATE',{obligationId:e.obligationId,correctionId:e.id,data:{...change().data,title:'Corrected',originalCents:'22000'}})]);
  expect((await latest(f)).obligationId).toBe(e.obligationId); expect((await latest(f)).originalCents).toBe(22000n);
  expect((await read(f,'2026-10-02','2')).states[0].title).toBe('Synthetic rent');
});

async function direct(f: Scope, overrides: Record<string, unknown>, day = '2026-10-20') {
  const h=await history(f), p=h.events.at(-1)!;
  return commit(f,h.knowledgeCut,[change('CANCELLED',{obligationId:p.obligationId,expectedStateRevisionId:p.id,effectiveDate:day})],async(tx,b)=>{
    const base={ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq}, pos=randomUUID();
    await tx.insert(s.historicalPositions).values({...base,id:pos,historicalDate:day,kind:'SQL_TEST'});
    await tx.insert(s.orderingRevisions).values({...base,id:randomUUID(),historicalDate:day,manifest:{schemaVersion:1,positionIds:[pos]},dependencies:{schemaVersion:1,edges:[]}});
    await tx.insert(s.obligationEvents).values({...base,id:randomUUID(),obligationId:p.obligationId,logicalFactId:randomUUID(),previousRevisionId:p.id,positionId:pos,
      fundingPeriodId:p.fundingPeriodId,effectiveDate:day,action:'CANCELLED',beforeState:snapshot(p),title:p.title,dueDate:p.dueDate,
      originalCents:p.originalCents,outstandingCents:p.outstandingCents,status:'CANCELLED',isPossible:p.isPossible,reserveFull:false,...overrides});
    return [{entityType:'SQL_TEST',entityId:p.id,before:null,after:null}];
  });
}
it.each([
  ['unknown action',{action:'REOPEN'}],['missing predecessor',{previousRevisionId:null}],['wrong before',{beforeState:{}}],
  ['JSON null before',{beforeState:null}],['cancellation payment',{outstandingCents:0n}],['position date',{effectiveDate:'2026-10-19'}],
  ['blank title',{title:' '}],['overlong title',{title:'😀'.repeat(201)}],['partial reserve ordinary',{status:'UNPAID',reserveFull:false}],
  ['paid remainder',{action:'PAID',status:'PAID',outstandingCents:1n}],['duplicate CREATE',{action:'CREATE',previousRevisionId:null,beforeState:null,status:'UNPAID',reserveFull:true}],
] as const)('HB11-SQL negative %s',async(_name,override)=>{
  const f=await fixture(), before=await counts(f); await expect(direct(f,override)).rejects.toThrow(); expect(await counts(f)).toEqual(before);
});
it('HB11-SQL foreign previous and correction identity, terminal bypass and immutable events',async()=>{
  const f=await fixture(), g=await fixture(), foreign=await latest(g), own=await latest(f);
  await expect(direct(f,{previousRevisionId:foreign.id,beforeState:snapshot(foreign)})).rejects.toThrow();
  await expect(direct(f,{supersedesId:foreign.id,logicalFactId:foreign.logicalFactId})).rejects.toThrow();
  await next(f,'CANCELLED','2026-10-05');
  await expect(direct(f,{previousRevisionId:own.id,beforeState:snapshot(own)})).rejects.toThrow();
  await expect(db.db.update(s.obligationEvents).set({title:'Changed'}).where(eq(s.obligationEvents.id,own.id))).rejects.toThrow();
  await expect(db.db.delete(s.obligationEvents).where(eq(s.obligationEvents.id,own.id))).rejects.toThrow();
});
it('HB11-SQL legacy guard refuses without backfill or mutation',async()=>{
  const u=new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL), name='hb011_legacy_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE DATABASE "'+name+'"'); u.pathname='/'+name;
  const legacy=new pg.Pool({connectionString:u.toString()});
  try {
    for(const file of ['0000_foundation.sql','0001_integrity.sql','0002_checkpoint_positions.sql']) await legacy.query(readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
    const ids=Array.from({length:7},()=>randomUUID());
    await legacy.query('BEGIN');
    await legacy.query('INSERT INTO users(id) VALUES($1)',[ids[0]]);
    await legacy.query("INSERT INTO accounts(id,owner_user_id,display_name) VALUES($1,$2,'Synthetic legacy')",[ids[1],ids[0]]);
    await legacy.query("INSERT INTO budget_periods(id,owner_user_id,account_id,period) VALUES($1,$2,$3,'2026-10')",[ids[2],ids[0],ids[1]]);
    await legacy.query("INSERT INTO budget_updates(id,owner_user_id,account_id,request_id,payload_identity,expected_revision,recorded_seq,actor_id,kind,result) VALUES($1,$2,$3,$4,'synthetic',0,1,$2,'TEST','{}')",[ids[3],ids[0],ids[1],randomUUID()]);
    await legacy.query("INSERT INTO historical_positions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,kind) VALUES($1,$2,$3,$4,1,'2026-10-02','TEST')",[ids[4],ids[0],ids[1],ids[3]]);
    await legacy.query('INSERT INTO obligations(id,owner_user_id,account_id,budget_update_id,recorded_seq,originating_period_id) VALUES($1,$2,$3,$4,1,$5)',[ids[5],ids[0],ids[1],ids[3],ids[2]]);
    await legacy.query("INSERT INTO obligation_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,obligation_id,logical_fact_id,position_id,funding_period_id,effective_date,action,original_cents,outstanding_cents,status,is_possible,reserve_full) VALUES($1,$2,$3,$4,1,$5,$1,$6,$7,'2026-10-02','CREATE',20000,20000,'UNPAID',false,true)",[ids[6],ids[0],ids[1],ids[3],ids[5],ids[4],ids[2]]);
    await legacy.query('COMMIT');
    await expect(legacy.query(readFileSync('drizzle/0003_obligation_lifecycle_guards.sql','utf8').replaceAll('--> statement-breakpoint',''))).rejects.toMatchObject({message:expect.stringContaining('HB011_LEGACY_METADATA_REVIEW_REQUIRED')});
    expect((await legacy.query('SELECT count(*)::int AS n FROM obligation_events')).rows[0].n).toBe(1);
    expect((await legacy.query("SELECT column_name FROM information_schema.columns WHERE table_name='obligation_events' AND column_name='title'")).rows).toHaveLength(0);
  } finally {await legacy.end();}
});

async function closeFixture(f: Scope, supported = true) {
  const h=await history(f), selected=value(selectState(h,date('2026-10-31'))), states=await read(f), c=selected.checkpoint!, v=selected.vector!;
  const [period]=await db.db.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.accountId,f.accountId),eq(s.budgetPeriods.period,'2026-10')));
  const closingId=randomUUID(), headId=randomUUID();
  await commit(f,h.knowledgeCut,[change('AMEND',{effectiveDate:'2026-10-31'})],async(tx,b)=>{
    await tx.insert(s.monthClosings).values({...f,id:closingId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,periodId:period.id,version:1,
      historicalThroughDate:'2026-10-31',closedAt:b.recordedAt,closedBy:f.ownerUserId,evidenceRecordedCutoffSeq:h.knowledgeCut,evidenceRecordedCutoffAt:b.recordedAt,
      reason:'Synthetic immutable October close',changeEvidenceRefs:[],lastCheckpointId:c.id,lastBankObservedDate:c.observedDate,lastBankObservedAt:c.observedAt,lastObservedBalanceCents:c.balanceCents,
      historicalAllocationRevisionId:v.id,allocationEffectiveDate:v.effectiveDate,endCheckpointId:null,endBalanceCents:null,bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'NOT_PROVIDED',
      historicalAllocatedCents:50000n,historicalReservedCents:20000n,historicalSavingsCents:0n,historicalFreeCents:30000n,snapshotSchemaVersion:1,selectionContractVersion:1,
      snapshotJson:{synthetic:true,states:states.states.map(e=>snapshot(e))},sourceManifest:supported?{obligationRevisionIds:states.states.map(e=>e.id)}:{unsupported:true},orderingRevisionRefs:selected.orderingRevisionIds});
    await tx.insert(s.reportHeads).values({...f,id:headId,periodId:period.id,closingId});
    return [{entityType:'TEST_CLOSE',entityId:closingId,before:null,after:{headId}}];
  }); return {closingId,headId};
}
it('HB11-31 closed snapshot unchanged, only historical impact marks pending with audit',async()=>{
  const f=await fixture(), create=await latest(f), closed=await closeFixture(f);
  const [original]=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,closed.closingId));
  await next(f,'PAID','2026-11-01',{amountCents:'20000'},payment('2026-11-01','30000'));
  expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,closed.headId)))[0].correctionPending).toBe(false);
  const late=(await read(f,'2026-11-01')).states[0];
  await commit(f,4n,[change('PARTIAL_SETTLEMENT',{key:'partial',obligationId:create.obligationId,expectedStateRevisionId:create.id,effectiveDate:'2026-10-05',data:{amountCents:'5000'},...payment('2026-10-05','45000')}),
    change('PAID',{key:'paid',obligationId:create.obligationId,previousChangeKey:'partial',correctionId:late.id,effectiveDate:'2026-11-01',data:{amountCents:'15000'},paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:late.payment!.checkpointId}})]);
  expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,closed.headId)))[0]).toMatchObject({correctionPending:true,closingId:closed.closingId});
  expect((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,closed.closingId)))[0]).toEqual(original);
  const audit=await db.db.select().from(s.auditEvents).where(and(eq(s.auditEvents.accountId,f.accountId),eq(s.auditEvents.recordedSeq,5n)));
  expect(audit.some(a=>JSON.stringify(a.beforeAfter).includes('REPORT_REVIEW_REQUIRED'))).toBe(true);
});
it('HB11 unsupported report manifest rejects entire lifecycle update',async()=>{
  const f=await fixture();await closeFixture(f,false);const before=await counts(f);
  await expect(next(f,'AMEND','2026-10-03',{title:'Updated'})).rejects.toMatchObject({code:'REPORT_IMPACT_REVIEW_REQUIRED'});
  expect(await counts(f)).toEqual(before);
});
it('HB11 audit INSERT failure rolls back actual payment facts',async()=>{
  const f=await fixture(),e=await latest(f),before=await counts(f);
  await db.db.execute(sql`CREATE FUNCTION hb011_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.event_kind='HB011_AUDIT_FAIL' THEN RAISE EXCEPTION 'synthetic audit insert failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);
  await db.db.execute(sql`CREATE TRIGGER hb011_audit_fail BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION hb011_audit_fail()`);
  const c=change('PAID',{obligationId:e.obligationId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-05',data:{amountCents:'20000'},...payment('2026-10-05','30000')});
  await expect(commitBatch(db.db,{scope:f,kind:'HB011_AUDIT_FAIL',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:2n,effectiveDate:c.effectiveDate,reason:'Synthetic audit failure',payload:{changes:[c]}}))},writeObligations)).rejects.toMatchObject({code:'TRANSACTION_FAILED'});
  expect(await counts(f)).toEqual(before);
});
it('HB11-33 MAX reserve valid; one additional cent rolls back candidate',async()=>{
  const max='9223372036854775807',f=await fixture(max,true,{originalCents:max});const before=await counts(f);
  await expect(commit(f,2n,[change('CREATE',{effectiveDate:'2026-10-03',data:{...change().data,originalCents:'1'}})])).rejects.toMatchObject({code:'MONEY_RANGE'});
  expect(await counts(f)).toEqual(before);
});
it('HB11-13/32 same-period identities sum once and ordinary checkpoint retains R',async()=>{
  const f=await fixture();await commit(f,2n,[change('CREATE',{effectiveDate:'2026-10-03',data:{...change().data,originalCents:'7000'}})]);
  expect([...(await read(f)).reserves.values()]).toEqual([27000n]);
  await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:3n,effectiveDate:'2026-10-04',reason:'Synthetic actual check',payload:input('2026-10-04','45000')}))},writeBankCheckpoint);
  expect([...(await read(f)).reserves.values()]).toEqual([27000n]);expect((await history(f)).events).toHaveLength(2);
});
it('HB11-SQL canonical before rejects numeric money and extra fields',async()=>{
  const f=await fixture(),e=await latest(f),canonical=snapshot(e) as Record<string,unknown>;
  await expect(direct(f,{beforeState:{...canonical,originalCents:20000}})).rejects.toThrow();
  await expect(direct(f,{beforeState:{...canonical,extra:true}})).rejects.toThrow();
});
it('HB11 correction forks and wrong action reject without consuming a receipt',async()=>{
  const f=await fixture(),e=await latest(f);
  const c=change('CREATE',{obligationId:e.obligationId,correctionId:e.id,data:{...change().data,title:'Corrected'}});
  await commit(f,2n,[c]);const before=await counts(f);
  await expect(commit(f,3n,[c])).rejects.toMatchObject({code:'CORRECTION_CONFLICT'});
  await expect(commit(f,3n,[change('CANCELLED',{obligationId:e.obligationId,correctionId:e.id,expectedStateRevisionId:e.id})])).rejects.toThrow();
  expect(await counts(f)).toEqual(before);
});
it('HB11-SQL direct correction CREATE passes but fork, self predecessor and reserve bypass reject',async()=>{
  const f=await fixture(),e=await latest(f);
  const correction={action:'CREATE',supersedesId:e.id,logicalFactId:e.logicalFactId,previousRevisionId:null,beforeState:null,status:'UNPAID',reserveFull:true};
  await direct(f,correction);
  const before=await counts(f);
  await expect(direct(f,correction,'2026-10-21')).rejects.toMatchObject({code:'TRANSACTION_FAILED'});
  expect(await counts(f)).toEqual(before);
  const g=await fixture(),self=randomUUID(),p=await latest(g);
  await expect(direct(g,{id:self,previousRevisionId:self,beforeState:{...snapshot(p) as object,revisionId:self}})).rejects.toThrow();
  await expect(direct(g,{...correction,supersedesId:p.id,logicalFactId:p.logicalFactId,reserveFull:false})).rejects.toThrow();
});
it('HB11-34 Berlin DST offsets order co-located payment and month boundary stays distinct',async()=>{
  const f=await fixture();
  await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:2n,effectiveDate:'2026-10-25',reason:'Synthetic first DST observation',payload:input('2026-10-25','50000',{observedAt:'2026-10-25T00:30:00Z'})}))},writeBankCheckpoint);
  const h=await history(f),o=h.orderings.find(o=>o.historicalDate==='2026-10-25')!;
  await next(f,'PARTIAL_SETTLEMENT','2026-10-25',{amountCents:'5000'},{...payment('2026-10-25','45000'),bankCheck:input('2026-10-25','45000',{observedAt:'2026-10-25T01:30:00Z',placement:{expectedOrderingRevisionId:o.id,afterPositionId:o.positionIds[0],beforePositionId:null}})});
  expect((await read(f,'2026-10-25')).states[0].outstandingCents).toBe(15000n);
  await next(f,'PAID','2026-11-01',{amountCents:'15000'},{...payment('2026-11-01','30000'),bankCheck:input('2026-11-01','30000',{observedAt:'2026-10-31T23:30:00Z'})});
  expect((await read(f,'2026-10-31')).states[0].status).toBe('UNPAID');
  expect((await read(f,'2026-11-01')).states[0].status).toBe('PAID');
});
it.each([['100000','90000',false,'75400'],['50000','50000',true,'35400']] as const)('HB11 F-001/F-002 exact paid flag at B%s',async(balance,observed,ack,free)=>{
  const f=await fixture(balance,false);
  await commit(f,1n,[change('CREATE',{data:{...change().data,originalCents:'5400'}})]);const first=await latest(f);
  await commit(f,2n,[change('CREATE',{effectiveDate:'2026-10-03',data:{...change().data,originalCents:'14600'}})]);
  await commit(f,3n,[change('PAID',{obligationId:first.obligationId,expectedStateRevisionId:first.id,effectiveDate:'2026-10-05',data:{amountCents:'5400'},...payment('2026-10-05',observed,ack)})]);
  const r=await read(f,'2026-10-05','4');expect([...r.reserves.values()]).toEqual([14600n]);
  expect(BigInt(observed)-[...r.reserves.values()][0]).toBe(BigInt(free));
  expect(value(selectState(await history(f),date('2026-10-05'))).checkpoint!.balanceCents).toBe(BigInt(observed));
});
it('HB11-16 exact new B42000 with partial5000 yields R15000 and F27000',async()=>{
  const f=await fixture();await next(f,'PARTIAL_SETTLEMENT','2026-10-05',{amountCents:'5000'},payment('2026-10-05','42000'));
  const r=await read(f,'2026-10-05','3');expect([...r.reserves.values()]).toEqual([15000n]);expect(42000n-[...r.reserves.values()][0]).toBe(27000n);
});
