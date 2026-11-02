import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../../src/infrastructure/db/client';
import { canonicalPayload } from '../../src/infrastructure/db/commit';
import { commitBatch, type CommitRequest } from '../fixtures/legacy-commit';
import * as s from '../../src/infrastructure/db/schema';
import { requireLocalDatabaseTargets } from '../../src/infrastructure/db/local-target';

let database: ReturnType<typeof createDatabase>;
let admin: pg.Pool;
const n = BigInt;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container' || !process.env.TEST_DATABASE_URL) {
    throw new Error('DB tests require TEST_DATABASE_URL and HB_TEST_DATABASE_TARGET=disposable-local-container');
  }
  const targets = requireLocalDatabaseTargets(process.env);
  const url = new URL(targets.TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: url.toString() });
  const name = 'hb_test_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"'); // Generated identifier only; never use/drop existing data.
  url.pathname = '/' + name;
  database = createDatabase(url.toString());
  await migrate(database.db, { migrationsFolder: './drizzle' });
});
afterAll(async () => { await database?.close(); await admin?.end(); });

it('DB01/02 setup migrates fresh PostgreSQL and replay preserves tables', async () => {
  const before = await database.db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  expect(before.rows).toHaveLength(19);
  await migrate(database.db, { migrationsFolder: './drizzle' });
  const after = await database.db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  expect(after.rows).toEqual(before.rows);
});

