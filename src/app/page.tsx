import { redirect } from 'next/navigation';
import {FirstRunScreen} from '@/features/onboarding/first-run-screen';
import {previewFirstBudget,confirmFirstBudget,firstBudgetStatus} from './onboarding/actions';
import {berlinDateFromEpochMilliseconds} from '@/shared/pure/berlin-date';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { loadDashboard } from './dashboard-loader';
import { requirePageOwner } from './require-page-owner';

export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const owner=await requirePageOwner();
  const view = await loadDashboard(await searchParams ?? {});
  if (view.kind === 'UNAUTHORIZED') redirect('/login');
  if(view.kind==='NO_ACCOUNT'){const day=berlinDateFromEpochMilliseconds(Date.now());if(day.ok)return <FirstRunScreen key={owner.id} today={day.value} actions={{preview:previewFirstBudget,confirm:confirmFirstBudget,status:firstBudgetStatus}}/>;}
  if('period'in view&&view.period<view.asOfDate.slice(0,7))redirect('/months?period='+view.period);
  return <DashboardScreen view={view} />;
}
