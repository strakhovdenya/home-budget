import { layoutGoto, layoutReload } from './layout-navigation';
import {expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {quiet,response,ownRows,type Fixture} from './history-proof';
import {hydrated} from './proof';
import type en from '../../../src/shared/i18n/messages/en.json';
import {noWrite} from './proof';

export async function historyViews(page:Page,t:typeof en,check:(stage:string)=>Promise<void>){
 const f=JSON.parse(readFileSync('/work/test-results/h-fixture.json','utf8')) as Fixture,history=t.financialHistory;
 if(!process.env.HB_H_CASE!.endsWith('-ZERO')){
  const first=await page.locator('ol > li').first().textContent();
  await page.getByRole('button',{name:history.next,exact:true}).click();await quiet(page);await check('history-next');
  await page.getByRole('button',{name:history.previous,exact:true}).click();await quiet(page);expect(await page.locator('ol > li').first().textContent()).toBe(first);await check('history-previous');
 }
 await page.locator('input[type="month"]').fill(f.calendar.m);
 await response(page,{month:f.calendar.m},()=>page.getByRole('button',{name:history.refresh,exact:true}).click());
 await check('history-filter');
 const rows=await ownRows();
 async function select(batch:string){
  const audit=rows.audit_events.find(a=>a.budget_update_id===batch);expect(!!audit,'H_PERSISTED_BATCH_ANCHOR').toBe(true);
  const card=page.locator('ol > li').filter({hasText:String(audit!.id)});
  await expect(card).toHaveCount(1);await card.getByRole('button',{name:history.open,exact:true}).click();await quiet(page);
 }
 await select(f.original.updateId);await check('history-original');
 const region=page.getByRole('region',{name:history.selected,exact:true});
 if(process.env.HB_H_CASE!.endsWith('-ZERO')){
  const locale=await page.locator('html').getAttribute('lang'),money=(n:number)=>new Intl.NumberFormat(locale!,{style:'currency',currency:'EUR'}).format(n);
  await expect(region.getByText(history.bank+': '+money(0),{exact:true})).toBeVisible();await expect(region.getByText(history.end+': '+money(0),{exact:true})).toBeVisible();await expect(region.getByText(money(-30),{exact:true})).toBeVisible();await check('known-zero-negative-free');
  return;
 }
 await expect(region.getByText(history.end+': '+history.unknown,{exact:true})).toBeVisible();
 await expect(region.getByRole('button',{name:history.original,exact:true})).toHaveAttribute('aria-pressed','true');
 await region.getByRole('button',{name:history.later,exact:true}).click();await quiet(page);await check('history-later');
 await select(f.report1!.updateId);await expect(region.getByText(history.reportCaption,{exact:true})).toBeVisible();await check('history-report-v1');
 for(const version of [1,2]){
  await layoutGoto(page,'/months?period='+f.calendar.m+'&version='+version);await quiet(page);
  await expect(page.getByRole('heading',{name:t.monthClosing.version.replace('{n}',String(version)),exact:true})).toBeVisible();
  await check('closing-v'+version);
  const details=page.getByRole('button',{name:t.monthClosing.details,exact:true});await hydrated(details);await details.click();await quiet(page);
  await expect(page.getByRole('heading',{name:t.monthClosing.details,exact:true})).toBeVisible();await check('closing-v'+version+'-chunk');
  await layoutReload(page);await quiet(page);await expect(page.getByRole('link',{name:new RegExp('^'+t.monthClosing.version.replace('{n}',String(version))+'\\b')})).toHaveAttribute('aria-current','page');await check('closing-v'+version+'-reload');
 }
 for(const path of ['/','/update-budget','/obligations','/savings','/settings']){
  await layoutGoto(page,path);await quiet(page);await expect(page.locator('main')).toBeVisible();
  if(path==='/'){const locale=await page.locator('html').getAttribute('lang');await expect(page.getByText(new Intl.NumberFormat(locale!,{style:'currency',currency:'EUR'}).format(1000.01),{exact:true}).first()).toBeVisible();}
  await check('route:'+path);
 }
 await layoutGoto(page,'/months?period='+f.calendar.m+'&version=1');await quiet(page);
 await expect(page.getByRole('heading',{name:t.monthClosing.version.replace('{n}','1'),exact:true})).toBeVisible();
}
export async function themes(page:Page,t:typeof en,check:(stage:string)=>Promise<void>){
 const select=page.getByLabel(t.preferences.theme,{exact:true}),body=await page.locator('main').innerText();
 for(const mode of ['light','dark','system']){
  await select.selectOption(mode);await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-mui-color-scheme',mode==='system'?'dark':mode);
  expect(await page.locator('main').innerText(),'H_THEME_RETAINS_FINANCIAL_TEXT').toBe(body);await check('theme-'+mode);
  await page.locator('main').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:'/work/test-results/h-theme-'+mode+'.png'});
  if(mode==='system'){await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-mui-color-scheme','light');await check('theme-system-light');}
 }
 await noWrite('H_THEME_RELOAD',async()=>{await layoutReload(page);await quiet(page);await expect(select).toHaveValue('system');});
}
