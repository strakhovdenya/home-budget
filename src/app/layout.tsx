import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { AppShell } from '@/features/shell/app-shell';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell');
  return { title: 'Home Budget', description: t('metadata') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return <html lang={locale} suppressHydrationWarning>
    <body>
      <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="system" modeStorageKey="home-budget-mode" />
      <AppRouterCacheProvider>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Berlin">
          <AppThemeProvider><AppShell>{children}</AppShell></AppThemeProvider>
        </NextIntlClientProvider>
      </AppRouterCacheProvider>
    </body>
  </html>;
}
