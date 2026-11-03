// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { DashboardScreen, DashboardLoading } from '@/features/dashboard/dashboard-screen';
import { dashboardPresentation, type DashboardView } from '@/features/dashboard/presentation';
import { formatMoney } from '@/features/dashboard/format-money';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { catalogs } from '@/shared/i18n/catalogs';
import { state, obligation, saving, value, day } from './fixtures/forecast';
import { projectAccount, projectPeriod } from '@/domain/forecast/budget';
import { encodeProjection } from '@/domain/forecast/serialization';
const mocks=vi.hoisted(()=>({push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}));
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();window.matchMedia=vi.fn((query:string)=>({media:query,onchange:null,matches:false,addListener:vi.fn(),removeListener:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn(),dispatchEvent:vi.fn()}));});
const ready=()=>dashboardPresentation(value(encodeProjection(value(projectAccount(state(10000n,undefined,[obligation(20000n,'2026-12')]),'2026-11-28')))));
function tree(view:DashboardView,locale:keyof typeof catalogs='en',base:'/'|'/months'='/') {return <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin"><AppThemeProvider><DashboardScreen view={view} base={base}/></AppThemeProvider></NextIntlClientProvider>;}
it('HB16-B01/D07 renders safe main versus ordinary and a single grouped shortage with all meanings, without financial actions',()=>{
  render(tree(ready()));
  expect(screen.getByText('Safe daily limit')).toBeTruthy();expect(screen.getByText('€33.33')).toBeTruthy();
  expect(screen.getAllByText('Shortfall of €100.00 based on the card check')).toHaveLength(1);
  expect(screen.getByText(catalogs.en.dashboard.meaning.OBLIGATIONS_UNDERFUNDED)).toBeTruthy();expect(screen.getByText(catalogs.en.dashboard.meaning.EARMARKS_UNDERFUNDED)).toBeTruthy();expect(screen.getByText(catalogs.en.dashboard.meaning.PROTECTION_UNDERFUNDED)).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('button',{name:/update budget|pay|release|carry|close|acknowledge/i})).toBeNull();
});
it('HB16-B03/D03 keeps signed deficit and distinct nonadditive shortages',()=>{
  const p=dashboardPresentation(value(encodeProjection(value(projectAccount(state(10000n,undefined,[obligation(12000n)],[saving(2000n)]),'2026-11-28')))));
  render(tree(p));expect(screen.getByText('-€40.00')).toBeTruthy();expect(screen.getByText('Shortfall of €20.00 based on the card check')).toBeTruthy();expect(screen.getByText('Shortfall of €40.00 based on the card check')).toBeTruthy();expect(screen.getByText(catalogs.en.dashboard.nonAdditive)).toBeTruthy();expect(screen.queryByText('€60.00')).toBeNull();
});
it('HB16-B04/B05 keeps unknown states distinct from zero and preserves only negative bank facts',()=>{
  const s=state();
  const no=dashboardPresentation(value(encodeProjection(value(projectAccount({kind:'NO_OBSERVATION',accountId:s.accountId,provenance:s.provenance,knownObligations:[obligation(20000n)],knownSavings:[saving(5000n)]},'2026-11-28')))));
  const view=render(tree(no));expect(screen.getByText(catalogs.en.dashboard.unavailable.NO_OBSERVATION)).toBeTruthy();expect(screen.getByText(catalogs.en.dashboard.known)).toBeTruthy();expect(screen.queryByText('Confirmed card balance')).toBeNull();expect(screen.queryByText('Safe daily limit')).toBeNull();view.unmount();
  const incomplete=dashboardPresentation(value(encodeProjection(value(projectAccount({kind:'INCOMPLETE_STATE',accountId:s.accountId,provenance:s.provenance,missing:['ALLOCATIONS']},'2026-11-28')))));
  const part=render(tree(incomplete));expect(screen.getByText(catalogs.en.dashboard.unavailable.INCOMPLETE_STATE)).toBeTruthy();expect(screen.queryByText('€0.00')).toBeNull();part.unmount();
  const negative=dashboardPresentation(value(encodeProjection(value(projectAccount({kind:'NEGATIVE_BANK_OBSERVATION',accountId:s.accountId,provenance:s.provenance,checkpoint:{...s.checkpoint,balance:-100n}},'2026-11-28')))));
  render(tree(negative));expect(screen.getByText('-€1.00')).toBeTruthy();expect(screen.getByText(catalogs.en.dashboard.unavailable.OVERDRAFT_POLICY_REQUIRED)).toBeTruthy();expect(screen.queryByText('Monthly budget deficit')).toBeNull();
});
it('HB16-B06 renders genuine zero and a current-unfunded notice',()=>{
  render(tree(dashboardPresentation(value(encodeProjection(value(projectAccount(state(0n),'2026-11-28')))))));
  expect(screen.getAllByText('€0.00').length).toBeGreaterThan(3);expect(screen.getByText(catalogs.en.dashboard.notice.CURRENT_UNFUNDED)).toBeTruthy();
});
it.each(['2026-12','2026-10'])('HB16-C01/C02 renders %s without today safe or counterfeit past daily',period=>{
  const s=state(123000n,{'2026-11':3000n,'2026-12':120000n},[obligation(90000n,'2026-12')]);
  render(tree(dashboardPresentation(value(encodeProjection(value(projectPeriod(s,'2026-11-28',period))))),'en','/months'));
  expect(screen.queryByText('Safe daily limit')).toBeNull();expect(screen.getByText(catalogs.en.dashboard.bankNoncurrent)).toBeTruthy();
  if(period==='2026-12'){expect(screen.getByText('€9.67')).toBeTruthy();expect(screen.getByText(catalogs.en.dashboard.futureBasis)).toBeTruthy();}
  else {expect(screen.getByText(catalogs.en.dashboard.pastBasis)).toBeTruthy();expect(screen.queryByText(catalogs.en.dashboard.ordinary)).toBeNull();}
});
it.each([0,1,6,7,8])('HB16-D01 keeps dated estimates at civil age %s',age=>{
  const s=state(),asOf=day(`2026-11-${String(20+age)}`);
  const p=dashboardPresentation(value(encodeProjection(value(projectAccount({...s,provenance:{...s.provenance,historicalThroughDate:asOf}},asOf)))));
  render(tree(p));expect(screen.getByText('Safe daily limit')).toBeTruthy();expect(screen.queryByText(catalogs.en.dashboard.notice.REMINDER_DUE)!==null).toBe(age>=7);expect(screen.queryByText(catalogs.en.dashboard.notice.EARLIER_OBSERVATION)!==null).toBe(age>0);
});
it.each(['2026-03-28','2026-03-29','2026-03-30','2026-10-24','2026-10-25','2026-10-26'])('HB16-D02 displays Berlin DST freshness %s',asOf=>{
  const s=state(),observed=day(asOf.slice(0,7)+(asOf.includes('-03-')?'-22':'-18'));
  const p=dashboardPresentation(value(encodeProjection(value(projectAccount({...s,checkpoint:{...s.checkpoint,observedDate:observed},provenance:{...s.provenance,historicalThroughDate:day(asOf)},allocationEffectiveDate:observed},asOf)))));
  render(tree(p));expect(screen.queryByText(catalogs.en.dashboard.notice.REMINDER_DUE)!==null).toBe(!asOf.endsWith('28')&&!asOf.endsWith('24'));
});
it.each(['UNAUTHORIZED','NO_ACCOUNT','ACCOUNT_SELECTION_REQUIRED','STORAGE_ERROR','PROJECTION_LIMIT_EXCEEDED','CALCULATION_ERROR','INVALID_PERIOD','FORBIDDEN'] as const)('HB16-A05 renders safe %s state without money',kind=>{
  render(tree({kind}));expect(screen.getByText(catalogs.en.dashboard.state[kind])).toBeTruthy();expect(screen.queryByText('€0.00')).toBeNull();
});
it('HB16-C04/C05/D05 uses accessible URL controls and supports calendar boundaries',async()=>{
  const first=render(tree(ready(),'en','/months'));
  const nav=screen.getByRole('navigation',{name:'Select a budget month'});
  expect(within(nav).getByRole('link',{name:/Next month/}).getAttribute('href')).toBe('/months?period=2026-12');expect(within(nav).getByRole('link',{name:'Current month'}).getAttribute('href')).toBe('/months');
  await userEvent.selectOptions(screen.getByRole('combobox',{name:'Month'}),'02');await userEvent.clear(screen.getByRole('spinbutton',{name:'Year'}));await userEvent.type(screen.getByRole('spinbutton',{name:'Year'}),'2028');await userEvent.click(screen.getByRole('button',{name:'Show month'}));expect(mocks.push).toHaveBeenCalledWith('/months?period=2028-02');first.unmount();
  const p=ready();if(p.kind!=='READY')throw Error('ready');const start=render(tree({...p,period:'0001-01'}));expect((screen.getByRole('button',{name:'First supported month reached'}) as HTMLButtonElement).disabled).toBe(true);start.unmount();
  render(tree({...p,period:'9999-12'}));expect((screen.getByRole('button',{name:'Last supported month reached'}) as HTMLButtonElement).disabled).toBe(true);
});
it.each(['ru','de','en'] as const)('HB16-D04/D06 renders translated semantic money in %s with all theme modes',async locale=>{
  for(const mode of ['light','dark','system']){
    localStorage.setItem('home-budget-mode',mode);
    const r=render(tree(ready(),locale));expect(screen.getByRole('heading',{level:1,name:catalogs[locale].navigation.overview})).toBeTruthy();expect(screen.getByText(formatMoney('3333',locale).replaceAll('\u00a0',' '))).toBeTruthy();expect(screen.getAllByRole('definition').length).toBeGreaterThan(5);r.unmount();
  }
});
it('HB16-D04 hydrates the same dated financial view without mismatch',async()=>{
  const container=document.createElement('div'),onRecoverableError=vi.fn();container.innerHTML=renderToString(tree(ready()));document.body.append(container);
  let root:ReturnType<typeof hydrateRoot>;await act(async()=>{root=hydrateRoot(container,tree(ready()),{onRecoverableError});});expect(onRecoverableError).not.toHaveBeenCalled();act(()=>root.unmount());container.remove();
});
it('HB16-C06 loading never attaches new headings to old monetary values',()=>{
  render(<NextIntlClientProvider locale="en" messages={catalogs.en}><AppThemeProvider><DashboardLoading/></AppThemeProvider></NextIntlClientProvider>);
  expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');expect(screen.queryByText('€0.00')).toBeNull();
});