async function fixture() {
  const ownerUserId = randomUUID(), accountId = randomUUID();
  await database.db.insert(s.users).values({ id: ownerUserId });
  await database.db.insert(s.accounts).values({ id: accountId, ownerUserId, displayName: 'Synthetic test card' });
  const periodIds = [randomUUID(),randomUUID()];
  await database.db.insert(s.budgetPeriods).values(periodIds.map((id,i) => ({id,ownerUserId,accountId,period: ['2020-11','2020-12'][i]})));
  const request: CommitRequest = { ownerUserId,accountId,requestId:randomUUID(),expectedRevision:n(0),kind:'TEST_UPDATE',payload:{balance:'10000'} };
  return { ownerUserId, accountId, periodIds, request };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

async function vector(f: Fixture, amounts = [n(6000),n(4000)], balance = n(10000), anchor?: string, request = f.request) {
  const checkpointId=anchor ?? randomUUID(), revisionId=randomUUID(), positionId=randomUUID();
  const result = await commitBatch(database.db,request,async(tx,batch)=>{
    const base={ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:batch.id,recordedSeq:batch.recordedSeq};
    await tx.insert(s.historicalPositions).values({...base,id:positionId,historicalDate:'2020-11-20',kind:'CONFIRMED'});
    if (!anchor) await tx.insert(s.balanceCheckpoints).values({...base,id:checkpointId,logicalFactId:checkpointId,positionId,observedDate:'2020-11-20',balanceCents:balance,reason:'Synthetic observation'});
    await tx.insert(s.allocationRevisions).values({...base,id:revisionId,logicalFactId:revisionId,checkpointId,positionId,effectiveDate:'2020-11-20',changeKind:anchor?'REDISTRIBUTION':'ACTUAL_CHECK'});
    if(anchor) {
      const [account]=await tx.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
      const proposalId=randomUUID(), decisionId=randomUUID();
      await tx.insert(s.transferProposals).values({id:proposalId,ownerUserId:f.ownerUserId,accountId:f.accountId,expectedRevision:request.expectedRevision,baseCheckpointId:anchor,baseAllocationRevisionId:account.activeAllocationRevisionId!,sourcePeriodId:f.periodIds[0],targetPeriodId:f.periodIds[1],payloadIdentity:'synthetic-transfer',proposal:{baseRevision:account.activeAllocationRevisionId,allocations:amounts.map(String),funding:[]}});
      await tx.insert(s.transitionDecisions).values({...base,id:decisionId,mode:'CARRY',observationMode:'REUSE_CONFIRMED',beforeAllocationRevisionId:account.activeAllocationRevisionId,afterAllocationRevisionId:revisionId,positionId,manifest:{funding:[]},reason:'Synthetic single-source transfer'});
      await tx.insert(s.budgetTransfers).values({...base,id:randomUUID(),proposalId,decisionId,sourcePeriodId:f.periodIds[0],targetPeriodId:f.periodIds[1],beforeAllocationRevisionId:account.activeAllocationRevisionId!,afterAllocationRevisionId:revisionId,fundingManifest:[]});
    }
    if (amounts.length) await tx.insert(s.periodAllocations).values(amounts.map((amountCents,i)=>({id:randomUUID(),ownerUserId:f.ownerUserId,accountId:f.accountId,allocationRevisionId:revisionId,periodId:f.periodIds[i],amountCents})));
    await tx.update(s.accounts).set({activeAllocationRevisionId:revisionId}).where(eq(s.accounts.id,f.accountId));
  });
  return {checkpointId,revisionId,result};
}

it('DB03 creates a user and owned account; DB05 confirms complete cash across months',async()=>{
  const f=await fixture(); const v=await vector(f);
  const rows=await database.db.select().from(s.periodAllocations).where(eq(s.periodAllocations.allocationRevisionId,v.revisionId));
  expect(rows.map(x=>x.amountCents).reduce((a,b)=>a+b,n(0))).toBe(n(10000));
});
it('DB04 rejects foreign owner and cross-account period references',async()=>{
  const a=await fixture(),b=await fixture();
  await expect(database.db.insert(s.budgetPeriods).values({id:randomUUID(),ownerUserId:b.ownerUserId,accountId:a.accountId,period:'2020-01'})).rejects.toThrow();
  a.periodIds[1]=b.periodIds[1];
  await expect(vector(a)).rejects.toThrow();
  expect(await database.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.accountId,a.accountId))).toHaveLength(0);
});
it('DB06 rejects negative allocation even when total is correct',async()=>{
  const f=await fixture(); await expect(vector(f,[n(11000),n(-1000)])).rejects.toThrow();
});
it('DB07 rejects mismatched, absent and duplicate distributions at commit',async()=>{
  for(const amounts of [[n(6000),n(3999)],[]]){
    const f=await fixture(); await expect(vector(f,amounts)).rejects.toThrow();
    expect(await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId))).toHaveLength(0);
  }
  const f=await fixture(); f.periodIds[1]=f.periodIds[0]; await expect(vector(f)).rejects.toThrow();
});
it('DB08 full R/S may exceed B; ordinary partial reserve rejects',async()=>{
  const f=await fixture(); await vector(f);
  async function earmarks(reserveFull:boolean){
    return commitBatch(database.db,{...f.request,requestId:randomUUID(),expectedRevision:n(1)},async(tx,b)=>{
      const base={ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq};
      const positionId=randomUUID(),obligationId=randomUUID(),savingsId=randomUUID();
      await tx.insert(s.historicalPositions).values({...base,id:positionId,historicalDate:'2020-11-20',kind:'EARMARK'});
      await tx.insert(s.obligations).values({...base,id:obligationId,originatingPeriodId:f.periodIds[0]});
      await tx.insert(s.obligationEvents).values({...base,id:randomUUID(),logicalFactId:randomUUID(),obligationId,positionId,fundingPeriodId:f.periodIds[0],effectiveDate:'2020-11-20',action:'CREATE',originalCents:n(20000),outstandingCents:n(20000),status:'UNPAID',isPossible:false,reserveFull});
      await tx.insert(s.savingsGoals).values({...base,id:savingsId,originatingPeriodId:f.periodIds[0]});
      await tx.insert(s.savingsEvents).values({...base,id:randomUUID(),logicalFactId:randomUUID(),savingsId,positionId,fundingPeriodId:f.periodIds[0],effectiveDate:'2020-11-20',action:'CREATE',amountCents:n(5000),status:'ACTIVE'});
    });
  }
  await expect(earmarks(false)).rejects.toThrow();
  await earmarks(true);
  const [o]=await database.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId,f.accountId));
  const [saving]=await database.db.select().from(s.savingsEvents).where(eq(s.savingsEvents.accountId,f.accountId));
  expect(n(6000)-o.outstandingCents-saving.amountCents).toBe(n(-19000));
});
it('DB09/10 redistribution retains old vector and checkpoint identity/count/date; history is sealed',async()=>{
  const f=await fixture(),a=await vector(f);
  await vector(f,[n(0),n(10000)],n(10000),a.checkpointId,{...f.request,requestId:randomUUID(),expectedRevision:n(1)});
  expect(await database.db.select().from(s.allocationRevisions).where(eq(s.allocationRevisions.accountId,f.accountId))).toHaveLength(2);
  const c=await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId,f.accountId));
  expect(c).toHaveLength(1); expect(c[0].observedDate).toBe('2020-11-20');
  expect(await database.db.select().from(s.budgetTransfers).where(eq(s.budgetTransfers.accountId,f.accountId))).toHaveLength(1);
  await expect(database.db.update(s.balanceCheckpoints).set({balanceCents:n(1)}).where(eq(s.balanceCheckpoints.id,a.checkpointId))).rejects.toThrow();
  await expect(database.db.delete(s.allocationRevisions).where(eq(s.allocationRevisions.id,a.revisionId))).rejects.toThrow();
  await expect(database.db.insert(s.periodAllocations).values({id:randomUUID(),ownerUserId:f.ownerUserId,accountId:f.accountId,allocationRevisionId:a.revisionId,periodId:randomUUID(),amountCents:n(0)})).rejects.toThrow();
});
it('DB11 returns original result after revision moves, with exactly one callback',async()=>{
  const f=await fixture(); let writes=0;
  const write=async()=>{writes++;};
  const a=await commitBatch(database.db,f.request,write);
  const b=await commitBatch(database.db,f.request,write);
  expect(a).toEqual(b); expect(writes).toBe(1);
});
it('DB12 rejects same request ID with different typed payload',async()=>{
  const f=await fixture(); await commitBatch(database.db,f.request,async()=>{});
  await expect(commitBatch(database.db,{...f.request,payload:{balance:'9999'}},async()=>{})).rejects.toThrow('REQUEST_PAYLOAD_CONFLICT');
});
it('DB13 rejects stale revision; concurrent writers have exactly one winner',async()=>{
  const f=await fixture();
  const results=await Promise.allSettled([1,2].map(()=>commitBatch(database.db,{...f.request,requestId:randomUUID()},async()=>{})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  await expect(commitBatch(database.db,{...f.request,requestId:randomUUID()},async()=>{})).rejects.toThrow('STALE_REVISION');
});
it('DB14 rolls back facts, account, audit and idempotency result on mid-batch failure',async()=>{
  const f=await fixture();
  await expect(commitBatch(database.db,f.request,async(tx,b)=>{
    await tx.insert(s.historicalPositions).values({id:randomUUID(),ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,historicalDate:'2020-11-20',kind:'TEST'});
    throw new Error('SIMULATED_FAILURE');
  })).rejects.toThrow('TRANSACTION_FAILED');
  for(const table of [s.historicalPositions,s.budgetUpdates,s.auditEvents]) expect(await database.db.select().from(table).where(eq(table.accountId,f.accountId))).toHaveLength(0);
  const [a]=await database.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId));
  expect(a.aggregateRevision).toBe(n(0)); expect(a.recordedSeq).toBe(n(0));
});
it('DB15/16 keeps unknown end as NULL and old closing bytes after a new version',async()=>{
  const f=await fixture(); const firstId=randomUUID();
  const close=async(version:number,id:string,previousVersionId?:string)=>commitBatch(database.db,{...f.request,requestId:randomUUID(),expectedRevision:n(version-1),kind:'CLOSE'},async(tx,b)=>{
    await tx.insert(s.monthClosings).values({
      id,ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,
      periodId:f.periodIds[0],version,previousVersionId,historicalThroughDate:'2020-11-30',closedBy:f.ownerUserId,
      evidenceRecordedCutoffSeq:n(version-1),evidenceRecordedCutoffAt:'2020-12-01T00:00:00Z',
      reason:'Synthetic close/correction',changeEvidenceRefs:version===1?[]:[{revisionId:firstId}],
      bankDataCompleteness:'NO_OBSERVATION',operationDetailStatus:'NOT_PROVIDED',
      historicalReservedCents:n(0),historicalSavingsCents:n(0),snapshotSchemaVersion:1,selectionContractVersion:1,
      snapshotJson:{kind:'NO_OBSERVATION',version},sourceManifest:[],orderingRevisionRefs:[],
    });
  });
  await close(1,firstId);
  const [old]=await database.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,firstId));
  expect(old.endBalanceCents).toBeNull(); expect(old.historicalFreeCents).toBeNull();
  await close(2,randomUUID(),firstId);
  expect((await database.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,firstId)))[0]).toEqual(old);
  await expect(database.db.update(s.monthClosings).set({reason:'overwrite'}).where(eq(s.monthClosings.id,firstId))).rejects.toThrow();
});
it('DB17 round-trips BIGINT above Number.MAX_SAFE_INTEGER exactly through Drizzle',async()=>{
  const f=await fixture(),large=n('9007199254740993');
  const v=await vector(f,[large,n(0)],large);
  const [c]=await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.id,v.checkpointId));
  expect(c.balanceCents).toBe(large); expect(typeof c.balanceCents).toBe('bigint');
});

