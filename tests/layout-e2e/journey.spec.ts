import {test,expect} from '@playwright/test';
import {encode} from 'next-auth/jwt';
import {writeFileSync} from 'node:fs';
import {sessionCookieName,syntheticOwner} from '../e2e/support/session';
import {identity,foreign} from '../e2e/support/onboarding-proof';
import {database} from '../e2e/support/proof';
import {monitor} from '../e2e/support/history-proof';
import {firstJourney,transitionJourney} from '../e2e/support/layout-journey';
import ru from '../../src/shared/i18n/messages/ru.json' with {type:'json'};
import de from '../../src/shared/i18n/messages/de.json' with {type:'json'};
import en from '../../src/shared/i18n/messages/en.json' with {type:'json'};

const name=process.env.HB_H_CASE!,locale=name.startsWith('H-DE')?'de':name.startsWith('H-EN')?'en':'ru',t={ru,de,en}[locale];
test(name+' localized successful financial journey',async({browser},info)=>{
 const ctx=await browser.newContext({...info.project.use}),retained=await foreign(),errors:string[]=[],stages:unknown[]=[];
 const evidence:Record<string,unknown>={case:name,browser:browser.browserType().name(),version:browser.version(),locale,viewport:info.project.use.viewport,stages,providerLogin:'NOT EXECUTED'};
 let external=0;
 await ctx.route('**/*',async route=>{if(new URL(route.request().url()).origin===info.project.use.baseURL)await route.continue();else{external++;await route.abort();}});
 const token=await encode({secret:process.env.AUTH_SECRET!,salt:sessionCookieName,maxAge:300,token:{sub:await identity(),googleSubject:syntheticOwner.subject,email:syntheticOwner.email}});
 await ctx.addCookies([{name:sessionCookieName,value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax',secure:false},{name:'home-budget-locale',value:locale,domain:'127.0.0.1',path:'/',sameSite:'Lax'}]);
 const page=await ctx.newPage();monitor(page);page.on('dialog',d=>d.accept());page.on('pageerror',e=>errors.push(e.message));
 try{
  await database(async c=>{const r=(await c.query("SELECT current_user role,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) super,has_schema_privilege('public','CREATE') ddl,has_table_privilege('accounts','DELETE') del,has_column_privilege('users','google_subject','UPDATE') identity,has_table_privilege('month_closings','INSERT') report,pg_has_role(current_user,'hb_migrator','MEMBER') migrator")).rows[0];expect(r).toEqual({role:'hb_h_writer',super:false,ddl:false,del:false,identity:false,report:false,migrator:false});evidence.minimumWriter=true;});
  const input=(n:number)=>new Intl.NumberFormat(locale,{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  const check=async(stage:string)=>{
   evidence.lastStage=stage;
   const clipped = await page.evaluate(() => {
    return [...document.querySelectorAll('main label,main button,main h1,main h2,main h3')]
     .filter(element => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden'
       && ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
     }).map(element => element.textContent?.slice(0, 120));
   });
   const measured=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].flatMap(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.left< -1||r.right>innerWidth+1)?[{tag:el.tagName,text:el.textContent?.slice(0,120),left:r.left,right:r.right,width:r.width}]:[];}).slice(0,15)}));stages.push({stage,...measured});
   expect(measured.scrollWidth,'H_NO_HORIZONTAL_OVERFLOW '+stage).toBeLessThanOrEqual(measured.width+1);
   expect(clipped,'H_NO_CLIPPED_JOURNEY_TEXT '+stage).toEqual([]);
   expect(await page.locator('main').innerText(),'H_NO_RAW_I18N_KEYS '+stage).not.toMatch(/\b(?:firstRun|budgetUpdate|financialHistory|monthClosing|recurring)\.[a-zA-Z]/);
   expect(await page.locator('main').innerText(),'H_NO_VISIBLE_RAW_ENUMS '+stage).not.toMatch(/\b(?:UNPAID|PAID|CANCELLED|RELEASED|ALLOCATION|FRESH_START|CARRY|DEFER|END_DATE_OBSERVED|NO_OBSERVATION)\b/);
  };
  if(name.endsWith('-FIRST'))await firstJourney(page,t,input,check);else await transitionJourney(page,t,input,check);
  expect(errors,'H_NO_RENDER_ERRORS').toEqual([]);expect(external,'H_NO_EXTERNAL_REQUESTS').toBe(0);
  expect(await page.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(k=>k!=='home-budget-mode'))).toEqual([]);
 }finally{
  evidence.errors=errors;evidence.externalRequests=external;
  await page.screenshot({path:'/work/test-results/h-layout.png',fullPage:true});writeFileSync('/work/test-results/h-layout.json',JSON.stringify(evidence,null,2));
  expect(await foreign(),'H_FOREIGN_AND_IDENTITIES_RETAINED').toBe(retained);await ctx.close();
 }
});
