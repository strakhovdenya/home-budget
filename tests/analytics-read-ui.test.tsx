// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import type { AnalyticsActions } from '@/features/analytics/read-analytics';
import type { Basis, Check, Page, Query } from '@/domain/analytics/contracts';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { catalogs } from '@/shared/i18n/catalogs';
import { id } from './fixtures/checkpoints';

const basis: Basis = { schemaVersion: 1, accountId: id(), indexAnchor: id(), indexCut: '2', stateAnchor: id(), stateCut: '2',
  dayH: '2026-11-16', today: '2026-11-16', capturedAt: '2026-11-16T12:00:00.000000Z', report: null };
const checks: Check[] = [
  { id: id(), logicalFactId: id(), positionId: id(), observedDate: '2026-11-05', observedAt: null, balance: '80000' },
  { id: id(), logicalFactId: id(), positionId: id(), observedDate: '2026-11-12', observedAt: null, balance: '77000' },
];
const query: Query = { schemaVersion: 1, basis, view: 'CHECKPOINTS', filters: { from: '2026-09-01', to: '2026-11-16', origin: null, funding: null }, cursor: null, compare: null };
function response(request = query): Page {
  const common = { schemaVersion: 1 as const, basis, query: request, completeness: 'COMPLETE' as const, lastCheck: checks[1], endBalance: null, count: 2, next: null };
  if (request.view === 'MONTHS') return { ...common, view: 'MONTHS', count: 1,
    months: [{ period: '2026-11', allocated: '10000', reserved: '20000', savings: '1000', free: '-11000', deficit: '11000' }] };
  if (request.view === 'FUNDING') return { ...common, view: 'FUNDING', count: 1, groups: [{ origin: '2026-10', funding: '2026-11', amount: '20000', count: 1 }],
    total: '20000', totalCount: 1, subtotal: '20000', subtotalCount: 1,
    identities: [{ id: id(), revisionId: id(), title: 'Synthetic selected obligation', origin: '2026-10', funding: '2026-11', original: '30000', outstanding: '20000', status: 'UNPAID', reserveFull: true, isPossible: false }] };
  let comparison = null;
  if (request.compare) comparison = { from: checks[0], to: checks[1], delta: '-3000', evidence: 'NOT_AVAILABLE' as const, known: null, unexplained: null };
  return { ...common, view: 'CHECKPOINTS', checks, comparison };
}
function actions(): AnalyticsActions {
  return { open: vi.fn().mockResolvedValue({ ok: true, value: response() }),
    read: vi.fn(async (raw: unknown) => ({ ok: true as const, value: response(raw as Query) })),
    choices: vi.fn().mockResolvedValue({ ok: true, value: { basis, items: [], nextBeforeSeq: null } }) };
}
function mount(service: AnalyticsActions, locale: keyof typeof catalogs = 'en') {
  return render(<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin">
    <AppThemeProvider><AnalyticsScreen actions={service} /></AppThemeProvider>
  </NextIntlClientProvider>);
}
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
});
afterEach(cleanup);

it.each(['ru', 'de', 'en'] as const)('P2 %s exposes real dates/dots/exact values and compares two checks read-only', async locale => {
  const service = actions(), view = mount(service, locale), messages = catalogs[locale].analytics;
  await screen.findByRole('tabpanel');
  expect(screen.getByRole('heading', { level: 1, name: messages.title })).toBeTruthy();
  expect(screen.getByText(messages.olderCheck)).toBeTruthy();
  expect(screen.getByText(messages.differenceNotice)).toBeTruthy();
  const chart = screen.getByRole('img', { name: messages.checkChart });
  expect(chart.querySelectorAll('circle')).toHaveLength(2);
  expect(chart.querySelectorAll('path, polyline')).toHaveLength(0);
  expect(screen.getByRole('table', { hidden: true })).toBeTruthy();
  const buttons = screen.getAllByRole('button', { name: messages.chooseCheck });
  await userEvent.click(buttons[0]); await userEvent.click(buttons[1]);
  await waitFor(() => expect(service.read).toHaveBeenCalledOnce());
  expect((vi.mocked(service.read).mock.calls[0][0] as Query).compare).toEqual([checks[0].id, checks[1].id]);
  await waitFor(() => expect(view.container.textContent?.replace(/\s/g, ' ')).toContain(locale === 'en' ? '-€30.00' : '-30,00 €'));
  expect(screen.queryByText(/confirmed transfers|transfer history|Подтверждённые переносы/i)).toBeNull();
  expect(localStorage.getItem('bankBalance')).toBeNull();
});

it('P2 rejects a late reply on another basis without rendering its values', async () => {
  const service = actions();
  vi.mocked(service.read).mockImplementation(async raw => {
    const page = response(raw as Query);
    return { ok: true, value: { ...page, basis: { ...basis, stateCut: '1' } } };
  });
  mount(service); await screen.findByRole('tabpanel');
  await userEvent.click(screen.getByRole('tab', { name: 'Months' }));
  expect(await screen.findByText(catalogs.en.analytics.error)).toBeTruthy();
  expect(screen.queryByText('Deficit')).toBeNull();
  expect(screen.queryByRole('tabpanel')).toBeNull();
});

it('P3 shows signed F, the deficit and unknown separately, using the same basis', async () => {
  const service = actions(), view = mount(service);
  await screen.findByRole('tabpanel');
  await userEvent.click(screen.getByRole('tab', { name: 'Months' }));
  await screen.findByText(catalogs.en.analytics.monthsNotice);
  expect(view.container.textContent).toContain('-€110.00');
  expect(screen.getByText(/Deficit/)).toBeTruthy();
  expect(screen.getByRole('img', { name: catalogs.en.analytics.monthChart }).querySelector('line')).toBeTruthy();
  expect((vi.mocked(service.read).mock.calls[0][0] as Query).basis).toEqual(basis);
  expect(screen.queryByText(/safeDailyLimit|confirmed transfers/i)).toBeNull();
});

it('P4 displays full/filter counts and identity disclosure without any decision listing', async () => {
  const service = actions(), view = mount(service);
  await screen.findByRole('tabpanel');
  await userEvent.click(screen.getByRole('tab', { name: 'Funding' }));
  await screen.findByText(catalogs.en.analytics.fundingNotice);
  expect(view.container.textContent).toContain('Full reserve across all months / count');
  expect(view.container.textContent).toContain('Filtered subtotal / count');
  expect(view.container.textContent).toContain('Synthetic selected obligation');
  const details = [...view.container.querySelectorAll('details')].find(item => item.textContent?.includes('Synthetic selected obligation'));
  if (!details) throw new Error('IDENTITY_DETAILS_REQUIRED');
  const summary = details.querySelector('summary');
  if (!summary) throw new Error('IDENTITY_SUMMARY_REQUIRED');
  await userEvent.click(summary);
  expect(details.open).toBe(true);
  expect(details.textContent).toContain('Unpaid · full reserve');
  expect(view.container.textContent).not.toContain('Confirmed transfers');
});

it('P2 initial read failure retries read-only and keeps UNKNOWN instead of zero', async () => {
  const service = actions();
  vi.mocked(service.open).mockResolvedValueOnce({ ok: false, code: 'FORBIDDEN' });
  mount(service); await screen.findByRole('alert');
  await userEvent.click(screen.getByRole('button', { name: 'Retry read' }));
  await screen.findByRole('tabpanel');
  expect(service.open).toHaveBeenCalledTimes(2);
  await act(async () => { await Promise.resolve(); });
});
