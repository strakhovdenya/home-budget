import fs from 'node:fs';
import { encode } from 'next-auth/jwt';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import en from '../../../src/shared/i18n/messages/en.json' with { type: 'json' };
import { database, census, hydrated, type Action, capture, resultOf } from './proof';
import { sessionCookieName, syntheticOwner } from './session';

export { en, database, census, hydrated, capture, resultOf };
export async function identity() {
  return database(async c => {
    const rows=(await c.query('SELECT id FROM users WHERE email_verified AND google_subject=$1',[syntheticOwner.subject])).rows;
    expect(rows.length === 1,'C_SINGLE_ADMITTED_OWNER').toBe(true); return rows[0].id as string;
  });
}
export async function contextFor(browser: Browser): Promise<BrowserContext> {
  const context=await browser.newContext({baseURL:'http://127.0.0.1:3000',locale:'en-US',timezoneId:'Europe/Berlin',viewport:{width:1280,height:900},serviceWorkers:'block'});
  context.setDefaultTimeout(10_000);context.setDefaultNavigationTimeout(20_000);
  await context.route('**/*', route=>new URL(route.request().url()).origin==='http://127.0.0.1:3000'?route.continue():route.abort());
  const secret=process.env.AUTH_SECRET;if(!secret)throw Error('C_SYNTHETIC_AUTH_REQUIRED');
  const token=await encode({secret,salt:sessionCookieName,maxAge:180,token:{sub:await identity(),googleSubject:syntheticOwner.subject,email:syntheticOwner.email}});
  await context.addCookies([{name:sessionCookieName,value:token,domain:'127.0.0.1',path:'/',httpOnly:true,secure:false,sameSite:'Lax'},
    {name:'home-budget-locale',value:'en',domain:'127.0.0.1',path:'/',sameSite:'Lax'}]);return context;
}
export async function clock() {
  return database(async c=>(await c.query("SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin','YYYY-MM') period,to_char((clock_timestamp() AT TIME ZONE 'Europe/Berlin')+interval '1 month','YYYY-MM') future")).rows[0] as {today:string;period:string;future:string});
}
export async function form(page:Page,balance='1000.00',current='700.00',future='300.00') {
  const day=await clock();await page.goto('/');await expect(page.getByRole('heading',{name:en.firstRun.title,exact:true})).toBeVisible();
  const input=page.getByRole('textbox',{name:en.budgetUpdate.balance,exact:true});await hydrated(input);await input.fill(balance);
  await page.getByRole('textbox',{name:en.budgetUpdate.allocated,exact:true}).fill(current);
  if(future!==null && future!==''){
    await page.getByRole('button',{name:en.firstRun.add,exact:true}).click();
    // Address the actual month input in the live form. MUI's required label text
    // includes its asterisk; accessible-name computation excludes that adornment.
    const periods=page.locator('input[type="month"]:visible');await expect(periods).toHaveCount(2);
    await expect(periods.nth(1)).toHaveAccessibleName(en.budgetUpdate.period);await periods.nth(1).fill(day.future);
    await page.getByRole('textbox',{name:en.budgetUpdate.allocated,exact:true}).nth(1).fill(future);
  }
  await page.getByRole('checkbox',{name:en.firstRun.consent,exact:true}).check();
  test.info().annotations.push({type:'progress',description:'C_FORM_READY'});return day;
}
export async function review(page:Page) {
  test.info().annotations.push({type:'progress',description:'C_REVIEW_STARTED'});
  const packet=await capture(page,()=>page.getByRole('button',{name:en.firstRun.review,exact:true}).click());
  await expect(page.getByRole('heading',{name:en.firstRun.reviewTitle,exact:true})).toBeVisible();
  test.info().annotations.push({type:'progress',description:'C_REVIEW_COMPLETED'});return packet;
}
export function checkDisclosure(body:string) { expect(!['C FORBIDDEN SENTINEL','HB021 FORBIDDEN SENTINEL','6,543.21'].some(v=>body.includes(v)),'C_NO_FOREIGN_DISCLOSURE').toBe(true); }
export async function own() {
  const owner=await identity();return database(async c=>{
    const accounts=(await c.query('SELECT * FROM accounts WHERE owner_user_id=$1',[owner])).rows;
    const rows: Record<string,Record<string,unknown>[]>={accounts};
    for(const table of ['budget_updates','balance_checkpoints','allocation_revisions','period_allocations','budget_periods','audit_events','obligation_events','savings_events','historical_positions','ordering_revisions','month_closings','report_heads']) rows[table]=(await c.query('SELECT to_jsonb(t) row FROM '+table+' t WHERE owner_user_id=$1 ORDER BY id',[owner])).rows.map(r=>r.row);
    return rows;
  });
}
export async function foreign() {
  const owner=await identity();return database(async c=>{
    const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const data: string[]=[];
    for(const {tablename}of tables){if(!/^[a-z_]+$/.test(tablename))throw Error('C_UNKNOWN_TABLE');
      data.push((await c.query('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),\'[]\'::jsonb)::text rows FROM '+tablename+' t'+(tablename==='users'?'':' WHERE owner_user_id<>$1'),tablename==='users'?[]:[owner])).rows[0].rows);}
    return JSON.stringify(data);
  });
}
export async function provesFirst(balance:string,allocated:string,future:string|null) {
  const rows=await own();expect(rows.accounts.length===1,'C_ONE_ACCOUNT').toBe(true);const account=rows.accounts[0];
  expect(account.recorded_seq==='1'&&account.aggregate_revision==='1'&&account.currency==='EUR','C_COHERENT_ACCOUNT_COUNTERS').toBe(true);
  for(const table of ['budget_updates','balance_checkpoints','allocation_revisions','historical_positions','ordering_revisions'])expect(rows[table].length===1,'C_SINGLE_'+table).toBe(true);
  expect(rows.audit_events.length===6,'C_COMPLETE_CREATION_AND_FINANCIAL_AUDITS').toBe(true);
  expect(rows.audit_events.map(row=>(row.before_after as {entity:{type:string}}).entity.type).sort()).toEqual(
    ['ACCOUNT_CREATED','ALLOCATION_REVISION','BANK_CHECKPOINT','BANK_HEAD','BUDGET_UPDATE_REVIEW','DAY_ORDERING']);
  expect(String(rows.balance_checkpoints[0].balance_cents)===balance,'C_PERSISTED_BANK').toBe(true);
  expect(account.active_allocation_revision_id===rows.allocation_revisions[0].id,'C_CONFIRMED_POINTER').toBe(true);
  expect(rows.allocation_revisions[0].checkpoint_id===rows.balance_checkpoints[0].id&&
    rows.allocation_revisions[0].position_id===rows.balance_checkpoints[0].position_id&&
    rows.balance_checkpoints[0].position_id===rows.historical_positions[0].id,'C_ONE_COHERENT_CHECKPOINT_ANCHOR_POSITION').toBe(true);
  for(const table of ['balance_checkpoints','allocation_revisions','historical_positions','ordering_revisions','audit_events'])
    expect(rows[table].every(row=>row.budget_update_id===rows.budget_updates[0].id&&String(row.recorded_seq)==='1'),'C_ONE_ATOMIC_BATCH_'+table).toBe(true);
  const amounts=rows.period_allocations.map(r=>String(r.amount_cents)).sort();expect(amounts).toEqual((future===null?[allocated]:[allocated,future]).sort());
  const day=await clock(),periods=new Map(rows.budget_periods.map(row=>[row.id,row.period]));
  expect(rows.period_allocations.every(row=>row.allocation_revision_id===rows.allocation_revisions[0].id),'C_COMPLETE_VECTOR_LINKS').toBe(true);
  expect(rows.period_allocations.map(row=>[periods.get(row.period_id),String(row.amount_cents)]).sort()).toEqual(
    (future===null?[[day.period,allocated]]:[[day.period,allocated],[day.future,future]]).sort());
  expect(rows.obligation_events.length===0&&rows.savings_events.length===0&&rows.month_closings.length===0&&rows.report_heads.length===0,'C_NO_AUTOMATIC_EARMARK_OR_CLOSE').toBe(true);
  test.info().annotations.push({type:'atomic-first-budget',description:'One account/C/V/position/order/batch/receipt, six audits, full A and pointer verified independently in PG'});return rows;
}
export function marker(name:string) {fs.writeFileSync('/work/test-results/c-control/'+name,name);}
export async function waitMarker(name:string) { await expect.poll(()=>fs.existsSync('/work/test-results/c-control/'+name),{timeout:4000,message:'C_CONTROL_ACK_REQUIRED'}).toBe(true); }
export async function saved(page:Page) {await expect(page.locator('#safe-heading:visible')).toHaveCount(1);await expect(page.getByRole('heading',{name:en.firstRun.title,exact:true})).toHaveCount(0);checkDisclosure(await page.locator('body').innerText());}
export async function digest(label:string) { test.info().annotations.push({type:'census',description:label+': sha256='+createHash('sha256').update(await census()).digest('hex')}); }
export async function rawResult(page:Page,action:Action,args?:unknown[]) { const {invoke}=await import('./proof');return resultOf((await invoke(page,action,args)).body); }
