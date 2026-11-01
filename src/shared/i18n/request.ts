import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { catalogs } from './catalogs';
import { localeCookie, resolveLocale } from './config';

export default getRequestConfig(async () => {
  const locale = resolveLocale((await cookies()).get(localeCookie)?.value);
  return { locale, messages: catalogs[locale], timeZone: 'Europe/Berlin' };
});