it('DB18 authorization precedes replay; typed payloads are canonical without bigint/object collisions',async()=>{
  const f=await fixture(),other=await fixture();
  await commitBatch(database.db,f.request,async()=>{});
  await expect(commitBatch(database.db,{...f.request,ownerUserId:other.ownerUserId},async()=>{})).rejects.toThrow('FORBIDDEN');
  expect(canonicalPayload({b:n(1),a:'1'})).toBe(canonicalPayload({a:'1',b:n(1)}));
  expect(canonicalPayload(n(1))).not.toBe(canonicalPayload({$bigint:'1'}));
  expect(()=>canonicalPayload(1.5)).toThrow();
});

it('DB19 observed instants must match Berlin civil day across DST and month boundary',async()=>{
  const f=await fixture();
  async function observation(observedDate:string,observedAt:string,revision:bigint) {
    return commitBatch(database.db,{...f.request,requestId:randomUUID(),expectedRevision:revision},async(tx,b)=>{
      const base={ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq};
      const id=randomUUID(),positionId=randomUUID();
      await tx.insert(s.historicalPositions).values({...base,id:positionId,historicalDate:observedDate,kind:'OBSERVATION'});
      await tx.insert(s.balanceCheckpoints).values({...base,id,logicalFactId:id,positionId,observedDate,observedAt,balanceCents:n(0),reason:'Synthetic DST fixture'});
      await tx.insert(s.allocationRevisions).values({...base,id:randomUUID(),logicalFactId:randomUUID(),checkpointId:id,positionId,effectiveDate:observedDate,changeKind:'ACTUAL_CHECK'});
    });
  }
  await observation('2020-10-25','2020-10-25T00:30:00Z',n(0));
  await observation('2020-10-25','2020-10-25T01:30:00Z',n(1));
  await expect(observation('2020-11-30','2020-11-30T23:30:00Z',n(2))).rejects.toThrow();
  await observation('2020-12-01','2020-11-30T23:30:00Z',n(2));
});

