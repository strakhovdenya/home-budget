import {test,expect,contextFor,own,foreign,clock,day,database,census,noWrite,open,vector,consent,edit,transition,preview,commit,replay,assertState,same,invoke,argsOf,resultOf,u,actionFrom,type Action} from '../e2e/support/finance-proof';
import type {Page,BrowserContext} from '@playwright/test';
function scenario(name:string,run:(page:Page,context:BrowserContext)=>Promise<void>){test(name,async({browser})=>{
 const before=JSON.parse(await census()) as Record<string,string>,retained=await foreign(),today=(await clock()).today,ctx=await contextFor(browser),page=await ctx.newPage(),errors:string[]=[];
 ctx.on('dialog',dialog=>dialog.accept());page.on('pageerror',e=>errors.push(e.message));
 test.info().annotations.push({type:'calendar',description:JSON.stringify(await day())});
 try{
  await database(async c=>{const r=(await c.query("SELECT current_user role,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) super,has_table_privilege('accounts','DELETE') del,has_schema_privilege('public','CREATE') ddl,has_column_privilege('users','google_subject','UPDATE') identity,has_table_privilege('month_closings','INSERT') close,has_table_privilege('accounts','INSERT') create_account")).rows[0];expect(r.role==='hb_d_runtime'&&!r.super&&!r.del&&!r.ddl&&!r.identity&&!r.close&&!r.create_account,'D_MINIMAL_DISPOSABLE_ROLE').toBe(true);});
  await run(page,ctx);expect(errors.length===0,'D_NO_BROWSER_ERROR').toBe(true);
  expect(await page.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(k=>k!=='home-budget-mode'))).toEqual([]);
  expect(await page.evaluate(async()=> (await indexedDB.databases()).length)).toBe(0);expect(!(await page.locator('body').innerText()).includes('D FORBIDDEN SENTINEL'),'D_NO_FOREIGN_DISCLOSURE').toBe(true);
 }finally{
  expect(await foreign()===retained,'D_FOREIGN_AND_ALL_USERS_UNCHANGED').toBe(true);const after=JSON.parse(await census()) as Record<string,string>;
  for(const table of Object.keys(before))if(table!=='accounts'){const rows=JSON.parse(after[table]) as {id:string}[];for(const old of JSON.parse(before[table]) as {id:string}[])same(rows.find(row=>row.id===old.id),old,'D_RETAINED_IMMUTABLE_'+table);}
  expect((await clock()).today===today,'D_BERLIN_MIDNIGHT_INVALIDATES').toBe(true);await ctx.close();
 }
});}
async function routine(page:Page,b:string,a:Record<string,string>,date?:string){await open(page);await vector(page,b,a,date);await consent(page);}
async function finish(page:Page,technical=false){await preview(page,technical);return commit(page);}
async function denied(page:Page,label:string,code?:string){await noWrite(label,async()=>{
 const pending=page.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);await page.getByRole('button',{name:u.preview,exact:true}).click();const r=await pending;await r.finished();const value=resultOf(await r.text());expect(value?.ok===false,'D_REFUSED').toBe(true);if(code)expect(value?.code===code,'D_TYPED_REFUSAL').toBe(true);
});}
scenario('D-00 BR-02 HBUX-024 UNKNOWN existing empty account then confirmed known zero',async page=>{
 const d=await day(),before=await own();await noWrite('D_UNKNOWN_ENTRY',async()=>{await page.goto('/');await expect(page.locator('#safe-heading:visible')).toHaveCount(0);expect(before.balance_checkpoints.length===0&&before.allocation_revisions.length===0,'D_UNKNOWN_NOT_ZERO').toBe(true);});
 await routine(page,'0',{[d.p]:'0'});await preview(page);expect((await own()).balance_checkpoints.length===0,'D_NOT_COMMITTED').toBe(true);const saved=await commit(page);await assertState(page,{B:'0',A:{[d.p]:'0'}});await replay(page,saved);same((await own()).accounts[0].id,before.accounts[0].id,'D_EXISTING_ACCOUNT_RETAINED');
});
scenario('D-01 F-003 HBUX-006/014 ordinary full vector future isolation cancel and equal fresh checkpoint',async page=>{
 const d=await day();await routine(page,'90000',{[d.p]:'60000',[d.q]:'30000'});await preview(page);await noWrite('D_CANCEL_ORDINARY_REVIEW',()=>page.goto('/'));expect((await own()).balance_checkpoints.length===1,'D_CANCEL_NO_CHECK').toBe(true);
 await routine(page,'90000',{[d.p]:'60000',[d.q]:'30000'});const saved=await finish(page);await assertState(page,{B:'90000',A:{[d.p]:'60000',[d.q]:'30000'}});
 await routine(page,'90000',{[d.p]:'60000',[d.q]:'30000'});await finish(page);expect((await own()).balance_checkpoints.length===3,'D_EQUAL_NEW_CHECK_NOT_REUSE').toBe(true);await replay(page,saved);
});
scenario('D-02 F-001/F-017 actual bank partial then full payment never double debits',async page=>{
 const d=await day();await routine(page,'90000',{[d.p]:'90000'});await edit(page,'OBLIGATION','PARTIAL_SETTLEMENT','D retained obligation','5400');await consent(page,true);const first=await finish(page);
 await assertState(page,{B:'90000',A:{[d.p]:'90000'},R:{[d.p]:'14600'}});
 await routine(page,'75400',{[d.p]:'75400'});await edit(page,'OBLIGATION','PAID','D retained obligation');await consent(page,true);await finish(page);await assertState(page,{B:'75400',A:{[d.p]:'75400'}});await replay(page,first);
});
scenario('D-03 F-002 HBUX-020 unchanged paid requires warning and affirmation',async page=>{
 const d=await day();await routine(page,'50000',{[d.p]:'50000'});await edit(page,'OBLIGATION','PARTIAL_SETTLEMENT','D retained obligation','5400');
 await noWrite('D_UNAFFIRMED_PAYMENT',async()=>{await page.getByRole('button',{name:u.preview,exact:true}).click();await expect(page.locator('#budget-update-error')).toContainText(u.errors.payment);});
 await consent(page,true,true);await finish(page);await assertState(page,{B:'50000',A:{[d.p]:'50000'},R:{[d.p]:'14600'}});
 const rows=await own();expect(rows.audit_events.some(a=>JSON.stringify(a.before_after).includes('"unchangedBalanceAcknowledged":true')),'D_RECORDED_UNCHANGED_AFFIRMATION').toBe(true);
});
scenario('D-04 F-007 cancellation is not payment and never changes confirmed bank',async page=>{
 const d=await day();await routine(page,'50000',{[d.p]:'50000'});await edit(page,'OBLIGATION','CANCELLED','D retained obligation');await finish(page);await assertState(page,{B:'50000',A:{[d.p]:'50000'}});
 expect((await own()).obligation_events.some(e=>e.action==='CANCELLED'&&!e.reserve_full),'D_DISTINCT_CANCELLED_EVENT').toBe(true);
});
scenario('D-05 F-006 BR-03 possible claim counts only when elected full reserve and negative F',async page=>{
 const d=await day();await routine(page,'15000',{[d.p]:'15000'});const f=await edit(page,'OBLIGATION','CREATE',undefined,'20000');await f.getByRole('textbox',{name:u.name,exact:true}).fill('D possible claim');await f.getByRole('checkbox',{name:u.possible,exact:true}).check();await finish(page);await assertState(page,{B:'15000',A:{[d.p]:'15000'}});
 await routine(page,'15000',{[d.p]:'15000'});const selected=await edit(page,'OBLIGATION','AMEND','D possible claim','20000');await selected.getByRole('checkbox',{name:u.reserveFull,exact:true}).check();await finish(page);const state=await assertState(page,{B:'15000',A:{[d.p]:'15000'},R:{[d.p]:'20000'}});expect(state.F===-5000n&&state.safe===0n,'D_FULL_DEFICIT_NOT_TRIMMED').toBe(true);
});
scenario('D-06 F-008 BR-07 savings partial release increase full release leave B unchanged',async page=>{
 const d=await day();for(const [action,amount,S]of [['PARTIAL_RELEASE','2000','3000'],['INCREASE','1000','4000'],['FULL_RELEASE','4000','0']]){
  await routine(page,'40000',{[d.p]:'40000'});await edit(page,'SAVING',action,'D retained saving',amount);await finish(page);await assertState(page,{B:'40000',A:{[d.p]:'40000'},R:{[d.p]:'20000'},S:{[d.p]:S}});
 }
 expect((await own()).savings_events.length===4,'D_ONE_SAVING_ID_REVISIONS').toBe(true);
});
scenario('D-07 HBUX-001/002/005/007/016 FRESH_START retains O/S then separate PAID',async page=>{
 const d=await day(),before=await own();await noWrite('D_NO_IMPLICIT_TRANSITION',async()=>{await open(page);await page.reload();await expect(page.getByRole('button',{name:u.startFresh,exact:true})).toHaveAttribute('aria-pressed','false');});
 await vector(page,'80000',{[d.m]:'0',[d.p]:'80000'});await transition(page,'FRESH_START');await consent(page);const first=await finish(page,true);await assertState(page,{B:'80000',A:{[d.p]:'80000'},R:{[d.p]:'20000'},S:{[d.p]:'15000'}});
 const moved=await own(),decisions=JSON.parse(JSON.parse(await census()).transition_decisions) as unknown[];expect(moved.obligation_events.length===2&&moved.savings_events.length===2&&decisions.length===1,'D_ONE_FUNDING_CHANGE_PER_IDENTITY').toBe(true);
 same(moved.obligation_events.map(e=>e.obligation_id),[before.obligation_events[0].obligation_id,before.obligation_events[0].obligation_id],'D_SAME_OBLIGATION_ID');
 await routine(page,'60000',{[d.m]:'0',[d.p]:'60000'});await edit(page,'OBLIGATION','PAID','D retained obligation');await consent(page,true);await finish(page);await assertState(page,{B:'60000',A:{[d.p]:'60000'},S:{[d.p]:'15000'}});await replay(page,first);
});
for(const reuse of [false,true])scenario((reuse?'D-08b':'D-08a')+' HBUX-011/012 CARRY full funding proof target cash once '+(reuse?'reuse':'actual'),async page=>{
 const d=await day(),before=await own();await routine(page,'90000',{[d.m]:'0',[d.p]:'90000'});await transition(page,'CARRY',reuse,d.m);await consent(page);const saved=await finish(page,true);const state=await assertState(page,{B:'90000',A:{[d.p]:'90000'},R:{[d.p]:'30000'},S:{[d.p]:'5000'}});
 expect(state.rows.balance_checkpoints.length===before.balance_checkpoints.length+(reuse?0:1),'D_ACTUAL_VS_REUSED_CHECKPOINT').toBe(true);
 const transfer=JSON.parse(await census()).budget_transfers as string;expect((JSON.parse(transfer) as unknown[]).length===1,'D_SINGLE_CARRY').toBe(true);
 const audits=state.rows.audit_events.filter(a=>(a.before_after as {entity:{type:string}}).entity.type==='FUNDING_TRANSFER');expect(audits.length===2,'D_O_S_FUNDING_EVIDENCE_ONCE').toBe(true);await replay(page,saved);
});
scenario('D-09 HBUX-013/015 DEFER is explicit and leaves old funding in place',async page=>{
 const d=await day(),before=await own();await routine(page,'80000',{[d.m]:'40000',[d.p]:'40000'});await noWrite('D_NO_SILENT_DISPOSITION',async()=>{await page.getByRole('button',{name:u.preview,exact:true}).click();await expect(page.locator('#budget-update-error')).toContainText(u.chooseTransition);});
 await transition(page,'DEFER');await consent(page);await finish(page,true);const state=await assertState(page,{B:'80000',A:{[d.m]:'40000',[d.p]:'40000'},R:{[d.m]:'20000'},S:{[d.m]:'15000'}});
 same(state.rows.obligation_events,before.obligation_events,'D_DEFER_O_UNCHANGED');same(state.rows.savings_events,before.savings_events,'D_DEFER_S_UNCHANGED');expect((JSON.parse(JSON.parse(await census()).transition_decisions) as unknown[]).length===1,'D_EXPLICIT_DEFER_DECISION').toBe(true);
});
scenario('D-10 HBUX-008/009/010 same moving identity refuses disjoint atomic composition succeeds',async page=>{
 const d=await day();await routine(page,'88000',{[d.m]:'0',[d.p]:'88000'});await transition(page,'CARRY',false,d.m);await edit(page,'OBLIGATION','PAID','D retained obligation');await consent(page,true);await denied(page,'D_SAME_ID_COMPOUND','SAME_IDENTITY_COMPOUND_NOT_SUPPORTED');await expect(page.getByRole('group',{name:u.obligation,exact:true})).toHaveCount(1);
 await open(page);await vector(page,'88000',{[d.m]:'0',[d.p]:'88000'});await transition(page,'CARRY',false,d.m);await edit(page,'SAVING','PARTIAL_RELEASE','D retained saving','1000');await consent(page);await denied(page,'D_SAME_SAVING_COMPOUND','SAME_IDENTITY_COMPOUND_NOT_SUPPORTED');
 await open(page);await vector(page,'88000',{[d.m]:'0',[d.p]:'88000'});await transition(page,'CARRY',false,d.m);await edit(page,'OBLIGATION','PAID','D disjoint obligation');await consent(page,true);await finish(page,true);await assertState(page,{B:'88000',A:{[d.p]:'88000'},R:{[d.p]:'30000'},S:{[d.p]:'5000'}});
});
scenario('D-11 HBUX-023 stale confirmed revision refuses and original receipt remains idempotent',async(page,ctx)=>{
 const d=await day();await routine(page,'90000',{[d.p]:'90000'});await preview(page);const other=await ctx.newPage();await routine(other,'80000',{[d.p]:'80000'});await preview(other);const saved=await commit(page);
 await noWrite('D_STALE_NO_WRITE',async()=>{const pending=other.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);await other.getByRole('button',{name:u.confirm,exact:true}).click();const response=await pending;await response.finished();expect(resultOf(await response.text())?.code==='STALE_REVISION','D_STALE_REVISION').toBe(true);});await replay(page,saved);await assertState(page,{B:'90000',A:{[d.p]:'90000'}});await other.close();
});
scenario('D-12 F-010 HBUX-034/035 backdated H/K receipt differs from current bank',async page=>{
 const d=await day(),before=await own(),K=String(before.accounts[0].recorded_seq),H=d.m+'-07';await routine(page,'48000',{[d.p]:'48000'},H);const saved=await finish(page);expect((saved.review as {financial:{bank:{balanceCents:string;observedDate:string}}}).financial.bank.balanceCents==='48000','D_SAVED_HISTORICAL_BANK').toBe(true);await assertState(page,{B:'45000',A:{[d.p]:'45000'}});
 await noWrite('D_INDEPENDENT_H_K',async()=>{const rows=await own(),pick=(cut:string)=>rows.balance_checkpoints.filter(c=>String(c.observed_date)<=H&&BigInt(String(c.recorded_seq))<=BigInt(cut)).sort((a,b)=>String(b.observed_date).localeCompare(String(a.observed_date)))[0];expect(String(pick(K).balance_cents)==='50000'&&String(pick(String(rows.accounts[0].recorded_seq)).balance_cents)==='48000','D_SAME_H_DIFFERENT_K').toBe(true);});await replay(page,saved);
});
scenario('D-13 ADR0003 D36 protects future shortfall exactly once independent integer daily',async(page,ctx)=>{
 const d=await day();const state=await assertState(page,{B:'20000',A:{[d.p]:'15000',[d.q]:'5000'},R:{[d.q]:'10000'}});expect(state.F===15000n&&state.safe===10000n,'D_D36_DISTINCT_FROM_CURRENT_FREE').toBe(true);
 await routine(page,'20000',{[d.p]:'15000',[d.q]:'5000'});await finish(page);await assertState(page,{B:'20000',A:{[d.p]:'15000',[d.q]:'5000'},R:{[d.q]:'10000'}});
 const west=await ctx.browser()!.newContext({baseURL:'http://127.0.0.1:3000',locale:'en-US',timezoneId:'America/Los_Angeles',serviceWorkers:'block'});
 try{await west.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:3000'?route.continue():route.abort());await west.addCookies(await ctx.cookies());await assertState(await west.newPage(),{B:'20000',A:{[d.p]:'15000',[d.q]:'5000'},R:{[d.q]:'10000'}});}finally{await west.close();}
});
scenario('D-14 F-005 HBUX-024 negative allocation future observation malformed input refuse',async(page,ctx)=>{
 const d=await day();await routine(page,'100000',{[d.p]:'100000'});const review=await preview(page),raw=argsOf(review.action)[0] as {payload:{checkpoint:Record<string,unknown>}};
 await noWrite('D_NEGATIVE_FUTURE_REFUSALS',async()=>{for(const patch of [{allocations:[{period:d.p,amountCents:'150000'},{period:d.q,amountCents:'-50000'}]},{observedDate:'9999-12-31'},{balanceCents:'100000.1'}]){const r=resultOf((await invoke(page,review.action,[{...raw,payload:{...raw.payload,checkpoint:{...raw.payload.checkpoint,...patch}}}])).body);expect(r?.ok===false,'D_NO_UNOBSERVED_OR_NEGATIVE_CASH').toBe(true);}});
 await noWrite('D_WRITABLE_RUNTIME_ANONYMOUS_CONFIRM_DENIED',async()=>{
  let packet:Action|undefined;
  await page.route('**/update-budget',async route=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']){packet=actionFrom(route.request());await route.abort();}else await route.continue();});
  await page.getByRole('button',{name:u.confirm,exact:true}).click();await expect(page.getByRole('button',{name:u.checkResult,exact:true})).toBeVisible();await page.unroute('**/update-budget');
  expect(!!packet,'D_REAL_UNSENT_CONFIRM_PACKET').toBe(true);const cookies=await ctx.cookies();await ctx.clearCookies();
  try{const r=resultOf((await invoke(page,packet!)).body);expect(r?.ok===false&&['FORBIDDEN','UNAUTHORIZED'].includes(String(r.code)),'D_AUTH_BEFORE_WRITABLE_COMMIT').toBe(true);}finally{await ctx.addCookies(cookies);}
 });
 await noWrite('D_CANCEL_REJECTED_DRAFT',()=>page.goto('/'));
});
scenario('D-15 HBUX-018/021 missed periods FRESH_START retains full deficits without policy fallback',async page=>{
 const d=await day(),old=await own(),periods=old.budget_periods.map(p=>String(p.period));await routine(page,'8000',Object.fromEntries([...periods.filter(p=>p<d.p).map(p=>[p,'0']),[d.p,'8000']]));await transition(page,'FRESH_START');await consent(page);await finish(page,true);const state=await assertState(page,{B:'8000',A:{[d.p]:'8000'},R:{[d.p]:'9000'},S:{[d.p]:'2000'}});expect(state.F===-3000n&&state.safe===0n,'D_FULL_EARMARKS_MISSED_MONTHS').toBe(true);
});
