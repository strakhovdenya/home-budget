import type { Brand } from '@/shared/pure/brand';
import { remainingDaysInMonth, type BerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';

export type Period = Brand<string, 'Period'>;

export function parsePeriod(value: unknown): Result<Period, 'INVALID_PERIOD'> {
  if (typeof value !== 'string' || value.length !== 7 || !/^[0-9]{4}-(?:0[1-9]|1[0-2])$/.test(value) || value.startsWith('0000-')) {
    return { ok: false, code: 'INVALID_PERIOD' };
  }
  return { ok: true, value: value as Period };
}

export function periodOf(date: BerlinDate): Period {
  return date.slice(0, 7) as Period;
}

export function comparePeriods(a: Period, b: Period): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function startOfMonth(period: Period): BerlinDate {
  return `${period}-01` as BerlinDate;
}

export function daysInMonth(period: Period): number {
  return remainingDaysInMonth(startOfMonth(period));
}

export function endOfMonth(period: Period): BerlinDate {
  // Month lengths are >=28 and stay within the validated period, even in 9999-12.
  return `${period}-${daysInMonth(period)}` as BerlinDate;
}

export function shiftPeriod(
  period: Period,
  months: number,
): Result<Period, 'INVALID_MONTH_OFFSET' | 'PERIOD_RANGE'> {
  if (!Number.isSafeInteger(months)) return { ok: false, code: 'INVALID_MONTH_OFFSET' };
  const index = (Number(period.slice(0, 4)) - 1) * 12 + Number(period.slice(5, 7)) - 1 + months;
  if (index < 0 || index >= 9999 * 12) return { ok: false, code: 'PERIOD_RANGE' };
  const year = Math.floor(index / 12) + 1;
  const month = index % 12 + 1;
  return { ok: true, value: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` as Period };
}
