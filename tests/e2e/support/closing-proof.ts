import fs from 'node:fs';import {test,expect,type Page} from '@playwright/test';
import {contextFor,foreign,own,clock,identity} from './onboarding-proof';import {database,census,noWrite,hydrated,invoke,argsOf,resultOf,actionFrom,type Action} from './proof';
import {quiet,monitor,same,euros,ownRows,oracle} from './history-proof';import {storedReport,storedDigest} from './history-report-oracle';
import en from '../../../src/shared/i18n/messages/en.json' with {type:'json'};
import {closingResult} from './closing-flight';
export {test,expect,contextFor,foreign,own,clock,identity,database,census,noWrite,hydrated,invoke,argsOf,resultOf,actionFrom,quiet,monitor,same,euros,ownRows,en};export type{Action};
export const t=en.monthClosing;
export type Fixture={calendar:{today:string;m:string;p:string;h:string;d0:string};scope:{ownerUserId:string;accountId:string};amounts:{r:string;s:string};foreign:{owner:string;account:string;receipt:{updateId:string}}};
export const fixture=()=>JSON.parse(fs.readFileSync('/work/test-results/g-fixture.json','utf8')) as Fixture;
export const screen=(p:Page)=>p.getByRole('heading',{name:t.title,exact:true}).locator('..').locator('..');
export async function open(p:Page,version?:number){monitor(p);await p.goto('/months?period='+fixture().calendar.m+(version?'&version='+version:''));await expect(p.getByRole('heading',{name:t.title,exact:true})).toBeVisible();await hydrated(p.getByRole('button',{name:t.refresh,exact:true}));await quiet(p);}
export function requestArgs(body:string|null){try{return JSON.parse(body??'') as unknown[];}catch{return[];}}
export async function action(p:Page,match:(args:unknown[])=>boolean,click:()=>Promise<unknown>){monitor(p);const pending=p.waitForResponse(r=>!!r.request().headers()['next-action']&&match(requestArgs(r.request().postData())));await click();const r=await pending;await r.finished();await quiet(p);const body=await r.text(),f=fixture();expect(!body.includes(f.foreign.owner)&&!body.includes(f.foreign.account)&&!body.includes('654321'),'G_NO_FOREIGN_ACTION_DISCLOSURE').toBe(true);return{action:actionFrom(r.request()),result:closingResult(body)};}
export async function refresh(p:Page){return action(p,a=>!!a[0]&&typeof a[0]==='object'&&'period'in a[0]&&!('requestId'in a[0]),()=>p.getByRole('button',{name:t.refresh,exact:true}).click());}
export async function review(p:Page,reason='G explicit synthetic closing reason'){
 await p.getByRole('textbox',{name:t.reason,exact:true}).fill(reason);
 const r=await action(p,a=>!!a[0]&&typeof a[0]==='object'&&'requestId'in a[0]&&!((a[0] as {payload?:{confirmed?:boolean}}).payload?.confirmed),()=>p.getByRole('button',{name:/^Review closing/}).click());
 expect(r.result?.ok===true,'G_REAL_PREVIEW_OK').toBe(true);await expect(p.getByRole('checkbox',{name:t.consent,exact:true})).toBeVisible();
 // Read every actual evidence page. No bypass of the production review gate.
 const next=p.getByRole('button',{name:t.evidenceNext,exact:true});let pages=1;
 while(await next.count()&&await next.isEnabled()){expect(pages++<100,'G_BOUNDED_EVIDENCE_REVIEW').toBe(true);await next.click();}
 try{await expect(p.getByRole('checkbox',{name:t.consent,exact:true})).toBeEnabled();}catch(error){test.info().annotations.push({type:'G-review-diagnostic',description:JSON.stringify({evidencePagesClicked:pages,alerts:await p.getByRole('alert').allTextContents(),status:await p.getByRole('status').allTextContents(),evidenceNext:await next.count()?await next.isEnabled():null,details:await p.getByRole('heading',{level:3}).allTextContents()})});throw error;}await p.getByRole('checkbox',{name:t.consent,exact:true}).check();
 await expect(p.getByRole('button',{name:/^Confirm report version/})).toBeEnabled();return r;
}
export async function confirm(p:Page){return action(p,a=>!!a[0]&&typeof a[0]==='object'&&!!(a[0] as {payload?:{confirmed?:boolean}}).payload?.confirmed,()=>p.getByRole('button',{name:/^Confirm report version/}).click());}
export async function rows(){return Object.fromEntries(Object.entries(JSON.parse(await census()) as Record<string,string>).map(([k,v])=>[k,JSON.parse(v) as Record<string,unknown>[]]));}
export async function closeWrites(before:Awaited<ReturnType<typeof rows>>,receipt:Record<string,unknown>){
 const after=await rows(),id=await identity(),mutable=new Set(['accounts','budget_periods','budget_updates','audit_events','month_closings','report_heads']);
 for(const table of Object.keys(before)){
  if(!mutable.has(table)){same(after[table],before[table],'G_NO_FINANCIAL_FACT_WRITES_'+table);continue;}
  for(const old of before[table]){const n=after[table].find(r=>r.id===old.id);expect(!!n,'G_OLD_ROW_RETAINED_'+table).toBe(true);
   if(table==='accounts'&&old.owner_user_id===id){for(const k of Object.keys(old))if(!['aggregate_revision','recorded_seq'].includes(k))same(n![k],old[k],'G_POINTERS_ACCOUNT_RETAINED_'+k);for(const k of ['aggregate_revision','recorded_seq'])expect(BigInt(String(n![k]))===BigInt(String(old[k]))+1n,'G_ONE_COUNTER_'+k).toBe(true);}
   else if(table==='report_heads'&&old.owner_user_id===id){for(const k of Object.keys(old))if(!['closing_id','correction_pending'].includes(k))same(n![k],old[k],'G_HEAD_IDENTITY_RETAINED');expect(n!.correction_pending===false,'G_PENDING_CLEARED').toBe(true);}
   else same(n,old,'G_IMMUTABLE_'+table);
  }
  const added=after[table].filter(r=>!before[table].some(o=>o.id===r.id));expect(added.every(r=>r.owner_user_id===id),'G_ONLY_OWNED_WRITES_'+table).toBe(true);
  if(table==='budget_updates'||table==='month_closings')expect(added.length===1,'G_EXACT_ONE_'+table).toBe(true);
  if(table==='audit_events'){expect(added.length===2,'G_EXACT_TWO_CLOSING_AUDITS').toBe(true);same(added.map(a=>(a.before_after as {entity:{type:string}}).entity.type).sort(),['REPORT_HEAD','REPORT_VERSION'],'G_TYPED_AUDITS');}
  if(['budget_updates','month_closings','audit_events'].includes(table))expect(added.every(r=>(table==='budget_updates'?r.id:r.budget_update_id)===receipt.updateId&&String(r.recorded_seq)===receipt.recordedSeq),'G_ONE_BATCH_K').toBe(true);
  if(table==='report_heads'||table==='budget_periods')expect(added.length<=1,'G_BOUNDED_CONTROL_CREATION').toBe(true);
 }
 const batch=after.budget_updates.find(r=>r.id===receipt.updateId)!;same(batch.result,receipt,'G_PERSISTED_ORIGINAL_RECEIPT');
 const audit=after.audit_events.find(a=>a.budget_update_id===receipt.updateId&&(a.before_after as {entity:{type:string}}).entity.type==='REPORT_VERSION')!,command=(audit.before_after as {after:{command:Record<string,unknown>}}).after.command;
 expect(command.requestId===batch.request_id&&String(command.expectedRevision)===String(batch.expected_revision)&&command.reason===audit.reason,'G_ORIGINAL_COMMAND_AUDIT_BINDING').toBe(true);
 expect(storedDigest({owner:batch.owner_user_id,account:batch.account_id,kind:'MONTH_CLOSE',expectedRevision:String(command.expectedRevision),payload:command.payload,effectiveDate:command.effectiveDate,reason:command.reason})===batch.payload_identity,'G_ORIGINAL_NORMALIZED_COMMAND_IDENTITY').toBe(true);
 test.info().annotations.push({type:'write-set',description:'CLOSE only: exact20-table comparison, one report/batch/counter step, two audit descriptors; all C/V/A/O/S/positions/order and earlier report bytes unchanged'});return after;
}
export async function document(p:Page,version:number){
 const r=await action(p,a=>!!a[0]&&typeof a[0]==='object'&&(a[0] as {version?:number}).version===version,()=>p.getByRole('button',{name:t.details,exact:true}).click());expect(r.result?.ok===true,'G_REAL_CHUNK_OK').toBe(true);
 let wire=r.result!.value as {base64:string;nextOffset:number|null;digest:string;totalBytes:number};const bytes=[Buffer.from(wire.base64,'base64')],digest=wire.digest,total=wire.totalBytes;let n=0;
 while(wire.nextOffset!==null){expect(n++<100,'G_BOUNDED_CHUNKS').toBe(true);const a=argsOf(r.action)[0] as object,reply=closingResult((await invoke(p,r.action,[{...a,offset:wire.nextOffset,digest}])).body);expect(reply?.ok===true).toBe(true);wire=reply!.value as typeof wire;expect(wire.digest===digest&&wire.totalBytes===total).toBe(true);bytes.push(Buffer.from(wire.base64,'base64'));}
 const full=Buffer.concat(bytes);expect(full.length===total,'G_ALL_REPORT_BYTES').toBe(true);const doc=JSON.parse(full.toString('utf8')),f=fixture(),all=await ownRows(),row=all.month_closings.find(x=>x.version===version)!;
 same(doc,storedReport(row,f.calendar.m),'G_FULL_PERSISTED_ENVELOPE');expect(storedDigest(doc)===digest,'G_FULL_CANONICAL_DIGEST').toBe(true);
 const audit=all.audit_events.find(a=>a.budget_update_id===row.budget_update_id&&(a.before_after as {entity:{type:string}}).entity.type==='REPORT_VERSION')!,after=(audit.before_after as {after:{digest:string;command:Record<string,unknown>;knowledgeCut:string}}).after;
 expect(after.digest===digest&&after.knowledgeCut===String(row.evidence_recorded_cutoff_seq)&&row.historical_through_date===f.calendar.h,'G_ORIGINAL_AUDIT_DIGEST_H_K').toBe(true);
 const batch=all.budget_updates.find(b=>b.id===row.budget_update_id)!;expect(batch.request_id===after.command.requestId&&batch.kind==='MONTH_CLOSE','G_ORIGINAL_REQUEST_RECEIPT_MAPPING').toBe(true);
 same(doc.snapshot,row.snapshot_json,'G_SNAPSHOT_IMMUTABLE_BYTES');same(doc.sourceManifest,row.source_manifest,'G_FULL_ORIGINAL_FUNDING_EVIDENCE');
 const o=await oracle(f.calendar.h,String(row.evidence_recorded_cutoff_seq)),kind=process.env.HB_G_CASE,zero=kind==='G-03',late=version===2,expectedR=BigInt(f.amounts?.r??'20000'),expectedS=BigInt(f.amounts?.s??'10000'),expectedA=zero?0n:late?56000n:60000n;
 same([String(row.historical_allocated_cents),String(row.historical_reserved_cents),String(row.historical_savings_cents),String(row.historical_free_cents)],[String(expectedA),String(expectedR),String(expectedS),String(expectedA-expectedR-expectedS)],'G_PERSISTED_EXACT_INTEGER_ORACLE');
 expect((o.A[f.calendar.m]??0n)===expectedA&&(o.R[f.calendar.m]??0n)===expectedR&&(o.S[f.calendar.m]??0n)===expectedS,'G_INDEPENDENT_PHYSICAL_FULL_A_R_S').toBe(true);
 expect(row.last_checkpoint_id===o.bank?.id&&row.historical_allocation_revision_id===o.vector?.id,'G_REAL_SOURCE_CHECKPOINT_VECTOR_AT_H_K').toBe(true);
 same(row.end_balance_cents===null?null:String(row.end_balance_cents),zero?'0':late?'76000':kind==='G-02'?'80000':null,'G_PERSISTED_END_NOT_CURRENT_SUBSTITUTION');
 const live=all.allocation_revisions.find(v=>v.id===all.accounts[0].active_allocation_revision_id)!,bank=all.balance_checkpoints.find(c=>c.id===live.checkpoint_id)!;expect(String(bank.balance_cents)==='100000','G_CURRENT_B_RETAINED_100000').toBe(true);
 test.info().annotations.push({type:'persisted-oracle',description:'H='+f.calendar.h+'; sourceK='+row.evidence_recorded_cutoff_seq+'; A/R/S/F='+expectedA+'/'+expectedR+'/'+expectedS+'/'+(expectedA-expectedR-expectedS)+'; end='+row.end_balance_cents+'; full document digest='+digest});
 return{row,doc,digest,chunk:r.action,all};
}
export async function summary(p:Page,version:number,expected:{end:string|null;bank:string;a:string;r:string;s:string;free:string}){
 const root=p.getByRole('heading',{name:t.version.replace('{n}',String(version)),exact:true}).locator('..');await expect(root).toBeVisible();
 for(const [key,value]of Object.entries({endBalanceCents:expected.end,lastObservedBalanceCents:expected.bank,historicalAllocatedCents:expected.a,historicalReservedCents:expected.r,historicalSavingsCents:expected.s,historicalFreeCents:expected.free}))await expect(root.locator('dt').filter({hasText:new RegExp('^'+t[key as keyof typeof t]+'$')}).locator('..').locator('dd')).toHaveText(value===null?t.unknown:euros(value));
}
