// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppThemeProvider } from '../src/shared/ui/app-theme-provider';
import { Preferences } from '../src/shared/ui/preferences';
import { AppShell } from '../src/features/shell/app-shell';
import { PlaceholderScreen } from '../src/features/shell/placeholder-screen';
import { catalogs } from '../src/shared/i18n/catalogs';
import { sections } from '../src/features/shell/sections';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { NotFoundScreen } from '../src/features/shell/not-found-screen';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), setLocale: vi.fn(), path: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.path, useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('../src/shared/i18n/actions', () => ({ setLocale: mocks.setLocale }));

let dark = false;
const listeners = new Set<(event: MediaQueryListEvent) => void>();
beforeEach(() => {
  localStorage.clear(); dark = false; listeners.clear(); vi.clearAllMocks(); mocks.path = '/';
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && dark, media: query, onchange: null,
    addListener: (cb: (event: MediaQueryListEvent) => void) => { listeners.add(cb); },
    removeListener: (cb: (event: MediaQueryListEvent) => void) => { listeners.delete(cb); },
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
});
afterEach(cleanup);

function mount(locale: keyof typeof catalogs = 'ru', section: 'overview' | 'settings' = 'overview') {
  return render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin">
    <AppThemeProvider><AppShell><PlaceholderScreen section={section} /></AppShell></AppThemeProvider>
  </NextIntlClientProvider>);
}

describe('HB-005 shell', () => {
  it.each(['ru', 'de', 'en'] as const)('HBU-004 localizes the %s not-found screen', (locale) => {
    render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]}><AppThemeProvider><NotFoundScreen /></AppThemeProvider></NextIntlClientProvider>);
    expect(screen.getByRole('heading', { level: 1, name: catalogs[locale].notFound.title })).toBeTruthy();
    expect(screen.getByRole('link', { name: catalogs[locale].notFound.back }).getAttribute('href')).toBe('/');
  });
  it('HBU-003 hydrates server markup with a saved dark preference without recoverable errors', async () => {
    localStorage.setItem('home-budget-mode', 'dark');
    const tree = <NextIntlClientProvider locale="ru" messages={catalogs.ru} timeZone="Europe/Berlin">
      <AppThemeProvider><AppShell><PlaceholderScreen section="overview" /></AppShell></AppThemeProvider>
    </NextIntlClientProvider>;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, tree, { onRecoverableError }); });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute('data-mui-color-scheme')).toBe('dark');
    act(() => root.unmount());
    container.remove();
  });
  it.each(['ru', 'de', 'en'] as const)('HBU-001/004 renders %s labels, navigation and unavailable states', (locale) => {
    mount(locale);
    const messages = catalogs[locale];
    expect(screen.getByRole('heading', { level: 1, name: messages.navigation.overview })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: messages.shell.navigation });
    expect(within(nav).getAllByRole('link')).toHaveLength(5);
    expect(within(nav).getByRole('link', { name: messages.navigation.overview }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText(messages.screens.overview.description)).toBeTruthy();
    expect(screen.getByRole('combobox', { name: messages.preferences.language })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: messages.preferences.theme })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /обновить бюджет/i })).toBeNull();
  });

  it('HBU-002 selects locale and refreshes the current route after saving', async () => {
    mount();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: catalogs.ru.preferences.language }), 'de');
    expect(mocks.setLocale).toHaveBeenCalledWith('de');
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it('HBU-002 reports a failed locale save without refreshing', async () => {
    mocks.setLocale.mockRejectedValueOnce(new Error('network'));
    mount();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: catalogs.ru.preferences.language }), 'en');
    expect(await screen.findByText(catalogs.ru.preferences.error)).toBeTruthy();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each(sections)('HBU-001 renders the %s screen in every locale without translation errors', (section) => {
    const onError = vi.fn();
    for (const locale of ['ru', 'de', 'en'] as const) {
      const view = render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]} onError={onError} timeZone="Europe/Berlin">
        <AppThemeProvider><PlaceholderScreen section={section} /></AppThemeProvider>
      </NextIntlClientProvider>);
      expect(screen.getByRole('heading', { level: 1, name: catalogs[locale].navigation[section] })).toBeTruthy();
      view.unmount();
    }
    expect(onError).not.toHaveBeenCalled();
  });

  it('HBU-003 switches and restores all three MUI modes and follows live system changes', async () => {
    const first = mount();
    for (const mode of ['dark', 'light', 'system']) {
      await userEvent.selectOptions(screen.getByRole('combobox', { name: catalogs.ru.preferences.theme }), mode);
      expect(localStorage.getItem('home-budget-mode')).toBe(mode);
      if (mode !== 'system') expect(document.documentElement.getAttribute('data-mui-color-scheme')).toBe(mode);
    }
    act(() => { dark = true; listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent)); });
    expect(document.documentElement.getAttribute('data-mui-color-scheme')).toBe('dark');
    expect((screen.getByRole('combobox', { name: catalogs.ru.preferences.theme }) as HTMLSelectElement).value).toBe('system');
    act(() => { dark = false; listeners.forEach((cb) => cb({ matches: false } as MediaQueryListEvent)); });
    expect(document.documentElement.getAttribute('data-mui-color-scheme')).toBe('light');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: catalogs.ru.preferences.theme }), 'dark');
    first.unmount(); mount();
    expect((screen.getByRole('combobox', { name: catalogs.ru.preferences.theme }) as HTMLSelectElement).value).toBe('dark');
  });

  it('HBU-005 offers a keyboard skip link followed by all five navigation links', async () => {
    mount();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: catalogs.ru.shell.skip }));
    expect(document.activeElement?.getAttribute('href')).toBe('#main-content');
    const links = within(screen.getByRole('navigation', { name: catalogs.ru.shell.navigation })).getAllByRole('link');
    for (const link of links) {
      await userEvent.tab();
      expect(document.activeElement).toBe(link);
    }
  });

  it('HBU-005 opens accessible mobile navigation and closes it with Escape', async () => {
    mount();
    const trigger = screen.getByRole('button', { name: catalogs.ru.shell.openMenu });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: catalogs.ru.shell.navigation });
    expect(within(dialog).getAllByRole('link')).toHaveLength(5);
    expect(within(dialog).getByRole('button', { name: catalogs.ru.shell.closeMenu })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('HBU-001 renders functional preferences on Settings', () => {
    render(<NextIntlClientProvider locale="en" messages={catalogs.en}><AppThemeProvider><Preferences /></AppThemeProvider></NextIntlClientProvider>);
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeTruthy();
  });
});
