import { redirect } from 'next/navigation';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { loadDashboard } from '../dashboard-loader';
import { requirePageOwner } from '../require-page-owner';

export default async function MonthsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  await requirePageOwner();
  const view = await loadDashboard(await searchParams ?? {});
  if (view.kind === 'UNAUTHORIZED') redirect('/login');
  return <DashboardScreen view={view} base="/months" />;
}
