import { describe, expect, it } from 'vitest';
import {
  addCalendarDays, calendarDaysBetween, calendarOrdinal, compareDates,
  parseBerlinDate, remainingDaysInMonth,
} from '@/shared/pure/calendar';
import { unwrap } from '../../fixtures/hb-008';

const date = (value: string) => unwrap(parseBerlinDate(value));

describe('HB-008 / BR-10 proleptic Gregorian civil dates', () => {
  it.each(['0001-01-01', '0004-02-29', '0099-12-31', '0100-03-01', '2000-02-29', '2026-02-28', '2028-02-29', '9999-12-31'])('accepts %s', (input) => {
    expect(date(input)).toBe(input);
  });

  it.each([
    '0000-01-01', '10000-01-01', '0001-02-29', '0100-02-29', '1900-02-29', '2026-02-29',
    '2028-02-30', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-01-32',
    '2026-1-01', '2026-01-1', '26-01-01', '2026-01-01T00:00:00Z', '2026-01-01\n',
    ' 2026-01-01', '２０２６-01-01', '', null, undefined, 20260101, new Date(0),
  ])('rejects invalid date %s', (value) => {
    expect(parseBerlinDate(value)).toEqual({ ok: false, code: 'INVALID_DATE' });
  });

  it('pins independently known ordinals across the entire year range', () => {
    expect(calendarOrdinal(date('0001-01-01'))).toBe(1);
    expect(calendarOrdinal(date('0001-12-31'))).toBe(365);
    expect(calendarOrdinal(date('0004-12-31'))).toBe(1461);
    expect(calendarOrdinal(date('1970-01-01'))).toBe(719163);
    expect(calendarOrdinal(date('2000-01-01'))).toBe(730120);
    expect(calendarOrdinal(date('9999-12-31'))).toBe(3652059);
    expect(calendarDaysBetween(date('0001-01-01'), date('9999-12-31'))).toBe(3652058);
  });

  it.each([
    ['0001-01-01', 0, '0001-01-01'], ['0001-12-31', 1, '0002-01-01'],
    ['0099-12-31', 1, '0100-01-01'], ['0100-02-28', 1, '0100-03-01'],
    ['1900-02-28', 1, '1900-03-01'], ['2000-02-28', 1, '2000-02-29'],
    ['2026-02-28', 1, '2026-03-01'], ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'], ['2026-12-31', 1, '2027-01-01'],
    ['9999-12-30', 1, '9999-12-31'], ['0001-01-01', 3652058, '9999-12-31'],
  ] as const)('shifts %s by %s days', (from, offset, expected) => {
    expect(unwrap(addCalendarDays(date(from), offset))).toBe(expected);
    expect(unwrap(addCalendarDays(date(expected), -offset))).toBe(from);
    expect(calendarDaysBetween(date(from), date(expected))).toBe(offset);
    expect(calendarDaysBetween(date(expected), date(from))).toBe(-offset || 0);
  });

  it('rejects shifts outside years 0001..9999', () => {
    for (const [input, offset] of [['0001-01-01', -1], ['9999-12-31', 1], ['2026-01-01', Number.MAX_SAFE_INTEGER], ['2026-01-01', -Number.MAX_SAFE_INTEGER]] as const) {
      expect(addCalendarDays(date(input), offset)).toEqual({ ok: false, code: 'DATE_RANGE' });
    }
  });

  it.each([0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects non-calendar day offset %s', (offset) => {
    expect(addCalendarDays(date('2026-01-01'), offset)).toEqual({ ok: false, code: 'INVALID_DAY_OFFSET' });
  });

  it.each([
    ['2026-11-28', 3], ['2026-11-29', 2], ['2026-11-30', 1], ['2026-02-01', 28],
    ['2026-02-28', 1], ['2028-02-01', 29], ['2028-02-28', 2], ['2028-02-29', 1],
    ['0001-01-01', 31], ['9999-12-31', 1],
  ] as const)('HB3-002/003/025/026 includes today in %s', (input, days) => {
    expect(remainingDaysInMonth(date(input))).toBe(days);
  });

  it('compares civil dates and signed differences', () => {
    const a = date('0001-01-01');
    const b = date('9999-12-31');
    expect(compareDates(a, b)).toBe(-1);
    expect(compareDates(b, a)).toBe(1);
    expect(compareDates(a, a)).toBe(0);
    expect(calendarDaysBetween(a, a)).toBe(0);
  });

  it('round-trips the first and last day of every month in all 9999 supported years', () => {
    const first = date('0001-01-01');
    for (let year = 1; year <= 9999; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const start = date(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`);
        const end = unwrap(addCalendarDays(start, remainingDaysInMonth(start) - 1));
        for (const input of [start, end]) {
          // Plain comparison avoids hundreds of thousands of test-runner objects.
          if (unwrap(addCalendarDays(first, calendarOrdinal(input) - 1)) !== input) {
            throw new Error(`Gregorian round-trip failed: ${input}`);
          }
        }
      }
    }
  });
});
