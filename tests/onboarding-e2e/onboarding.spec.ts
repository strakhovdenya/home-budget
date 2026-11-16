import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { actionFrom, argsOf, invoke, noWrite, type Action } from '../e2e/support/proof';
import { en, contextFor, clock, form, review, own, foreign, provesFirst, marker, waitMarker, saved, database, census, checkDisclosure, digest, resultOf, hydrated, rawResult } from '../e2e/support/onboarding-proof';

type Case = (page:Page,context:BrowserContext)=>Promise<void>;
const writable = new Set(['accounts','budget_periods','budget_updates','historical_positions','ordering_revisions','balance_checkpoints','allocation_revisions','period_allocations','audit_events']);
function scenario(name:string,run:Case) {
  test(name,async({browser})=>{
    const beforeDate=await clock(),before=JSON.parse(await census()) as Record<string,string>,retained=await foreign();
    const context=await contextFor(browser),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await database(async c=>{
        const row=(await c.query("SELECT current_user role,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) super,has_table_privilege('accounts','DELETE') del,has_schema_privilege('public','CREATE') ddl,has_column_privilege('users','google_subject','UPDATE') subject,has_column_privilege('users','email_verified','UPDATE') verified,has_column_privilege('users','id','UPDATE') identity,has_table_privilege('month_closings','INSERT') close,has_table_privilege('obligation_events','INSERT') obligations")).rows[0];
        expect(row.role==='hb_c_runtime'&&!row.super&&!row.del&&!row.ddl&&!row.subject&&!row.verified&&!row.identity&&!row.close&&!row.obligations,'C_MINIMUM_TEST_WRITE_ROLE').toBe(true);
      });
      await run(page,context);
      expect(errors.length===0,'C_NO_BROWSER_ERROR').toBe(true);
      expect(await page.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(k=>k!=='home-budget-mode'))).toEqual([]);
      expect(await page.evaluate(async()=> (await indexedDB.databases()).length)).toBe(0);
      checkDisclosure(await page.locator('body').innerText());
    } finally {
      const after=JSON.parse(await census()) as Record<string,string>;
      for(const table of Object.keys(before))if(!writable.has(table))expect(after[table]===before[table],'C_UNRELATED_TABLE_UNCHANGED_'+table).toBe(true);
      expect(await foreign()===retained,'C_FOREIGN_AND_ALL_USERS_UNCHANGED').toBe(true);
      expect((await clock()).today===beforeDate.today,'C_BERLIN_MIDNIGHT_INVALIDATES_RUN').toBe(true);
      await digest(name.split(' ')[0]);await context.close();
    }
  });
}
async function confirm(page:Page) {
  test.info().annotations.push({type:'progress',description:'C_CONFIRM_STARTED'});
  const pending=page.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);
  await page.getByRole('button',{name:en.firstRun.confirm,exact:true}).click();
  const response=await pending;await response.finished();
  test.info().annotations.push({type:'progress',description:'C_CONFIRM_RESPONSE'});
  return {action:actionFrom(response.request()),result:resultOf(await response.text())};
}
async function notInitialized() { const rows=await own();for(const table of Object.keys(rows))expect(rows[table].length===0,'C_ABSENT_'+table).toBe(true); }
function money(value:bigint) {return '€'+(value/100n).toLocaleString('en-US')+'.'+(value%100n).toString().padStart(2,'0');}
async function metric(page:Page,label:string,value:string) {await expect(page.locator('dt:visible').filter({hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).locator('..').locator('dd')).toHaveText(value);}

scenario('C-01 HB20-A01/A02/A03/A04/A07/A08/B01/B02 UNKNOWN cancel invalid sum first atomic B/A and original replay',async page=>{
  await noWrite('C_UNKNOWN_CANCEL_INVALID',async()=>{
    await page.goto('/');await expect(page.getByText(en.firstRun.unknown,{exact:true}).filter({visible:true})).toHaveCount(1);
    await expect(page.getByRole('textbox',{name:en.budgetUpdate.balance,exact:true})).toHaveValue('');await expect(page.locator('#safe-heading')).toHaveCount(0);
    await page.reload();await notInitialized();
    await form(page);await review(page);await notInitialized();
    await page.getByRole('button',{name:en.firstRun.edit,exact:true}).click();await page.reload();await notInitialized();
    await form(page,'1000.00','600.00','300.00');
    const pending=page.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);
    test.info().annotations.push({type:'progress',description:'C_INVALID_REVIEW_STARTED'});
    await page.getByRole('button',{name:en.firstRun.review,exact:true}).click();const response=await pending;await response.finished();
    expect(resultOf(await response.text())?.ok===false,'C_INVALID_SUM_REFUSED').toBe(true);
    await expect(page.getByRole('alert').filter({hasText:en.firstRun.error})).toHaveText(en.firstRun.error);await notInitialized();
  });
  const day=await form(page);const preview=await review(page);await notInitialized();
  await noWrite('C_DIRECT_INVALID_PREVIEWS',async()=>{
    const raw=argsOf(preview)[0] as {payload:{checkpoint:Record<string,unknown>}};
    for(const patch of [{balanceCents:'-1'},{balanceCents:'9223372036854775808'},{balanceCents:'1000.5'},{observedDate:'9999-12-31'}]){
      const response=await invoke(page,preview,[{...raw,payload:{...raw.payload,checkpoint:{...raw.payload.checkpoint,...patch}}}]);
      expect(resultOf(response.body)?.ok===false,'C_MALFORMED_AMOUNT_DATE_REFUSED').toBe(true);
    }
  });
  const committed=await confirm(page);expect(committed.result?.ok===true,'C_CONFIRM_SUCCEEDED').toBe(true);await saved(page);const rows=await provesFirst('100000','70000','30000');
  expect(isDeepStrictEqual(rows.budget_updates[0].result,committed.result?.value),'C_COHERENT_ORIGINAL_RECEIPT').toBe(true);
  await noWrite('C_SAVED_RELOAD_FUTURE_AND_REPLAY',async()=>{
    await page.reload();await saved(page);await metric(page,en.dashboard.free,'€700.00');await metric(page,en.dashboard.safeAvailable,'€700.00');
    const [year,month,date]=day.today.split('-').map(Number),days=new Date(Date.UTC(year,month,0)).getUTCDate()-date+1;
    await metric(page,en.dashboard.safeDaily,money(70000n/BigInt(days)));
    await page.goto('/?period='+day.future);await metric(page,en.dashboard.free,'€300.00');await page.goto('/');await saved(page);
    const replay=await rawResult(page,committed.action);expect(replay?.ok===true,'C_ORIGINAL_REPLAY').toBe(true);expect(isDeepStrictEqual(replay?.value,committed.result?.value),'C_EXACT_ORIGINAL_RECEIPT').toBe(true);
    const command=argsOf(committed.action)[0] as Record<string,unknown>;
    const conflict=await rawResult(page,committed.action,[{...command,reason:'Synthetic changed original command'}]);expect(conflict?.code==='REQUEST_PAYLOAD_CONFLICT','C_CHANGED_ORIGINAL_CONFLICT').toBe(true);
    const stale=await rawResult(page,preview);expect(stale?.code==='ALREADY_INITIALIZED','C_NO_SECOND_INITIALIZATION').toBe(true);
  });
});
scenario('C-02 HB20-A07/B03 explicit known zero is stored only after actual confirmation',async page=>{
  await form(page,'0.00','0.00','');await expect(page.getByText(en.firstRun.unknown,{exact:true}).filter({visible:true})).toHaveCount(1);
  await noWrite('C_ZERO_PREVIEW',()=>review(page));await notInitialized();expect((await confirm(page)).result?.ok===true,'C_ZERO_CONFIRMED').toBe(true);
  await saved(page);await provesFirst('0','0',null);await noWrite('C_KNOWN_ZERO_RELOAD',async()=>{await page.reload();await saved(page);await metric(page,en.dashboard.free,'€0.00');await metric(page,en.dashboard.safeAvailable,'€0.00');});
});
scenario('C-03 HB20-A08/A09 existing empty account retains identity name and debt',async page=>{
  const before=await own(),id=before.accounts[0].id,name=before.accounts[0].display_name,debt=JSON.stringify(before.obligation_events);
  await noWrite('C_EMPTY_ACCOUNT_ENTRY',async()=>{await page.goto('/');await expect(page.getByRole('heading',{name:en.firstRun.title,exact:true})).toHaveCount(0);await page.goto('/update-budget');});
  const balance=page.getByRole('textbox',{name:en.budgetUpdate.balance,exact:true});await hydrated(balance);await balance.fill('1000.00');
  const allocated=page.getByRole('textbox',{name:en.budgetUpdate.allocated,exact:true});await allocated.fill('1000.00');
  await page.getByRole('checkbox',{name:en.budgetUpdate.vectorConsent,exact:true}).check();
  const order=page.getByRole('checkbox',{name:en.budgetUpdate.orderConsent,exact:true});if(await order.count())await order.check();
  await page.getByRole('button',{name:en.budgetUpdate.preview,exact:true}).click();await expect(page.getByRole('button',{name:en.budgetUpdate.confirm,exact:true})).toBeVisible();
  await page.getByRole('button',{name:en.budgetUpdate.confirm,exact:true}).click();await expect(page.getByRole('button',{name:en.budgetUpdate.confirm,exact:true})).toHaveCount(0);
  const after=await own();expect(after.accounts.length===1&&after.accounts[0].id===id&&after.accounts[0].display_name===name,'C_EMPTY_ACCOUNT_NOT_RECREATED_OR_RENAMED').toBe(true);
  expect(JSON.stringify(after.obligation_events)===debt,'C_FULL_EXISTING_DEBT_PRESERVED').toBe(true);expect(after.balance_checkpoints.length===1&&String(after.balance_checkpoints[0].balance_cents)==='100000','C_EMPTY_REAL_BANK_CONFIRMED').toBe(true);
  await noWrite('C_EMPTY_SAVED_RELOAD',async()=>{await page.goto('/');await saved(page);await metric(page,en.dashboard.free,'€946.00');await page.reload();await saved(page);});
});
scenario('C-04 HB20-A09/B04 established account C/V/O/S and immutable v1/v2 survive session entry',async page=>{
  const before=await own();expect(before.month_closings.length===2,'C_REAL_V1_V2_FIXTURE').toBe(true);
  await noWrite('C_ESTABLISHED_ENTRY_AND_VERSIONS',async()=>{
    await page.goto('/');await saved(page);await page.reload();await saved(page);
    await page.goto('/update-budget');await expect(page.getByRole('textbox',{name:en.budgetUpdate.balance,exact:true})).toBeVisible();
    const period=await database(async c=>(await c.query('SELECT p.period FROM month_closings c JOIN budget_periods p ON p.id=c.period_id WHERE c.owner_user_id=$1 LIMIT 1',[before.accounts[0].owner_user_id])).rows[0].period);
    for(const version of [1,2]){await page.goto('/months?period='+period+'&version='+version);await expect(page.getByRole('button',{name:en.monthClosing.details,exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:en.monthClosing.details,exact:true})).toBeVisible();}
    await page.goto('/history');await expect(page.getByRole('button',{name:en.financialHistory.open,exact:true}).first()).toBeEnabled();
  });expect(isDeepStrictEqual(await own(),before),'C_ESTABLISHED_EXACTLY_UNCHANGED').toBe(true);
});
scenario('C-05 HB20-A06 browser failed audit INSERT rolls back account and facts then original-key retry commits',async page=>{
  await form(page);await review(page);let failed:Awaited<ReturnType<typeof confirm>>;
  await noWrite('C_REAL_TRANSACTION_ROLLBACK',async()=>{failed=await confirm(page);expect(failed.result?.code==='TRANSACTION_FAILED','C_REAL_ROLLBACK_RESULT').toBe(true);await notInitialized();});
  marker('restore');await waitMarker('restored');const success=await confirm(page);expect(success.result?.ok===true,'C_ORIGINAL_RETRY_AFTER_ROLLBACK').toBe(true);
  expect(isDeepStrictEqual(argsOf(success.action),argsOf(failed!.action)),'C_SAME_ORIGINAL_AFTER_ROLLBACK').toBe(true);await saved(page);await provesFirst('100000','70000','30000');
});
scenario('C-06 HB20-A06/B02 lost browser response after real commit recovers original status without duplicate',async page=>{
  await form(page);await review(page);let original:Action|undefined;
  await page.route('**/',async route=>{
    if(route.request().method()==='POST'&&route.request().headers()['next-action']){
      original=actionFrom(route.request());const response=await route.fetch();await response.body();await provesFirst('100000','70000','30000');await route.abort();
    }else await route.continue();
  });
  await page.getByRole('button',{name:en.firstRun.confirm,exact:true}).click();await expect(page.getByRole('button',{name:en.firstRun.status,exact:true})).toBeVisible();await page.unroute('**/');
  await noWrite('C_COMMITTED_STATUS_AND_REPLAY',async()=>{
    await page.getByRole('button',{name:en.firstRun.status,exact:true}).click();await saved(page);expect(original!==undefined,'C_CAPTURED_ORIGINAL_REQUEST').toBe(true);
    expect((await rawResult(page,original!))?.ok===true,'C_LOST_RESPONSE_REPLAY').toBe(true);await page.reload();await saved(page);
  });test.info().annotations.push({type:'fault-boundary',description:'Browser transport response loss after real server/PG commit; distinct from driver COMMIT acknowledgement loss covered by existing PG HB20-A06 test'});
});
async function abortFirst(page:Page) {
  let packet:Action|undefined;
  await page.route('**/',async route=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']){packet=actionFrom(route.request());await route.abort();}else await route.continue();});
  await page.getByRole('button',{name:en.firstRun.confirm,exact:true}).click();await expect(page.getByRole('button',{name:en.firstRun.status,exact:true})).toBeVisible();await page.unroute('**/');
  if(!packet)throw Error('C_ORIGINAL_PACKET_REQUIRED');return packet;
}
scenario('C-07 HB20-A03/A04/A08/B02 unsent confirm UNKNOWN unauthorized write refuses then retries original',async(page,context)=>{
  await form(page);await review(page);let original:Action;
  await noWrite('C_ABORT_BEFORE_DELIVERY',async()=>{original=await abortFirst(page);await notInitialized();});
  await noWrite('C_UNAUTHORIZED_WITH_REAL_WRITE_GRANTS',async()=>{
    const cookies=await context.cookies();await context.clearCookies();
    expect(['UNAUTHORIZED','FORBIDDEN'].includes(String((await rawResult(page,original!))?.code)),'C_AUTH_BEFORE_WRITABLE_CONFIRM').toBe(true);
    await notInitialized();await context.addCookies(cookies);
  });
  const pending=page.waitForRequest(r=>r.method()==='POST'&&!!r.headers()['next-action']);
  await page.getByRole('button',{name:en.firstRun.retry,exact:true}).click();const retried=actionFrom(await pending);expect(isDeepStrictEqual(argsOf(retried),argsOf(original!)),'C_FROZEN_ORIGINAL_RETRY').toBe(true);
  await saved(page);await provesFirst('100000','70000','30000');
});
scenario('C-08 HB20-B02 double click is one commit and repeated original request is idempotent',async page=>{
  await form(page);await review(page);let release!:()=>void,count=0,packet:Action|undefined;const wait=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/',async route=>{if(route.request().method()==='POST'&&route.request().headers()['next-action']){count++;packet=actionFrom(route.request());const reply=await route.fetch();await reply.body();await wait;await route.fulfill({response:reply});}else await route.continue();});
  try{await page.getByRole('button',{name:en.firstRun.confirm,exact:true}).dblclick();}finally{release();}
  await saved(page);await page.unroute('**/');expect(count===1&&packet!==undefined,'C_ONE_UI_DELIVERY').toBe(true);await provesFirst('100000','70000','30000');
  await noWrite('C_DOUBLE_ORIGINAL_REPLAY',async()=>{expect((await rawResult(page,packet!))?.ok===true,'C_NO_DUPLICATE_FROM_REPLAY').toBe(true);});
});
for(const same of [false,true])scenario((same?'C-09b':'C-09a')+' HB20-A05/B02 two real browser backends '+(same?'same':'different')+' key owner-lock overlap',async(page,context)=>{
  await form(page);await review(page);const original=await abortFirst(page);
  const statusAction=await (async()=>{const {capture}=await import('../e2e/support/proof');return capture(page,()=>page.getByRole('button',{name:en.firstRun.status,exact:true}).click());})();
  const second=await context.newPage();await form(second,'900.00','600.00','300.00');await review(second);
  marker('hold');await waitMarker('held');
  const reqA=page.waitForRequest(r=>r.method()==='POST'&&!!r.headers()['next-action']);
  const clickA=page.getByRole('button',{name:en.firstRun.retry,exact:true}).click();
  let responseB:Promise<{body:string}>,clickB:Promise<unknown>|undefined;
  if(same)responseB=invoke(second,original);
  else {const request=second.waitForRequest(r=>r.method()==='POST'&&!!r.headers()['next-action']);clickB=second.getByRole('button',{name:en.firstRun.confirm,exact:true}).click();responseB=request.then(async r=>{const response=await r.response();if(!response)throw Error('C_SECOND_RESPONSE_REQUIRED');await response.finished();return{body:await response.text()};});}
  const requestA=await reqA;
  try{
    await waitMarker('overlapped');const overlap=JSON.parse(fs.readFileSync('/work/test-results/c-control/overlap.json','utf8'));expect(overlap.overlapped&&new Set(overlap.pids).size===2,'C_INDEPENDENT_PG_BACKENDS').toBe(true);
    const blocked=overlap.rows.filter((row:{pid:number})=>overlap.pids.includes(row.pid)) as {pid:number;wait_event_type:string;blockers:number[]}[];
    const direct=blocked.filter(row=>row.blockers.includes(overlap.blocker));
    expect(blocked.length===2&&direct.length>=1&&blocked.every(row=>row.wait_event_type==='Lock'&&
      (row.blockers.includes(overlap.blocker)||row.blockers.some(pid=>pid!==row.pid&&direct.some(root=>root.pid===pid)))),'C_OBSERVED_OWNER_LOCK_QUEUE_CHAIN').toBe(true);
    await notInitialized();const key=(argsOf(original)[0] as {requestId:string}).requestId;
    expect(await rawResult(page,statusAction,[key])).toEqual({ok:true,value:null});
    test.info().annotations.push({type:'concurrency',description:'Two independently observed PG backend PIDs blocked on owner lock; status NOT_FOUND while in flight does not imply rollback'});
  }finally{marker('release');}
  const replyA=await requestA.response();if(!replyA)throw Error('C_FIRST_RESPONSE_REQUIRED');await replyA.finished();
  const a=resultOf(await replyA.text()),b=resultOf((await responseB).body);await clickA;await clickB;
  if(same){expect(a?.ok===true&&b?.ok===true,'C_IDENTICAL_REQUESTS_REPLAY').toBe(true);expect(isDeepStrictEqual(a?.value,b?.value),'C_IDENTICAL_RECEIPTS').toBe(true);}
  else expect([a,b].filter(r=>r?.ok===true).length===1&&[a,b].some(r=>r?.code==='ALREADY_INITIALIZED'),'C_ONE_WINNER_NO_SECOND_CHECK').toBe(true);
  const rows=await own(),firstKey=(argsOf(original)[0] as {requestId:string}).requestId,winnerIsFirst=rows.budget_updates[0].request_id===firstKey;
  await provesFirst(winnerIsFirst?'100000':'90000',winnerIsFirst?'70000':'60000','30000');
  await page.goto('/');await saved(page);await second.close();
});
