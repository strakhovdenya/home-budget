// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { catalogs } from '@/shared/i18n/catalogs';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { dashboardPresentation } from '@/features/dashboard/presentation';
import { UpdateBudgetScreen } from '@/features/budget-updates/update-budget-screen';
import { BudgetReview, type BudgetReviewData } from '@/features/budget-updates/budget-review';
import { initialForm, makeBudgetCommand, type UpdateSeed, type BudgetActions } from '@/features/budget-updates/presentation';
import { projectPeriod } from '@/domain/forecast/budget';
import { encodeProjection } from '@/domain/forecast/serialization';
import { state, value } from './fixtures/forecast';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);
beforeEach(()=>{window.matchMedia=vi.fn(query=>({media:query,matches:false,onchange:null,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));});
function tree(children:React.ReactNode,locale:keyof typeof catalogs='en'){return <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><AppThemeProvider>{children}</AppThemeProvider></NextIntlClientProvider>;}
const seed=():UpdateSeed=>({revision:'1',knowledgeCut:'1',today:'2026-12-04',baseCheckpointId:'00000000-0000-4000-8000-000000000001',baseVectorId:'00000000-0000-4000-8000-000000000002',bank:{balanceCents:'100000',observedDate:'2026-11-20'},allocations:[{period:'2026-11',amountCents:'100000'}],obligations:[],savings:[],placement:null});
function actions():BudgetActions{return {load:vi.fn(),preview:vi.fn(async()=>({ok:false as const,code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED' as const})),confirm:vi.fn(),status:vi.fn(),history:vi.fn()};}
const review:BudgetReviewData={financial:{asOfDate:'2026-11-04',effectiveDate:'2026-10-31',bank:{balanceCents:'90000',observedDate:'2026-10-31'},allocations:[{period:'2026-10',amountCents:'90000'}],fundingPeriods:[],obligations:[],savings:[],projection:{bank:{balance:'100000',observedDate:'2026-11-04'},safe:{safeAvailable:'100000',safeDailyLimit:'3703',coverageGroups:[]}}},reportImpact:[{synthetic:true}]};
it.each(['ru','de','en'] as const)('HBUX-026/030/031/032 future budget leads dated card, SSR semantic copy %s',locale=>{
  const s=state(100000n,{'2026-11':80000n,'2026-12':20000n});const view=dashboardPresentation(value(encodeProjection(value(projectPeriod(s,'2026-11-28','2026-12')))));
  const ui=tree(<DashboardScreen view={view} base="/months"/>,locale),html=renderToString(ui);expect(html).not.toMatch(/undefined|NaN/);
  render(ui);const text=document.body.textContent!;expect(text.indexOf(catalogs[locale].dashboard.budgetTitle)).toBeLessThan(text.indexOf(catalogs[locale].dashboard.bank));
  expect(screen.getByText(catalogs[locale].dashboard.bankNoncurrent)).toBeTruthy();expect(screen.getByText(catalogs[locale].dashboard.futureCashUnknown)).toBeTruthy();
  expect(screen.queryByText(catalogs[locale].dashboard.safeDaily)).toBeNull();
});
it.each(['ru','de','en'] as const)('HBUX-034 historical proposal and current guidance are separate semantic sections %s',locale=>{
  render(tree(<BudgetReview review={review}/>,locale));
  const primary=screen.getByRole('region',{name:catalogs[locale].budgetUpdate.proposedState}),secondary=screen.getByRole('region',{name:catalogs[locale].budgetUpdate.currentGuidance});
  expect(primary.textContent).toContain('900');expect(primary.textContent).not.toContain('1,000');expect(secondary.textContent).toContain('37');
  expect(within(secondary).getByText(catalogs[locale].budgetUpdate.historicalSeparate)).toBeTruthy();
  expect(primary.compareDocumentPosition(secondary)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('HBUX-015/016/018/036 primary fresh start is a deliberate action without writes or prechecked consent',async()=>{
  const f=seed(),a=actions();render(tree(<UpdateBudgetScreen initialSeed={f} actions={a}/>));
  const button=screen.getByRole('button',{name:'Start month with actual balance'});expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(a.preview).not.toHaveBeenCalled();expect(a.confirm).not.toHaveBeenCalled();await userEvent.click(button);
  expect(button.getAttribute('aria-pressed')).toBe('true');expect((screen.getByRole('checkbox',{name:/I confirm clearing past active allocations/}) as HTMLInputElement).checked).toBe(false);
  expect((screen.getByRole('checkbox',{name:/I confirm the full transfer/}) as HTMLInputElement).checked).toBe(false);expect(a.confirm).not.toHaveBeenCalled();
});
it('HBUX-011/013/014/036 ordinary path hides transition selector, alternatives preserve canonical intent',async()=>{
  const f={...seed(),today:'2026-11-24'},a=actions();render(tree(<UpdateBudgetScreen initialSeed={f} actions={a}/>));expect(screen.queryByRole('combobox',{name:'Choose action'})).toBeNull();
  await userEvent.click(screen.getByText('Other explicitly confirmed actions'));expect(screen.getByRole('combobox',{name:'Choose action'})).toBeTruthy();
  const form=initialForm(f);form.mode='DEFER';form.vectorConfirmed=true;
  expect(makeBudgetCommand(f,form,'en','synthetic').payload.allocationChange).toMatchObject({mode:'DEFER',consent:{transitionConfirmed:true}});
  form.mode='';form.reuse=true;form.unchangedFunding=true;expect(makeBudgetCommand(f,form,'en','synthetic').payload.allocationChange).toMatchObject({mode:'REDISTRIBUTE',observationMode:'REUSE_CONFIRMED'});
});
it('HBUX-035 saved result is verified history, one success, read failure never saves twice',async()=>{
  const f={...seed(),today:'2026-11-24'},receipt={updateId:'verified-id',recordedSeq:'2',aggregateRevision:'2'},a=actions();
  a.preview=vi.fn(async input=>({ok:true as const,value:JSON.parse(JSON.stringify({...input as object,payload:{review}}))}));a.confirm=vi.fn(async()=>({ok:true as const,value:receipt}));a.history=vi.fn(async()=>({ok:false as const,code:'STORAGE_ERROR' as const}));
  render(tree(<UpdateBudgetScreen initialSeed={f} actions={a}/>));await userEvent.click(screen.getByRole('checkbox',{name:/I have checked the complete allocation/}));await userEvent.click(screen.getByRole('button',{name:'Preview result'}));
  await userEvent.click(await screen.findByRole('button',{name:'Confirm update'}));await screen.findByText(/Update saved/);
  expect(screen.getAllByRole('status').filter(e=>e.textContent?.includes('Update saved'))).toHaveLength(1);
  a.history=vi.fn(async()=>({ok:true as const,value:JSON.parse(JSON.stringify([{receipt,recordedAt:'2026-11-04T12:00:00Z',review}]))}));
  await userEvent.click(screen.getByRole('button',{name:'Retry reading'}));
  expect(a.confirm).toHaveBeenCalledTimes(1);expect(screen.getAllByText(/Update saved/)).toHaveLength(1);

});
