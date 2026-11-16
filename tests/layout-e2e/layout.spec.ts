import { layoutGoto } from '../e2e/support/layout-navigation';
import {test,expect,type Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {installSession} from '../e2e/support/session';
import {noWrite,database,hydrated} from '../e2e/support/proof';
import {monitor,quiet} from '../e2e/support/history-proof';
import {historyViews,themes} from '../e2e/support/layout-history';
import ru from '../../src/shared/i18n/messages/ru.json' with {type:'json'};
import de from '../../src/shared/i18n/messages/de.json' with {type:'json'};
import en from '../../src/shared/i18n/messages/en.json' with {type:'json'};
const catalogs={ru,de,en};

// First development slice only: read-only route geometry. This does not claim
// the six-combination successful financial journey matrix is implemented.
const name=process.env.HB_H_CASE!;
test(name+' localized saved history and report routes fit the actual viewport',async({browser},info)=>{
 const context=await browser.newContext({...info.project.use});
 const locale=name.startsWith('H-DE')?'de':name.startsWith('H-EN')?'en':'ru',t=catalogs[locale];
 const stages:unknown[]=[];
 const evidence:Record<string,unknown>={case:name,locale,browser:browser.browserType().name(),version:browser.version(),viewport:info.project.use.viewport,transport:info.project.use.baseURL?.startsWith('https:')?'loopback HTTPS':'loopback HTTP',scope:'read-only routes; explicit financial journeys are separate cases',stages};
 let external=0;const errors:string[]=[];
 await context.route('**/*',async route=>{if(new URL(route.request().url()).origin===info.project.use.baseURL)await route.continue();else{external++;await route.abort();}});
 await installSession(context);
 await context.addCookies([{name:'home-budget-locale',value:locale,domain:'127.0.0.1',path:'/',sameSite:'Lax'}]);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));monitor(page);
 try{
  await database(async c=>{const r=(await c.query("SELECT current_user role,has_schema_privilege('public','CREATE') ddl,pg_has_role(current_user,'hb_migrator','MEMBER') migrator,EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND (has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'INSERT') OR has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'UPDATE') OR has_table_privilege(current_user,quote_ident(schemaname)||'.'||quote_ident(tablename),'DELETE'))) dml")).rows[0];expect(r).toEqual({role:'hb_h_runtime',ddl:false,migrator:false,dml:false});evidence.selectOnly=true;});
  await noWrite('H_HISTORY_NAVIGATION_EXACT_20_TABLE_CENSUS',async()=>{
   try{
    await layoutGoto(page,'/history');
    await expect(page.getByRole('heading',{name:t.financialHistory.title,exact:true})).toBeVisible();
    if(name.endsWith('-ZERO'))await expect(page.locator('ol > li').first()).toBeVisible();else await expect(page.locator('ol > li')).toHaveCount(20);await quiet(page);
    if(!name.endsWith('-ZERO'))await expect(page.getByRole('button',{name:t.financialHistory.next,exact:true})).toBeEnabled();
    const check=async(stage:string)=>{const measured=await geometry(page);stages.push({stage,...measured});evidence.lastStage=stage;expect(measured.scrollWidth,'H_NO_HORIZONTAL_OVERFLOW '+stage).toBeLessThanOrEqual(measured.width+1);expect(measured.clipped,'H_NO_CLIPPED_TEXT '+stage).toEqual([]);expect(await page.locator('main').innerText(),'H_NO_RAW_TRANSLATION_KEYS '+stage).not.toMatch(/\b(?:firstRun|budgetUpdate|financialHistory|monthClosing|recurring)\.[a-zA-Z]/);};
    await check('history-index');
    expect(await page.locator('main').innerText(),'H_NO_VISIBLE_RAW_ENUMS').not.toMatch(/\b(?:UNPAID|PAID|CANCELLED|RELEASED|ALLOCATION|FRESH_START|CARRY|DEFER|END_DATE_OBSERVED|NO_OBSERVATION)\b/);
    const time=page.locator('time').first(),instant=await time.getAttribute('datetime');await expect(time).toHaveText(new Intl.DateTimeFormat(locale,{timeZone:'Europe/Berlin',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).format(new Date(instant!)));
    await historyViews(page,t,check);
    await themes(page,t,check);
    if(!name.endsWith('-ZERO')){
     await layoutGoto(page,'/history');await quiet(page);
     let current=t;const localeActions:unknown[]=[];evidence.localeActions=localeActions;
     // Exercise each distinct choice and await its actual action/transition.
     // Selecting the already-active value adds an unrelated refresh to the flow.
     for(const next of [...(['ru','de','en'] as const).filter(l=>l!==locale),locale] as const){
      const control=page.getByLabel(current.preferences.language,{exact:true});await hydrated(control);
      const action:{to:string;before:string;status?:number;cookie?:string;after?:string;secureLocaleCookie?:boolean}={to:next,before:await control.inputValue()};localeActions.push(action);
      const pending=page.waitForResponse(r=>{if(r.request().method()!=='POST'||!r.request().headers()['next-action'])return false;try{return JSON.parse(r.request().postData()??'[]')[0]===next;}catch{return false;}});
      await control.selectOption(next);const response=await pending;await response.finished();action.status=response.status();expect(action.status,'H_REAL_LOCALE_ACTION').toBe(200);
      action.secureLocaleCookie=/home-budget-locale=[^\r\n]*;\s*secure\b/i.test((await response.allHeaders())['set-cookie']??'');
      expect(action.secureLocaleCookie,'H_PRODUCTION_SECURE_COOKIE_POLICY_RETAINED').toBe(true);
      await expect.poll(async()=>(await context.cookies()).find(c=>c.name==='home-budget-locale')?.value,{message:'H_LOCALE_COOKIE_APPLIED_AFTER_REAL_ACTION'}).toBe(next);
      action.cookie=(await context.cookies()).find(c=>c.name==='home-budget-locale')?.value;expect(action.cookie).toBe(next);
      current=catalogs[next];await expect(page.locator('html')).toHaveAttribute('lang',next);await expect(page.getByRole('heading',{name:current.financialHistory.title,exact:true})).toBeVisible();
      const refreshed=page.getByLabel(current.preferences.language,{exact:true});await expect(refreshed).toBeEnabled();await hydrated(refreshed);action.after=await refreshed.inputValue();expect(action.after).toBe(next);await quiet(page);await check('locale-switch-'+next);
     }
    }
    expect(errors,'H_NO_BROWSER_RENDER_ERRORS').toEqual([]);expect(external,'H_NO_EXTERNAL_REQUESTS').toBe(0);
   }finally{await page.screenshot({path:'/work/test-results/h-layout.png',fullPage:true});}
  });
  evidence.noWrite=true;
 }finally{evidence.errors=errors;evidence.externalRequests=external;writeFileSync('/work/test-results/h-layout.json',JSON.stringify(evidence,null,2));await context.close();}
});
async function geometry(page:Page){return page.evaluate(()=>{
 const width=document.documentElement.clientWidth;
 return{width,scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,colors:{foreground:getComputedStyle(document.body).color,background:getComputedStyle(document.body).backgroundColor},clipped:[...document.querySelectorAll('main p,main h1,main h2,main h3,main dt,main dd,main button,main label')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&['hidden','clip'].includes(s.overflowX)&&el.scrollWidth>el.clientWidth+1;}).map(el=>el.textContent?.slice(0,120)),offenders:[...document.querySelectorAll('body *')].flatMap(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&(r.left< -1||r.right>width+1)?[{tag:el.tagName,role:el.getAttribute('role'),text:el.textContent?.slice(0,120),left:r.left,right:r.right,width:r.width}]:[];}).slice(0,20)};
 });}
