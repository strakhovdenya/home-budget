import { Alert, Typography } from '@mui/material';
import { getTranslations } from 'next-intl/server';
import { requirePageOwner } from './require-page-owner';
import { resolveDashboardAccount } from './dashboard-account-boundary';
import { management } from './management-boundary';
import { ManagementScreen } from '@/features/management/management-screen';
import { RetryManagementLoad } from '@/features/management/retry-load';
import type { ManagementKind } from '@/domain/management/contracts';
import { loadManagement, loadManagementHistory, proposeRelease } from './obligations/actions';
export async function ManagementPage({ kind }: { kind: ManagementKind }) {
  await requirePageOwner(); const a=await resolveDashboardAccount(),t=await getTranslations('dashboard'),m=await getTranslations('management');
  const heading=<Typography component="h1" variant="h1">{m(kind==='OBLIGATION'?'obligations':'savings')}</Typography>;
  if(a.kind!=='ACCOUNT')return <>{heading}<Alert severity="info">{t(`state.${a.kind}`)}</Alert></>;
  const result=await management.list(a.accountId);
  if(!result.ok)return <>{heading}<Alert severity="error">{m('error')}<RetryManagementLoad/></Alert></>;
  return <ManagementScreen key={result.value.scopeKey} initial={result.value} kind={kind} actions={{load:loadManagement,history:loadManagementHistory,propose:proposeRelease}}/>;
}
