'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Stack, Typography } from '@mui/material';

export function NotFoundScreen() {
  const t = useTranslations('notFound');
  return <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
    <Typography component="h1" variant="h1">{t('title')}</Typography>
    <Typography color="text.secondary">{t('description')}</Typography>
    <Button component={Link} href="/" variant="contained">{t('back')}</Button>
  </Stack>;
}
