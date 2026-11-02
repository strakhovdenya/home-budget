import { Alert, Paper, Stack, Typography } from '@mui/material';
import { LoginSubmitButton } from '@/features/auth/submit-button';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { currentOwner } from '@/infrastructure/auth/auth';
import { authEnvironment } from '@/infrastructure/auth/policy';
import { login } from '../auth-actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentOwner()) redirect('/');
  const t = await getTranslations('auth');
  const enabled = Boolean(authEnvironment(process.env));
  const { error } = await searchParams;
  return <Paper variant="outlined" sx={{ maxWidth: 480, mx: 'auto', p: { xs: 3, sm: 5 } }}>
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" sx={{ textWrap: 'balance' }}>{t('title')}</Typography>
      <Typography color="text.secondary">{t('description')}</Typography>
      {!enabled && <Alert severity="info">{t('unavailable')}</Alert>}
      {error && <Alert severity="error">{t('error')}</Alert>}
      <form action={login}><LoginSubmitButton available={enabled} /></form>
    </Stack>
  </Paper>;
}
