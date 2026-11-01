'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Alert, FormControl, InputLabel, Select, Stack } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { setLocale } from '../i18n/actions';
import { locales } from '../i18n/config';

export function Preferences() {
  const t = useTranslations('preferences');
  const locale = useLocale();
  const router = useRouter();
  const { mode, setMode } = useColorScheme();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const id = useId();
  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <FormControl size="small" sx={{ minWidth: 150, flex: 1 }} disabled={pending}>
        <InputLabel htmlFor={`${id}-language`}>{t('language')}</InputLabel>
        <Select native id={`${id}-language`} value={locale} label={t('language')} onChange={(event) => {
          const nextLocale = event.target.value;
          setError(false);
          startTransition(async () => {
            try { await setLocale(nextLocale); router.refresh(); }
            catch { setError(true); }
          });
        }}>{locales.map((value) => <option key={value} value={value}>{t(value)}</option>)}</Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160, flex: 1 }} disabled={!mode}>
        <InputLabel htmlFor={`${id}-theme`}>{t('theme')}</InputLabel>
        <Select native id={`${id}-theme`} value={mode ?? 'system'} label={t('theme')} onChange={(event) => {
          const value = event.target.value;
          if (value === 'light' || value === 'dark' || value === 'system') setMode(value);
        }}>{(['light', 'dark', 'system'] as const).map((value) => <option key={value} value={value}>{t(value)}</option>)}</Select>
      </FormControl>
    </Stack>
    {error && <Alert severity="error">{t('error')}</Alert>}
  </Stack>;
}
