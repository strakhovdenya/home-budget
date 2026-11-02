import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { encodeCanonical } from '@/domain/updates/canonical-value';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { createProposalRepository } from '@/infrastructure/db/transfer-proposal-repository';
import { writeRedistribution } from '@/infrastructure/db/redistribution-writer';
import { commitBatch, type BatchWriter } from '@/infrastructure/db/commit';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { writeSavings } from '@/infrastructure/db/savings-writer';
import { prepareCommand } from '@/domain/updates/validation';
import { loadTransitionState } from '@/infrastructure/db/transition-state';
import { loadObligationHistory } from '@/infrastructure/db/obligation-history';
import { loadSavingHistory } from '@/infrastructure/db/savings-history';
import { selectObligationState } from '@/domain/obligations/history';
import { selectSavingState } from '@/domain/savings/history';
import { indexHistory } from '@/domain/checkpoints/history';
import { snapshot as obligationSnapshot } from '@/domain/obligations/lifecycle';
import { snapshot as savingSnapshot } from '@/domain/savings/lifecycle';
import { persistAllocation,ensurePeriod } from '@/infrastructure/db/allocation-writer';
import { databaseToday } from '@/infrastructure/db/transition-state';
import { parseTransition } from '@/domain/transitions/validation';
import { writeTransition } from '@/infrastructure/db/transition-writer';
import type { CanonicalValue, AuditDescriptor } from '@/domain/updates/contracts';
import { value, date } from '../fixtures/checkpoints';
import { transitionCalendar } from '../fixtures/transition-calendar';
import * as s from '@/infrastructure/db/schema';
let db:ReturnType<typeof createDatabase>,admin:pg.Pool,testUrl:string,testDbName:string;
type Scope={ownerUserId:string;accountId:string};
let calendar:ReturnType<typeof transitionCalendar>;
let today:string,past:string,target:string,future:string;
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('LOCAL_TARGET_REQUIRED');
  const u=new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);admin=new pg.Pool({connectionString:u.toString()});
  const name='hb013_'+randomUUID().replaceAll('-','');testDbName=name;await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;testUrl=u.toString();
  db=createDatabase(u.toString());await migrate(db.db,{migrationsFolder:'./drizzle'});
});
beforeEach(async()=>{
  // Refresh for each independent fixture, including a suite spanning a Berlin midnight.
  const clock=await db.db.execute<{day:string}>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD') AS day`);
  calendar=transitionCalendar(clock.rows[0].day);
  ({today,past,target,future}=calendar);
});
afterAll(async()=>{await db?.close();await admin?.end();});
async function account(f:Scope){return (await db.db.select().from(s.accounts).where(eq(s.accounts.id,f.accountId)))[0];}
function command(payload:unknown,revision:bigint,effectiveDate=today,requestId=randomUUID()){return value(prepareCommand({requestId,expectedRevision:revision,effectiveDate,reason:'Synthetic HB013 explicit review',payload}));}
async function batch(f:Scope,payload:unknown,day:string,writer:BatchWriter){return commitBatch(db.db,{scope:f,kind:'HB013_FIXTURE',command:command(payload,(await account(f)).aggregateRevision,day)},writer);}
// Capture account K before immutable loading; no independent stream can refresh it.
async function selected(f:Scope){const a=await account(f);return db.db.transaction(tx=>loadTransitionState(tx,f,a.recordedSeq,date(today)));}
async function baseline(f:Scope){const tables=[s.budgetUpdates,s.budgetPeriods,s.balanceCheckpoints,s.allocationRevisions,s.periodAllocations,s.historicalPositions,s.orderingRevisions,s.obligations,s.obligationEvents,s.savingsGoals,s.savingsEvents,s.auditEvents,s.transferProposals,s.transitionDecisions,s.budgetTransfers,s.transferProposalCancellations,s.monthClosings,s.reportHeads];return {account:await account(f),rows:await Promise.all(tables.map(t=>db.db.select().from(t).where(eq(t.accountId,f.accountId)).orderBy(t.id)))};}
async function fixture(earmarks=true,zero=false){
  const f={ownerUserId:randomUUID(),accountId:randomUUID()};await db.db.insert(s.users).values({id:f.ownerUserId});await db.db.insert(s.accounts).values({...f,id:f.accountId,displayName:'Synthetic HB013'});
  await batch(f,{observedDate:calendar.pastDay(1),observedAt:null,balanceCents:zero?'0':'89000',allocations:zero?[]:[{period:past,amountCents:'40000'},{period:target,amountCents:'48000'},{period:future,amountCents:'1000'}],correction:null,placement:null},calendar.pastDay(1),writeBankCheckpoint);
  if(earmarks){
    await batch(f,{changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:calendar.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:'Synthetic obligation',dueDate:null,originalCents:'30000',isPossible:false,reserveFull:true,originatingPeriod:past,fundingPeriod:past}}]},calendar.pastDay(2),writeObligations);
    await batch(f,{changes:[{key:'s',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:calendar.pastDay(3),placement:null,bankCheck:null,data:{title:'Synthetic saving',amountCents:'5000',originatingPeriod:past,fundingPeriod:past}}]},calendar.pastDay(3),writeSavings);
  }
  return f;
}
async function input(f:Scope,mode='CARRY',actual:string|null=null){
  const st=await selected(f);
  const allocations=[{period:target,amountCents:actual??(st.base.balanceCents===0n?'0':'88000')},{period:future,amountCents:st.base.balanceCents===0n?'0':'1000'}];
  if(actual!==null)allocations[0].amountCents=(BigInt(actual)-BigInt(allocations[1].amountCents)).toString();
  return {schemaVersion:1,intent:mode==='REDISTRIBUTE'?'ALLOCATION_ONLY':'TRANSITION',mode,observationMode:actual===null?'REUSE_CONFIRMED':'ACTUAL_CHECK',target,sources:mode==='CARRY'?[past]:[],balanceCents:actual??st.base.balanceCents.toString(),allocations,
    fundingRefs:mode==='DEFER'?[]:st.base.funding.filter(f=>f.period<target).map(({kind,identityId,revisionId})=>({kind,identityId,revisionId})),futureEdits:[],expectedCheckpointRevisionId:st.base.checkpointId,expectedAllocationRevisionId:st.base.vectorId,effectiveDate:today,placement:null,
    checkpoint:actual===null?null:{observedDate:today,observedAt:null,balanceCents:actual,allocations,correction:null,placement:null},consent:{completeVectorConfirmed:true,fundingUnchangedAcknowledged:true,transitionConfirmed:true,fundingConfirmed:true,nonCarryConfirmed:true}};
}
async function prepared(f:Scope,mode='CARRY',actual:string|null=null){const p=await input(f,mode,actual),a=await account(f),repo=createProposalRepository(db),proposal=value(await repo.prepare(f,command(p,a.aggregateRevision))) as Record<string,CanonicalValue>;return {p,proposal,repo,confirmation:command({proposalId:proposal.proposalId,proposalIdentity:proposal.proposalIdentity,input:proposal.input,review:proposal.review},a.aggregateRevision)};}
it('HB13 T13..T16/T19/T39/T41/T51..T53 CARRY full histories and unchanged bank date',async()=>{
  const f=await fixture(),before=await selected(f),p=await prepared(f),receipt=value(await p.repo.confirm(f,p.confirmation)),after=await selected(f);
  expect(after.base.balanceCents).toBe(89000n);expect(after.bank.vector.allocations).toEqual([{period:target,amountCents:88000n},{period:future,amountCents:1000n}]);
  expect(after.oh.checkpoints).toEqual(before.oh.checkpoints);expect(after.obligations[0]).toMatchObject({obligationId:before.obligations[0].obligationId,outstandingCents:30000n,reserveFull:true});expect(after.savings[0].amountCents).toBe(5000n);
  expect(after.obligations[0].fundingPeriodId).toBe(after.savings[0].fundingPeriodId);expect(88000n-30000n-5000n).toBe(53000n);
  const oldO=value(selectObligationState(after.oh,date(calendar.pastEnd))).states[0],oldS=value(selectSavingState(after.sh,date(calendar.pastEnd))).states[0];expect(oldO.id).toBe(before.obligations[0].id);expect(oldS.id).toBe(before.savings[0].id);
  expect(BigInt(receipt.recordedSeq)).toBe(before.oh.knowledgeCut+1n);
});
it.each([['T20 equal','89000'],['T21 changed','84000']])('HB13 %s combined actual creates one final vector',async(_,amount)=>{
  const f=await fixture(),before=await selected(f),p=await prepared(f,'CARRY',amount);value(await p.repo.confirm(f,p.confirmation));const h=await selected(f);
  expect(h.oh.checkpoints.length-before.oh.checkpoints.length).toBe(1);expect(h.oh.vectors.length-before.oh.vectors.length).toBe(1);expect(h.base.balanceCents).toBe(BigInt(amount));expect(h.bank.checkpoint.observedDate).toBe(today);
});
it('HB13 PG-R01/R03 allocation-only preserves funding and R protection oracle',async()=>{
  const f=await fixture(),p=await input(f,'REDISTRIBUTE'),before=await selected(f),snapshot=await baseline(f);
  p.consent.fundingUnchangedAcknowledged=false;await expect(batch(f,p,today,writeRedistribution)).rejects.toMatchObject({code:'TRANSITION_CONFIRMATION_REQUIRED'});expect(await baseline(f)).toEqual(snapshot);
  p.consent.fundingUnchangedAcknowledged=true;await batch(f,p,today,writeRedistribution);const h=await selected(f);
  expect(h.obligations).toEqual(before.obligations);expect(h.savings).toEqual(before.savings);expect(h.oh.checkpoints).toEqual(before.oh.checkpoints);expect(89000n-35000n-1000n).toBe(53000n);expect(0n-30000n-5000n).toBe(-35000n);
  expect(await db.db.select().from(s.transitionDecisions).where(eq(s.transitionDecisions.accountId,f.accountId))).toHaveLength(0);
});
it('HB13 T60 zero cash retains and moves full earmarks',async()=>{const f=await fixture(true,true),p=await prepared(f);value(await p.repo.confirm(f,p.confirmation));const h=await selected(f);expect(h.base.balanceCents).toBe(0n);expect(h.obligations[0].outstandingCents).toBe(30000n);expect(h.savings[0].amountCents).toBe(5000n);});