it('DB20 closing an older observation keeps end NULL and validates copied checkpoint/vector facts',async()=>{
  const f=await fixture(),v=await vector(f);
  const close=async(endBalanceCents:bigint|null)=>commitBatch(database.db,{...f.request,requestId:randomUUID(),expectedRevision:n(1)},async(tx,b)=>{
    await tx.insert(s.monthClosings).values({
      id:randomUUID(),ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,
      periodId:f.periodIds[0],version:1,historicalThroughDate:'2020-11-30',closedBy:f.ownerUserId,evidenceRecordedCutoffSeq:n(1),evidenceRecordedCutoffAt:'2020-12-01T00:00:00Z',
      reason:'Actual last observation predates end',changeEvidenceRefs:[],lastCheckpointId:v.checkpointId,lastBankObservedDate:'2020-11-20',lastObservedBalanceCents:n(10000),
      historicalAllocationRevisionId:v.revisionId,allocationEffectiveDate:'2020-11-20',endBalanceCents,bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'PARTIAL',
      historicalAllocatedCents:n(6000),historicalReservedCents:n(8000),historicalSavingsCents:n(0),historicalFreeCents:n(-2000),
      snapshotSchemaVersion:1,selectionContractVersion:1,snapshotJson:{fixture:true},sourceManifest:[v],orderingRevisionRefs:[],
    });
  });
  await expect(close(n(10000))).rejects.toThrow();
  await close(null);
  const [c]=await database.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId,f.accountId));
  expect(c.endBalanceCents).toBeNull(); expect(c.lastObservedBalanceCents).toBe(n(10000));
});

