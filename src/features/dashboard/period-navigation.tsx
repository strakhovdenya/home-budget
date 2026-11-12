'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Box, Button, FormControl, InputLabel, Select, Stack, TextField, Typography } from '@mui/material';
import { adjacentPeriod, formatMonth, periodHref } from './presentation';

export function PeriodNavigation({ period, base,disabled=false }: { period: string; base: '/' | '/months' | '/obligations';disabled?:boolean }) {
  const t = useTranslations('periodNavigation'), locale = useLocale(), router = useRouter(), id = useId();
  const [month, setMonth] = useState(period.slice(5)), [year, setYear] = useState(period.slice(0, 4));
  const [pending, startTransition] = useTransition();
  const prev = adjacentPeriod(period, -1), next = adjacentPeriod(period, 1);
  return <Box component="nav" aria-label={t('label')} aria-busy={pending}>
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {prev ? <Button component={Link} disabled={disabled||pending} prefetch={false} href={periodHref(base, prev)} aria-label={t('previous', { month: formatMonth(prev, locale) })}>← {t('previousShort')}</Button> : <Button disabled aria-label={t('lowerBoundary')}>←</Button>}
        {next ? <Button component={Link} disabled={disabled||pending} prefetch={false} href={periodHref(base, next)} aria-label={t('next', { month: formatMonth(next, locale) })}>{t('nextShort')} →</Button> : <Button disabled aria-label={t('upperBoundary')}>→</Button>}
        <Button component={Link} disabled={disabled||pending} prefetch={false} href={base}>{t('current')}</Button>
      </Stack>
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} action={base} method="get" onSubmit={event => {
        event.preventDefault();
        if(disabled||pending)return;
        if (!/^[0-9]{1,4}$/.test(year) || Number(year) < 1 || Number(year) > 9999) return;
        startTransition(() => router.push(periodHref(base, `${year.padStart(4, '0')}-${month}`)));
      }} sx={{ alignItems: { sm: 'center' } }}>
        <input type="hidden" name="period" value={`${year.padStart(4, '0')}-${month}`} />
        <FormControl size="small" sx={{ minWidth: { sm: 180 } }} disabled={pending||disabled}>
          <InputLabel htmlFor={`${id}-month`}>{t('month')}</InputLabel>
          <Select native id={`${id}-month`} label={t('month')} value={month} onChange={e => setMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'Europe/Berlin' }).format(new Date(`2000-${m}-01T12:00:00Z`))}</option>)}
          </Select>
        </FormControl>
        <TextField id={`${id}-year`} label={t('year')} size="small" type="number" value={year} onChange={e => setYear(e.target.value)} required disabled={pending||disabled}
          slotProps={{ htmlInput: { min: 1, max: 9999, step: 1, inputMode: 'numeric', style: { minHeight: 44, boxSizing: 'border-box' } } }} sx={{ width: { sm: 120 } }} />
        <Button type="submit" variant="outlined" disabled={pending||disabled}>{t('show')}</Button>
      </Stack>
      {pending ? <Typography role="status">{t('loading')}</Typography> : null}
    </Stack>
  </Box>;
}
