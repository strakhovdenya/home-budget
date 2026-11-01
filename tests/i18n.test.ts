import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslator } from 'next-intl';
import { catalogs } from '../src/shared/i18n/catalogs';
import { localeCookie, resolveLocale } from '../src/shared/i18n/config';
import { setLocale } from '../src/shared/i18n/actions';

const cookie = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => cookie }));
vi.mock('next-intl/server', () => ({ getRequestConfig: (callback: unknown) => callback }));
import request from '../src/shared/i18n/request';

function leaves(value: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'string' ? [[path, child]] : Object.entries(leaves(child, path));
  }));
}

beforeEach(() => vi.clearAllMocks());
describe('HB-005 catalogs and server preferences', () => {
  it.each(['ru', 'de', 'en'] as const)('HBU-004 has complete, valid %s translations', (locale) => {
    const messages = leaves(catalogs[locale]);
    expect(Object.keys(messages).sort()).toEqual(Object.keys(leaves(catalogs.ru)).sort());
    const onError = vi.fn();
    const translate = createTranslator({ locale, messages: catalogs[locale], onError });
    for (const [key, value] of Object.entries(messages)) {
      expect(value.trim()).not.toBe('');
      expect(translate(key as Parameters<typeof translate>[0])).toBe(value);
    }
    expect(onError).not.toHaveBeenCalled();
  });

  it.each(['ru', 'de', 'en'] as const)('HBU-002 saves and reads %s in the next server request', async (locale) => {
    await setLocale(locale);
    expect(cookie.set).toHaveBeenCalledWith(localeCookie, locale, expect.objectContaining({ path: '/', maxAge: 31536000, httpOnly: true, sameSite: 'lax' }));
    cookie.get.mockReturnValue({ value: cookie.set.mock.calls[0][1] });
    const config = await request({ requestLocale: Promise.resolve(undefined) });
    expect(config.locale).toBe(locale);
    expect(config.messages).toEqual(catalogs[locale]);
    expect(config.timeZone).toBe('Europe/Berlin');
  });

  it('HBU-002 rejects unsupported writes and defaults missing or invalid cookies to Russian', async () => {
    await expect(setLocale('fr')).rejects.toThrow('Unsupported locale');
    expect(cookie.set).not.toHaveBeenCalled();
    expect(resolveLocale(undefined)).toBe('ru');
    cookie.get.mockReturnValue({ value: '../../en' });
    const config = await request({ requestLocale: Promise.resolve(undefined) });
    expect(config.locale).toBe('ru');
  });
});
