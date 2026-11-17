// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Basis, Page, Query, View } from '@/domain/analytics/contracts';
import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import type { AnalyticsActions } from '@/features/analytics/read-analytics';
import { catalogs } from '@/shared/i18n/catalogs';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { id } from './fixtures/checkpoints';

const basis: Basis = {
  schemaVersion: 1,
  accountId: id(),
  indexAnchor: id(),
  indexCut: '2',
  stateAnchor: id(),
  stateCut: '2',
  dayH: '2026-11-16',
  today: '2026-11-16',
  capturedAt: '2026-11-16T12:00:00.000000Z',
  report: null
};
const initialQuery: Query = {
  schemaVersion: 1,
  basis,
  view: 'CHECKPOINTS',
  filters: { from: '2026-09-01', to: '2026-11-16', origin: null, funding: null },
  cursor: null,
  compare: null
};

function emptyPage(query: Query): Page {
  const common = {
    schemaVersion: 1 as const,
    basis,
    query,
    completeness: 'COMPLETE' as const,
    lastCheck: null,
    endBalance: null,
    count: 0,
    next: null
  };
  if (query.view === 'MONTHS') {
    return { ...common, view: 'MONTHS', months: [] };
  }
  if (query.view === 'FUNDING') {
    return {
      ...common,
      view: 'FUNDING',
      groups: [],
      identities: [],
      total: '0',
      totalCount: 0,
      subtotal: '0',
      subtotalCount: 0
    };
  }
  return { ...common, view: 'CHECKPOINTS', checks: [], comparison: null };
}

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn(media => ({
    matches: false,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
});
afterEach(cleanup);

const cases = (['ru', 'de', 'en'] as const).flatMap(locale => (
  (['CHECKPOINTS', 'MONTHS', 'FUNDING'] as const).map(view => ({ locale, view }))
));

it.each(cases)('$locale $view mobile fields use natural flex sizing and retain date filtering on the same basis', async ({ locale, view }) => {
  const actions: AnalyticsActions = {
    open: vi.fn().mockResolvedValue({ ok: true, value: emptyPage(initialQuery) }),
    read: vi.fn(async raw => ({ ok: true as const, value: emptyPage(raw as Query) })),
    choices: vi.fn()
  };
  const messages = catalogs[locale].analytics;
  render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin">
      <AppThemeProvider>
        <AnalyticsScreen actions={actions} />
      </AppThemeProvider>
    </NextIntlClientProvider>
  );
  await screen.findByRole('tabpanel');
  const tabNames: Record<View, string> = {
    CHECKPOINTS: messages.checks,
    MONTHS: messages.months,
    FUNDING: messages.funding
  };
  if (view !== 'CHECKPOINTS') {
    await userEvent.click(screen.getByRole('tab', { name: tabNames[view] }));
    await screen.findByRole('tabpanel');
  }
  const filterGroup = screen.getByRole('group', {
    name: view === 'CHECKPOINTS' ? messages.checkDates : messages.financialMonths
  });
  const from = within(filterGroup).getByLabelText(messages.from);
  const to = within(filterGroup).getByLabelText(messages.to);
  const controls = filterGroup.querySelectorAll('.MuiFormControl-root');
  expect(controls).toHaveLength(view === 'FUNDING' ? 4 : 2);
  for (const control of controls) {
    // jsdom checks the base mobile rule; actual viewport geometry is verified in Chromium.
    const style = getComputedStyle(control);
    expect(style.flexBasis).toBe('auto');
    expect(style.flexGrow).toBe('0');
  }
  expect(from.getAttribute('type')).toBe('date');
  expect(to.getAttribute('type')).toBe('date');
  fireEvent.change(from, { target: { value: '2026-10-01' } });
  fireEvent.change(to, { target: { value: '2026-11-15' } });
  await userEvent.click(within(filterGroup).getByRole('button', { name: messages.apply }));
  await waitFor(() => expect(vi.mocked(actions.read).mock.lastCall?.[0]).toMatchObject({
    basis,
    view,
    filters: { from: '2026-10-01', to: '2026-11-15', origin: null, funding: null },
    cursor: null,
    compare: null
  }));
});
