import { expect, it } from 'vitest';
import { parseBerlinDate, calendarDaysBetween, remainingDaysInMonth } from '@/shared/pure/calendar';
import { transitionCalendar } from './fixtures/transition-calendar';

it.each([
  ['2026-11-01', '2026-09', '2026-10', '2026-12', '2026-10-31'],
  ['2026-11-30', '2026-09', '2026-10', '2026-12', '2026-10-31'],
  ['2027-01-01', '2026-11', '2026-12', '2027-02', '2026-12-31'],
  ['2026-12-31', '2026-10', '2026-11', '2027-01', '2026-11-30'],
  ['2028-03-01', '2028-01', '2028-02', '2028-04', '2028-02-29'],
  ['2028-02-29', '2027-12', '2028-01', '2028-03', '2028-01-31'],
  ['2026-03-01', '2026-01', '2026-02', '2026-04', '2026-02-28'],
  ['2026-03-29', '2026-01', '2026-02', '2026-04', '2026-02-28'],
  ['2026-03-31', '2026-01', '2026-02', '2026-04', '2026-02-28'],
  ['2026-10-01', '2026-08', '2026-09', '2026-11', '2026-09-30'],
  ['2026-10-25', '2026-08', '2026-09', '2026-11', '2026-09-30'],
  ['2026-10-31', '2026-08', '2026-09', '2026-11', '2026-09-30'],
])('HB13 R2 injected %s gives valid historical dates and month boundaries', (today, older, past, future, pastEnd) => {
  const c = transitionCalendar(today);
  expect(c).toMatchObject({ today, target: today.slice(0, 7), older, past, future, pastEnd });
  expect(c.currentStart).toBe(`${today.slice(0, 7)}-01`);
  expect(remainingDaysInMonth(c.pastEnd)).toBe(1);
  const historical = [c.olderDay(20), ...[21, 22, 23, 24, 25, 26].map(c.olderDay),
    ...[1, 2, 3, 4, 5].map(c.pastDay), c.pastEnd];
  for (const date of historical) {
    expect(parseBerlinDate(date).ok).toBe(true);
    expect(date < c.currentStart).toBe(true);
    expect(calendarDaysBetween(date, c.today)).toBeGreaterThan(0);
  }
  expect([...historical].sort()).toEqual(historical);
  // On day one the earlier candidate and later suffix need explicit same-day placement.
  expect(c.currentStart <= c.today).toBe(true);
  expect(c.currentStart === c.today).toBe(today.endsWith('-01'));
});

it.each(['2026-02-29', '2026-13-01', 'not-a-date', '0001-01-01', '9999-12-31'])(
  'HB13 R2 rejects invalid or unrepresentable fixture calendar %s', today => {
    expect(() => transitionCalendar(today)).toThrow(/HB013_FIXTURE_CALENDAR_/);
  },
);
