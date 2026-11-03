import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { createManagementReader } from '@/infrastructure/db/management-reader';
import { createBudgetRepository } from '@/infrastructure/db/budget-update-repository';
import { prepareCommand } from '@/domain/updates/validation';
import { checkpoint, createObligation, createSaving } from '../fixtures/budget-update';
import { value } from '../fixtures/checkpoints';
import { transitionCalendar } from '../fixtures/transition-calendar';
import * as s from '@/infrastructure/db/schema';
import type { UpdateSeed } from '@/features/budget-updates/presentation';

let db:ReturnType<typeof createDatabase>,admin:pg.Pool,calendar:ReturnType<typeof transitionCalendar>;
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_DB_REQUIRED');
  const target=requireLocalDatabaseTargets(process.env),u=new URL(target.TEST_DATABASE_URL);
  admin=new pg.Pool({connectionString:u.toString()});const name='hb018_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;db=createDatabase(u.toString());
  await migrate(db.db,{migrationsFolder:'./drizzle'});
  const clock=await db.db.execute<{today:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS today`);
  calendar=transitionCalendar(clock.rows[0].today);
});
afterAll(async()=>{await db?.close();await admin?.end();});
async function fixture(){const scope={ownerUserId:randomUUID(),accountId:randomUUID()};
  await db.db.insert(s.users).values({id:scope.ownerUserId});await db.db.insert(s.accounts).values({...scope,id:scope.accountId,displayName:'HB018 synthetic'});
  return {scope,repo:createBudgetRepository(db),reader:createManagementReader(db)};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function command(f:Fixture,os:unknown[]=[],ss:unknown[]=[],bank='100000',nov='80000',reuse=false){
  const seed=value(await f.repo.load(f.scope)) as unknown as UpdateSeed;
  const initial=!seed.baseCheckpointId;
  const day=initial?calendar.pastDay(2):calendar.today;
  const placement=!initial&&seed.placement?{expectedOrderingRevisionId:seed.placement.id,afterPositionId:seed.placement.afterPositionId,beforePositionId:null}:null;
  const cp={...checkpoint(day,bank,{[calendar.target]:nov,[calendar.future]:'20000'}),placement};
  return value(prepareCommand({requestId:randomUUID(),expectedRevision:seed.revision,effectiveDate:day,reason:'Synthetic HB018 update',payload:{
    schemaVersion:1,knowledgeCut:seed.knowledgeCut,baseCheckpointId:seed.baseCheckpointId,baseVectorId:seed.baseVectorId,effectiveDate:day,
    checkpoint:reuse?null:cp,allocationChange:reuse?{schemaVersion:1,intent:'ALLOCATION_ONLY',mode:'REDISTRIBUTE',observationMode:'REUSE_CONFIRMED',target:calendar.target,sources:[],balanceCents:bank,
      allocations:cp.allocations,futureEdits:[],fundingRefs:[],expectedCheckpointRevisionId:seed.baseCheckpointId,expectedAllocationRevisionId:seed.baseVectorId,effectiveDate:day,checkpoint:null,placement,
      consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:false,fundingConfirmed:false,nonCarryConfirmed:false}}:null,
    completeVectorConfirmed:true,obligations:os,savings:ss}}));
}
async function confirm(f:Fixture,c:Awaited<ReturnType<typeof command>>){return f.repo.confirm(f.scope,value(prepareCommand(value(await f.repo.preview(f.scope,c)))));}
async function initial(){const f=await fixture();value(await confirm(f,await command(f,[createObligation('30000',calendar.target)],[createSaving('10000',calendar.target)])));return f;}
async function rows(f:Fixture){const result=[];for(const table of [s.accounts,s.budgetUpdates,s.historicalPositions,s.orderingRevisions,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,s.obligations,s.obligationEvents,s.savingsGoals,s.savingsEvents,s.auditEvents,s.reportHeads,s.monthClosings]){
  const where=table===s.accounts?sql`t.id=${f.scope.accountId}`:sql`t.account_id=${f.scope.accountId}`;
  result.push((await db.db.execute(sql`SELECT to_jsonb(t)::text AS row FROM ${table} AS t WHERE ${where} ORDER BY t.id`)).rows);
}return result;}
async function seed(f:Fixture){return value(await f.repo.load(f.scope)) as unknown as UpdateSeed;}
async function rename(f:Fixture,title:string){const o=(await seed(f)).obligations[0];return command(f,[{action:'AMEND',identityId:o.obligationId,expectedRevisionId:o.id,data:{title},bankDate:null,payment:null}],[],'100000','80000',true);}

it('HB18-H01 HB18-P07 coherent owned list/history preserve exact prior titles and read-only row bytes',async()=>{
  const f=await initial(),before=await rows(f),list=value(await f.reader.list(f.scope));
  expect(list.projection).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:'100000'},periods:expect.arrayContaining([expect.objectContaining({free:'40000',reserved:'30000',savings:'10000'})])});
  const id=list.obligations[0].identityId;
  const original=value(await f.reader.history(f.scope,{kind:'OBLIGATION',identityId:id,cursor:null}));expect(original.entries[0].after).toMatchObject({title:'Synthetic obligation',originalCents:'30000'});
  expect(original.entries[0].recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
  expect(await rows(f)).toEqual(before);
  value(await confirm(f,await rename(f,'Renamed synthetic')));
  const h=value(await f.reader.history(f.scope,{kind:'OBLIGATION',identityId:id,cursor:null}));
  expect(h.entries.map(e=>(e.after as {title:string}).title)).toEqual(['Renamed synthetic','Synthetic obligation']);
  expect(h.entries[0].before).toMatchObject({title:'Synthetic obligation'});expect(h.entries.every(e=>e.recordedAt&&e.positionId&&e.originPeriod===calendar.target)).toBe(true);
});
it('HB18-P01 HB18-U04 HB18-U11 atomic payment/release uses one actual checkpoint and exact evidence',async()=>{
  const f=await initial(),d=await seed(f),o=d.obligations[0],saving=d.savings[0];
  const c=await command(f,[{action:'PAID',identityId:o.obligationId,expectedRevisionId:o.id,data:{amountCents:'30000'},bankDate:null,payment:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false}}],
    [{action:'PARTIAL_RELEASE',identityId:saving.savingsId,expectedRevisionId:saving.id,data:{amountCents:'2000'}}],'70000','50000');
  value(await confirm(f,c));const after=value(await f.reader.list(f.scope));
  expect(after.projection).toMatchObject({kind:'ACCOUNT_ESTIMATE',bank:{balance:'70000'},periods:expect.arrayContaining([expect.objectContaining({reserved:'0',savings:'8000',free:'42000'})])});
  const h=value(await f.reader.history(f.scope,{kind:'OBLIGATION',identityId:o.obligationId,cursor:null}));expect(h.entries[0].payment).toMatchObject({amountCents:'30000',bankStateAffirmed:true,source:'TRACKED_CARD'});
  const hs=value(await f.reader.history(f.scope,{kind:'SAVING',identityId:saving.savingsId,cursor:null}));expect(hs.entries[0]).toMatchObject({released:'2000',increase:null});
  const a=(await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.scope.accountId)))[0];expect(a.recordedSeq).toBe(2n);expect(a.aggregateRevision).toBe(2n);
  expect(await db.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.scope.accountId))).toHaveLength(2);
});
it('HB18-H05 pagination pins K during a concurrent update, rejects tampering and foreign cursors',async()=>{
  const f=await initial();for(let i=0;i<50;i++)value(await confirm(f,await rename(f,'Revision '+i)));
  const id=(await seed(f)).obligations[0].obligationId,q={kind:'OBLIGATION' as const,identityId:id,cursor:null};
  const first=value(await f.reader.history(f.scope,q));expect(first.entries).toHaveLength(50);expect(first.cursor).toBeTruthy();
  value(await confirm(f,await rename(f,'New K')));
  const second=value(await f.reader.history(f.scope,{...q,cursor:first.cursor}));expect(second.entries).toHaveLength(1);expect(second.knowledgeCut).toBe(first.knowledgeCut);expect(second.hasNewData).toBe(true);
  expect(new Set([...first.entries,...second.entries].map(e=>e.id)).size).toBe(51);
  expect(await f.reader.history(f.scope,{...q,cursor:first.cursor+'x'})).toMatchObject({ok:false,code:'INVALID_INPUT'});
  const foreign=await initial();expect(await foreign.reader.history(foreign.scope,{...q,cursor:first.cursor})).toMatchObject({ok:false,code:'INVALID_INPUT'});
},90000);
it('HB18-P05 direct foreign/unknown identities, history and release proposal reveal no data',async()=>{
  const f=await initial(),foreign={...f.scope,ownerUserId:randomUUID()},before=await rows(f);
  expect(await f.reader.list(foreign)).toMatchObject({ok:false,code:'FORBIDDEN'});
  const id=(await seed(f)).obligations[0].obligationId;
  expect(await f.reader.history(foreign,{kind:'OBLIGATION',identityId:id,cursor:null})).toMatchObject({ok:false,code:'FORBIDDEN'});
  expect(await f.reader.history(f.scope,{kind:'OBLIGATION',identityId:randomUUID(),cursor:null})).toMatchObject({ok:false,code:'FORBIDDEN'});
  expect(await f.reader.proposeRelease(foreign,randomUUID())).toMatchObject({ok:false,code:'FORBIDDEN'});
  expect(await rows(f)).toEqual(before);
});
it('HB18-U13 release suggestion is pinned and read-only, not a hidden financial update',async()=>{
  const f=await initial(),d=await seed(f),o=d.obligations[0];value(await confirm(f,await command(f,[{action:'AMEND',identityId:o.obligationId,expectedRevisionId:o.id,data:{originalCents:'85000'},bankDate:null,payment:null}],[],'100000','80000',true)));
  const list=value(await f.reader.list(f.scope)),before=await rows(f),p=value(await f.reader.proposeRelease(f.scope,list.savings[0].identityId));
  expect(p).toMatchObject({amount:'10000',revision:list.revision,knowledgeCut:list.knowledgeCut,revisionId:list.savings[0].revisionId});expect(await rows(f)).toEqual(before);
});
it('HB18-P02 snapshot list is coherent across an actual concurrent commit',async()=>{
  const f=await initial(),c=await rename(f,'Concurrent');
  const [list,receipt]=await Promise.all([f.reader.list(f.scope),confirm(f,c)]);expect(receipt.ok).toBe(true);const l=value(list);
  expect(l.obligations[0].title).toBe(l.revision==='1'?'Synthetic obligation':'Concurrent');
  expect(l.projection.provenance.knowledgeCut).toBe(l.knowledgeCut);
});
it('HB18-H06 known identities survive NO_OBSERVATION and are not invented zero bank values',async()=>{
  const f=await fixture(),l=value(await f.reader.list(f.scope));expect(l).toMatchObject({obligations:[],savings:[],projection:{kind:'UNAVAILABLE',reason:'NO_OBSERVATION'}});expect('bank'in l.projection).toBe(false);
});