async function proposeInput(f:Scope,p:Awaited<ReturnType<typeof input>>){const repo=createProposalRepository(db),a=await account(f),proposal=value(await repo.prepare(f,command(p,a.aggregateRevision))) as Record<string,CanonicalValue>;return {repo,proposal,confirmation:command({proposalId:proposal.proposalId,proposalIdentity:proposal.proposalIdentity,input:p,review:proposal.review},a.aggregateRevision)};}
async function freshFixture(current=false){
  const f={ownerUserId:randomUUID(),accountId:randomUUID()};await db.db.insert(s.users).values({id:f.ownerUserId});await db.db.insert(s.accounts).values({id:f.accountId,ownerUserId:f.ownerUserId,displayName:'Synthetic fresh HB013'});
  await batch(f,{observedDate:calendar.olderDay(20),observedAt:null,balanceCents:'10000',allocations:[{period:calendar.older,amountCents:current?'3000':'4000'},{period:past,amountCents:'4000'},...(current?[{period:target,amountCents:'1000'}]:[]),{period:future,amountCents:'2000'}],correction:null,placement:null},calendar.olderDay(20),writeBankCheckpoint);
  for(const [i,period,amount] of [[21,calendar.older,'3000'],[22,past,'1000'],[23,target,'500']] as const){await batch(f,{changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:calendar.olderDay(i),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:'Synthetic fresh obligation',dueDate:null,originalCents:amount,isPossible:false,reserveFull:true,originatingPeriod:period,fundingPeriod:period}}]},calendar.olderDay(i),writeObligations);}
  for(const [i,period,amount] of [[24,calendar.older,'500'],[25,target,'200'],[26,future,'700']] as const){await batch(f,{changes:[{key:'s',action:'CREATE',savingsId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:calendar.olderDay(i),placement:null,bankCheck:null,data:{title:'Synthetic fresh saving',amountCents:amount,originatingPeriod:period,fundingPeriod:period}}]},calendar.olderDay(i),writeSavings);}
  return f;
}
it.each([['PG-F01 preserved',false,false],['PG-F02 edited',true,false],['PG-F06 current not doubled',false,true]] as const)('HB13 %s full earmarks and future allocations',async(_,edit,current)=>{
  const f=await freshFixture(current),before=await selected(f),p=await input(f,'FRESH_START','9000');p.allocations=[{period:target,amountCents:edit?'8000':'7000'},{period:future,amountCents:edit?'1000':'2000'}];p.checkpoint!.allocations=p.allocations;
  const withEdits={...p,futureEdits:edit?[{period:future,beforeAmountCents:'2000',afterAmountCents:'1000',explicitConsent:true}]:[]};
  const prepared=await proposeInput(f,withEdits as typeof p);value(await prepared.repo.confirm(f,prepared.confirmation));const h=await selected(f);
  expect(h.base.balanceCents).toBe(9000n);expect(h.bank.vector.allocations).toEqual(p.allocations.map(a=>({...a,amountCents:BigInt(a.amountCents)})));
  const id=h.periods.find(p=>p.period===target)!.id;expect(h.obligations.filter(e=>e.fundingPeriodId===id).reduce((a,e)=>a+e.outstandingCents,0n)).toBe(4500n);
  expect(h.savings.filter(e=>e.fundingPeriodId===id).reduce((a,e)=>a+e.amountCents,0n)).toBe(700n);
  const unchangedO=before.obligations.find(e=>e.fundingPeriodId===id)!,unchangedS=before.savings.find(e=>e.fundingPeriodId===id)!;
  expect(h.obligations.find(e=>e.obligationId===unchangedO.obligationId)).toEqual(unchangedO);expect(h.savings.find(e=>e.savingsId===unchangedS.savingsId)).toEqual(unchangedS);
  const later=before.savings.find(e=>e.amountCents===700n)!;expect(h.savings.find(e=>e.savingsId===later.savingsId)).toEqual(later);
  expect(BigInt(p.allocations[0].amountCents)-4500n-700n).toBe(edit?2800n:1800n);
  const old=value(selectObligationState(h.oh,date(calendar.pastEnd)));expect(old.states).toEqual(before.obligations);
});
it('HB13 PG-F03 silent future removal refuses without proposal/financial writes',async()=>{
  const f=await freshFixture(),p=await input(f,'FRESH_START','9000');p.allocations=[{period:target,amountCents:'9000'}];p.checkpoint!.allocations=p.allocations;
  const b=await baseline(f);expect(await createProposalRepository(db).prepare(f,command(p,(await account(f)).aggregateRevision))).toEqual({ok:false,code:'FUTURE_ALLOCATION_REVIEW_REQUIRED'});expect(await baseline(f)).toEqual(b);
});
function replayCommand(c:ReturnType<typeof command>,mutate?:(p:Record<string,CanonicalValue>)=>void){const p=structuredClone(c.payload) as Record<string,CanonicalValue>;mutate?.(p);return value(prepareCommand({...c,requestId:randomUUID(),payload:p}));}
it('HB13 PG-P01/P03/P14 exact replay has no writes and survives later account changes',async()=>{
  const f=await fixture(),p=await prepared(f),r=value(await p.repo.confirm(f,p.confirmation)),b=await baseline(f);
  expect(value(await p.repo.confirm(f,p.confirmation))).toEqual(r);expect(value(await p.repo.confirm(f,replayCommand(p.confirmation)))).toEqual(r);expect(await baseline(f)).toEqual(b);
  const h=await selected(f),e=h.savings[0];await batch(f,{changes:[{key:'a',action:'AMEND',savingsId:e.savingsId,expectedStateRevisionId:e.id,correctionId:null,previousChangeKey:null,effectiveDate:today,placement:{expectedOrderingRevisionId:value(indexHistory(h.sh)).days.get(today)!.id,afterPositionId:e.positionId,beforePositionId:null},bankCheck:null,data:{title:'Synthetic after funding'}}]},today,writeSavings);
  const later=await baseline(f);expect(value(await p.repo.confirm(f,replayCommand(p.confirmation)))).toEqual(r);expect(await baseline(f)).toEqual(later);
});
it.each(['amount','funding','afterRef','consent','observation','placement','base','reason','sameKey'] as const)('HB13 PG-P02/P04..P08 adversarial %s never replays by proposalId alone',async variant=>{
  const f=await fixture(),p=await prepared(f);value(await p.repo.confirm(f,p.confirmation));const b=await baseline(f);
  let c=replayCommand(p.confirmation,raw=>{
    const v=raw.input as Record<string,CanonicalValue>;
    if(variant==='amount'||variant==='sameKey')v.allocations=[{period:past,amountCents:'1'},{period:target,amountCents:'87999'},{period:future,amountCents:'1000'}];
    if(variant==='funding')(v.fundingRefs as Record<string,CanonicalValue>[])[0].revisionId=randomUUID();
    if(variant==='afterRef'){const review=raw.review as Record<string,CanonicalValue>;((review.funding as Record<string,CanonicalValue>[])[0]).draftRef='changed';}
    if(variant==='consent')(v.consent as Record<string,CanonicalValue>).fundingConfirmed=false;
    if(variant==='observation')v.expectedCheckpointRevisionId=randomUUID();
    if(variant==='placement')v.placement={expectedOrderingRevisionId:randomUUID(),afterPositionId:null,beforePositionId:null};
    if(variant==='base')v.expectedAllocationRevisionId=randomUUID();
  });
  if(variant==='reason')c=value(prepareCommand({...c,reason:'Changed reason'}));
  if(variant==='sameKey')c=value(prepareCommand({...c,requestId:p.confirmation.requestId}));
  expect(await p.repo.confirm(f,c)).toEqual({ok:false,code:variant==='sameKey'?'REQUEST_PAYLOAD_CONFLICT':'PROPOSAL_ALREADY_CONFIRMED'});expect(await baseline(f)).toEqual(b);
});
function cancellation(p:Awaited<ReturnType<typeof prepared>>){return {controlRequestId:randomUUID(),proposalId:p.proposal.proposalId,expectedProposalPayloadIdentity:p.proposal.proposalIdentity,reason:'Synthetic cancel',cancellationConfirmed:true};}
it('HB13 PG-P11/P12 cancellation is scoped, terminal and idempotent',async()=>{
  const f=await fixture(),p=await prepared(f),a=await account(f),cancel=cancellation(p),r=value(await p.repo.cancel(f,cancel)),b=await baseline(f);
  expect(value(await p.repo.cancel(f,cancel))).toEqual(r);expect(value(await p.repo.cancel(f,{...cancel,controlRequestId:randomUUID()}))).toEqual(r);
  expect(await p.repo.cancel(f,{...cancel,reason:'Changed'})).toEqual({ok:false,code:'REQUEST_PAYLOAD_CONFLICT'});
  expect(await p.repo.confirm(f,p.confirmation)).toEqual({ok:false,code:'PROPOSAL_CANCELLED'});expect(await baseline(f)).toEqual(b);expect(await account(f)).toEqual(a);
  expect(await p.repo.read(f,String(p.proposal.proposalId))).toMatchObject({ok:true,value:{status:'CANCELLED'}});
});
it('HB13 T31/T37/PG-P09 stale, policy and foreign scope refuse atomically',async()=>{
  const f=await fixture(),p=await prepared(f),other=await fixture(false);expect(await p.repo.confirm(other,p.confirmation)).toEqual({ok:false,code:'FORBIDDEN'});
  const i=await input(f),b=await baseline(f);i.sources=[calendar.older,past];expect(await p.repo.prepare(f,command(i,(await account(f)).aggregateRevision))).toEqual({ok:false,code:'OWNER_POLICY_REQUIRED'});expect(await baseline(f)).toEqual(b);
  await batch(f,await input(f,'REDISTRIBUTE'),today,writeRedistribution);const next=await baseline(f);expect(await p.repo.confirm(f,p.confirmation)).toEqual({ok:false,code:'STALE_REVISION'});expect(await baseline(f)).toEqual(next);
});

