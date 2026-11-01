export const locales = ['ru', 'de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = 'home-budget-locale';

export function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale === value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : 'ru';
}
