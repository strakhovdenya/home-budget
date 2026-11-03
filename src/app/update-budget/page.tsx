import { Alert, Typography } from '@mui/material';
import { getTranslations } from 'next-intl/server';
import { requirePageOwner } from '../require-page-owner';
import { resolveDashboardAccount } from '../dashboard-account-boundary';
import { UpdateBudgetScreen } from '@/features/budget-updates/update-budget-screen';
import type { UpdateSeed } from '@/features/budget-updates/presentation';
import { loadBudgetDraft,previewBudgetUpdate,confirmBudgetUpdate,budgetUpdateStatus,budgetUpdateHistory } from './actions';

export default async function UpdateBudgetPage(){
  await requirePageOwner();const account=await resolveDashboardAccount(),t=await getTranslations('dashboard'),u=await getTranslations('budgetUpdate');
  if(account.kind!=='ACCOUNT')return <><Typography component="h1" variant="h1">{u('title')}</Typography><Alert severity="info"><Typography>{t(`state.${account.kind}`)}</Typography></Alert></>;
  const seed=await loadBudgetDraft();if(!seed.ok)return <><Typography component="h1" variant="h1">{u('title')}</Typography><Alert severity="error">{t('state.STORAGE_ERROR')}</Alert></>;
  return <UpdateBudgetScreen initialSeed={seed.value as unknown as UpdateSeed} actions={{load:loadBudgetDraft,preview:previewBudgetUpdate,
    confirm:confirmBudgetUpdate,status:budgetUpdateStatus,history:budgetUpdateHistory}}/>;
}
