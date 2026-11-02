import { describe, expect, it } from 'vitest';
import { comparePeriods, daysInMonth, endOfMonth, parsePeriod, periodOf, shiftPeriod, startOfMonth } from '@/domain/periods/period';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { unwrap } from '../fixtures/hb-008';

const period = (value: string) => unwrap(parsePeriod(value));

describe('HB-008 financial periods, independent of bank dates', () => {
  it.each(['0001-01', '0099-12', '2026-02', '2028-02', '9999-12'])('accepts %s', (input) => {
    expect(period(input)).toBe(input);
  });

  it.each(['0000-01', '10000-01', '2026-00', '2026-13', '2026-1', '26-01', '2026-01-01', '2026-01\n', ' 2026-01', '', null, 202601])('rejects invalid period %s', (input) => {
    expect(parsePeriod(input)).toEqual({ ok: false, code: 'INVALID_PERIOD' });
  });

  it.each([
    ['0001-01', 31], ['0099-02', 28], ['0100-02', 28], ['1900-02', 28], ['2000-02', 29],
    ['2026-02', 28], ['2028-02', 29], ['2026-04', 30], ['2026-12', 31], ['9999-12', 31],
  ] as const)('finds boundaries of %s', (input, length) => {
    const p = period(input);
    expect(daysInMonth(p)).toBe(length);
    expect(startOfMonth(p)).toBe(`${input}-01`);
    expect(endOfMonth(p)).toBe(`${input}-${length}`);
    expect(unwrap(parseBerlinDate(endOfMonth(p)))).toBe(endOfMonth(p));
    expect(periodOf(startOfMonth(p))).toBe(p);
    expect(periodOf(endOfMonth(p))).toBe(p);
  });

  it.each([
    ['0001-01', 0, '0001-01'], ['0099-12', 1, '0100-01'], ['2026-02', 1, '2026-03'],
    ['2026-12', 1, '2027-01'], ['2027-01', -1, '2026-12'], ['2026-11', 14, '2028-01'],
    ['0001-01', 119987, '9999-12'],
  ] as const)('shifts %s by %s months', (input, months, expected) => {
    expect(unwrap(shiftPeriod(period(input), months))).toBe(expected);
    expect(unwrap(shiftPeriod(period(expected), -months))).toBe(input);
  });

  it('compares past/current/future periods without opening or transferring anything', () => {
    const current = periodOf(unwrap(parseBerlinDate('2026-11-28')));
    expect(current).toBe('2026-11');
    expect(comparePeriods(period('2026-10'), current)).toBe(-1);
    expect(comparePeriods(current, current)).toBe(0);
    expect(comparePeriods(period('2027-01'), current)).toBe(1);
    expect(comparePeriods(period('0001-01'), period('9999-12'))).toBe(-1);
  });

  it('rejects period shifts outside the supported range', () => {
    for (const [input, offset] of [['0001-01', -1], ['9999-12', 1], ['2026-01', Number.MAX_SAFE_INTEGER], ['2026-01', -Number.MAX_SAFE_INTEGER]] as const) {
      expect(shiftPeriod(period(input), offset)).toEqual({ ok: false, code: 'PERIOD_RANGE' });
    }
  });

  it.each([0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects non-integer month offset %s', (offset) => {
    expect(shiftPeriod(period('2026-01'), offset)).toEqual({ ok: false, code: 'INVALID_MONTH_OFFSET' });
  });
});
