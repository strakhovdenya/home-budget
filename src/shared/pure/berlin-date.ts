import { parseBerlinDate, type BerlinDate } from './calendar';
import type { Result } from './result';

const berlinFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  calendar: 'gregory',
  numberingSystem: 'latn',
  era: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Converts a known instant; does not infer an instant from a local wall time. */
export function berlinDateFromEpochMilliseconds(
  value: unknown,
): Result<BerlinDate, 'INVALID_INSTANT' | 'DATE_RANGE'> {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || Math.abs(value) > 8640000000000000) {
    return { ok: false, code: 'INVALID_INSTANT' };
  }
  const parts = berlinFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value;
  const year = part('year');
  if (part('era') !== 'AD' || !year || year.length > 4) return { ok: false, code: 'DATE_RANGE' };
  const date = parseBerlinDate(`${year.padStart(4, '0')}-${part('month')}-${part('day')}`);
  return date.ok ? date : { ok: false, code: 'DATE_RANGE' };
}
