// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import {catalogs} from '@/shared/i18n/catalogs';
const fixtures=vi.hoisted(()=>({state:'CLOSED',version:2}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),redirect:vi.fn()}));
vi.mock('@/app/require-page-owner',()=>({requirePageOwner:vi.fn()}));
vi.mock('@/app/dashboard-account-boundary',()=>({resolveDashboardAccount:async()=>({kind:'ACCOUNT',accountId:'synthetic'})}));
vi.mock('@/app/dashboard-loader',()=>({loadDashboard:async()=>({kind:'READY',period:'2026-10',bank:{balance:'100000',observedDate:'2026-11-04'},budget:{allocated:'0',reserved:'0',savings:'0',free:'0'}})}));
vi.mock('@/app/month-closing-boundary',()=>({monthClosing:{load:async(_scope:unknown,q:{version:number|null})=>({ok:true,value:{state:fixtures.state,period:'2026-10',report:fixtures.state==='CLOSED'?{version:q.version??fixtures.version}:null}})}}));
vi.mock('@/app/months/actions',()=>({loadMonth:vi.fn(),previewClose:vi.fn(),confirmClose:vi.fn(),closeStatus:vi.fn(),readReportChunk:vi.fn(),readReviewPage:vi.fn()}));
vi.mock('next-intl/server',()=>({getLocale:async()=>'en',getTranslations:async()=>((key:string)=>key==='state.CLOSED'?'Closed':key)}));
vi.mock('@/features/dashboard/dashboard-screen',()=>({DashboardScreen:()=> <div>ACTIVE DASHBOARD</div>}));
vi.mock('@/features/month-closing/month-closing-screen',()=>({MonthClosingScreen:({initial}:{initial:{report:{version:number}|null}})=><div>Accepted historical version {initial.report?.version}</div>,MonthClosingReadError:()=> <div>Read error</div>}));
import MonthsPage from '@/app/months/page';
afterEach(cleanup);
it('HB19-Q04 CLOSED composition leads with selected historical version and leaves active distribution collapsed',async()=>{
  fixtures.state='CLOSED';render(<NextIntlClientProvider locale="en" messages={catalogs.en}>{await MonthsPage({searchParams:Promise.resolve({period:'2026-10',version:'1'})})}</NextIntlClientProvider>);
  expect(screen.getByText('Accepted historical version 1')).toBeTruthy();expect(screen.queryByText('ACTIVE DASHBOARD')).toBeNull();expect(document.querySelector('details')?.open).toBe(false);
  expect(document.body.textContent!.indexOf('Accepted historical version')).toBeLessThan(document.body.textContent!.indexOf(catalogs.en.monthClosing.currentAllocation));
});
it('HB19-Q04 nonclosed composition preserves the existing Dashboard surface',async()=>{
  fixtures.state='OPEN';render(<NextIntlClientProvider locale="en" messages={catalogs.en}>{await MonthsPage({searchParams:Promise.resolve({period:'2026-11'})})}</NextIntlClientProvider>);
  expect(screen.getByText('ACTIVE DASHBOARD')).toBeTruthy();expect(document.querySelector('details')).toBeNull();fixtures.state='CLOSED';
});
