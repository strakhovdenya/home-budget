import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { commitBatch, type BatchWriter } from '@/infrastructure/db/commit';
import { prepareCommand } from '@/domain/updates/validation';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { writeSavings } from '@/infrastructure/db/savings-writer';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { loadObligationHistory } from '@/infrastructure/db/obligation-history';
import { createSavingReader } from '@/infrastructure/db/savings-reader';
import { loadSavingHistory } from '@/infrastructure/db/savings-history';
import { insertHistoricalPosition } from '@/infrastructure/db/historical-placement';
import { savingAuditAfter } from '@/domain/savings/evidence';
import { snapshot } from '@/domain/savings/lifecycle';
import { selectState } from '@/domain/checkpoints/history';
import { selectSavingState } from '@/domain/savings/history';
import type { SavingEvent } from '@/domain/savings/contracts';
import type { CanonicalValue } from '@/domain/updates/contracts';
import { value, input, date } from '../fixtures/checkpoints';
import * as s from '@/infrastructure/db/schema';

let db: ReturnType<typeof createDatabase>, admin: pg.Pool;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('LOCAL_TARGET_REQUIRED');
  const u = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: u.toString() });
  const name = 'hb012_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"'); u.pathname = '/' + name;
  db = createDatabase(u.toString()); await migrate(db.db, { migrationsFolder: './drizzle' });
});
afterAll(async () => { await db?.close(); await admin?.end(); });
type Scope = { ownerUserId: string; accountId: string };
function change(action = 'CREATE', overrides: Record<string, unknown> = {}): Record<string, unknown> & { effectiveDate: string; data: Record<string, unknown> } {
  return { key: 'a', action, savingsId: null, expectedStateRevisionId: null, correctionId: null, previousChangeKey: null,
    effectiveDate: '2026-10-02', placement: null, bankCheck: null,
    data: action === 'CREATE' ? { title: 'Synthetic savings', amountCents: '5000', originatingPeriod: '2026-10', fundingPeriod: '2026-10' } : {}, ...overrides };
}
async function account(f: Scope) { return (await db.db.select().from(s.accounts).where(eq(s.accounts.id, f.accountId)))[0]; }
async function commit(f: Scope, changes: ReturnType<typeof change>[], writer: BatchWriter = writeSavings, requestId = randomUUID(), expected?: bigint, kind='SAVINGS_TEST') {
  return commitBatch(db.db, { scope: f, kind, command: value(prepareCommand({ requestId, expectedRevision: expected ?? (await account(f)).aggregateRevision,
    effectiveDate: changes[0].effectiveDate, reason: 'Synthetic explicit reviewed saving', payload: { changes } })) }, writer);
}
async function fixture(create = true, amount = '5000') {
  const f = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await db.db.insert(s.users).values({ id: f.ownerUserId });
  await db.db.insert(s.accounts).values({ id: f.accountId, ownerUserId: f.ownerUserId, displayName: 'Synthetic HB012' });
  await commitBatch(db.db, { scope: f, kind: 'BANK_CHECKPOINT', command: value(prepareCommand({ requestId: randomUUID(), expectedRevision: 0n,
    effectiveDate: '2026-10-01', reason: 'Synthetic actual bank observation', payload: input('2026-10-01', '40000') })) }, writeBankCheckpoint);
  if (create) await commit(f, [change('CREATE', { data: { ...change().data, amountCents: amount } })]);
  return f;
}
async function history(f: Scope) { return loadSavingHistory(db.db, f, (await account(f)).recordedSeq); }
async function read(f: Scope, through='2026-10-31', cut: bigint | null = null) { return createSavingReader(db).read(f,date(through),cut); }
async function latest(f: Scope) { return value(await read(f,'2026-11-02')).states[0]; }
async function next(f: Scope, action: string, day: string, amount='2000', extra: Record<string, unknown>={}) {
  const e=await latest(f);
  return commit(f,[change(action,{savingsId:e.savingsId,expectedStateRevisionId:e.id,effectiveDate:day,data:action==='AMEND'?{title:amount}:{amountCents:amount},...extra})]);
}
/** All scoped table contents, not counts alone: flags/heads/counters and original facts are compared. */
async function baseline(f: Scope) {
  const tables=[s.budgetUpdates,s.budgetPeriods,s.savingsGoals,s.savingsEvents,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,
    s.historicalPositions,s.orderingRevisions,s.auditEvents,s.obligations,s.obligationEvents,s.transitionDecisions,s.budgetTransfers,s.transferProposals,s.monthClosings,s.reportHeads];
  return { account: await account(f), rows: await Promise.all(tables.map(t=>db.db.select().from(t).where(eq(t.accountId,f.accountId)).orderBy(t.id))) };
}
async function unchangedFailure(f: Scope, operation: () => Promise<unknown>, code?: string) {
  const before=await baseline(f);
  if(code) await expect(operation()).rejects.toMatchObject({code}); else await expect(operation()).rejects.toThrow();
  expect(await baseline(f)).toEqual(before);
}
it('HB12-S01..S10/E01/E02 full voluntary lifecycle, evidence and unchanged bank head',async()=>{
  const f=await fixture(),original=await account(f),first=await latest(f);
  await next(f,'INCREASE','2026-10-03','3000');expect((await latest(f)).amountCents).toBe(8000n);
  await next(f,'PARTIAL_RELEASE','2026-10-04','2000');expect((await latest(f)).amountCents).toBe(6000n);
  await unchangedFailure(f,()=>next(f,'PARTIAL_RELEASE','2026-10-05','7000'),'RELEASE_AMOUNT_EXCEEDS_SAVING');
  for(const amount of ['0','-1']) await unchangedFailure(f,()=>next(f,'PARTIAL_RELEASE','2026-10-05',amount),'INVALID_SAVING');
  await next(f,'FULL_RELEASE','2026-10-05','6000');expect(await latest(f)).toMatchObject({savingsId:first.savingsId,status:'RELEASED',amountCents:0n,confirmedReleasedAmount:6000n});
  await unchangedFailure(f,()=>next(f,'FULL_RELEASE','2026-10-06','6000'),'TERMINAL_SAVING');
  expect((await account(f)).activeAllocationRevisionId).toBe(original.activeAllocationRevisionId);
  const h=await history(f);expect(h.checkpoints).toHaveLength(1);expect(h.vectors).toHaveLength(1);
  expect(h.savings.map(e=>e.confirmedReleasedAmount)).toContain(2000n);
  const g=await fixture();await next(g,'PARTIAL_RELEASE','2026-10-03');
  expect(40000n-20000n-(await latest(g)).amountCents).toBe(17000n);
});
it('HB12-S26/E08/E09/O01 reviewed suffix has two revisions, two savings audits and all nine H/K cuts',async()=>{
  const f=await fixture(),rC=await latest(f);await next(f,'PARTIAL_RELEASE','2026-10-20','2000');
  const rL=await latest(f),k11=(await account(f)).recordedSeq;
  const originalAudit=await db.db.select().from(s.auditEvents).where(and(eq(s.auditEvents.accountId,f.accountId),eq(s.auditEvents.recordedSeq,k11)));
  const increase=change('INCREASE',{key:'inc',savingsId:rC.savingsId,expectedStateRevisionId:rC.id,effectiveDate:'2026-10-10',data:{amountCents:'3000'}});
  await unchangedFailure(f,()=>commit(f,[increase]),'HISTORICAL_SAVINGS_CONFLICT');
  const receipt=await commit(f,[increase,change('PARTIAL_RELEASE',{key:'correct',savingsId:rC.savingsId,previousChangeKey:'inc',correctionId:rL.id,
    effectiveDate:'2026-10-20',data:{amountCents:'2000'}})]);
  const k12=BigInt(receipt.recordedSeq),h=await history(f),rI=h.savings.find(e=>e.action==='INCREASE')!,rLC=h.savings.find(e=>e.supersedesId===rL.id)!;
  expect(k12).toBe(k11+1n);expect(BigInt(receipt.aggregateRevision)).toBe(k12);
  expect(rI).toMatchObject({previousRevisionId:rC.id,confirmedIncreaseAmount:3000n,amountCents:8000n});
  expect(rLC).toMatchObject({previousRevisionId:rI.id,positionId:rL.positionId,logicalFactId:rL.logicalFactId,confirmedReleasedAmount:2000n,amountCents:6000n,budgetUpdateId:rI.budgetUpdateId});
  expect(rLC.beforeState).toEqual(snapshot(rI));expect(h.savings.find(e=>e.id===rL.id)).toEqual(rL);
  expect(await db.db.select().from(s.auditEvents).where(and(eq(s.auditEvents.accountId,f.accountId),eq(s.auditEvents.recordedSeq,k11)))).toEqual(originalAudit);
  const assertions=[['2026-10-01',k12,null,0n],['2026-10-02',k11,rC.id,5000n],['2026-10-10',k11,rC.id,5000n],['2026-10-20',k11,rL.id,3000n],
    ['2026-10-02',k12,rC.id,5000n],['2026-10-10',k12,rI.id,8000n],['2026-10-19',k12,rI.id,8000n],['2026-10-20',k12,rLC.id,6000n],['2026-10-31',k12,rLC.id,6000n]] as const;
  for(const [day,k,id,amount] of assertions){const selected=value(await read(f,day,k));expect(selected.states[0]?.id??null).toBe(id);expect(selected.states[0]?.amountCents??0n).toBe(amount);}
  const audits=await db.db.select().from(s.auditEvents).where(and(eq(s.auditEvents.accountId,f.accountId),eq(s.auditEvents.recordedSeq,k12)));
  const savingAudits=audits.filter(a=>(a.beforeAfter as {entity:{type:string}}).entity.type==='SAVINGS_STATE');expect(savingAudits).toHaveLength(2);
  expect(savingAudits.map(a=>(a.beforeAfter as {entity:{id:string}}).entity.id).sort()).toEqual([rI.id,rLC.id].sort());
  expect((await db.db.select().from(s.historicalPositions).where(and(eq(s.historicalPositions.accountId,f.accountId),eq(s.historicalPositions.recordedSeq,k12))))).toHaveLength(1);
});

