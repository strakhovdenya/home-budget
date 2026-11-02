import type { Brand } from '@/shared/pure/brand';
import type { Result } from '@/shared/pure/result';

export type Cents = bigint;
export type NonNegativeCents = Brand<bigint, 'NonNegativeCents'>;
export type NegativeCents = Brand<bigint, 'NegativeCents'>;

export type MoneyErrorCode =
  | 'INVALID_MONEY'
  | 'MONEY_RANGE'
  | 'MONEY_SIGN'
  | 'INVALID_DIVISOR';

export const MIN_CENTS: Cents = -9223372036854775808n;
export const MAX_CENTS: Cents = 9223372036854775807n;

export function validateCents(value: unknown): Result<Cents, MoneyErrorCode> {
  if (typeof value !== 'bigint') return { ok: false, code: 'INVALID_MONEY' };
  if (value < MIN_CENTS || value > MAX_CENTS) return { ok: false, code: 'MONEY_RANGE' };
  return { ok: true, value };
}

export function nonNegativeCents(value: unknown): Result<NonNegativeCents, MoneyErrorCode> {
  const checked = validateCents(value);
  if (!checked.ok) return checked;
  if (checked.value < 0n) return { ok: false, code: 'MONEY_SIGN' };
  return { ok: true, value: checked.value as NonNegativeCents };
}

export function negativeCents(value: unknown): Result<NegativeCents, MoneyErrorCode> {
  const checked = validateCents(value);
  if (!checked.ok) return checked;
  if (checked.value >= 0n) return { ok: false, code: 'MONEY_SIGN' };
  return { ok: true, value: checked.value as NegativeCents };
}

function checkedBinary(
  a: Cents,
  b: Cents,
  operation: (left: bigint, right: bigint) => bigint,
): Result<Cents, MoneyErrorCode> {
  const left = validateCents(a);
  if (!left.ok) return left;
  const right = validateCents(b);
  if (!right.ok) return right;
  return validateCents(operation(left.value, right.value));
}

export function addCents(a: Cents, b: Cents): Result<Cents, MoneyErrorCode> {
  return checkedBinary(a, b, (left, right) => left + right);
}

export function subtractCents(a: Cents, b: Cents): Result<Cents, MoneyErrorCode> {
  return checkedBinary(a, b, (left, right) => left - right);
}

/** The dimensionless integer factor is also restricted to signed int64. */
export function multiplyCents(amount: Cents, factor: bigint): Result<Cents, MoneyErrorCode> {
  return checkedBinary(amount, factor, (left, right) => left * right);
}

export function negateCents(amount: Cents): Result<Cents, MoneyErrorCode> {
  return subtractCents(0n, amount);
}

export function absCents(amount: Cents): Result<NonNegativeCents, MoneyErrorCode> {
  const checked = validateCents(amount);
  if (!checked.ok) return checked;
  return nonNegativeCents(checked.value < 0n ? -checked.value : checked.value);
}

/** Checks each partial sum in input order; never regroups to conceal overflow. */
export function sumCents(amounts: readonly Cents[]): Result<Cents, MoneyErrorCode> {
  let total: Cents = 0n;
  for (const amount of amounts) {
    const next = addCents(total, amount);
    if (!next.ok) return next;
    total = next.value;
  }
  return { ok: true, value: total };
}

export function divideNonNegativeCents(
  amount: NonNegativeCents,
  divisor: bigint,
): Result<Readonly<{ quotient: NonNegativeCents; remainder: NonNegativeCents }>, MoneyErrorCode> {
  const checked = nonNegativeCents(amount);
  if (!checked.ok) return checked;
  const denominator = validateCents(divisor);
  if (!denominator.ok) return denominator;
  if (denominator.value <= 0n) return { ok: false, code: 'INVALID_DIVISOR' };
  // For these validated operands both results are in [0, amount], hence in range.
  const quotient = nonNegativeCents(checked.value / denominator.value);
  if (!quotient.ok) return quotient;
  const remainder = nonNegativeCents(checked.value % denominator.value);
  if (!remainder.ok) return remainder;
  return { ok: true, value: { quotient: quotient.value, remainder: remainder.value } };
}