it('HB13 PG-F04/F05 insufficient preserved future cash and explicit reviewed remedy',async()=>{
  const f=await freshFixture(),p=await input(f,'FRESH_START','1500');p.allocations=[{period:target,amountCents:'0'},{period:future,amountCents:'2000'}];p.checkpoint!.allocations=p.allocations;
  const b=await baseline(f);expect(await createProposalRepository(db).prepare(f,command(p,(await account(f)).aggregateRevision))).toEqual({ok:false,code:'PRESERVED_ALLOCATION_CONFLICT'});expect(await baseline(f)).toEqual(b);
  p.allocations=[{period:target,amountCents:'500'},{period:future,amountCents:'1000'}];p.checkpoint!.allocations=p.allocations;
  const fixed={...p,futureEdits:[{period:future,beforeAmountCents:'2000',afterAmountCents:'1000',explicitConsent:true}]};const pr=await proposeInput(f,fixed as typeof p);value(await pr.repo.confirm(f,pr.confirmation));const h=await selected(f);expect(h.base.balanceCents).toBe(1500n);expect(h.bank.vector.allocations[0].amountCents-4500n-700n).toBe(-4700n);
});
function latch(){let release!:()=>void;const promise=new Promise<void>(r=>{release=r;});return {promise,release};}
async function waiting(n:number){const until=Date.now()+5000;while(Date.now()<until){const r=await admin.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=$1 AND wait_event_type=\'Lock\' AND cardinality(pg_blocking_pids(pid))>0',[testDbName]);if(r.rows[0].n>=n)return;await new Promise(r=>setTimeout(r,10));}throw Error('HB13_LOCK_WAIT_NOT_PROVEN');}
it.each(['sameProposal','differentProposals','cancelConfirm'] as const)('HB13 PG-P13/P14/T36 real lock barrier %s',async kind=>{
  const f=await fixture(),p=await prepared(f),p2=kind==='differentProposals'?await prepared(f):p,held=latch(),release=latch();
  const lock=db.db.transaction(async tx=>{await tx.select().from(s.accounts).where(eq(s.accounts.id,f.accountId)).for('update');held.release();await release.promise;});
  await held.promise;const first=p.repo.confirm(f,p.confirmation),second=kind==='cancelConfirm'?p.repo.cancel(f,cancellation(p)):p2.repo.confirm(f,replayCommand(p2.confirmation));
  try{await waiting(2);}finally{release.release();await lock;}
  const [a,b]=await Promise.all([first,second]);
  if(kind==='sameProposal'){expect(a.ok).toBe(true);expect(b).toEqual(a);}else{expect([a,b].filter(r=>r.ok)).toHaveLength(1);expect([a,b].find(r=>!r.ok)).toMatchObject({ok:false,code:kind==='differentProposals'?'STALE_REVISION':a.ok?'PROPOSAL_ALREADY_CONFIRMED':'PROPOSAL_CANCELLED'});}
  const transfers=await db.db.select().from(s.budgetTransfers).where(eq(s.budgetTransfers.accountId,f.accountId)),cancels=await db.db.select().from(s.transferProposalCancellations).where(eq(s.transferProposalCancellations.accountId,f.accountId));expect(transfers.length+cancels.length).toBe(1);
});
it('HB13 T59/PG-P01 real COMMIT acknowledgement loss recovers same request',async()=>{
  const f=await fixture(),p=await prepared(f),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let lost=false;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const x=args[0],text=typeof x==='string'?x:x&&typeof x==='object'&&'text' in x?x.text:'';const r=await Reflect.apply(query,client,args);if(!lost&&text==='commit'){lost=true;throw Object.assign(Error('Synthetic acknowledgement loss'),{code:'ECONNRESET'});}return r;}});
  try{const special=createProposalRepository({db:drizzle(client,{schema:s})});expect(await special.confirm(f,p.confirmation)).toEqual({ok:false,code:'COMMIT_OUTCOME_UNKNOWN'});expect(lost).toBe(true);expect((await p.repo.confirm(f,p.confirmation)).ok).toBe(true);expect(await db.db.select().from(s.budgetTransfers).where(eq(s.budgetTransfers.accountId,f.accountId))).toHaveLength(1);}finally{await client.end();}
});
/** Real SQL inserts bypass all transition writers/domain validators. */
async function directFunding(f:Scope,variant:string,saving=false){
  const prepared=await preparedForDirect(f),a=await account(f);
  return commitBatch(db.db,{scope:f,kind:'SYNTHETIC_DIRECT_FUNDING',command:command({},a.aggregateRevision)},async(tx,b)=>{
    const h=await loadTransitionState(tx,f,a.recordedSeq,date(today)),p=value(parseTransition(prepared.p)),clock=await databaseToday(tx),v=await persistAllocation(tx,b,h.oh,p,clock);
    const previous=saving?h.savings[0]:h.obligations[0],id=randomUUID(),decisionId=randomUUID(),targetId=await ensurePeriod(tx,f,target);
    const proof={decisionId,budgetUpdateId:b.id,positionId:v.positionId,sourcePeriodId:previous.fundingPeriodId,targetPeriodId:targetId,beforeRevisionId:previous.id,afterRevisionId:id};
    const old=saving?savingSnapshot(previous as typeof h.savings[number]):obligationSnapshot(previous as typeof h.obligations[number]);
    const d={...f,id:decisionId,proposalId:String(prepared.proposal.proposalId),budgetUpdateId:b.id,recordedSeq:b.recordedSeq,mode:'CARRY',observationMode:'REUSE_CONFIRMED',beforeAllocationRevisionId:h.base.vectorId,afterAllocationRevisionId:v.vectorId,positionId:v.positionId,confirmedAt:b.recordedAt,reason:'Synthetic direct SQL',manifest:{targetPeriodId:targetId,sourcePeriodIds:[previous.fundingPeriodId],funding:[proof]}};
    if(variant==='decisionMode')d.mode='DEFER';if(variant==='decisionPosition')d.positionId=previous.positionId;
    await tx.insert(s.transitionDecisions).values(d);
    await tx.insert(s.budgetTransfers).values({...f,id:randomUUID(),budgetUpdateId:b.id,recordedSeq:b.recordedSeq,proposalId:String(prepared.proposal.proposalId),decisionId,sourcePeriodId:previous.fundingPeriodId,targetPeriodId:targetId,beforeAllocationRevisionId:h.base.vectorId,afterAllocationRevisionId:v.vectorId,fundingManifest:[proof]});
    const row={...previous,id,previousRevisionId:previous.id,logicalFactId:id,supersedesId:null,transitionDecisionId:variant==='missingDecision'?null:variant==='foreignDecision'?randomUUID():decisionId,
      positionId:variant==='position'?previous.positionId:v.positionId,fundingPeriodId:variant==='sameFunding'?previous.fundingPeriodId:targetId,
      effectiveDate:today,confirmedAt:b.recordedAt,action:'FUNDING_TRANSFER',beforeState:variant==='beforeState'?{}:old,title:variant==='title'?'Changed':previous.title};
    if(saving){const e=previous as typeof h.savings[number];
      await tx.execute(sql`INSERT INTO savings_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,savings_id,previous_revision_id,logical_fact_id,position_id,funding_period_id,effective_date,confirmed_at,action,before_state,amount_cents,status,title,transition_decision_id)
       VALUES(${row.id},${f.ownerUserId},${f.accountId},${b.id},${b.recordedSeq},${e.savingsId},${variant==='predecessor'?randomUUID():row.previousRevisionId},${row.logicalFactId},${row.positionId},${row.fundingPeriodId},${row.effectiveDate},${row.confirmedAt},${row.action},${JSON.stringify(row.beforeState)}::jsonb,${variant==='amount'?e.amountCents+1n:e.amountCents},${variant==='status'?'RELEASED':e.status},${row.title},${row.transitionDecisionId})`);
    }else{const e=previous as typeof h.obligations[number];
      await tx.execute(sql`INSERT INTO obligation_events(id,owner_user_id,account_id,budget_update_id,recorded_seq,obligation_id,previous_revision_id,logical_fact_id,position_id,funding_period_id,effective_date,confirmed_at,action,before_state,original_cents,outstanding_cents,status,is_possible,reserve_full,title,due_date,transition_decision_id)
       VALUES(${row.id},${f.ownerUserId},${f.accountId},${b.id},${b.recordedSeq},${e.obligationId},${variant==='predecessor'?randomUUID():row.previousRevisionId},${row.logicalFactId},${row.positionId},${row.fundingPeriodId},${row.effectiveDate},${row.confirmedAt},${row.action},${JSON.stringify(row.beforeState)}::jsonb,${e.originalCents},${variant==='amount'?e.outstandingCents-1n:e.outstandingCents},${variant==='status'?'CANCELLED':e.status},${e.isPossible},${variant==='reserve'?false:e.reserveFull},${row.title},${e.dueDate},${row.transitionDecisionId})`);
    }
    if(variant==='cancelConflict')await tx.insert(s.transferProposalCancellations).values({...f,id:randomUUID(),proposalId:String(prepared.proposal.proposalId),controlRequestId:randomUUID(),actorId:f.ownerUserId,payloadIdentity:'synthetic',document:{},cancelledAt:b.recordedAt,reason:'Synthetic'});
    if(variant==='duplicate'){
      const duplicateId=randomUUID();
      if(saving)await tx.execute(sql`INSERT INTO savings_events SELECT (jsonb_populate_record(NULL::savings_events,to_jsonb(e)||jsonb_build_object('id',${duplicateId}::uuid,'logical_fact_id',${duplicateId}::uuid))).* FROM savings_events e WHERE e.id=${id}`);
      else await tx.execute(sql`INSERT INTO obligation_events SELECT (jsonb_populate_record(NULL::obligation_events,to_jsonb(e)||jsonb_build_object('id',${duplicateId}::uuid,'logical_fact_id',${duplicateId}::uuid))).* FROM obligation_events e WHERE e.id=${id}`);
    }
    return v.audit;
  });
}
async function preparedForDirect(f:Scope){return prepared(f);}
it.each([false,true].flatMap(saving=>['missingDecision','foreignDecision','position','sameFunding','beforeState','predecessor','title','amount','status','decisionMode','decisionPosition','cancelConflict','duplicate'].map(variant=>({saving,variant}))))('HB13 T48/T49 direct SQL $variant saving=$saving rejects and rolls back',async({saving,variant})=>{
  const f=await fixture(),b=await baseline(f);await expect(directFunding(f,variant,saving)).rejects.toMatchObject({code:'TRANSACTION_FAILED'});
  // Prepare is an allowed immutable control write; financial data and all original rows stay exact.
  const after=await baseline(f);expect(after.account).toEqual(b.account);for(let i=0;i<b.rows.length;i++)if(i!==12)expect(after.rows[i]).toEqual(b.rows[i]);
});
it('HB13 T64 SQL allows valid relational funding but missing evidence refuses runtime history',async()=>{
  const f=await fixture();await directFunding(f,'valid');const a=await account(f);await expect(loadObligationHistory(db.db,f,a.recordedSeq)).rejects.toMatchObject({code:'HISTORICAL_FUNDING_CONFLICT'});
});
it('HB13 T64 savings missing funding audit refuses runtime history',async()=>{
  const f=await fixture();await directFunding(f,'valid',true);const a=await account(f);await expect(loadSavingHistory(db.db,f,a.recordedSeq)).rejects.toMatchObject({code:'HISTORICAL_SAVINGS_CONFLICT'});
});

