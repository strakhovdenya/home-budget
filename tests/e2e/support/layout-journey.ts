import { layoutGoto, layoutReload } from './layout-navigation';
import {expect,type Page,type Locator} from '@playwright/test';
import type en from '../../../src/shared/i18n/messages/en.json';
import {database,noWrite,hydrated,actionFrom,argsOf,resultOf} from './proof';
import {clock,own} from './onboarding-proof';
import {quiet} from './history-proof';
type Messages=typeof en;
type Check=(stage:string)=>Promise<void>;
export async function confirm(page:Page,button:Locator){
 const waiting=page.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);
 await button.click();const response=await waiting;await response.finished();
 const result=resultOf(await response.text());expect(result?.ok,'H_REAL_SERVER_CONFIRM').toBe(true);
 const command=argsOf(actionFrom(response.request()))[0] as {requestId:string};
 await database(async c=>{const rows=(await c.query('SELECT result FROM budget_updates WHERE request_id=$1',[command.requestId])).rows;expect(rows).toHaveLength(1);expect(rows[0].result).toEqual(result!.value);});
 await quiet(page);await page.waitForLoadState('networkidle',{timeout:15000});
}
async function recoverFirst(p:Page,t:Messages,check:Check){
 let receipt:unknown,requestId:string|undefined;
 await p.route('**/',async route=>{
  if(route.request().method()==='POST'&&route.request().headers()['next-action']){
   requestId=(argsOf(actionFrom(route.request()))[0] as {requestId:string}).requestId;
   const response=await route.fetch({maxRetries:0}),result=resultOf(await response.text());expect(result?.ok,'H_REAL_COMMIT_BEFORE_TRANSPORT_LOSS').toBe(true);receipt=result!.value;
   await database(async c=>{const rows=(await c.query('SELECT result FROM budget_updates WHERE request_id=$1',[requestId])).rows;expect(rows).toHaveLength(1);expect(rows[0].result).toEqual(receipt);});await route.abort();
  }else await route.continue();
 });
 try{await p.getByRole('button',{name:t.firstRun.confirm,exact:true}).click();await expect(p.getByRole('button',{name:t.firstRun.status,exact:true})).toBeVisible();await expect(p.getByRole('status').filter({hasText:t.firstRun.outcomeUnknown})).toBeVisible();await check('localized-unknown-status');}finally{await p.unroute('**/');}
 expect(requestId).toBeDefined();
 await noWrite('H_STATUS_RECOVERY_NO_SECOND_COMMIT',async()=>{
  const waiting=p.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);await p.getByRole('button',{name:t.firstRun.status,exact:true}).click();const response=await waiting;await response.finished();const result=resultOf(await response.text());expect(result?.ok).toBe(true);expect(result!.value).toEqual(receipt);await expect(p.locator('#safe-heading')).toHaveCount(1);await expect(p.locator('#safe-heading')).toBeVisible();await check('localized-status-recovered');
 });
}
async function vector(p:Page,t:Messages,input:(n:number)=>string,b:number,a:Record<string,number>){
 await p.getByRole('textbox',{name:t.budgetUpdate.balance,exact:true}).fill(input(b));
 const pairs=Object.entries(a);while(await p.locator('input[name^="allocation-"]:visible').count()<pairs.length)await p.getByRole('button',{name:t.budgetUpdate.addMonth,exact:true}).click();
 expect(await p.locator('input[name^="allocation-"]:visible').count()).toBe(pairs.length);
 for(let i=0;i<pairs.length;i++){await p.locator('input[name="period-'+i+'"]:visible').fill(pairs[i][0]);await p.locator('input[name="allocation-'+i+'"]:visible').fill(input(pairs[i][1]));}
}
async function consent(p:Page,t:Messages,payment=false){
 await p.getByRole('checkbox',{name:t.budgetUpdate.vectorConsent,exact:true}).check();
 const order=p.getByRole('checkbox',{name:t.budgetUpdate.orderConsent,exact:true});if(await order.count())await order.check();
 if(payment)await p.getByRole('checkbox',{name:t.budgetUpdate.bankConsent,exact:true}).check();
}
async function finish(p:Page,t:Messages,check:Check,label:string){
 await p.getByRole('button',{name:t.budgetUpdate.preview,exact:true}).click();
 await expect(p.getByRole('button',{name:t.budgetUpdate.confirm,exact:true})).toBeVisible();await check(label+'-review');
 await confirm(p,p.getByRole('button',{name:t.budgetUpdate.confirm,exact:true}));
 await expect(p.getByRole('status').filter({hasText:t.budgetUpdate.saved})).toBeVisible();await check(label+'-saved');
}
export async function firstJourney(p:Page,t:Messages,input:(n:number)=>string,check:Check){
 const d=await clock(),u=t.budgetUpdate;
 await noWrite('H_FIRST_UNKNOWN_FORM',async()=>{await layoutGoto(p,'/');await expect(p.getByRole('heading',{name:t.firstRun.title,exact:true})).toBeVisible();await expect(p.getByRole('main').getByText(t.firstRun.unknown,{exact:true}).filter({visible:true})).toBeVisible();await check('first-unknown');
  const bank=p.getByRole('textbox',{name:u.balance,exact:true});await hydrated(bank);
  const label=await bank.evaluate(el=>{const label=(el as HTMLInputElement).labels?.[0];if(!label)throw Error('H_VISIBLE_BANK_LABEL_REQUIRED');const s=getComputedStyle(label);return{text:label.textContent,clientWidth:label.clientWidth,scrollWidth:label.scrollWidth,overflow:s.overflowX,whiteSpace:s.whiteSpace,textOverflow:s.textOverflow};});
  await testEvidence('first-bank-label',label);
  expect(label.overflow==='hidden'&&label.scrollWidth>label.clientWidth+1,'H_FIRST_BANK_LABEL_NOT_CLIPPED '+JSON.stringify(label)).toBe(false);
 });
 const bank=p.getByRole('textbox',{name:u.balance,exact:true});await hydrated(bank);await bank.fill(input(1000.01));await p.getByRole('textbox',{name:u.allocated,exact:true}).fill(input(700));
 await p.getByRole('button',{name:t.firstRun.add,exact:true}).click();await p.locator('input[type="month"]').nth(1).fill(d.future);await p.getByRole('textbox',{name:u.allocated,exact:true}).nth(1).fill(input(300));await p.getByRole('checkbox',{name:t.firstRun.consent,exact:true}).check();
 await noWrite('H_LOCALIZED_ERROR_AND_RECOVERY',async()=>{await p.getByRole('button',{name:t.firstRun.review,exact:true}).click();await expect(p.locator('main').getByRole('alert')).toContainText(t.firstRun.error);await check('first-error');await p.getByRole('textbox',{name:u.allocated,exact:true}).first().fill(input(700.01));await p.getByRole('button',{name:t.firstRun.review,exact:true}).click();await expect(p.getByRole('heading',{name:t.firstRun.reviewTitle,exact:true})).toBeVisible();await check('first-review');});
 if(/^H-(RU|DE|EN)-DESKTOP-FIRST$/.test(process.env.HB_H_CASE!))await recoverFirst(p,t,check);else await confirm(p,p.getByRole('button',{name:t.firstRun.confirm,exact:true}));await expect(p.locator('#safe-heading')).toHaveCount(1);await expect(p.locator('#safe-heading')).toBeVisible();await check('first-saved');
 await noWrite('H_FIRST_RELOAD',async()=>{await layoutReload(p);await expect(p.locator('#safe-heading')).toHaveCount(1);await expect(p.locator('#safe-heading')).toBeVisible();await check('first-reload');});
 await noWrite('H_UPDATE_OPEN',async()=>{await layoutGoto(p,'/update-budget');await hydrated(p.getByRole('textbox',{name:u.balance,exact:true}));await check('update-form');});
 await vector(p,t,input,900.01,{[d.period]:600.01,[d.future]:300});await consent(p,t);await finish(p,t,check,'update');
 await noWrite('H_UPDATE_RELOAD',async()=>{await layoutReload(p);await hydrated(p.getByRole('textbox',{name:u.balance,exact:true}));await check('update-reload');});
 for(const [i,decision]of ['ACCEPT','DECLINE'].entries()){
  const title='H synthetic monthly '+i;
  await noWrite('H_TEMPLATE_OPEN',async()=>{await layoutGoto(p,'/obligations');await hydrated(p.getByRole('button',{name:t.recurring.reviewConfig,exact:true}));await check('template-form');});
  const section=p.getByRole('heading',{name:t.recurring.title,exact:true}).locator('..'),form=section.locator('form').filter({has:p.getByRole('textbox',{name:t.recurring.name,exact:true})});
  await form.getByRole('textbox',{name:t.recurring.name,exact:true}).fill(title);await form.getByRole('textbox',{name:t.recurring.amount,exact:true}).fill(input(54));await form.getByRole('button',{name:t.recurring.reviewConfig,exact:true}).click();await check('template-config-review');
  await confirm(p,section.getByRole('button',{name:t.recurring.confirm,exact:true}));
  const offer=section.getByRole('heading',{name:title,exact:true}).locator('..');await expect(offer).toBeVisible();await offer.getByRole('button',{name:decision==='ACCEPT'?t.recurring.accept:t.recurring.decline,exact:true}).click();await check('template-'+decision+'-review');
  await confirm(p,section.getByRole('button',{name:t.recurring.confirm,exact:true}));await expect(offer).toHaveCount(0);await check('template-'+decision+'-saved');
 }
}
async function testEvidence(stage:string,value:unknown){const {test}=await import('@playwright/test');test.info().annotations.push({type:stage,description:JSON.stringify(value)});}
export async function transitionJourney(p:Page,t:Messages,input:(n:number)=>string,check:Check){
 const d=await clock(),u=t.budgetUpdate,m=await database(async c=>(await c.query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Europe/Berlin')-interval '1 month','YYYY-MM') m")).rows[0].m as string);
 await noWrite('H_TRANSITION_OPEN',async()=>{await layoutGoto(p,'/update-budget');await hydrated(p.getByRole('textbox',{name:u.balance,exact:true}));await check('transition-form');await p.getByRole('button',{name:u.otherActions,exact:true}).click();for(const mode of ['CARRY','DEFER'] as const){await p.getByRole('combobox',{name:u.mode,exact:true}).click();await p.getByRole('option',{name:u.modeLabel[mode],exact:true}).click();await check('transition-'+mode+'-form');}});
 await vector(p,t,input,800,{[m]:0,[d.period]:800});await p.getByRole('button',{name:u.startFresh,exact:true}).click();for(const label of [u.fundingConsent,u.nonCarryConsent,u.futureConsent])await p.getByRole('checkbox',{name:label,exact:true}).check();await consent(p,t);await finish(p,t,check,'transition');
 await noWrite('H_SEPARATE_PAYMENT_OPEN',async()=>{await layoutGoto(p,'/update-budget');await hydrated(p.getByRole('textbox',{name:u.balance,exact:true}));});
 await vector(p,t,input,600,{[m]:0,[d.period]:600});await p.getByRole('button',{name:u.addObligation,exact:true}).click();const field=p.getByRole('group',{name:u.obligation,exact:true}).last();
 await field.getByRole('combobox',{name:u.identity,exact:true}).click();await p.getByRole('option',{name:/^D retained obligation/}).click();await field.getByRole('combobox',{name:u.actionLabel,exact:true}).click();await p.getByRole('option',{name:u.action.PAID,exact:true}).click();await consent(p,t,true);await finish(p,t,check,'payment');
 const rows=await own();expect(rows.budget_updates.length).toBeGreaterThan(2);
}
