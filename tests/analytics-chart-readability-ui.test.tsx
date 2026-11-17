// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Check, Month } from '@/domain/analytics/contracts';
import { CheckChart, MonthBars } from '@/features/analytics/charts';
import { formatMoney } from '@/features/dashboard/format-money';
import { AppThemeProvider } from '@/shared/ui/app-theme-provider';
import { catalogs } from '@/shared/i18n/catalogs';

function check(id: string, date: string, balance: string, time: string | null = null): Check {
  return { id, logicalFactId: id, positionId: id, observedDate: date, observedAt: time, balance };
}

const checks = [check('first', '2026-11-01', '80000'), check('last', '2026-11-12', '77001')];
const amount = (value: string | null) => value === null ? 'Unknown' : formatMoney(value, 'en');
const pointLabel = (value: Check) => `${value.observedDate}: ${amount(value.balance)}`;

function providers(children: ReactNode, locale: keyof typeof catalogs = 'en') {
  return (
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Berlin">
      <AppThemeProvider>{children}</AppThemeProvider>
    </NextIntlClientProvider>
  );
}

function dots(values: readonly Check[] = checks, onCompare = vi.fn()) {
  return (
    <CheckChart checks={values} label="Observed balances" pointLabel={pointLabel}
      formatAmount={amount} formatDate={value => value} onSelect={onCompare} />
  );
}

function bars(months: readonly Month[]) {
  return <MonthBars months={months} label="Monthly values" formatAmount={amount} formatPeriod={value => value} />;
}