it('DB21 correction lineage rejects forks, date changes retain original facts',async()=>{
  const f=await fixture(),v=await vector(f),logicalFactId=v.checkpointId,firstCorrectionId=randomUUID();
  const correct=(id:string,supersedesId:string,expectedRevision:bigint)=>commitBatch(database.db,{...f.request,requestId:randomUUID(),expectedRevision},async(tx,b)=>{
    const base={ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq};
    const positionId=randomUUID();
    await tx.insert(s.historicalPositions).values({...base,id:positionId,historicalDate:'2020-11-21',kind:'CORRECTION'});
    await tx.insert(s.balanceCheckpoints).values({...base,id,logicalFactId,supersedesId,positionId,observedDate:'2020-11-21',balanceCents:n(10000),reason:'Reviewed synthetic date correction'});
    const allocationRevisionId=randomUUID();
    await tx.insert(s.allocationRevisions).values({...base,id:allocationRevisionId,logicalFactId:allocationRevisionId,checkpointId:id,positionId,effectiveDate:'2020-11-21',changeKind:'HISTORICAL_CORRECTION'});
    await tx.insert(s.periodAllocations).values({id:randomUUID(),ownerUserId:f.ownerUserId,accountId:f.accountId,allocationRevisionId,periodId:f.periodIds[0],amountCents:n(10000)});
  });
  await correct(firstCorrectionId,v.checkpointId,n(1));
  await expect(correct(randomUUID(),v.checkpointId,n(2))).rejects.toThrow();
  await correct(randomUUID(),firstCorrectionId,n(2));
  const [old]=await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.id,v.checkpointId));
  expect(old.observedDate).toBe('2020-11-20');
});

it('DB22 max signed BIGINT is exact; overflow and negative checkpoint reject',async()=>{
  const f=await fixture(),max=n('9223372036854775807');
  const v=await vector(f,[max,n(0)],max);
  const [c]=await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.id,v.checkpointId));
  expect(c.balanceCents).toBe(max);
  await expect(vector(await fixture(),[max+n(1),n(0)],max+n(1))).rejects.toThrow();
  await expect(vector(await fixture(),[n(0),n(0)],n(-1))).rejects.toThrow();
});

it('DB23 a standalone confirmed checkpoint cannot bypass the full-vector boundary',async()=>{
  const f=await fixture();
  await expect(commitBatch(database.db,f.request,async(tx,b)=>{
    const base={ownerUserId:f.ownerUserId,accountId:f.accountId,budgetUpdateId:b.id,recordedSeq:b.recordedSeq};
    const positionId=randomUUID(),id=randomUUID();
    await tx.insert(s.historicalPositions).values({...base,id:positionId,historicalDate:'2020-11-20',kind:'OBSERVATION'});
    await tx.insert(s.balanceCheckpoints).values({...base,id,logicalFactId:id,positionId,observedDate:'2020-11-20',balanceCents:n(0),reason:'Missing vector must reject even at zero'});
  })).rejects.toThrow();
  expect(await database.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.accountId,f.accountId))).toHaveLength(0);
});
