import {test,expect} from '@playwright/test';
import {encode} from 'next-auth/jwt';
import {writeFileSync} from 'node:fs';
import {sessionCookieName,syntheticOwner} from '../e2e/support/session';
import {identity,clock} from '../e2e/support/onboarding-proof';
import {noWrite,hydrated} from '../e2e/support/proof';
import ru from '../../src/shared/i18n/messages/ru.json' with {type:'json'};
import de from '../../src/shared/i18n/messages/de.json' with {type:'json'};
import en from '../../src/shared/i18n/messages/en.json' with {type:'json'};

for(const locale of ['ru','de','en'] as const)for(const width of [320,375,1280]){
 test('H-LABELS '+locale+' '+width+' complete bank label focus input review no-write',async({browser})=>{
  const t={ru,de,en}[locale],ctx=await browser.newContext({baseURL:'http://127.0.0.1:3000',locale,timezoneId:'Europe/Berlin',viewport:{width,height:width===320?800:width===375?812:900},serviceWorkers:'block'}),day=await clock();
  await ctx.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:3000'?route.continue():route.abort());
  const token=await encode({secret:process.env.AUTH_SECRET!,salt:sessionCookieName,maxAge:180,token:{sub:await identity(),googleSubject:syntheticOwner.subject,email:syntheticOwner.email}});
  await ctx.addCookies([{name:sessionCookieName,value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax',secure:false},{name:'home-budget-locale',value:locale,domain:'127.0.0.1',path:'/',sameSite:'Lax'}]);
  const page=await ctx.newPage();
  try{await noWrite('H_R01_'+locale+'_'+width,async()=>{
   await page.goto('/');const bank=page.getByRole('textbox',{name:t.budgetUpdate.balance,exact:true});await hydrated(bank);
   const label=await bank.evaluate(el=>{const label=(el as HTMLInputElement).labels?.[0];if(!label)throw Error('H_VISIBLE_BANK_LABEL_REQUIRED');const s=getComputedStyle(label),r=label.getBoundingClientRect(),input=el.getBoundingClientRect();return{text:label.textContent,clientWidth:label.clientWidth,scrollWidth:label.scrollWidth,overflow:s.overflowX,whiteSpace:s.whiteSpace,textOverflow:s.textOverflow,above:r.bottom<=input.top,visible:r.width>0&&r.height>0,forId:label.htmlFor,id:el.id};});
   test.info().annotations.push({type:'first-bank-label',description:JSON.stringify({locale,width,...label})});
   expect(label.overflow==='hidden'&&label.scrollWidth>label.clientWidth+1,'H_FIRST_BANK_LABEL_NOT_CLIPPED '+JSON.stringify(label)).toBe(false);
   expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth+1);expect(label.above&&label.visible&&label.forId===label.id&&!!label.id).toBe(true);
   await expect(bank).toHaveAttribute('required','');await expect(bank).toHaveAttribute('inputmode','decimal');await expect(bank).toHaveAccessibleName(t.budgetUpdate.balance);
   await page.locator('label').filter({hasText:t.budgetUpdate.balance}).filter({visible:true}).click();await expect(bank).toBeFocused();
   const input=new Intl.NumberFormat(locale,{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:2}).format(1000.01);await bank.fill(input);await expect(bank).toHaveValue(input);
   if(locale==='ru'&&width===320)await page.screenshot({path:'/work/test-results/h-layout.png',fullPage:true});
   await page.getByRole('textbox',{name:t.budgetUpdate.allocated,exact:true}).fill(input);await page.getByRole('checkbox',{name:t.firstRun.consent,exact:true}).check();
   await page.getByRole('button',{name:t.firstRun.review,exact:true}).click();await expect(page.getByRole('heading',{name:t.firstRun.reviewTitle,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:t.firstRun.confirm,exact:true})).toBeEnabled();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   test.info().annotations.push({type:'calendar',description:day.today});
  });}finally{writeFileSync('/work/test-results/h-layout.json',JSON.stringify({scope:'H-R01 label matrix; detailed nine independent results in playwright.json',browser:browser.version()}));await ctx.close();}
 });
}
