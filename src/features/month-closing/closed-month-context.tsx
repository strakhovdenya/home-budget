'use client';
import {Box,Typography} from '@mui/material';
import {useLocale,useTranslations} from 'next-intl';
import type {DashboardView} from '@/features/dashboard/presentation';
import {formatCalendarDate,formatMonth} from '@/features/dashboard/presentation';
import {formatMoney} from '@/features/dashboard/format-money';

/** Existing active projections remain a distinct, initially collapsed context.
 * The selected immutable report is rendered separately and is never rebased. */
export function ClosedMonthContext({selected,current}:{selected:DashboardView;current:DashboardView}){
  const t=useTranslations('monthClosing'),d=useTranslations('dashboard'),locale=useLocale();
  return <><Box component="section" sx={{mt:3,p:2,minWidth:0}}>
    {current.kind==='READY'?<Typography variant="body2">{t('currentAnchor',{amount:formatMoney(current.bank.balance,locale),date:formatCalendarDate(current.bank.observedDate,locale)})}</Typography>:<Typography>{t('currentUnavailable')}</Typography>}
    <Typography variant="body2">{d('bankNoncurrent')}</Typography>
  </Box><Box component="details" sx={{mt:3,p:2,border:1,borderColor:'divider',borderRadius:1,minWidth:0}}>
    <Box component="summary" sx={{cursor:'pointer'}}>{t('currentAllocation')}</Box>
    <Typography>{t('currentNotHistorical')}</Typography>
    {current.kind==='READY'?<Typography>{t('currentAnchor',{amount:formatMoney(current.bank.balance,locale),date:formatCalendarDate(current.bank.observedDate,locale)})}</Typography>:<Typography>{t('currentUnavailable')}</Typography>}
    {[selected,current].filter((v,i,a)=>v.kind==='READY'&&a.findIndex(x=>x.kind==='READY'&&x.period===v.period)===i).map((v,i)=>v.kind==='READY'?<Box key={i} component="section" sx={{mt:2}}>
      <Typography component="h3" variant="h6">{formatMonth(v.period,locale)}</Typography>
      <Typography variant="body2">{t('currentAnchor',{amount:formatMoney(v.bank.balance,locale),date:formatCalendarDate(v.bank.observedDate,locale)})}</Typography>
      <Box component="dl" sx={{m:0}}>{(['allocated','reserved','savings','free'] as const).map(k=><Box key={k} sx={{display:'flex',gap:2,flexWrap:'wrap',justifyContent:'space-between'}}><Typography component="dt">{d(k)}</Typography><Typography component="dd" sx={{m:0}}>{formatMoney(v.budget[k],locale)}</Typography></Box>)}</Box>
    </Box>:null)}
  </Box></>;
}
