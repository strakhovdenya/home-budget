'use server';

import { cookies } from 'next/headers';
import { isLocale, localeCookie } from './config';

export async function setLocale(locale: string) {
  if (!isLocale(locale)) throw new Error('Unsupported locale');
  (await cookies()).set(localeCookie, locale, {
    path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}
