import fs from 'node:fs';import {randomUUID} from 'node:crypto';import type {Page,BrowserContext,Route} from '@playwright/test';
import {test,expect,contextFor,foreign,clock,database,noWrite,hydrated,invoke,argsOf,resultOf,actionFrom,quiet,monitor,same,ownRows,t,fixture,open,refresh,review,confirm,rows,closeWrites,document,summary,requestArgs,action,type Fixture,type Action} from '../e2e/support/closing-proof';
function scenario(name:string,run:(p:Page,c:BrowserContext,f:Fixture)=>Promise<void>){test(name,async({browser})=>{
 const ctx=await contextFor(browser),p=await ctx.newPage(),f=fixture(),retained=await foreign(),date=await clock(),errors:string[]=[];monitor(p);p.on('pageerror',e=>errors.push(e.message));let external=0;p.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:3000')external++;});
 try{await database(async c=>{const r=(await c.query("SELECT current_user role,has_schema_privilege('public','CREATE') ddl,pg_has_role(current_user,'hb_migrator','MEMBER') migrator,has_table_privilege('balance_checkpoints','INSERT') bank_write,has_table_privilege('month_closings','INSERT') close_write")).rows[0];expect(r.role==='hb_g_runtime'&&!r.ddl&&!r.migrator&&!r.bank_write&&r.close_write,'G_MINIMUM_DISPOSABLE_RUNTIME').toBe(true);});
  await run(p,ctx,f);await quiet(p);expect(errors,'G_NO_REACT_RENDER_ERRORS').toEqual([]);expect(external,'G_NO_EXTERNAL_BROWSER_REQUESTS').toBe(0);expect((await p.locator('body').innerText()).includes('G FORBIDDEN'),'G_NO_FOREIGN_UI').toBe(false);
  expect(await p.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(k=>k!=='home-budget-mode')),'G_NO_DRAFT_PERSISTENCE').toEqual([]);
  test.info().annotations.push({type:'runtime',description:'Chromium '+browser.version()+'; actual Berlin '+date.today+'; completed H='+f.calendar.h+'; independent persisted oracles; no server clock substitution'});
 }finally{same(await foreign(),retained,'G_FOREIGN_ACCOUNT_USERS_NO_WRITE');expect((await clock()).today===date.today,'G_CALENDAR_ROLLOVER_REFUSED').toBe(true);await ctx.close();}
});}
const values=(f:Fixture,end:string|null=null)=>({end,bank:'80000',a:'60000',r:f.amounts.r,s:f.amounts.s,free:'30000'});
async function initial(p:Page,f:Fixture,reason?:string){await noWrite('G_OPEN_PREVIEW_READ',async()=>{await open(p);await review(p,reason);});const before=await rows(),r=await confirm(p);expect(r.result?.ok===true,'G_REAL_CLOSE_OK').toBe(true);await closeWrites(before,r.result!.value as Record<string,unknown>);return r;}
async function replay(p:Page,a:Action,receipt:unknown){await noWrite('G_EXACT_ORIGINAL_KEY_REPLAY',async()=>{const r=resultOf((await invoke(p,a)).body);expect(r?.ok===true).toBe(true);same(r!.value,receipt,'G_ORIGINAL_RECEIPT_NOT_NEW_COMMIT');});}
scenario('G-01 HB19-E08 B01 incomplete v1 UNKNOWN exact H K original report and receipt',async(p,_c,f)=>{
 const r=await initial(p,f);await noWrite('G_INCOMPLETE_REPORT_RELOAD',async()=>{await summary(p,1,values(f));const full=await document(p,1);expect(full.row.end_checkpoint_id===null&&full.row.end_balance_cents===null&&full.row.bank_data_completeness==='INCOMPLETE','G_UNKNOWN_NOT_CURRENT_OR_ZERO').toBe(true);expect(full.row.last_bank_observed_date===f.calendar.d0,'G_ACTUAL_OLD_DATE').toBe(true);expect(BigInt(String(full.row.evidence_recorded_cutoff_seq))+1n===BigInt(String(full.row.recorded_seq)),'G_H_K_BEFORE_COMMIT').toBe(true);
 const q=argsOf(full.chunk)[0] as object;for(const patch of [{digest:'0'.repeat(64)},{version:999},{accountId:f.foreign.account}]){const denied=resultOf((await invoke(p,full.chunk,[{...q,...patch}])).body);expect(denied?.ok===false,'G_TAMPERED_OR_FOREIGN_REPORT_REFUSED').toBe(true);}
 await p.reload();await summary(p,1,values(f));});await replay(p,r.action,r.result!.value);
});
scenario('G-02 HB19-A01 observed end nonzero complete final day v1',async(p,_c,f)=>{
 await initial(p,f);await noWrite('G_OBSERVED_END_READ',async()=>{await summary(p,1,values(f,'80000'));const full=await document(p,1);expect(full.row.bank_data_completeness==='END_DATE_OBSERVED'&&full.row.last_bank_observed_date===f.calendar.h&&String(full.row.end_balance_cents)==='80000','G_REAL_END_SOURCE').toBe(true);});
});
scenario('G-03 HB19-A04 HBUX-028 observed zero deficit distinct from UNKNOWN and latest B',async(p,_c,f)=>{
 await initial(p,f);await noWrite('G_OBSERVED_ZERO_RELOAD',async()=>{const v={end:'0',bank:'0',a:'0',r:'2000',s:'1000',free:'-3000'};await summary(p,1,v);const full=await document(p,1);expect(String(full.row.end_balance_cents)==='0'&&full.row.bank_data_completeness==='END_DATE_OBSERVED','G_ZERO_IS_OBSERVED').toBe(true);expect(BigInt(String(full.row.historical_allocated_cents))-BigInt(String(full.row.historical_reserved_cents))-BigInt(String(full.row.historical_savings_cents))===-3000n,'G_NEGATIVE_F_NOT_CLAMPED').toBe(true);await p.reload();await summary(p,1,v);});
});
scenario('G-04 HB19-E09 late fact pending cancel explicit reason v2 immutable v1 current head',async(p,_c,f)=>{
 await noWrite('G_V1_PRE_LATE_READ',async()=>{await open(p);await summary(p,1,values(f));});const prior=await rows();
 fs.writeFileSync('/work/test-results/g-control/append','go');await expect.poll(()=>fs.existsSync('/work/test-results/g-control/appended'),{timeout:20000}).toBe(true);
 const afterLate=await rows();same(afterLate.month_closings,prior.month_closings,'G_LATE_NEVER_REPUBLISHES_V1');same(afterLate.accounts.map(a=>a.active_allocation_revision_id),prior.accounts.map(a=>a.active_allocation_revision_id),'G_LATE_CURRENT_POINTER_RETAINED');
 await noWrite('G_PENDING_REVIEW_CANCEL',async()=>{await refresh(p);await expect(p.getByText(t.pending,{exact:true})).toBeVisible();await review(p,'G explicit late final-day evidence correction');await p.getByRole('button',{name:t.cancel,exact:true}).click();await summary(p,1,values(f));await review(p,'G explicit late final-day evidence correction');});
 const before=await rows(),r=await confirm(p);expect(r.result?.ok===true).toBe(true);const after=await closeWrites(before,r.result!.value as Record<string,unknown>),v1=after.month_closings.find(x=>x.version===1&&x.owner_user_id===f.scope.ownerUserId)!,v2=after.month_closings.find(x=>x.version===2&&x.owner_user_id===f.scope.ownerUserId)!;
 same(v1,prior.month_closings.find(x=>x.id===v1.id),'G_V1_EXACT_STORED_BYTES');expect(v2.previous_version_id===v1.id&&v2.reason==='G explicit late final-day evidence correction'&&String(v2.end_balance_cents)==='76000','G_V2_LINEAGE_REASON_END').toBe(true);const head=after.report_heads.find(h=>h.owner_user_id===f.scope.ownerUserId)!;expect(head.closing_id===v2.id&&head.correction_pending===false,'G_CURRENT_REPORT_HEAD').toBe(true);
 await noWrite('G_VERSIONS_CHUNKS_RELOAD',async()=>{await summary(p,2,{...values(f,'76000'),bank:'76000',a:'56000',free:'26000'});await document(p,2);await open(p,1);await summary(p,1,values(f));await document(p,1);await p.reload();await summary(p,1,values(f));await open(p,2);await document(p,2);});await replay(p,r.action,r.result!.value);
});
scenario('G-05 HB19-B C stale revision wrong head version no change ownership exact no-write',async(p,ctx,f)=>{
 const other=await ctx.newPage();monitor(other);let previewAction:Action;await noWrite('G_TWO_REVIEWS',async()=>{await open(p);await review(p);await open(other);previewAction=(await review(other,'G rival review')).action;});const before=await rows(),winner=await confirm(p);expect(winner.result?.ok===true).toBe(true);await closeWrites(before,winner.result!.value as Record<string,unknown>);
 await noWrite('G_STALE_NO_CHANGE_FOREIGN',async()=>{const loser=await confirm(other);expect(loser.result?.ok===false&&loser.result.code==='STALE_REVISION','G_STALE_CONFIRM_REFUSED').toBe(true);
  await refresh(p);const a=await ownRows(),account=a.accounts[0],head=a.month_closings[0],original=argsOf(winner.action)[0] as {payload:Record<string,unknown>};
  // Preview is the actually observed browser action from a fresh form, not a synthetic endpoint.
  const foreignReport=(await rows()).month_closings.find(r=>r.owner_user_id===f.foreign.owner)!;
  const actions=previewAction!;for(const [payload,code]of [[{expectedHeadId:randomUUID(),expectedHeadVersion:1},'STALE_REPORT_HEAD'],[{expectedHeadId:foreignReport.id,expectedHeadVersion:1},'STALE_REPORT_HEAD'],[{expectedHeadId:head.id,expectedHeadVersion:99},'STALE_REPORT_HEAD'],[{expectedHeadId:head.id,expectedHeadVersion:1},'NO_REPORT_CHANGE']] as const){
   const cmd={...original,requestId:randomUUID(),expectedRevision:String(account.aggregate_revision),payload:{schemaVersion:1,operation:'REVISION',period:f.calendar.m,...payload}};const r=resultOf((await invoke(p,actions,[cmd])).body);expect(r?.ok===false&&r.code===code,'G_EXACT_REFUSAL_'+code).toBe(true);
  }
  const r=resultOf((await invoke(p,actions,[{...original,requestId:randomUUID(),ownerUserId:f.foreign.owner}])).body);expect(r?.ok===false,'G_FOREIGN_OWNER_FIELD_REFUSED').toBe(true);
 });await other.close();
});
scenario('G-06 HB19-B08 real SQL audit failure rolls back every closing write',async(p,_c,f)=>{
 await noWrite('G_ROLLBACK_REVIEW',async()=>{await open(p);await review(p,'G forced SQL rollback');});await noWrite('G_REAL_SQL_TRANSACTION_ROLLBACK',async()=>{const r=await confirm(p);expect(r.result?.ok===false&&r.result.code==='TRANSACTION_FAILED','G_INJECTED_SQL_ERROR_REFUSED').toBe(true);await expect(p.getByRole('alert').filter({hasText:t.error})).toBeVisible();});const all=await ownRows();expect(all.month_closings.length===0&&all.report_heads.length===0,'G_NO_PARTIAL_REPORT_OR_HEAD').toBe(true);expect(f.calendar.h<f.calendar.today).toBe(true);
});
async function loss(p:Page,ctx:BrowserContext,f:Fixture,mode:'status'|'retry'|'read-failure'){
 await noWrite('G_RECOVERY_REVIEW',async()=>{await open(p);await review(p);});const before=await rows();let receipt:Record<string,unknown>|undefined,original:Action|undefined,failedRead=false;
 const route=async(r:Route)=>{const req=r.request(),args=requestArgs(req.postData()),q=args[0] as {payload?:{confirmed?:boolean};period?:string}|undefined;
  if(req.headers()['next-action']&&q?.payload?.confirmed){original=actionFrom(req);const res=await r.fetch();const result=resultOf(await res.text());expect(result?.ok===true,'G_REAL_DURABLE_COMMIT_BEFORE_RESPONSE_LOSS').toBe(true);receipt=result!.value as Record<string,unknown>;if(mode==='read-failure')await r.fulfill({response:res});else await r.abort('failed');}
  else if(mode==='read-failure'&&receipt&&q?.period&&!failedRead&&req.headers()['next-action']){failedRead=true;await r.abort('failed');}else await r.continue();};
 await ctx.route('**/months*',route);await p.getByRole('button',{name:/^Confirm report version/}).click();
 if(mode==='read-failure'){await expect(p.getByText(t.reloadNeeded,{exact:true})).toBeVisible();await expect(p.getByRole('alert').filter({hasText:t.savedVersion.replace('{n}','1')})).toBeVisible();expect(failedRead).toBe(true);}else await expect(p.getByRole('button',{name:t.check,exact:true})).toBeVisible();await quiet(p);expect(!!receipt&&!!original,'G_DURABLE_ORIGINAL_COMMAND').toBe(true);await closeWrites(before,receipt!);await ctx.unroute('**/months*',route);
 await noWrite('G_STATUS_RETRY_OR_REREAD_NO_SECOND_COMMIT',async()=>{
  if(mode==='read-failure'){await refresh(p);await summary(p,1,values(f));await expect(p.getByText(t.reloadNeeded,{exact:true})).toHaveCount(0);}
  else{const r=await action(p,a=>mode==='status'?typeof a[0]==='string':!!(a[0] as {payload?:{confirmed?:boolean}})?.payload?.confirmed,()=>p.getByRole('button',{name:mode==='status'?t.check:t.retry,exact:true}).click());expect(r.result?.ok===true).toBe(true);same(r.result!.value,receipt,'G_RECOVERY_ORIGINAL_RECEIPT');if(mode==='retry')same(argsOf(r.action),argsOf(original!),'G_ORIGINAL_KEY_PAYLOAD_EXACT');
   if(mode==='status'){const all=await rows(),foreign=all.budget_updates.find(b=>b.id===f.foreign.receipt.updateId)!;const denied=resultOf((await invoke(p,r.action,[foreign.request_id])).body);expect(denied?.ok===true&&denied.value===null,'G_FOREIGN_STATUS_NO_DISCLOSURE').toBe(true);}
   await summary(p,1,values(f));}
  await replay(p,original!,receipt);await document(p,1);
 });
}
scenario('G-07 HB19-E12 R02 lost response after save original status single commit',async(p,c,f)=>loss(p,c,f,'status'));
scenario('G-08 HB19-E12 R01 lost response original-key retry single receipt',async(p,c,f)=>loss(p,c,f,'retry'));
scenario('G-09 HB19-Q06 HBUX-035 saved but history read failed safe reread',async(p,c,f)=>loss(p,c,f,'read-failure'));
scenario('G-10 HB19-Q07 real savings months v1 v2 chunk reload render navigation',async(p,_c,f)=>{
 await noWrite('G_Q07_NAVIGATION_READ_ONLY',async()=>{await p.goto('/savings');await expect(p.getByRole('heading',{level:1})).toBeVisible();const link=p.locator('a[href="/months"]').first();await hydrated(link);await link.click();await expect(p.getByRole('heading',{name:t.title,exact:true})).toBeVisible();
  for(const v of [1,2]){await open(p,v);await document(p,v);await p.reload();await document(p,v);await expect(p.getByRole('link',{name:new RegExp('^Version '+v+'\\b')})).toHaveAttribute('aria-current','page');}
 });test.info().annotations.push({type:'HB19-Q07',description:'NOT REPRODUCED on this synthetic authenticated EN desktop Chromium build; real /savings → /months, selected elapsed month v1/v2, chunk/reload render; no claim FIXED; physical AT/locale/viewport matrix not executed'});expect(f.calendar.h<f.calendar.today).toBe(true);
});
