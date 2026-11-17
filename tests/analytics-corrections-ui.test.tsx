// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Basis, Check, Page, Query } from '@/domain/analytics/contracts';
import { AnalyticsScreen } from '@/features/analytics/analytics-screen';
import { CheckDots } from '@/features/analytics/charts';
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
const checks: Check[] = [0, 1].map(() => ({
  id: id(),
  logicalFactId: id(),
  positionId: id(),
  observedDate: '2026-11-12',
  observedAt: null,
  balance: '77000'
}));
const query: Query = {
  schemaVersion: 1,
  basis,
  view: 'CHECKPOINTS',
  filters: {
    from: '2026-09-01',
    to: '2026-11-16',
    origin: null,
    funding: null
  },
  cursor: null,
  compare: null
};
const page: Page = {
  schemaVersion: 1,
  basis,
  query,
  completeness: 'COMPLETE',
  view: 'CHECKPOINTS',
  lastCheck: checks[1],
  endBalance: null,
  count: 2,
  next: null,
  checks,
  comparison: null
};

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

it('keeps coincident observations at their true coordinates with separate mouse and keyboard targets', async () => {
  const onSelect = vi.fn();
  render(
    <AppThemeProvider>
      <CheckDots
        checks={checks}
        label="Observed balances"
        pointLabel={check => `${check.observedDate}: ${check.balance}`}
        onSelect={onSelect}
      />
    </AppThemeProvider>
  );
  const markers = screen.getAllByRole('button');
  expect(markers).toHaveLength(2);
  expect(markers[0].getAttribute('cx')).toBe(markers[1].getAttribute('cx'));
  expect(markers[0].getAttribute('cy')).toBe(markers[1].getAttribute('cy'));
  expect(markers[0].getAttribute('aria-label')).not.toBe(markers[1].getAttribute('aria-label'));
  expect(markers[0].getAttribute('fill')).toBe('none');
  expect(markers[1].getAttribute('fill')).toBe('none');
  expect(markers[0].getAttribute('stroke-dasharray')).toBeTruthy();
  expect(markers[0].getAttribute('stroke-dashoffset')).not.toBe(markers[1].getAttribute('stroke-dashoffset'));
  expect(screen.getByRole('img').querySelectorAll('path, polyline')).toHaveLength(0);

  await userEvent.click(markers[0]);
  await userEvent.click(markers[1]);
  expect(onSelect.mock.calls).toEqual([[checks[0].id], [checks[1].id]]);
  onSelect.mockClear();
  expect(markers[0].getAttribute('tabindex')).toBe('0');
  expect(markers[1].getAttribute('tabindex')).toBe('0');
  fireEvent.keyDown(markers[0], { key: 'Enter' });
  fireEvent.keyDown(markers[1], { key: ' ' });
  expect(onSelect.mock.calls).toEqual([[checks[0].id], [checks[1].id]]);
});

it.each(['result', 'throw'] as const)('clears the old balance when a new H/K request fails via %s and retries the requested selection', async failure => {
  const historicalAnchor = id();
  const service: AnalyticsActions = {
    open: vi.fn().mockResolvedValue({ ok: true, value: page }),
    read: vi.fn(),
    choices: vi.fn().mockResolvedValue({
      ok: true,
      value: {
        basis,
        items: [{ id: historicalAnchor, seq: '1', recordedAt: '2026-11-10T12:00:00.000000Z', report: null }],
        nextBeforeSeq: null
      }
    })
  };
  vi.mocked(service.open).mockResolvedValueOnce({ ok: true, value: page });
  if (failure === 'result') {
    vi.mocked(service.open).mockResolvedValueOnce({ ok: false, code: 'STORAGE_ERROR' });
  } else {
    vi.mocked(service.open).mockRejectedValueOnce(new Error('Synthetic storage failure'));
  }
  const nextBasis: Basis = { ...basis, dayH: '2026-11-10', stateAnchor: historicalAnchor, stateCut: '1' };
  vi.mocked(service.open).mockResolvedValue({
    ok: true,
    value: {
      ...page,
      basis: nextBasis,
      query: { ...query, basis: nextBasis },
      lastCheck: null,
      checks: [],
      count: 0
    }
  });
  const view = render(
    <NextIntlClientProvider locale="en" messages={catalogs.en} timeZone="Europe/Berlin">
      <AppThemeProvider>
        <AnalyticsScreen actions={service} />
      </AppThemeProvider>
    </NextIntlClientProvider>
  );
  await screen.findByRole('tabpanel');
  expect(view.container.textContent).toContain('€770.00');
  await userEvent.click(screen.getByText(catalogs.en.analytics.sourcesSettings));
  const knowledgeInput = screen.getByRole('combobox', { name: catalogs.en.analytics.knowledge });
  await waitFor(() => expect(knowledgeInput.getAttribute('aria-disabled')).not.toBe('true'));
  await userEvent.click(knowledgeInput);
  await userEvent.click(await screen.findByRole('option', { name: /2026/ }));
  const dayInput = screen.getByLabelText(catalogs.en.analytics.stateDate);
  await userEvent.clear(dayInput);
  await userEvent.type(dayInput, '2026-11-10');
  await userEvent.click(screen.getByRole('button', { name: catalogs.en.analytics.showState }));
  await screen.findByText(catalogs.en.analytics.error);
  expect(view.container.textContent).not.toContain('€770.00');
  expect(screen.queryByRole('tabpanel')).toBeNull();
  expect(service.read).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: catalogs.en.analytics.retry }));
  await screen.findByRole('tabpanel');
  await waitFor(() => expect(service.open).toHaveBeenCalledTimes(3));
  const attempts = vi.mocked(service.open).mock.calls;
  expect(attempts[2][0]).toEqual(attempts[1][0]);
  expect(attempts[2][0]).toMatchObject({
    selection: { dayH: '2026-11-10', knowledgeAnchor: historicalAnchor, report: null }
  });
  expect(view.container.textContent).not.toContain('€770.00');
  expect(view.container.textContent).toContain(catalogs.en.analytics.unknown);
});
