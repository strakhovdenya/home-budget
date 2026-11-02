import { describe, expect, it } from 'vitest';
import { formatEuroDecimal, parseCentsString, parseEuroDecimal, serializeCents } from '@/domain/money/money-codec';
import { MAX_CENTS, MIN_CENTS } from '@/domain/money/money';
import { unwrap } from '../fixtures/hb-008';

describe('HB-008 / BR-10 money boundary codecs', () => {
  it.each([0n, 1n, -1n, 1230n, -1230n, 9007199254740993n, MIN_CENTS, MAX_CENTS])('round-trips JSON cents %s exactly', (amount) => {
    const wire = JSON.stringify({ amountCents: unwrap(serializeCents(amount)) });
    const decoded: { amountCents: unknown } = JSON.parse(wire);
    expect(wire).toBe(`{"amountCents":"${amount}"}`);
    expect(unwrap(parseCentsString(decoded.amountCents))).toBe(amount);
  });

  it.each(['', ' ', ' 1', '1 ', '+1', '-0', '00', '01', '-01', '1.0', '1e2', '0x10', '1_000', '１', '1\n', 1, 1n, null, {}])('rejects noncanonical cents %s', (value) => {
    expect(parseCentsString(value)).toEqual({ ok: false, code: 'INVALID_MONEY' });
  });

  it.each(['9223372036854775808', '-9223372036854775809', '9'.repeat(1000)])('rejects out-of-range cents %s', (value) => {
    expect(parseCentsString(value)).toEqual({ ok: false, code: 'MONEY_RANGE' });
  });

  it.each([
    ['0', 0n, '0.00'], ['0.0', 0n, '0.00'], ['-0.00', 0n, '0.00'], ['-0', 0n, '0.00'],
    ['0.01', 1n, '0.01'], ['-0.01', -1n, '-0.01'], ['12.3', 1230n, '12.30'],
    ['-12.30', -1230n, '-12.30'], ['12', 1200n, '12.00'],
    ['92233720368547758.07', MAX_CENTS, '92233720368547758.07'],
    ['-92233720368547758.08', MIN_CENTS, '-92233720368547758.08'],
  ])('parses EUR %s exactly', (input, amount, formatted) => {
    expect(unwrap(parseEuroDecimal(input))).toBe(amount);
    expect(unwrap(formatEuroDecimal(amount))).toBe(formatted);
    expect(unwrap(parseEuroDecimal(formatted))).toBe(amount);
  });

  it.each(['1.001', '-0.001', '12,30', '1.', '.1', '+1', '01.00', ' 1.00', '1.00\n', '1e2', 'Infinity', 'NaN', '', 12.3, null])('rejects EUR %s without rounding', (value) => {
    expect(parseEuroDecimal(value)).toEqual({ ok: false, code: 'INVALID_MONEY' });
  });

  it.each(['92233720368547758.08', '-92233720368547758.09', '9'.repeat(1000)])('rejects EUR range %s', (value) => {
    expect(parseEuroDecimal(value)).toEqual({ ok: false, code: 'MONEY_RANGE' });
  });

  it('revalidates outbound values before serialization and formatting', () => {
    for (const amount of [MIN_CENTS - 1n, MAX_CENTS + 1n]) {
      expect(serializeCents(amount)).toEqual({ ok: false, code: 'MONEY_RANGE' });
      expect(formatEuroDecimal(amount)).toEqual({ ok: false, code: 'MONEY_RANGE' });
    }
    // @ts-expect-error An untyped boundary must not silently coerce number money.
    expect(formatEuroDecimal(12.3)).toEqual({ ok: false, code: 'INVALID_MONEY' });
    // @ts-expect-error An untyped boundary must not silently coerce number money.
    expect(serializeCents(1)).toEqual({ ok: false, code: 'INVALID_MONEY' });
  });
});
