'use client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/features/dashboard/format-money';
import { formatCalendarDate, formatMonth } from '@/features/dashboard/presentation';

type Item={title:string;fundingPeriodId:string;originalCents?:string;outstandingCents?:string;amountCents?:string;status:string;reserveFull?:boolean};
type Period={period:string;allocated:string;reserved:string;savings:string;free:string;deficit:string};
type State={kind:string;bank?:{balanceCents:string;observedDate:string};periods?:Period[];identities?:{title:string;origin:string;funding:string;status:string;amount:string}[]};
export type BudgetReviewData={financial:{asOfDate?:string;effectiveDate:string;bank:{balanceCents:string;observedDate:string};allocations:{period:string;amountCents:string}[];
  fundingPeriods:{id:string;period:string}[];projection:{bank?:{balance:string;observedDate:string};periods?:Period[];
    safe?:{safeAvailable:string;safeDailyLimit:string;coverageGroups:{amount:string;meanings:string[]}[]};freshness?:{showReminder:boolean;ageDays:number}};
  obligations:{action:string;before:Item|null;after:Item;payment:{amountCents:string;source:string;unchangedBalanceAcknowledged:boolean}|null}[];
  savings:{action:string;before:Item|null;after:Item;confirmedIncreaseAmount:string|null;confirmedReleasedAmount:string|null}[]};
  presentation?:{schemaVersion:number;effectiveDate:string;before:State;after:State};reportImpact?:unknown[]};