function setMobile(isMobile: boolean) {
  window.matchMedia = vi.fn(query => ({
    matches: isMobile && query.includes('max-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

beforeEach(() => {
  localStorage.clear();
  setMobile(false);
});
afterEach(cleanup);

it.each(['ru', 'de', 'en'] as const)('shows axes, the exact last check without hover, and point mode in %s', locale => {
  render(providers(dots(), locale));
  const messages = catalogs[locale].analytics;
  expect(screen.getByText(messages.chartDateAxis)).toBeTruthy();
  expect(screen.getByText(messages.chartBalanceAxis)).toBeTruthy();
  expect(screen.getByText(/2026-11-12 · €770.01/)).toBeTruthy();
  const chart = screen.getByRole('img');
  const labels = [...chart.querySelectorAll('text')].map(node => node.textContent);
  expect(labels.some(label => label?.includes('€0.00'))).toBe(false);
  expect(labels.some(label => label?.includes('€767.02'))).toBe(true);
  expect(chart.querySelectorAll('[data-check-connection]')).toHaveLength(0);
});

it('opens point details before a separate explicit comparison action; hover never compares', async () => {
  const onCompare = vi.fn();
  render(providers(dots(checks, onCompare)));
  const marker = within(screen.getByRole('img')).getByRole('button', { name: pointLabel(checks[0]) });
  fireEvent.pointerEnter(marker, { pointerType: 'mouse' });
  expect(onCompare).not.toHaveBeenCalled();
  await userEvent.click(marker);
  const close = screen.getByRole('button', { name: 'Close details' });
  expect(close).toBeTruthy();
  expect(onCompare).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Select for comparison' }));
  expect(onCompare.mock.calls).toEqual([['first']]);
  await userEvent.click(close);
  expect(screen.queryByRole('button', { name: 'Close details' })).toBeNull();
});

it('first opens all coincident observations as a list; opening its row does not compare', async () => {
  const onCompare = vi.fn();
  const coincident = [checks[0], { ...checks[0], id: 'second' }, { ...checks[0], id: 'third' }];
  render(providers(dots(coincident, onCompare)));
  const marker = within(screen.getByRole('img')).getAllByRole('button')[0];
  await userEvent.click(marker);
  expect(screen.getByText(catalogs.en.analytics.chartNearby)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Select for comparison' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: `2. ${pointLabel(checks[0])}` }));
  expect(onCompare).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Select for comparison' }));
  expect(onCompare.mock.calls).toEqual([['second']]);
});

it('connects only adjacent eligible checks and never bridges an unknown-time same-day pair', async () => {
  const values = [
    check('a', '2026-11-01', '80000'),
    check('b', '2026-11-01', '79000'),
    check('c', '2026-11-02', '78000'),
    check('d', '2026-11-02', '77000', '2026-11-02T11:00:00.000001Z'),
    check('e', '2026-11-02', '76000', '2026-11-02T11:00:00.000002Z'),
    check('f', '2026-11-02', '75000', '2026-11-02T11:00:00.000002Z')
  ];
  render(providers(dots(values)));
  await userEvent.click(screen.getByRole('button', { name: 'Connect checks' }));
  const connections = screen.getByRole('img').querySelectorAll('[data-check-connection]');
  expect(connections).toHaveLength(2);
  expect(screen.getByText(catalogs.en.analytics.chartLineNotice)).toBeTruthy();
  expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(values.length);
  await userEvent.click(screen.getByRole('button', { name: 'Points only' }));
  expect(screen.getByRole('img').querySelectorAll('[data-check-connection]')).toHaveLength(0);
  expect(screen.queryByText(catalogs.en.analytics.chartLineNotice)).toBeNull();
});

it.each(['0', '77001', '9223372036854775807'])('keeps one/equal-value observations finite and exact at %s cents', balance => {
  render(providers(dots([check('only', '2026-11-12', balance)])));
  const chart = screen.getByRole('img');
  expect(chart.outerHTML).not.toMatch(/NaN|Infinity/);
  expect(screen.getByText(`2026-11-12 · ${amount(balance)}`)).toBeTruthy();
  expect(chart.querySelectorAll('circle')).toHaveLength(1);
});

it('renders no plot and no fabricated last value for an empty check page', () => {
  render(providers(dots([])));
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.queryByText(/Last shown check/)).toBeNull();
});

it('centers the single-calendar-date X label directly below its observations', () => {
  const single = check('only', '2026-11-12', '77001');
  for (const values of [[single], [single, { ...single, id: 'other', balance: '80000' }]]) {
    const view = render(providers(dots(values)));
    const chart = screen.getByRole('img');
    const dateLabel = within(chart).getByText('11/12');
    const markers = chart.querySelectorAll('circle');
    expect(dateLabel.getAttribute('text-anchor')).toBe('middle');
    for (const marker of markers) {
      expect(dateLabel.getAttribute('x')).toBe(marker.getAttribute('cx'));
      expect(Number(dateLabel.getAttribute('y'))).toBeGreaterThan(Number(marker.getAttribute('cy')));
    }
    view.unmount();
  }
});

const months: Month[] = [
  { period: '2026-09', allocated: '10000', reserved: '20000', savings: '1000', free: '-11000', deficit: '11000' },
  { period: '2026-10', allocated: '900000', reserved: '10000', savings: '0', free: '890000', deficit: '0' },
  { period: '2026-11', allocated: '10000', reserved: '0', savings: '0', free: '10000', deficit: '0' }
];

it('shows a colored legend, the zero axis and negative F; tap/click reveals exact signed cents', async () => {
  render(providers(bars([months[0]])));
  for (const key of ['allocated', 'reserved', 'savings', 'free'] as const) {
    expect(screen.getByText(catalogs.en.analytics[key])).toBeTruthy();
  }
  const chart = screen.getByRole('img');
  const zero = Number(chart.querySelector('[data-zero-axis]')?.getAttribute('y1'));
  const negative = chart.querySelector('[data-series="free"]');
  expect(Number(negative?.getAttribute('y'))).toBe(zero);
  expect(Number(negative?.getAttribute('height'))).toBeGreaterThan(0);
  await userEvent.click(within(chart).getByRole('button', { name: '2026-09 · Free F: -€110.00' }));
  expect(screen.getByText('2026-09 · Free F: -€110.00', { selector: 'p' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Close details' })).toBeTruthy();
});

it('keeps the full-selection Y scale and equal-value heights stable across mobile windows', async () => {
  setMobile(true);
  render(providers(bars(months)));
  const initial = screen.getByRole('img');
  const maximum = initial.getAttribute('data-scale-max');
  const minimum = initial.getAttribute('data-scale-min');
  const height = initial.querySelector('[data-series="allocated"]')?.getAttribute('height');
  expect(maximum).toBe('900000');
  expect(minimum).toBe('-11000');
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  const final = screen.getByRole('img');
  expect(final.getAttribute('data-scale-max')).toBe(maximum);
  expect(final.getAttribute('data-scale-min')).toBe(minimum);
  expect(final.querySelector('[data-series="allocated"]')?.getAttribute('height')).toBe(height);
  await userEvent.click(within(final).getByRole('button', { name: '2026-11 · Savings S: €0.00' }));
  expect(screen.getByText('2026-11 · Savings S: €0.00', { selector: 'p' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(screen.queryByRole('button', { name: 'Close details' })).toBeNull();
});

it('keeps known R/S visible with UNKNOWN A/F, without fabricated zero bars', () => {
  render(providers(bars([{ ...months[0], allocated: null, free: null, deficit: null }])));
  const chart = screen.getByRole('img');
  expect(chart.querySelector('[data-series="allocated"]')).toBeNull();
  expect(chart.querySelector('[data-series="free"]')).toBeNull();
  expect(chart.querySelector('[data-series="reserved"]')).toBeTruthy();
  expect(screen.getByText('Unknown')).toBeTruthy();
});

it('shows exact bar labels when there is space, and handles an all-zero month without invalid coordinates', () => {
  render(providers(bars([{ ...months[0], allocated: '0', reserved: '0', savings: '0', free: '0', deficit: '0' }])));
  const chart = screen.getByRole('img');
  expect(chart.outerHTML).not.toMatch(/NaN|Infinity/);
  expect([...chart.querySelectorAll('text')].filter(node => node.textContent === '€0.00').length).toBeGreaterThanOrEqual(4);
  expect(within(chart).getAllByRole('button')).toHaveLength(4);
});
