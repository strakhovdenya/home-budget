import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { AppShell } from '@/features/shell/app-shell';
import { Button, Stack, Typography } from '@mui/material';
import { currentOwner } from '@/infrastructure/auth/auth';
import { logout } from './auth-actions';
import './globals.css';
import { BudgetDraftProvider } from '@/features/budget-updates/budget-draft-provider';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell');
  return { title: 'Home Budget', description: t('metadata') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages, owner, t] = await Promise.all([
    getLocale(), getMessages(), currentOwner(), getTranslations('auth'),
  ]);
  const sessionControl = owner ? <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
    <Typography variant="caption">{t('signedIn')}</Typography>
    <form action={logout}><Button type="submit" size="small">{t('logout')}</Button></form>
  </Stack> : <Typography variant="caption">{t('signedOut')}</Typography>;
  return <html lang={locale} suppressHydrationWarning>
    <body>
      <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="system" modeStorageKey="home-budget-mode" />
      <AppRouterCacheProvider>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Berlin">
          <AppThemeProvider><BudgetDraftProvider key={owner?.id ?? 'anonymous'}><AppShell sessionControl={sessionControl}>{children}</AppShell></BudgetDraftProvider></AppThemeProvider>
        </NextIntlClientProvider>
      </AppRouterCacheProvider>
    </body>
  </html>;
}
