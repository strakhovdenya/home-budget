import type { Brand } from './brand';
import type { Result } from './result';
import { addCalendarDays, parseBerlinDate } from './calendar';
import { berlinDateFromEpochMilliseconds } from './berlin-date';

/** Fixed-width UTC, six fractional digits. Lexical order retains PostgreSQL microseconds. */
export type MicrosecondInstant = Brand<string, 'MicrosecondInstant'>;
export function parseInstant(input: unknown): Result<MicrosecondInstant, 'INVALID_INSTANT'> {
  const bad = { ok: false, code: 'INVALID_INSTANT' } as const;
  if (typeof input !== 'string') return bad;
  const m = /^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,6}))?(Z|[+-][0-9]{2}:[0-9]{2})$/.exec(input);
  if (!m) return bad;
  const date = parseBerlinDate(m[1]);
  const hour = Number(m[2]), minute = Number(m[3]), second = Number(m[4]);
  if (!date.ok || hour > 23 || minute > 59 || second > 59) return bad;
  let offset = 0;
  if (m[6] !== 'Z') {
    const h = Number(m[6].slice(1, 3)), min = Number(m[6].slice(4));
    if (h > 14 || min > 59 || (h === 14 && min !== 0) || m[6] === '-00:00') return bad;
    offset = (h * 60 + min) * (m[6][0] === '+' ? 1 : -1);
  }
  const utcMinutes = hour * 60 + minute - offset;
  const day = addCalendarDays(date.value, Math.floor(utcMinutes / 1440));
  if (!day.ok) return bad;
  const clock = ((utcMinutes % 1440) + 1440) % 1440;
  const pad = (v: number) => String(v).padStart(2, '0');
  return { ok: true, value: `${day.value}T${pad(Math.floor(clock / 60))}:${pad(clock % 60)}:${m[4]}.${(m[5] ?? '').padEnd(6, '0')}Z` as MicrosecondInstant };
}

/** Date is used only for explicit-instant timezone conversion, never for ordering. */
export function berlinDateOfInstant(instant: MicrosecondInstant) {
  return berlinDateFromEpochMilliseconds(Date.parse(instant));
}
