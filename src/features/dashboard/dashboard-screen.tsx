'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Box, Button, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import type { DashboardView } from './presentation';
import { formatCalendarDate, formatMonth } from './presentation';
import { formatMoney } from './format-money';
import { PeriodNavigation } from './period-navigation';

const amountStyle = { fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', minWidth: 0 } as const;
function Metric({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <Box sx={{ minWidth: 0 }}><Typography component="dt" color="text.secondary">{label}</Typography>
    <Typography component="dd" sx={{ ...amountStyle, m: 0, mt: 0.5, fontSize: prominent ? 'clamp(1.7rem, 5vw, 2.7rem)' : '1.35rem', fontWeight: 650 }}>{value}</Typography></Box>;
}
export function DashboardLoading() {
  const t = useTranslations('dashboard');
  return <Stack role="status" aria-busy="true" spacing={3}><Typography>{t('loading')}</Typography><Skeleton aria-hidden="true" variant="rounded" height={180} animation={false} /><Skeleton aria-hidden="true" variant="rounded" height={120} animation={false} /></Stack>;
}
export function DashboardScreen({ view, base = '/' }: { view: DashboardView; base?: '/' | '/months' }) {
  const t = useTranslations('dashboard'), nav = useTranslations('navigation'), locale = useLocale();
  const update = useTranslations('budgetUpdate');
  const money = (c: string) => formatMoney(c, locale), date = (d: string) => formatCalendarDate(d, locale);
  const hasPeriod = view.kind === 'READY' || view.kind === 'UNAVAILABLE';
  return <Stack spacing={3} sx={{ minWidth: 0 }}>
    <Box><Typography variant="overline" color="text.secondary">{t('eyebrow')}</Typography><Typography component="h1" variant="h1">{nav(base === '/' ? 'overview' : 'months')}</Typography></Box>
    {view.kind==='READY'||view.kind==='UNAVAILABLE'?<Button component={Link} prefetch={false} href="/update-budget" variant="contained" sx={{alignSelf:'flex-start'}}>{update('title')}</Button>:null}
    {hasPeriod ? <>
      <Stack spacing={1}>
        <Box role="status" aria-live="polite" aria-atomic="true"><Typography component="h2" variant="h2">{formatMonth(view.period, locale)}</Typography></Box>
        {view.kind === 'READY' ? <Chip label={t(`mode.${view.mode}`)} variant="outlined" sx={{ alignSelf: 'flex-start', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }} /> : null}
      </Stack>
      <PeriodNavigation key={view.period} period={view.period} base={base} />
      <Typography variant="body2" color="text.secondary">{t('asOf', { date: date(view.asOfDate) })}</Typography>
    </> : null}
    {hasPeriod && view.bank ? <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Box component="dl" sx={{ m: 0 }}><Metric label={t('bank')} value={money(view.bank.balance)} prominent /></Box>
      <Typography sx={{ mt: 1 }}>{t('observed', { date: date(view.bank.observedDate) })}</Typography>
      <Typography color="text.secondary" variant="body2">{t(view.kind === 'READY' && view.mode === 'CURRENT' ? 'bankBasis' : 'bankNoncurrent')}</Typography>
    </Paper> : null}
    {view.kind === 'READY' ? <>
      {view.safe ? <Paper component="section" aria-labelledby="safe-heading" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderColor: 'primary.main', borderWidth: 2, minWidth: 0 }}>
        <Typography id="safe-heading" component="h2" variant="h3">{t('safeTitle', { date: date(view.bank.observedDate) })}</Typography>
        <Box component="dl" sx={{ m: 0, mt: 2, display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(2,minmax(0,1fr))' } }}>
          <Metric label={t('safeDaily')} value={money(view.safe.safeDailyLimit)} prominent /><Metric label={t('safeAvailable')} value={money(view.safe.safeAvailable)} />
        </Box><Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>{t('days', { count: view.safe.days })}</Typography>
      </Paper> : null}
      <Paper component="section" aria-labelledby="budget-heading" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
        <Typography id="budget-heading" component="h2" variant="h3">{t('budgetTitle')}</Typography>
        <Box component="dl" sx={{ m: 0, mt: 2, display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' } }}>
          {(['allocated', 'free', 'reserved', 'savings', 'deficit'] as const).map(k => <Metric key={k} label={t(k)} value={money(view.budget[k])} />)}
          {view.budget.ordinary.kind === 'BUDGET_ESTIMATE' ? <Metric label={t(view.mode === 'FUTURE' ? 'futureGuideline' : 'ordinary')} value={money(view.budget.ordinary.ordinaryGuideline)} /> : null}
        </Box>
        <Typography color="text.secondary" sx={{ mt: 2 }}>{t(view.mode === 'CURRENT' ? 'ordinaryBasis' : view.mode === 'FUTURE' ? 'futureBasis' : 'pastBasis')}</Typography>
      </Paper>
      <Stack component="section" aria-label={t('noticesTitle')} spacing={2}>
        {view.freshness.notices.map(n => <Paper key={n} variant="outlined" sx={{ p: 2 }}><Typography>{t(`notice.${n}`)}</Typography></Paper>)}
        {view.safe?.coverageGroups.map(g => <Paper key={g.amount} variant="outlined" sx={{ p: 2, borderColor: 'warning.main' }}>
          <Typography sx={amountStyle}>{t('shortage', { amount: money(g.amount) })}</Typography>
          <Box component="ul" sx={{ mb: 0, pl: 2.5 }}>{g.meanings.map(m => <Typography component="li" key={m}>{t(`meaning.${m}`)}</Typography>)}</Box>
        </Paper>)}
        {view.safe && view.safe.coverageGroups.length > 1 ? <Typography>{t('nonAdditive')}</Typography> : null}
        {view.safe?.budgetExplanation ? <Typography>{t('budgetGap')}</Typography> : null}
      </Stack>
    </> : view.kind === 'UNAVAILABLE' ? <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography component="h2" variant="h3">{t(`unavailable.${view.reason}`)}</Typography>
      <Typography sx={{ mt: 1 }}>{t('noEstimate')}</Typography>
      {view.known.length ? <><Typography sx={{ mt: 2 }}>{t('known')}</Typography><Box component="ul" sx={{ pl: 2.5 }}>
        {view.known.map((e, i) => <Typography component="li" key={i} sx={amountStyle}>{e.title} — {t(e.type)} ({formatMonth(e.period, locale)}): {money(e.amount)}</Typography>)}
      </Box></> : null}
    </Paper> : <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography component="h2" variant="h3">{t(`state.${view.kind}`)}</Typography>
      <Typography sx={{ mt: 1 }}>{t('readOnly')}</Typography>
      <Button component={Link} prefetch={false} href={base} sx={{ mt: 2 }}>{t('retry')}</Button>
    </Paper>}
  </Stack>;
}