/** Direct parameterized SQL bypasses saving validators and intentionally stores incomplete/malformed evidence. */
async function direct(f: Scope, options: { full?: boolean; increase?: boolean; evidence?: string; override?: Record<string,unknown> }={}) {
  const p=await latest(f),h=await history(f);
  const foreign=options.evidence==='scope'?await fixture():null,foreignEvent=foreign?await latest(foreign):null;
  return commit(f,[change()],async(tx,b)=>{
    const id=randomUUID(),positionId=randomUUID();
    const placed=await insertHistoricalPosition(tx,b,h,date('2026-10-20'),positionId,null,'SYNTHETIC_SQL');
    const e:SavingEvent={...p,id,logicalFactId:id,supersedesId:null,previousRevisionId:p.id,beforeState:snapshot(p),positionId,effectiveDate:date('2026-10-20'),
      confirmedAt:b.recordedAt,recordedSeq:b.recordedSeq,budgetUpdateId:b.id,action:options.full?'FULL_RELEASE':'PARTIAL_RELEASE',
      status:options.full?'RELEASED':'ACTIVE',amountCents:options.full?0n:3000n,confirmedIncreaseAmount:null,confirmedReleasedAmount:options.full?5000n:2000n};
    if(options.increase) Object.assign(e,{action:'INCREASE',amountCents:8000n,confirmedIncreaseAmount:3000n,confirmedReleasedAmount:null});
    const row={...e,...options.override};
    await tx.execute(sql`INSERT INTO savings_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,savings_id,previous_revision_id,supersedes_id,logical_fact_id,position_id,funding_period_id,effective_date,confirmed_at,action,before_state,amount_cents,status,title)
      VALUES(${row.id},${f.ownerUserId},${f.accountId},${b.id},${b.recordedSeq},${row.savingsId},${row.previousRevisionId},${row.supersedesId},${row.logicalFactId},${row.positionId},${row.fundingPeriodId},${row.effectiveDate},${row.confirmedAt},${row.action},${JSON.stringify(row.beforeState)}::jsonb,${row.amountCents},${row.status},${row.title})`);
    const after=savingAuditAfter(e) as Record<string,CanonicalValue>;
    if(options.evidence==='missing') return [placed.audit];
    if(options.evidence==='amount') after.confirmedReleasedAmount='1999';
    if(options.evidence==='number') after.confirmedReleasedAmount=2000;
    if(options.evidence==='fraction') after.confirmedReleasedAmount='2000.5';
    if(options.evidence==='canonical') after.confirmedReleasedAmount='02000';
    if(options.evidence==='absent') delete after.confirmedReleasedAmount;
    if(options.evidence==='revision') after.savingsRevisionId=randomUUID();
    if(options.evidence==='batch') after.budgetUpdateId=randomUUID();
    if(options.evidence==='predecessor') after.beforeRevisionId=randomUUID();
    if(options.evidence==='snapshot') after.stateAfter={...snapshot(e) as object,amountCents:'3001'};
    if(foreign && foreignEvent){
      await tx.execute(sql`INSERT INTO audit_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,event_kind,effective_date,reason,before_after)
        VALUES(${randomUUID()},${foreign.ownerUserId},${foreign.accountId},${foreignEvent.budgetUpdateId},${foreignEvent.recordedSeq},'SYNTHETIC_SQL','2026-10-20','Synthetic foreign evidence',${JSON.stringify({schemaVersion:1,eventIndex:0,entity:{type:'SAVINGS_STATE',id},before:e.beforeState,after})}::jsonb)`);
      return [placed.audit];
    }
    if(options.evidence==='seq') {
      await tx.execute(sql`INSERT INTO audit_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,event_kind,effective_date,reason,before_after)
        VALUES(${randomUUID()},${f.ownerUserId},${f.accountId},${p.budgetUpdateId},${p.recordedSeq},'SYNTHETIC_SQL','2026-10-20','Synthetic wrong evidence sequence',${JSON.stringify({schemaVersion:1,eventIndex:0,entity:{type:'SAVINGS_STATE',id},before:e.beforeState,after})}::jsonb)`);
      return [placed.audit];
    }
    const audit={entityType:'SAVINGS_STATE',entityId:id,before:e.beforeState,after};
    return options.evidence==='duplicate'?[placed.audit,audit,audit]:[placed.audit,audit];
  });
}
it.each([false,true].flatMap(full=>['missing','amount','number','fraction','canonical','absent','revision','batch','predecessor','snapshot','duplicate','seq','scope'].map(evidence=>({full,evidence}))))('HB12-E03..E07 direct SQL $evidence full=$full refuses read and write without fallback',async({full,evidence})=>{
  const f=await fixture();await direct(f,{evidence,full});
  expect(await read(f)).toEqual({ok:false,code:'HISTORICAL_SAVINGS_CONFLICT'});
  await unchangedFailure(f,()=>commit(f,[change('CREATE',{effectiveDate:'2026-10-21'})]),'HISTORICAL_SAVINGS_CONFLICT');
});
it('HB12-E03 FULL_RELEASE missing evidence refuses and E10 immutable history',async()=>{
  const f=await fixture(),p=await latest(f);await direct(f,{full:true,evidence:'missing'});
  expect(await read(f)).toEqual({ok:false,code:'HISTORICAL_SAVINGS_CONFLICT'});
  const audits=await db.db.select().from(s.auditEvents).where(eq(s.auditEvents.accountId,f.accountId));
  await expect(db.db.update(s.savingsEvents).set({amountCents:1n}).where(eq(s.savingsEvents.id,p.id))).rejects.toThrow();
  await expect(db.db.delete(s.savingsEvents).where(eq(s.savingsEvents.id,p.id))).rejects.toThrow();
  await expect(db.db.update(s.auditEvents).set({beforeAfter:{}}).where(eq(s.auditEvents.id,audits[0].id))).rejects.toThrow();
  await expect(db.db.delete(s.auditEvents).where(eq(s.auditEvents.id,audits[0].id))).rejects.toThrow();
});
it('HB12 immutable INCREASE evidence never inferred; older K remains readable',async()=>{
  const f=await fixture(),k=(await account(f)).recordedSeq;await direct(f,{increase:true,evidence:'missing'});
  expect(await read(f)).toEqual({ok:false,code:'HISTORICAL_SAVINGS_CONFLICT'});
  expect(value(await read(f,'2026-10-31',k)).states[0].amountCents).toBe(5000n);
  await unchangedFailure(f,()=>commit(f,[change('CREATE',{effectiveDate:'2026-10-21'})]),'HISTORICAL_SAVINGS_CONFLICT');
});
it('HB12-O02/O07 two fresh positions per day roll back including a co-located checkpoint',async()=>{
  for(const combined of [false,true]){
    const f=await fixture(false),c=change('CREATE',{effectiveDate:'2026-10-03',bankCheck:combined?input('2026-10-03','40000'):null});
    await unchangedFailure(f,()=>commit(f,[c,change('CREATE',{key:'second',effectiveDate:'2026-10-03'})]),'ORDERING_CONFLICT');
  }
});
it('HB12-O06/S22 co-located actual check/vector/savings one position and one counter increment',async()=>{
  const f=await fixture(),p=await latest(f),before=await account(f);
  await next(f,'PARTIAL_RELEASE','2026-10-03','2000',{bankCheck:input('2026-10-03','40000')});
  const h=await history(f),e=await latest(f),c=h.checkpoints.find(c=>c.positionId===e.positionId)!;
  expect(c.balanceCents).toBe(40000n);expect(h.vectors.find(v=>v.positionId===e.positionId)?.checkpointId).toBe(c.id);
  expect(e).toMatchObject({amountCents:3000n,savingsId:p.savingsId});
  expect((await account(f)).recordedSeq).toBe(before.recordedSeq+1n);
  expect(h.positions.filter(p=>p.historicalDate==='2026-10-03')).toHaveLength(1);
  await unchangedFailure(f,()=>commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:(before.aggregateRevision+1n),effectiveDate:'2026-10-03',reason:'Synthetic attached correction',payload:input('2026-10-03','40000',{correction:{checkpointId:c.id,allocationRevisionId:h.vectors.find(v=>v.checkpointId===c.id)!.id,reposition:false}})}))},writeBankCheckpoint),'HISTORICAL_STATE_CONFLICT');
});
it('HB12-O03/O05 same-day corrections reuse positions and may depend on a same-batch earlier corrected revision',async()=>{
  const f=await fixture(),c=await latest(f),h=await history(f),day=h.orderings.find(o=>o.historicalDate===c.effectiveDate)!;
  await next(f,'INCREASE',c.effectiveDate,'1000',{placement:{expectedOrderingRevisionId:day.id,afterPositionId:c.positionId,beforePositionId:null}});
  const inc=await latest(f),count=(await history(f)).positions.length;
  await commit(f,[change('CREATE',{key:'root',savingsId:c.savingsId,correctionId:c.id,data:{...change().data,title:'Corrected'}}),
    change('INCREASE',{key:'child',savingsId:c.savingsId,previousChangeKey:'root',correctionId:inc.id,effectiveDate:c.effectiveDate,data:{amountCents:'1000'}})]);
  expect((await latest(f)).amountCents).toBe(6000n);expect((await history(f)).positions).toHaveLength(count);
});
it('HB12-O04/O08 same-position or reversed dependency is refused with full rollback',async()=>{
  const f=await fixture(),c=await latest(f);
  await unchangedFailure(f,async()=>commit(f,[change('INCREASE',{savingsId:c.savingsId,expectedStateRevisionId:c.id,effectiveDate:'2026-10-01',data:{amountCents:'1000'},placement:{expectedOrderingRevisionId:(await history(f)).orderings.find(o=>o.historicalDate==='2026-10-01')!.id,afterPositionId:null,beforePositionId:(await history(f)).positions.find(p=>p.historicalDate==='2026-10-01')!.id}})]),'ORDERING_CONFLICT');
  const h=await history(f),forged={...c,id:randomUUID(),logicalFactId:randomUUID(),action:'INCREASE' as const,previousRevisionId:c.id,beforeState:snapshot(c),amountCents:6000n,confirmedIncreaseAmount:1000n};
  expect(selectSavingState({...h,savings:[...h.savings,forged]},date('2026-10-31'))).toEqual({ok:false,code:'HISTORICAL_SAVINGS_CONFLICT'});
});
it('HB12-S28 correction CREATE accepted; original K retained',async()=>{
  const f=await fixture(),c=await latest(f),k=(await account(f)).recordedSeq;
  await commit(f,[change('CREATE',{savingsId:c.savingsId,correctionId:c.id,data:{...change().data,amountCents:'6000'}})]);
  expect((await latest(f)).amountCents).toBe(6000n);expect(value(await read(f,'2026-10-31',k)).states[0].amountCents).toBe(5000n);
});
it('HB12-S25 incompatible correction cannot change confirmed release or historical remainder',async()=>{
  const f=await fixture(true,'6000'),c=await latest(f);await next(f,'PARTIAL_RELEASE','2026-10-20','5000');const release=await latest(f);
  await unchangedFailure(f,()=>commit(f,[change('CREATE',{savingsId:c.savingsId,correctionId:c.id,data:{...change().data,amountCents:'4000'}})]),'HISTORICAL_SAVINGS_CONFLICT');
  await unchangedFailure(f,()=>commit(f,[change('PARTIAL_RELEASE',{savingsId:c.savingsId,expectedStateRevisionId:c.id,correctionId:release.id,effectiveDate:release.effectiveDate,data:{amountCents:'4000'}})]),'HISTORICAL_SAVINGS_CONFLICT');
});
it('HB12-S29 direct SQL identity, correction and terminal bypass reject',async()=>{
  const f=await fixture(),first=await latest(f);
  await commit(f,[change('CREATE',{effectiveDate:'2026-10-03'})]);const all=value(await read(f)).states,other=all.find(e=>e.id!==first.id)!;
  await unchangedFailure(f,()=>direct(f,{override:{previousRevisionId:other.id,beforeState:snapshot(other),savingsId:first.savingsId}}),'TRANSACTION_FAILED');
  await unchangedFailure(f,()=>direct(f,{override:{action:'CREATE',savingsId:other.savingsId,supersedesId:first.id,logicalFactId:first.logicalFactId,previousRevisionId:null,beforeState:null,positionId:first.positionId,effectiveDate:first.effectiveDate}}),'TRANSACTION_FAILED');
  const g=await fixture(),root=await latest(g);await next(g,'FULL_RELEASE','2026-10-03','5000');
  await unchangedFailure(g,()=>direct(g,{override:{previousRevisionId:root.id,beforeState:snapshot(root)}}),'TRANSACTION_FAILED');
});
it('HB12-S30..S33 replay before stale, payload conflict and real concurrent release',async()=>{
  const f=await fixture(),c=await latest(f),a=await account(f),q=randomUUID();
  const changes=[change('PARTIAL_RELEASE',{savingsId:c.savingsId,expectedStateRevisionId:c.id,effectiveDate:'2026-10-03',data:{amountCents:'2000'}})];
  const receipt=await commit(f,changes,writeSavings,q,a.aggregateRevision);const stored=await baseline(f);
  expect(await commit(f,changes,writeSavings,q,a.aggregateRevision)).toEqual(receipt);expect(await baseline(f)).toEqual(stored);
  await unchangedFailure(f,()=>commit(f,[{...changes[0],data:{amountCents:'1000'}}],writeSavings,q,a.aggregateRevision),'REQUEST_PAYLOAD_CONFLICT');
  await unchangedFailure(f,()=>commit(f,changes,writeSavings,randomUUID(),a.aggregateRevision),'STALE_REVISION');
  const g=await fixture(),e=await latest(g),rev=(await account(g)).aggregateRevision;
  const release=[change('PARTIAL_RELEASE',{savingsId:e.savingsId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-03',data:{amountCents:'4000'}})];
  let unlock!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>{unlock=r;}),locked=new Promise<void>(r=>{entered=r;});
  const first=commit(g,release,async(tx,b)=>{entered();await gate;return writeSavings(tx,b);},randomUUID(),rev);
  await locked;const second=commit(g,release,writeSavings,randomUUID(),rev);unlock();
  const results=await Promise.allSettled([first,second]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.code).toBe('STALE_REVISION');expect((await latest(g)).amountCents).toBe(1000n);
});
it('HB12-S34 actual audit INSERT failure rolls back savings and bank',async()=>{
  const f=await fixture();
  await db.db.execute(sql`CREATE FUNCTION hb012_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_kind='HB012_FAIL_AUDIT' THEN RAISE EXCEPTION 'synthetic' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);
  await db.db.execute(sql`CREATE TRIGGER hb012_fail_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION hb012_fail_audit()`);
  const e=await latest(f);
  await unchangedFailure(f,()=>commit(f,[change('PARTIAL_RELEASE',{savingsId:e.savingsId,expectedStateRevisionId:e.id,effectiveDate:'2026-10-03',data:{amountCents:'2000'},bankCheck:input('2026-10-03','40000')})],writeSavings,randomUUID(),undefined,'HB012_FAIL_AUDIT'),'TRANSACTION_FAILED');
});
it.each([
  ['unknown action',{action:'REOPEN'}],['wrong before',{beforeState:{}}],['missing predecessor',{previousRevisionId:null}],
  ['position date',{effectiveDate:'2026-10-19'}],['zero ACTIVE',{amountCents:0n}],['RELEASED positive',{status:'RELEASED'}],
  ['increase direction',{action:'INCREASE'}],['AMEND amount',{action:'AMEND'}],['funding change',{fundingPeriodId:randomUUID()}],
  ['blank title',{title:' '}],['long title',{title:'😀'.repeat(201)}],['duplicate CREATE',{action:'CREATE',previousRevisionId:null,beforeState:null}],
] as const)('HB12-S35 direct SQL negative %s rolls back every table',async(_name,override)=>{const f=await fixture();await unchangedFailure(f,()=>direct(f,{override}),'TRANSACTION_FAILED');});
it('HB12-S36 foreign identity/scope denied and S40 aggregate overflow rolls back',async()=>{
  const f=await fixture(),g=await fixture(),foreign=await latest(g);
  expect(await createSavingReader(db).read({...f,accountId:g.accountId},date('2026-10-31'),null)).toEqual({ok:false,code:'FORBIDDEN'});
  await unchangedFailure(f,()=>next(f,'PARTIAL_RELEASE','2026-10-03','1000',{expectedStateRevisionId:foreign.id}),'STALE_SAVING');
  const max=await fixture(true,'9223372036854775807');await unchangedFailure(max,()=>next(max,'INCREASE','2026-10-03','1'),'MONEY_RANGE');
  await unchangedFailure(max,()=>commit(max,[change('CREATE',{effectiveDate:'2026-10-03',data:{...change().data,amountCents:'1'}})]),'MONEY_RANGE');
});
it('HB12 migration replay has five entries, nineteen tables',async()=>{
  await migrate(db.db,{migrationsFolder:'./drizzle'});await migrate(db.db,{migrationsFolder:'./drizzle'});
  expect((await db.db.execute(sql`SELECT * FROM drizzle.__drizzle_migrations`)).rows).toHaveLength(5);
  expect((await db.db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)).rows).toHaveLength(19);
});

async function closeFixture(f: Scope, supported=true) {
  const h=await history(f),bank=value(selectState(h,date('2026-10-31'))),states=value(await read(f)),c=bank.checkpoint!,v=bank.vector!;
  const [period]=await db.db.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.accountId,f.accountId),eq(s.budgetPeriods.period,'2026-10')));
  const closingId=randomUUID(),headId=randomUUID();
  await commit(f,[change()],async(tx,b)=>{
    await tx.insert(s.monthClosings).values({...f,id:closingId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,periodId:period.id,version:1,
      historicalThroughDate:'2026-10-31',closedAt:b.recordedAt,closedBy:f.ownerUserId,evidenceRecordedCutoffSeq:h.knowledgeCut,evidenceRecordedCutoffAt:b.recordedAt,
      reason:'Synthetic October close',changeEvidenceRefs:[],lastCheckpointId:c.id,lastBankObservedDate:c.observedDate,lastBankObservedAt:c.observedAt,lastObservedBalanceCents:c.balanceCents,
      historicalAllocationRevisionId:v.id,allocationEffectiveDate:v.effectiveDate,endCheckpointId:null,endBalanceCents:null,bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'NOT_PROVIDED',
      historicalAllocatedCents:40000n,historicalReservedCents:0n,historicalSavingsCents:5000n,historicalFreeCents:35000n,snapshotSchemaVersion:1,selectionContractVersion:1,
      snapshotJson:{synthetic:true,states:states.states.map(e=>snapshot(e))},sourceManifest:supported?{savingsRevisionIds:states.states.map(e=>e.id),obligationRevisionIds:[]}:{savingsRevisionIds:[]},orderingRevisionRefs:bank.orderingRevisionIds});
    await tx.insert(s.reportHeads).values({...f,id:headId,periodId:period.id,closingId});
    const sept=randomUUID(),oldClosing=randomUUID();
    await tx.insert(s.budgetPeriods).values({...f,id:sept,period:'2026-09'});
    await tx.insert(s.monthClosings).values({...f,id:oldClosing,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,periodId:sept,version:1,
      historicalThroughDate:'2026-09-30',closedAt:b.recordedAt,closedBy:f.ownerUserId,evidenceRecordedCutoffSeq:h.knowledgeCut,evidenceRecordedCutoffAt:b.recordedAt,
      reason:'Synthetic unrelated September close',changeEvidenceRefs:[],bankDataCompleteness:'NO_OBSERVATION',operationDetailStatus:'NOT_PROVIDED',
      historicalReservedCents:0n,historicalSavingsCents:0n,snapshotSchemaVersion:1,selectionContractVersion:1,snapshotJson:{synthetic:true},sourceManifest:{savingsRevisionIds:[],obligationRevisionIds:[]},orderingRevisionRefs:[]});
    await tx.insert(s.reportHeads).values({...f,id:randomUUID(),periodId:sept,closingId:oldClosing});
    return [{entityType:'TEST_CLOSE',entityId:closingId,before:null,after:{headId}}];
  });return {closingId,headId};
}
it('HB12-S37/S38 immutable closing; only actual historical savings impact marks pending',async()=>{
  const f=await fixture(),c=await latest(f),closed=await closeFixture(f);
  const original=(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,closed.closingId)))[0];
  await next(f,'PARTIAL_RELEASE','2026-11-01','2000');const late=await latest(f);
  expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,closed.headId)))[0].correctionPending).toBe(false);
  await commit(f,[change('CREATE',{key:'root',savingsId:c.savingsId,correctionId:c.id,data:{...change().data,amountCents:'6000'}}),
    change('PARTIAL_RELEASE',{key:'late',savingsId:c.savingsId,correctionId:late.id,previousChangeKey:'root',effectiveDate:'2026-11-01',data:{amountCents:'2000'}})]);
  expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,closed.headId)))[0]).toMatchObject({closingId:closed.closingId,correctionPending:true});
  expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.accountId,f.accountId))).filter(r=>r.id!==closed.headId).every(r=>!r.correctionPending)).toBe(true);
  expect((await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,closed.closingId)))[0]).toEqual(original);
});
it('HB12-S39 invalid source manifest refuses atomically',async()=>{
  const f=await fixture();await closeFixture(f,false);
  await unchangedFailure(f,()=>next(f,'PARTIAL_RELEASE','2026-11-01'),'REPORT_IMPACT_REVIEW_REQUIRED');
});
it('HB12 report drift cannot be hidden by a bank writer setting pending earlier in the same batch',async()=>{
  const f=await fixture();await closeFixture(f);await direct(f); // Privileged SQL bypasses report marking, leaving valid savings but unexplained report drift.
  await unchangedFailure(f,async()=>commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account(f)).aggregateRevision,
    effectiveDate:'2026-10-15',reason:'Synthetic bank impact with unexplained savings drift',payload:input('2026-10-15','39000')}))},writeBankCheckpoint),'REPORT_IMPACT_REVIEW_REQUIRED');
});
it('HB12-S20/S21/S42/S43 savings-only does not refresh B; ordinary checkpoint/calendar retain savings',async()=>{
  const f=await fixture(),e=await latest(f),a=await account(f);
  await next(f,'AMEND','2026-10-03','Renamed');expect((await latest(f)).amountCents).toBe(5000n);
  expect((await account(f)).activeAllocationRevisionId).toBe(a.activeAllocationRevisionId);
  await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account(f)).aggregateRevision,effectiveDate:'2026-10-04',reason:'Synthetic actual changed B',payload:input('2026-10-04','1000')}))},writeBankCheckpoint);
  expect(value(await read(f,'2026-11-01')).states[0]).toMatchObject({savingsId:e.savingsId,fundingPeriodId:e.fundingPeriodId,amountCents:5000n});
});
it('HB12-S19/S27 same-day bank/obligation/savings positions retain independent full R and S',async()=>{
  const f=await fixture(false);
  const obligation={key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:'2026-10-02',bankDate:null,bankCheck:null,paymentConfirmation:null,placement:null,
    data:{title:'Synthetic obligation',dueDate:null,originalCents:'20000',isPossible:false,reserveFull:true,originatingPeriod:'2026-10',fundingPeriod:'2026-10'}};
  await commitBatch(db.db,{scope:f,kind:'OBLIGATION_TEST',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:1n,effectiveDate:'2026-10-02',reason:'Synthetic obligation',payload:{changes:[obligation]}}))},writeObligations);
  const before=await history(f),order=before.orderings.find(o=>o.historicalDate==='2026-10-02')!;
  await commit(f,[change('CREATE',{placement:{expectedOrderingRevisionId:order.id,afterPositionId:order.positionIds[0],beforePositionId:null}})]);
  const h=await history(f),saving=await latest(f);
  expect(value(selectSavingState(h,date('2026-10-02'),order.positionIds[0])).states).toEqual([]);
  expect(value(selectSavingState(h,date('2026-10-02'),saving.positionId)).states[0].amountCents).toBe(5000n);
  const oh=await loadObligationHistory(db.db,f,(await account(f)).recordedSeq),o=oh.events[0];
  await commitBatch(db.db,{scope:f,kind:'OBLIGATION_TEST',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account(f)).aggregateRevision,effectiveDate:'2026-10-03',reason:'Synthetic full reserve edit',payload:{changes:[{...obligation,action:'AMEND',obligationId:o.obligationId,expectedStateRevisionId:o.id,effectiveDate:'2026-10-03',data:{originalCents:'25000'}}]}}))},writeObligations);
  expect(await latest(f)).toEqual(saving);expect(40000n-25000n-saving.amountCents).toBe(10000n);
});
it('HB12-S41 PostgreSQL DST and Berlin month boundary preserve savings funding and historical cuts',async()=>{
  const f=await fixture(),saving=await latest(f);
  await commitBatch(db.db,{scope:f,kind:'BANK_CHECKPOINT',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:(await account(f)).aggregateRevision,effectiveDate:'2026-10-25',reason:'Synthetic first DST observation',payload:input('2026-10-25','40000',{observedAt:'2026-10-25T00:30:00Z'})}))},writeBankCheckpoint);
  const h=await history(f),o=h.orderings.find(o=>o.historicalDate==='2026-10-25')!;
  await next(f,'PARTIAL_RELEASE','2026-10-25','2000',{bankCheck:input('2026-10-25','40000',{observedAt:'2026-10-25T01:30:00Z',placement:{expectedOrderingRevisionId:o.id,afterPositionId:o.positionIds[0],beforePositionId:null}})});
  expect(value(await read(f,'2026-10-24')).states[0].amountCents).toBe(5000n);expect(value(await read(f,'2026-10-25')).states[0].amountCents).toBe(3000n);
  await next(f,'AMEND','2026-11-01','New title',{bankCheck:input('2026-11-01','40000',{observedAt:'2026-10-31T23:30:00Z'})});
  expect(await latest(f)).toMatchObject({fundingPeriodId:saving.fundingPeriodId,savingsId:saving.savingsId,amountCents:3000n});
  expect(value(await read(f,'2026-10-31')).states[0].title).toBe(saving.title);
});
it('HB12-0004 legacy savings migration refuses without invented metadata',async()=>{
  const u=new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL),name='hb012_legacy_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;const legacy=new pg.Pool({connectionString:u.toString()});
  try{
    for(const file of ['0000_foundation.sql','0001_integrity.sql','0002_checkpoint_positions.sql','0003_obligation_lifecycle_guards.sql'])await legacy.query(readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
    const [owner,acct,period,batch,pos,goal,event]=Array.from({length:7},()=>randomUUID());
    await legacy.query('BEGIN');await legacy.query('INSERT INTO users(id) VALUES($1)',[owner]);
    await legacy.query("INSERT INTO accounts(id,owner_user_id,display_name) VALUES($1,$2,'Synthetic')",[acct,owner]);
    await legacy.query("INSERT INTO budget_periods(id,owner_user_id,account_id,period) VALUES($1,$2,$3,'2026-10')",[period,owner,acct]);
    await legacy.query("INSERT INTO budget_updates(id,owner_user_id,account_id,request_id,payload_identity,expected_revision,recorded_seq,actor_id,kind,result) VALUES($1,$2,$3,$4,'synthetic',0,1,$2,'TEST','{}')",[batch,owner,acct,randomUUID()]);
    await legacy.query("INSERT INTO historical_positions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,kind) VALUES($1,$2,$3,$4,1,'2026-10-02','TEST')",[pos,owner,acct,batch]);
    await legacy.query('INSERT INTO savings_goals(id,owner_user_id,account_id,budget_update_id,recorded_seq,originating_period_id) VALUES($1,$2,$3,$4,1,$5)',[goal,owner,acct,batch,period]);
    await legacy.query("INSERT INTO savings_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,savings_id,logical_fact_id,position_id,funding_period_id,effective_date,action,amount_cents,status) VALUES($1,$2,$3,$4,1,$5,$1,$6,$7,'2026-10-02','CREATE',5000,'ACTIVE')",[event,owner,acct,batch,goal,pos,period]);await legacy.query('COMMIT');
    await expect(legacy.query(readFileSync('drizzle/0004_savings_lifecycle_guards.sql','utf8').replaceAll('--> statement-breakpoint',''))).rejects.toMatchObject({message:expect.stringContaining('HB012_LEGACY_METADATA_REVIEW_REQUIRED')});
    expect((await legacy.query('SELECT count(*)::int AS n FROM savings_events')).rows[0].n).toBe(1);
    expect((await legacy.query("SELECT column_name FROM information_schema.columns WHERE table_name='savings_events' AND column_name='title'")).rows).toHaveLength(0);
  }finally{await legacy.end();}
});