async function closing(f:Scope,supported=true){
  const h=await selected(f),period=h.periods.find(p=>p.period===past)!,id=randomUUID(),headId=randomUUID();
  await batch(f,{},today,async(tx,b)=>{
    await tx.insert(s.monthClosings).values({...f,id,budgetUpdateId:b.id,recordedSeq:b.recordedSeq,periodId:period.id,version:1,historicalThroughDate:calendar.pastEnd,closedAt:b.recordedAt,closedBy:f.ownerUserId,
      evidenceRecordedCutoffSeq:h.oh.knowledgeCut,evidenceRecordedCutoffAt:b.recordedAt,reason:'Synthetic HB013 close',changeEvidenceRefs:[],lastCheckpointId:h.base.checkpointId,lastBankObservedDate:calendar.pastDay(1),lastBankObservedAt:null,lastObservedBalanceCents:89000n,historicalAllocationRevisionId:h.base.vectorId,allocationEffectiveDate:calendar.pastDay(1),endCheckpointId:null,endBalanceCents:null,bankDataCompleteness:'INCOMPLETE',operationDetailStatus:'NOT_PROVIDED',historicalAllocatedCents:40000n,historicalReservedCents:30000n,historicalSavingsCents:5000n,historicalFreeCents:5000n,snapshotSchemaVersion:1,selectionContractVersion:1,
      snapshotJson:{synthetic:true,A:'40000',R:'30000',S:'5000',F:'5000'},sourceManifest:supported?{obligationRevisionIds:h.obligations.map(e=>e.id),savingsRevisionIds:h.savings.map(e=>e.id)}:{unsupported:true},orderingRevisionRefs:h.bank.orderingRevisionIds});
    await tx.insert(s.reportHeads).values({...f,id:headId,periodId:period.id,closingId:id});
    return [{entityType:'SYNTHETIC_CLOSE',entityId:id,before:null,after:{headId}}];
  });return {id,headId};
}
it('HB13 T44 later CARRY leaves original closing bytes, pinned K and pending flag unchanged',async()=>{
  const f=await fixture(),c=await closing(f),before=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,c.id)),p=await prepared(f);value(await p.repo.confirm(f,p.confirmation));
  expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,c.id))).toEqual(before);expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,c.headId)))[0].correctionPending).toBe(false);
});
it('HB13 T45 accepted historical correction flags affected original without automatic v2',async()=>{
  const f=await fixture(),c=await closing(f),h=await selected(f),e=h.obligations[0],before=await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,c.id));
  await batch(f,{changes:[{key:'correct',action:'CREATE',obligationId:e.obligationId,expectedStateRevisionId:null,correctionId:e.id,previousChangeKey:null,effectiveDate:calendar.pastDay(2),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:e.title,dueDate:null,originalCents:'31000',isPossible:false,reserveFull:true,originatingPeriod:past,fundingPeriod:past}}]},calendar.pastDay(2),writeObligations);
  expect((await selected(f)).obligations[0].outstandingCents).toBe(31000n);expect((await db.db.select().from(s.reportHeads).where(eq(s.reportHeads.id,c.headId)))[0].correctionPending).toBe(true);expect(await db.db.select().from(s.monthClosings).where(eq(s.monthClosings.id,c.id))).toEqual(before);
});
it('HB13 T47 malformed report manifest rolls back final multi-stream candidate',async()=>{
  const f=await fixture();await closing(f,false);const p=await prepared(f),b=await baseline(f);expect(await p.repo.confirm(f,p.confirmation)).toEqual({ok:false,code:'REPORT_IMPACT_REVIEW_REQUIRED'});expect(await baseline(f)).toEqual(b);
});
it.each(['auditFailure','sqlFailure'] as const)('HB13 T47 rollback after all financial inserts: %s',async variant=>{
  const f=await fixture(),p=await prepared(f),b=await baseline(f);
  await expect(commitBatch(db.db,{scope:f,kind:'PERIOD_TRANSITION',command:p.confirmation},async(tx,batch)=>{
    const audits=await writeTransition(tx,batch);
    if(variant==='sqlFailure')await tx.execute(sql`INSERT INTO period_allocations(id,owner_user_id,account_id,allocation_revision_id,period_id,amount_cents) VALUES(${randomUUID()},${f.ownerUserId},${f.accountId},${randomUUID()},${randomUUID()},1)`);
    return variant==='auditFailure'?[]:audits;
  })).rejects.toThrow();expect(await baseline(f)).toEqual(b);
});
it.each(['mapping','evidence','receipt'] as const)('HB13 PG-P10 corrupt stored %s refuses replay with STORAGE_ERROR',async variant=>{
  const f=await fixture(),p=await prepared(f),client=new pg.Client({connectionString:testUrl});await client.connect();
  if(variant==='receipt'){
    const original=client.query.bind(client);Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{
      const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text' in q?String(q.text):'';
      const columns=/^insert into "budget_updates" \(([^)]+)\)/.exec(text);
      if(columns){const at=columns[1].split(',').map(c=>c.trim()).indexOf('"result"');const params=Array.isArray(args[1])?[...args[1]]:null;if(!params||at<0)throw Error('RECEIPT_FIXTURE_QUERY_CHANGED');params[at]='{}';args[1]=params;}
      return Reflect.apply(original,client,args);
    }});
  }
  try{
    await commitBatch(drizzle(client,{schema:s}),{scope:f,kind:'PERIOD_TRANSITION',command:p.confirmation},async(tx,b)=>{
      const a=await writeTransition(tx,b);return a.map((x):AuditDescriptor=>{
        if(variant==='mapping'&&x.entityType==='TRANSITION_CONFIRMATION')return {...x,after:{...x.after as object,vectorId:randomUUID()}};
        if(variant==='evidence'&&x.entityType==='FUNDING_TRANSFER')return {...x,after:{state:null,proof:null}};
        return x;
      });
    });
    const before=await baseline(f);expect(await p.repo.confirm(f,replayCommand(p.confirmation))).toEqual({ok:false,code:'STORAGE_ERROR'});expect(await baseline(f)).toEqual(before);
  }finally{await client.end();}
});
it('HB13 0005 upgrade over 0000..0004 retains pre-existing immutable facts',async()=>{
  const u=new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL),name='hb013_upgrade_'+randomUUID().replaceAll('-','');await admin.query('CREATE DATABASE "'+name+'"');u.pathname='/'+name;const legacy=new pg.Pool({connectionString:u.toString()});
  try{
    for(const file of ['0000_foundation.sql','0001_integrity.sql','0002_checkpoint_positions.sql','0003_obligation_lifecycle_guards.sql','0004_savings_lifecycle_guards.sql'])await legacy.query(readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
    const owner=randomUUID(),acct=randomUUID();await legacy.query('INSERT INTO users(id) VALUES($1)',[owner]);await legacy.query("INSERT INTO accounts(id,owner_user_id,display_name) VALUES($1,$2,'Synthetic upgrade')",[acct,owner]);
    const period=randomUUID(),update=randomUUID(),position=randomUUID(),checkpoint=randomUUID(),vector=randomUUID();
    await legacy.query('BEGIN');
    await legacy.query('INSERT INTO budget_periods(id,owner_user_id,account_id,period) VALUES($1,$2,$3,$4)',[period,owner,acct,past]);
    await legacy.query("INSERT INTO budget_updates(id,owner_user_id,account_id,request_id,payload_identity,expected_revision,recorded_seq,actor_id,kind,result) VALUES($1,$2,$3,$4,'synthetic-upgrade',0,1,$2,'SYNTHETIC_UPGRADE','{}')",[update,owner,acct,randomUUID()]);
    await legacy.query("INSERT INTO historical_positions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,kind) VALUES($1,$2,$3,$4,1,$5,'BANK_CHECK')",[position,owner,acct,update,calendar.pastDay(1)]);
    await legacy.query('INSERT INTO ordering_revisions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,manifest,dependencies) VALUES($1,$2,$3,$4,1,$7,$5::jsonb,$6::jsonb)',[randomUUID(),owner,acct,update,JSON.stringify({schemaVersion:1,positionIds:[position]}),JSON.stringify({schemaVersion:1,edges:[]}),calendar.pastDay(1)]);
    await legacy.query("INSERT INTO balance_checkpoints(id,owner_user_id,account_id,budget_update_id,recorded_seq,logical_fact_id,position_id,observed_date,balance_cents,reason) VALUES($1,$2,$3,$4,1,$1,$5,$6,10000,'Synthetic actual observation')",[checkpoint,owner,acct,update,position,calendar.pastDay(1)]);
    await legacy.query("INSERT INTO allocation_revisions(id,owner_user_id,account_id,budget_update_id,recorded_seq,logical_fact_id,checkpoint_id,position_id,effective_date,change_kind) VALUES($1,$2,$3,$4,1,$1,$5,$6,$7,'ACTUAL_CHECK')",[vector,owner,acct,update,checkpoint,position,calendar.pastDay(1)]);
    await legacy.query('INSERT INTO period_allocations(id,owner_user_id,account_id,allocation_revision_id,period_id,amount_cents) VALUES($1,$2,$3,$4,$5,10000)',[randomUUID(),owner,acct,vector,period]);
    await legacy.query('UPDATE accounts SET aggregate_revision=1,recorded_seq=1,active_allocation_revision_id=$1 WHERE id=$2',[vector,acct]);await legacy.query('COMMIT');
    const before=(await legacy.query('SELECT * FROM accounts')).rows,oldBank=(await legacy.query('SELECT * FROM balance_checkpoints')).rows,oldVector=(await legacy.query('SELECT * FROM allocation_revisions')).rows;
    await legacy.query(readFileSync('drizzle/0005_period_transfers.sql','utf8').replaceAll('--> statement-breakpoint',''));
    expect((await legacy.query('SELECT * FROM accounts')).rows).toEqual(before);expect((await legacy.query('SELECT * FROM balance_checkpoints')).rows).toEqual(oldBank);expect((await legacy.query('SELECT * FROM allocation_revisions')).rows).toEqual(oldVector);expect((await legacy.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).rows).toHaveLength(20);
  }finally{await legacy.end();}
});
it('HB13 T65 normal payment after funding retains savings, actual bank and exact reserve semantics',async()=>{
  const f=await fixture(),p=await prepared(f);value(await p.repo.confirm(f,p.confirmation));const h=await selected(f),o=h.obligations[0],day=value(indexHistory(h.oh)).days.get(today)!;
  await batch(f,{changes:[{key:'paid',action:'PAID',obligationId:o.obligationId,expectedStateRevisionId:o.id,correctionId:null,previousChangeKey:null,effectiveDate:today,bankDate:null,placement:null,
    bankCheck:{observedDate:today,observedAt:null,balanceCents:'59000',allocations:[{period:target,amountCents:'58000'},{period:future,amountCents:'1000'}],correction:null,placement:{expectedOrderingRevisionId:day.id,afterPositionId:day.positionIds.at(-1),beforePositionId:null}},
    paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:null},data:{amountCents:'30000'}}]},today,writeObligations);
  const next=await selected(f);expect(next.base.balanceCents).toBe(59000n);expect(next.obligations[0]).toMatchObject({status:'PAID',outstandingCents:0n,fundingPeriodId:o.fundingPeriodId});expect(next.savings).toEqual(h.savings);expect(58000n-5000n).toBe(53000n);
});
it('HB13 T28 DEFER preserves full funding without a transfer',async()=>{
  const f=await fixture(),before=await selected(f),p=await input(f,'DEFER','84000');p.allocations=[{period:past,amountCents:'35000'},{period:target,amountCents:'48000'},{period:future,amountCents:'1000'}];p.checkpoint!.allocations=p.allocations;
  const pr=await proposeInput(f,p);value(await pr.repo.confirm(f,pr.confirmation));const next=await selected(f);expect(next.obligations).toEqual(before.obligations);expect(next.savings).toEqual(before.savings);expect(next.base.balanceCents).toBe(84000n);expect(next.oh.checkpoints).toHaveLength(2);expect(await db.db.select().from(s.budgetTransfers).where(eq(s.budgetTransfers.accountId,f.accountId))).toHaveLength(0);
});
it('HB13 T26 FRESH_START discovers earmarks even without source cash',async()=>{
  const f=await fixture(true,true),pr=await prepared(f,'FRESH_START','8000');value(await pr.repo.confirm(f,pr.confirmation));const h=await selected(f);expect(h.base.balanceCents).toBe(8000n);expect(h.obligations[0].outstandingCents).toBe(30000n);expect(h.savings[0].amountCents).toBe(5000n);expect(8000n-30000n-5000n).toBe(-27000n);
});
it.each(['month-start','same-day'] as const)('HB13 T42/T43 incompatible %s suffix refuses the complete candidate',async placement=>{
  const f=await fixture(),h=await selected(f),e=h.obligations[0];await batch(f,{changes:[{key:'amend',action:'AMEND',obligationId:e.obligationId,expectedStateRevisionId:e.id,correctionId:null,previousChangeKey:null,effectiveDate:today,bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:'Synthetic later state'}}]},today,writeObligations);
  const p=await input(f);p.effectiveDate=placement==='same-day'?today:calendar.currentStart;
  const day=value(indexHistory((await selected(f)).oh)).days.get(p.effectiveDate);
  // Day one has no earlier date in this target month: place before the retained suffix explicitly.
  const reviewed={...p,placement:day?{expectedOrderingRevisionId:day.id,afterPositionId:null,beforePositionId:day.positionIds[0]}:null};
  const a=await account(f),repo=createProposalRepository(db),proposal=value(await repo.prepare(f,command(reviewed,a.aggregateRevision,p.effectiveDate))) as Record<string,CanonicalValue>,c=command({proposalId:proposal.proposalId,proposalIdentity:proposal.proposalIdentity,input:reviewed,review:proposal.review},a.aggregateRevision,p.effectiveDate),b=await baseline(f);
  expect(await repo.confirm(f,c)).toEqual({ok:false,code:'HISTORICAL_PAYMENT_CONFLICT'});expect(await baseline(f)).toEqual(b);
});
it('HB13 T29/T68 prepare and preview persist only immutable control review',async()=>{
  const f=await fixture(),before=await baseline(f),p=await prepared(f),after=await baseline(f);expect(after.account).toEqual(before.account);for(let i=0;i<before.rows.length;i++)if(i!==12)expect(after.rows[i]).toEqual(before.rows[i]);
  expect((p.proposal.review as Record<string,CanonicalValue>).preview).toEqual([{period:target,allocated:'88000',reserved:'30000',savings:'5000',free:'53000'},{period:future,allocated:'1000',reserved:'0',savings:'0',free:'1000'}]);
  expect(await p.repo.read(f,String(p.proposal.proposalId))).toMatchObject({ok:true,value:{status:'PROPOSED'}});expect(await baseline(f)).toEqual(after);
});
it('HB13 T32 a proposal for a completed target month is stale even without account changes',async()=>{
  const f=await fixture(false),a=await account(f),st=await selected(f),sourceId=await db.db.transaction(tx=>ensurePeriod(tx,f,calendar.older)),targetId=st.periods.find(p=>p.period===past)!.id;
  const p=await input(f);p.target=past;p.sources=[calendar.older];p.effectiveDate=calendar.pastEnd;p.allocations=st.base.allocations.map(x=>({period:x.period,amountCents:x.amountCents.toString()}));p.fundingRefs=[];
  const id=randomUUID(),doc={schemaVersion:1,expectedRevision:a.aggregateRevision.toString(),effectiveDate:p.effectiveDate,reason:'Synthetic aged proposal',input:p,review:{}},identity=createHash('sha256').update(encodeCanonical({owner:f.ownerUserId,account:f.accountId,document:doc})).digest('hex');
  await db.db.insert(s.transferProposals).values({...f,id,expectedRevision:a.aggregateRevision,baseCheckpointId:st.base.checkpointId,baseAllocationRevisionId:st.base.vectorId,targetPeriodId:targetId,sourcePeriodId:sourceId,payloadIdentity:identity,mode:'CARRY',observationMode:'REUSE_CONFIRMED',proposal:doc,createdAt:calendar.agedProposalCreatedAt});
  const repo=createProposalRepository(db);expect(await repo.read(f,id)).toMatchObject({ok:true,value:{status:'STALE'}});const b=await baseline(f),c=value(prepareCommand({requestId:randomUUID(),expectedRevision:a.aggregateRevision,effectiveDate:p.effectiveDate,reason:doc.reason,payload:{proposalId:id,proposalIdentity:identity,input:p,review:{}}}));
  expect(await repo.confirm(f,c)).toEqual({ok:false,code:'TARGET_PERIOD_CHANGED'});expect(await baseline(f)).toEqual(b);
});
it('HB13 PG-P15 confirmed replay never consults the current calendar',async()=>{
  const f=await fixture(),p=await prepared(f),receipt=value(await p.repo.confirm(f,p.confirmation)),client=new pg.Client({connectionString:testUrl});await client.connect();const query=client.query.bind(client);let clockReads=0;
  Object.defineProperty(client,'query',{value:async(...args:unknown[])=>{const q=args[0],text=typeof q==='string'?q:q&&typeof q==='object'&&'text' in q?String(q.text):'';if(text.includes('clock_timestamp')){clockReads++;throw Error('CONFIRMED_REPLAY_MUST_NOT_QUERY_TODAY');}return Reflect.apply(query,client,args);}});
  try{const before=await baseline(f);expect(value(await createProposalRepository({db:drizzle(client,{schema:s})}).confirm(f,replayCommand(p.confirmation)))).toEqual(receipt);expect(clockReads).toBe(0);expect(await baseline(f)).toEqual(before);}finally{await client.end();}
});
it.each(['PG-R01 exact allocation-only','PG-R02 unconfirmed rollover','PG-R04 exact CARRY'])('HB13 %s owner 90000/30000 example',async variant=>{
  const f=await fixture(false);await batch(f,{observedDate:calendar.pastDay(4),observedAt:null,balanceCents:'90000',allocations:[{period:past,amountCents:'40000'},{period:target,amountCents:'50000'}],correction:null,placement:null},calendar.pastDay(4),writeBankCheckpoint);
  await batch(f,{changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:calendar.pastDay(5),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:'Synthetic exact owner example',dueDate:null,originalCents:'30000',isPossible:false,reserveFull:true,originatingPeriod:past,fundingPeriod:past}}]},calendar.pastDay(5),writeObligations);
  const before=await selected(f),p=await input(f,variant.includes('CARRY')?'CARRY':'REDISTRIBUTE');p.allocations=[{period:target,amountCents:'90000'}];
  if(variant.includes('rollover')){p.intent='TRANSITION';const b=await baseline(f);await expect(batch(f,p,today,writeRedistribution)).rejects.toMatchObject({code:'TRANSITION_CONFIRMATION_REQUIRED'});expect(await baseline(f)).toEqual(b);return;}
  if(p.mode==='CARRY'){const pr=await proposeInput(f,p);value(await pr.repo.confirm(f,pr.confirmation));}else await batch(f,p,today,writeRedistribution);
  const h=await selected(f);expect(h.base.balanceCents).toBe(90000n);expect(h.bank.vector.allocations).toEqual([{period:target,amountCents:90000n}]);expect(h.savings).toHaveLength(0);expect(h.oh.checkpoints).toEqual(before.oh.checkpoints);expect(h.obligations[0].outstandingCents).toBe(30000n);
  const funded=h.periods.find(x=>x.id===h.obligations[0].fundingPeriodId)!.period;expect(funded).toBe(p.mode==='CARRY'?target:past);expect(90000n-30000n).toBe(60000n);
  if(p.mode==='REDISTRIBUTE'){expect(h.obligations).toEqual(before.obligations);expect(0n-30000n).toBe(-30000n);expect(await db.db.select().from(s.transitionDecisions).where(eq(s.transitionDecisions.accountId,f.accountId))).toHaveLength(0);}
});
it('HB13 T51 full unpaid remainder after partial settlement survives funding SQL guards',async()=>{
  const f=await fixture(),h=await selected(f),o=h.obligations[0];
  await batch(f,{changes:[{key:'partial',action:'PARTIAL_SETTLEMENT',obligationId:o.obligationId,expectedStateRevisionId:o.id,correctionId:null,previousChangeKey:null,effectiveDate:calendar.pastDay(4),bankDate:null,placement:null,
    bankCheck:{observedDate:calendar.pastDay(4),observedAt:null,balanceCents:'84000',allocations:[{period:past,amountCents:'35000'},{period:target,amountCents:'48000'},{period:future,amountCents:'1000'}],correction:null,placement:null},paymentConfirmation:{source:'TRACKED_CARD',bankStateAffirmed:true,unchangedBalanceAcknowledged:false,checkpointId:null},data:{amountCents:'5000'}}]},calendar.pastDay(4),writeObligations);
  const p=await input(f);p.allocations=[{period:target,amountCents:'83000'},{period:future,amountCents:'1000'}];const pr=await proposeInput(f,p);value(await pr.repo.confirm(f,pr.confirmation));const after=await selected(f);
  expect(after.obligations[0]).toMatchObject({originalCents:30000n,outstandingCents:25000n,reserveFull:true,status:'UNPAID'});expect(after.base.balanceCents).toBe(84000n);expect(83000n-25000n-5000n).toBe(53000n);
});
it('HB13 unelected possible claim transfers without becoming a selected reserve',async()=>{
  const f=await fixture(),h=await selected(f),o=h.obligations[0];await batch(f,{changes:[{key:'possible',action:'AMEND',obligationId:o.obligationId,expectedStateRevisionId:o.id,correctionId:null,previousChangeKey:null,effectiveDate:calendar.pastDay(4),bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{isPossible:true,reserveFull:false}}]},calendar.pastDay(4),writeObligations);
  const p=await prepared(f);value(await p.repo.confirm(f,p.confirmation));expect((await selected(f)).obligations[0]).toMatchObject({isPossible:true,reserveFull:false,outstandingCents:30000n,status:'UNPAID'});
  expect((p.proposal.review as Record<string,CanonicalValue>).preview).toEqual([{period:target,allocated:'88000',reserved:'0',savings:'5000',free:'83000'},{period:future,allocated:'1000',reserved:'0',savings:'0',free:'1000'}]);
});
