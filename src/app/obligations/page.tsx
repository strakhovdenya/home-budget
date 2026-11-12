import { ManagementPage } from '../management-page';
import { requirePageOwner } from '../require-page-owner';
import {TemplateScreen} from '@/features/recurring/template-screen';
import {berlinDateFromEpochMilliseconds} from '@/shared/pure/berlin-date';
import {parseDashboardQuery} from '@/features/dashboard/presentation';
import {Alert} from '@mui/material';
import {getTranslations} from 'next-intl/server';
import {loadTemplates,confirmTemplateCommand,templateCommandStatus} from './template-actions';

export default async function ObligationsPage({searchParams}:{searchParams?:Promise<Record<string,unknown>>}={}) {
  const owner=await requirePageOwner();
  const today=berlinDateFromEpochMilliseconds(Date.now());
  if(!today.ok)return <ManagementPage kind="OBLIGATION"/>;
  const query=parseDashboardQuery(await searchParams??{});
  if(!query.ok){const t=await getTranslations('recurring');return <><ManagementPage kind="OBLIGATION"/><Alert severity="error">{t('invalidPeriod')}</Alert></>;}
  const initial=await loadTemplates(query.value??today.value.slice(0,7));
  return <><ManagementPage kind="OBLIGATION"/><TemplateScreen key={owner.id} today={today.value} initial={initial} actions={{load:loadTemplates,commit:confirmTemplateCommand,status:templateCommandStatus}}/></>;
}
