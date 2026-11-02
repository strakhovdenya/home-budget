import type { Brand } from './brand';
import type { Result } from './result';

export type BerlinDate = Brand<string, 'BerlinDate'>;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function monthLength(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseBerlinDate(value: unknown): Result<BerlinDate, 'INVALID_DATE'> {
  if (typeof value !== 'string' || value.length !== 10 || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
    return { ok: false, code: 'INVALID_DATE' };
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthLength(year, month)) {
    return { ok: false, code: 'INVALID_DATE' };
  }
  return { ok: true, value: value as BerlinDate };
}

function daysBeforeYear(year: number): number {
  const previous = year - 1;
  return 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400);
}

/** Proleptic Gregorian ordinal: 0001-01-01 is 1. Accepts a validated date. */
export function calendarOrdinal(date: BerlinDate): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  let ordinal = daysBeforeYear(year) + Number(date.slice(8, 10));
  for (let priorMonth = 1; priorMonth < month; priorMonth += 1) ordinal += monthLength(year, priorMonth);
  return ordinal;
}

export function calendarDaysBetween(from: BerlinDate, to: BerlinDate): number {
  return calendarOrdinal(to) - calendarOrdinal(from);
}

export function compareDates(a: BerlinDate, b: BerlinDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function remainingDaysInMonth(date: BerlinDate): number {
  return monthLength(Number(date.slice(0, 4)), Number(date.slice(5, 7))) - Number(date.slice(8, 10)) + 1;
}

export function addCalendarDays(
  date: BerlinDate,
  days: number,
): Result<BerlinDate, 'INVALID_DAY_OFFSET' | 'DATE_RANGE'> {
  if (!Number.isSafeInteger(days)) return { ok: false, code: 'INVALID_DAY_OFFSET' };
  const target = calendarOrdinal(date) + days;
  if (target < 1 || target > daysBeforeYear(10000)) return { ok: false, code: 'DATE_RANGE' };
  // Find the year without Date constructors (including their special years 0..99).
  let low = 1;
  let high = 9999;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (daysBeforeYear(middle) < target) low = middle;
    else high = middle - 1;
  }
  let day = target - daysBeforeYear(low);
  let month = 1;
  while (day > monthLength(low, month)) {
    day -= monthLength(low, month);
    month += 1;
  }
  const value = `${String(low).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { ok: true, value: value as BerlinDate };
}