export function BudgetReview({review}:{review:BudgetReviewData}){
  const t=useTranslations('budgetUpdate'),d=useTranslations('dashboard'),locale=useLocale(),f=review.financial;
  const m=(c:string)=>formatMoney(c,locale),date=(s:string)=>formatCalendarDate(s,locale);
  const historical=!!f.asOfDate&&f.effectiveDate.slice(0,7)<f.asOfDate.slice(0,7);
  const periods=(values:Period[])=>values.map(p=><Box component="dl" key={p.period} sx={{m:0,p:2,border:1,borderColor:'divider',borderRadius:1,minWidth:0}}>
    <Typography component="dt" sx={{fontWeight:700}}>{formatMonth(p.period,locale)}</Typography>
    {(['allocated','reserved','savings','free','deficit'] as const).map(k=><Box key={k} sx={{display:'flex',gap:2,justifyContent:'space-between',flexWrap:'wrap'}}>
      <Typography component="dt">{t(k)}</Typography><Typography component="dd" sx={{m:0,fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere'}}>{m(p[k])}</Typography>
    </Box>)}</Box>);
  return <Stack spacing={2}>
    <Box component="section" aria-label={t('proposedState')} sx={{p:2,border:1,borderColor:'primary.main',borderRadius:1,minWidth:0}}>
      <Typography component="h3" variant="h5">{t('proposedState')}</Typography>
      <Typography>{t('bank')}: {m(f.bank.balanceCents)} · {date(f.bank.observedDate)}</Typography>
      <Typography>{t('effectiveDate')}: {date(f.effectiveDate)}</Typography>
      {f.allocations.map(a=><Typography key={a.period}>{formatMonth(a.period,locale)} — {t('allocated')}: {m(a.amountCents)}</Typography>)}
      {review.presentation?(['before','after'] as const).map(key=>{const state=review.presentation![key];return <Box component="section" key={key} sx={{mt:2}}>
        <Typography component="h4" variant="h6">{t(key)}</Typography>
        {state.bank?<Typography>{t('bank')}: {m(state.bank.balanceCents)} · {date(state.bank.observedDate)}</Typography>:<Typography>{t('stateUnavailable')}</Typography>}
        {periods(state.periods??[])}
        {state.identities?.map((i,n)=><Typography key={n} sx={{overflowWrap:'anywhere'}}>{i.title} — {m(i.amount)} · {t('originPeriod')}: {formatMonth(i.origin,locale)} · {t('fundingPeriod')}: {formatMonth(i.funding,locale)} · {t('status.'+i.status)}</Typography>)}
      </Box>;}):null}
    </Box>
    <Box component="section" aria-label={t('currentGuidance')} sx={{p:2,border:1,borderColor:'divider',borderRadius:1,minWidth:0}}>
      <Typography component="h3" variant="h6">{t('currentGuidance')}</Typography>
      {historical?<Typography>{t('historicalSeparate')}</Typography>:null}
      {f.projection.bank?<Typography>{t('currentBasis',{amount:m(f.projection.bank.balance),date:date(f.projection.bank.observedDate)})}</Typography>:null}
      {f.projection.safe?<><Typography>{t('safeDaily')}: {m(f.projection.safe.safeDailyLimit)}</Typography><Typography>{t('safeAvailable')}: {m(f.projection.safe.safeAvailable)}</Typography></>:null}
      {f.projection.safe?.coverageGroups.map(g=><Alert key={g.amount} severity="warning"><Typography>{d('shortage',{amount:m(g.amount)})}</Typography>{g.meanings.map(meaning=><Typography key={meaning}>{d('meaning.'+meaning)}</Typography>)}</Alert>)}
      {f.projection.safe&&f.projection.safe.coverageGroups.length>1?<Typography>{d('nonAdditive')}</Typography>:null}
      {f.projection.freshness?.ageDays?<Alert severity="info">{t('oldData')}{f.projection.freshness.showReminder?' '+t('reminder'):''}</Alert>:null}
      {!review.presentation?periods(f.projection.periods??[]):null}
    </Box>
    {(review.reportImpact?.length??0)>0?<Alert severity="info">{t('reportImpact')}</Alert>:null}
    {[...f.obligations,...f.savings].map((e,i)=><Box key={i} sx={{p:2,border:1,borderColor:'divider',borderRadius:1,overflowWrap:'anywhere'}}>
      <Typography sx={{fontWeight:700}}>{e.after.title}: {t('action.'+e.action)}</Typography>
      {(['before','after'] as const).map(key=>{const s=e[key];return <Box key={key}><Typography>{t(key)}</Typography>{s?<>
        <Typography>{t('fundingPeriod')}: {f.fundingPeriods.some(p=>p.id===s.fundingPeriodId)?formatMonth(f.fundingPeriods.find(p=>p.id===s.fundingPeriodId)!.period,locale):'—'}</Typography><Typography>{t('itemStatus')}: {t('status.'+s.status)}</Typography>
        {s.originalCents!==undefined?<Typography>{t('originalAmount')}: {m(s.originalCents)}</Typography>:null}
        {s.outstandingCents!==undefined?<Typography>{t('outstandingAmount')}: {m(s.outstandingCents)}</Typography>:null}
        {s.amountCents!==undefined?<Typography>{t('amount')}: {m(s.amountCents)}</Typography>:null}
        {s.reserveFull!==undefined?<Typography>{t('reserveFull')}: {t(s.reserveFull?'yes':'no')}</Typography>:null}
      </>:<Typography>—</Typography>}</Box>;})}
      {'payment'in e&&e.payment?<><Typography>{t('paymentAmount')}: {m(e.payment.amountCents)}</Typography><Typography>{t('paymentSource')}: {t(e.payment.source==='TRACKED_CARD'?'trackedCard':'outsideCard')}</Typography><Typography>{t('unchangedConsent')}: {t(e.payment.unchangedBalanceAcknowledged?'yes':'no')}</Typography></>:null}
      {'confirmedReleasedAmount'in e&&e.confirmedReleasedAmount!==null?<Typography>{t('releasedAmount')}: {m(e.confirmedReleasedAmount)}</Typography>:null}
      {'confirmedIncreaseAmount'in e&&e.confirmedIncreaseAmount!==null?<Typography>{t('increasedAmount')}: {m(e.confirmedIncreaseAmount)}</Typography>:null}
    </Box>)}
    <Typography variant="body2">{t('nonPosting')}</Typography>
  </Stack>;
}
