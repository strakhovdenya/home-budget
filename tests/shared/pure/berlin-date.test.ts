import { describe, expect, it } from 'vitest';
import { berlinDateFromEpochMilliseconds } from '@/shared/pure/berlin-date';
import { calendarDaysBetween, remainingDaysInMonth } from '@/shared/pure/calendar';
import { unwrap } from '../../fixtures/hb-008';

const berlinDate = (utc: string) => unwrap(berlinDateFromEpochMilliseconds(Date.parse(utc)));

describe('HB-008 / ADR 0002/0003 explicit instant to Europe/Berlin', () => {
  it.each([
    ['2026-11-30T22:59:59.999Z', '2026-11-30'], ['2026-11-30T23:00:00.000Z', '2026-12-01'],
    ['2026-11-30T23:30:00.000Z', '2026-12-01'], ['2026-06-30T21:59:59.999Z', '2026-06-30'],
    ['2026-06-30T22:00:00.000Z', '2026-07-01'], ['2026-12-31T23:00:00.000Z', '2027-01-01'],
    ['0001-01-01T00:00:00.000Z', '0001-01-01'], ['0099-06-01T12:00:00.000Z', '0099-06-01'],
    ['9999-12-31T12:00:00.000Z', '9999-12-31'],
    ['2026-03-29T00:30:00.000Z', '2026-03-29'], ['2026-03-29T01:30:00.000Z', '2026-03-29'],
    ['2026-10-25T00:30:00.000Z', '2026-10-25'], ['2026-10-25T01:30:00.000Z', '2026-10-25'],
  ])('converts %s to %s independently of host timezone', (instant, expected) => {
    expect(berlinDate(instant)).toBe(expected);
    expect(berlinDate(instant)).toBe(expected);
  });

  it.each([NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, 8640000000000001, -8640000000000001, '2026-01-01T00:00:00Z', new Date(0), null])('rejects invalid instant case %#', (value) => {
    expect(berlinDateFromEpochMilliseconds(value)).toEqual({ ok: false, code: 'INVALID_INSTANT' });
  });

  it.each(['0000-06-01T00:00:00.000Z', '9999-12-31T23:00:00.000Z', '+010000-01-01T00:00:00.000Z'])('rejects Berlin date outside AD 0001..9999: %s', (instant) => {
    expect(berlinDateFromEpochMilliseconds(Date.parse(instant))).toEqual({ ok: false, code: 'DATE_RANGE' });
  });

  it.each([8640000000000000, -8640000000000000])('rejects valid Date-limit instant %s outside calendar range', (value) => {
    expect(berlinDateFromEpochMilliseconds(value)).toEqual({ ok: false, code: 'DATE_RANGE' });
  });

  it.each([
    ['2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z', 23, 3],
    ['2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z', 25, 7],
  ] as const)('HB3-023/024 counts one civil day across %s to %s', (from, to, hours, remaining) => {
    expect(Date.parse(to) - Date.parse(from)).toBe(hours * 60 * 60 * 1000);
    expect(calendarDaysBetween(berlinDate(from), berlinDate(to))).toBe(1);
    expect(remainingDaysInMonth(berlinDate(from))).toBe(remaining);
  });

  it.each([
    ['2026-03-22T11:00:00Z', '2026-03-29T10:00:00Z', 167],
    ['2026-10-18T10:00:00Z', '2026-10-25T11:00:00Z', 169],
  ] as const)('HBL-025/026 counts seven civil days across %s to %s', (from, to, hours) => {
    expect(Date.parse(to) - Date.parse(from)).toBe(hours * 60 * 60 * 1000);
    expect(calendarDaysBetween(berlinDate(from), berlinDate(to))).toBe(7);
  });
});
