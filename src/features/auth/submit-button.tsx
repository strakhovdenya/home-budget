'use client';

import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import Button from '@mui/material/Button';

export function LoginSubmitButton({ available }: { available: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');
  return <Button type="submit" variant="contained" disabled={!available || pending} loading={pending} fullWidth aria-live="polite" sx={{ touchAction: 'manipulation' }}>
    {pending ? t('pending') : t('login')}
  </Button>;
}
