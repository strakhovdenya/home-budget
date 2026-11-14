import { redirect } from 'next/navigation';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { loadDashboard } from '../dashboard-loader';
import { requirePageOwner } from '../require-page-owner';
import { resolveDashboardAccount } from '../dashboard-account-boundary';
import { monthClosing } from '../month-closing-boundary';
import { MonthClosingScreen,MonthClosingReadError } from '@/features/month-closing/month-closing-screen';
import type { MonthView } from '@/features/month-closing/presentation';
import { loadMonth,previewClose,confirmClose,closeStatus,readReportChunk,readReviewPage } from './actions';
import {ClosedMonthContext} from '@/features/month-closing/closed-month-context';
import {PeriodNavigation} from '@/features/dashboard/period-navigation';
import {Button,Typography} from '@mui/material';
import {getLocale,getTranslations} from 'next-intl/server';
import {formatMonth} from '@/features/dashboard/presentation';

export default async function MonthsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  await requirePageOwner();
  const query=await searchParams??{},view = await loadDashboard(Object.keys(query).some(k=>k!=='period'&&k!=='version')?{invalid:true}:{period:query.period});
  if (view.kind === 'UNAUTHORIZED') redirect('/login');
  const selected=query.version===undefined?null:typeof query.version==='string'&&/^[1-9][0-9]{0,9}$/.test(query.version)?Number(query.version):undefined;
  const account=await resolveDashboardAccount();
  const closing='period'in view&&account.kind==='ACCOUNT'&&selected!==undefined?await monthClosing.load(account.accountId,{period:view.period,version:selected,offset:0,digest:null}):null;
  const month=closing?.ok?closing.value as unknown as MonthView:null,closed=month?.state==='CLOSED'&&!!month.report;
  const current=closed?await loadDashboard({}):view;
  const locale=closed?await getLocale():'',t=closed?await getTranslations('monthClosing'):null;
  const update=closed?await getTranslations('budgetUpdate'):null;
  return <>{closed&&month&&t?<><Typography component="h1" variant="h2">{formatMonth(month.period,locale)} — {t('state.CLOSED')}</Typography><PeriodNavigation period={month.period} base="/months"/><Button component="a" href="/update-budget">{update?.('transitionEntry')}</Button></>:<DashboardScreen view={view} base="/months" />}{closing?.ok&&account.kind==='ACCOUNT'?<MonthClosingScreen key={account.accountId+':'+view.kind+':'+('period'in view?view.period:'')+':'+selected}
    initial={closing.value as unknown as MonthView} actions={{load:loadMonth,preview:previewClose,confirm:confirmClose,status:closeStatus,chunk:readReportChunk,review:readReviewPage}}/>:account.kind==='ACCOUNT'&&'period'in view?<MonthClosingReadError/>:null}{closed?<ClosedMonthContext selected={view} current={current}/>:null}</>;
}
