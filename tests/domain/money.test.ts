import { describe, expect, it } from 'vitest';
import {
  absCents, addCents, divideNonNegativeCents, MAX_CENTS, MIN_CENTS,
  multiplyCents, negateCents, negativeCents, nonNegativeCents,
  subtractCents, sumCents, validateCents, type NonNegativeCents,
} from '@/domain/money/money';
import { unwrap } from '../fixtures/hb-008';

describe('HB-008 / BR-10 exact signed cents', () => {
  it.each([0n, 1n, -1n, MIN_CENTS, MAX_CENTS, 9007199254740993n])('validates %s', (value) => {
    expect(unwrap(validateCents(value))).toBe(value);
  });

  it.each([0, 1, 0.01, -1, NaN, Infinity, null, undefined, '1', {}, true])('rejects non-bigint %s [case %#]', (value) => {
    expect(validateCents(value)).toEqual({ ok: false, code: 'INVALID_MONEY' });
  });

  it.each([MIN_CENTS - 1n, MAX_CENTS + 1n])('rejects range %s', (value) => {
    expect(validateCents(value)).toEqual({ ok: false, code: 'MONEY_RANGE' });
    expect(nonNegativeCents(value)).toEqual({ ok: false, code: 'MONEY_RANGE' });
    expect(negativeCents(value)).toEqual({ ok: false, code: 'MONEY_RANGE' });
  });

  it('validates signs without forbidding general negative cents', () => {
    expect(unwrap(nonNegativeCents(0n))).toBe(0n);
    expect(unwrap(nonNegativeCents(MAX_CENTS))).toBe(MAX_CENTS);
    expect(nonNegativeCents(-1n)).toEqual({ ok: false, code: 'MONEY_SIGN' });
    expect(unwrap(negativeCents(MIN_CENTS))).toBe(MIN_CENTS);
    expect(unwrap(negativeCents(-1n))).toBe(-1n);
    for (const amount of [0n, 1n]) expect(negativeCents(amount)).toEqual({ ok: false, code: 'MONEY_SIGN' });
    expect(nonNegativeCents(1)).toEqual({ ok: false, code: 'INVALID_MONEY' });
    expect(negativeCents(-1)).toEqual({ ok: false, code: 'INVALID_MONEY' });
    expect(unwrap(subtractCents(10000n, 20000n))).toBe(-10000n);
  });

  it.each([
    [1n, 2n, 3n], [0n, 0n, 0n], [-2n, 1n, -1n], [2n, -1n, 1n],
    [-2n, -1n, -3n], [9007199254740993n, 2n, 9007199254740995n],
    [MIN_CENTS, MAX_CENTS, -1n],
  ])('adds %s and %s exactly', (a, b, expected) => {
    expect(unwrap(addCents(a, b))).toBe(expected);
    expect(unwrap(subtractCents(expected, b))).toBe(a);
  });

  it.each([
    [3n, 0n, 0n], [3n, 1n, 3n], [3n, -1n, -3n], [-3n, -2n, 6n],
    [MIN_CENTS, 1n, MIN_CENTS], [MAX_CENTS, 1n, MAX_CENTS],
  ])('multiplies %s by %s', (amount, factor, expected) => {
    expect(unwrap(multiplyCents(amount, factor))).toBe(expected);
  });

  it('rejects overflowing results in both directions', () => {
    for (const result of [
      addCents(MAX_CENTS, 1n), addCents(MIN_CENTS, -1n),
      subtractCents(MIN_CENTS, 1n), subtractCents(MAX_CENTS, -1n),
      multiplyCents(MAX_CENTS, 2n), multiplyCents(MIN_CENTS, 2n), multiplyCents(MIN_CENTS, -1n),
    ]) expect(result).toEqual({ ok: false, code: 'MONEY_RANGE' });
  });

  it('checks operands even when cancellation or multiplication by zero would hide them', () => {
    for (const outside of [MIN_CENTS - 1n, MAX_CENTS + 1n]) {
      for (const result of [
        addCents(outside, -outside), subtractCents(outside, outside),
        addCents(0n, outside), subtractCents(0n, outside),
        multiplyCents(outside, 0n), multiplyCents(0n, outside),
        negateCents(outside), absCents(outside), sumCents([outside, -outside]),
        divideNonNegativeCents(outside as NonNegativeCents, 1n),
        divideNonNegativeCents(unwrap(nonNegativeCents(0n)), outside),
      ]) expect(result).toEqual({ ok: false, code: 'MONEY_RANGE' });
    }
  });

  it('checks runtime types even if a caller bypasses TypeScript', () => {
    // @ts-expect-error Deliberately simulate untyped input at runtime.
    expect(addCents(1, 2n)).toEqual({ ok: false, code: 'INVALID_MONEY' });
    // @ts-expect-error Deliberately simulate untyped input at runtime.
    expect(multiplyCents(2n, 1.5)).toEqual({ ok: false, code: 'INVALID_MONEY' });
    // @ts-expect-error Deliberately simulate untyped input at runtime.
    expect(divideNonNegativeCents(unwrap(nonNegativeCents(1n)), 1)).toEqual({ ok: false, code: 'INVALID_MONEY' });
  });

  it('handles negate and abs, including the asymmetric int64 minimum', () => {
    for (const amount of [0n, 1n, -1n, MAX_CENTS, -MAX_CENTS]) {
      expect(unwrap(negateCents(amount))).toBe(-amount);
      expect(unwrap(absCents(amount))).toBe(amount < 0n ? -amount : amount);
    }
    expect(negateCents(MIN_CENTS)).toEqual({ ok: false, code: 'MONEY_RANGE' });
    expect(absCents(MIN_CENTS)).toEqual({ ok: false, code: 'MONEY_RANGE' });
  });

  it('checks every partial sum in input order and leaves the input unchanged', () => {
    const values = Object.freeze([MAX_CENTS, 1n, -1n]);
    expect(sumCents(values)).toEqual({ ok: false, code: 'MONEY_RANGE' });
    expect(sumCents([MIN_CENTS, -1n, 1n])).toEqual({ ok: false, code: 'MONEY_RANGE' });
    expect(unwrap(sumCents([MAX_CENTS, -1n, 1n]))).toBe(MAX_CENTS);
    expect(unwrap(sumCents([]))).toBe(0n);
    expect(unwrap(sumCents([10n, -20n, 5n]))).toBe(-5n);
    expect(values).toEqual([MAX_CENTS, 1n, -1n]);
  });

  it.each([
    [10000n, 3n, 3333n, 1n], [1n, 3n, 0n, 1n], [1n, 1n, 1n, 0n],
    [0n, 31n, 0n, 0n], [MAX_CENTS, 1n, MAX_CENTS, 0n], [MAX_CENTS, MAX_CENTS, 1n, 0n],
  ])('HB3-008/009 divides %s by %s without losing cents', (amount, divisor, quotient, remainder) => {
    const result = unwrap(divideNonNegativeCents(unwrap(nonNegativeCents(amount)), divisor));
    expect(result).toEqual({ quotient, remainder });
    expect(result.quotient * divisor + result.remainder).toBe(amount);
    expect(result.remainder >= 0n && result.remainder < divisor).toBe(true);
  });

  it('rejects invalid division signs', () => {
    const amount = unwrap(nonNegativeCents(1n));
    for (const divisor of [0n, -1n, MIN_CENTS]) {
      expect(divideNonNegativeCents(amount, divisor)).toEqual({ ok: false, code: 'INVALID_DIVISOR' });
    }
    expect(divideNonNegativeCents(-1n as NonNegativeCents, 1n)).toEqual({ ok: false, code: 'MONEY_SIGN' });
  });
});
