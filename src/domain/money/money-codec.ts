import type { Result } from '@/shared/pure/result';
import { validateCents, type Cents, type MoneyErrorCode } from './money';

/** Canonical signed decimal cents for JSON/DB boundaries; no number coercion. */
export function parseCentsString(value: unknown): Result<Cents, MoneyErrorCode> {
  if (typeof value !== 'string' || value !== value.trim() || !/^(?:0|-?[1-9][0-9]*)$/.test(value)) {
    return { ok: false, code: 'INVALID_MONEY' };
  }
  // At most 19 magnitude digits; bound BigInt construction even for hostile input.
  if (value.length > (value.startsWith('-') ? 20 : 19)) return { ok: false, code: 'MONEY_RANGE' };
  return validateCents(BigInt(value));
}

export function serializeCents(value: Cents): Result<string, MoneyErrorCode> {
  const checked = validateCents(value);
  return checked.ok ? { ok: true, value: checked.value.toString() } : checked;
}

/** Exact machine decimal EUR, with zero, one or two fractional digits. */
export function parseEuroDecimal(value: unknown): Result<Cents, MoneyErrorCode> {
  if (typeof value !== 'string' || value !== value.trim() || !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(value)) {
    return { ok: false, code: 'INVALID_MONEY' };
  }
  if (value.length > 21) return { ok: false, code: 'MONEY_RANGE' };
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  // Construct the signed integer directly: abs(MIN_CENTS) is not signed int64.
  const magnitude = (whole + fraction.padEnd(2, '0')).replace(/^0+/, '') || '0';
  return parseCentsString((negative && magnitude !== '0' ? '-' : '') + magnitude);
}

/** Canonical exact EUR with two fractional digits, without rounding or Number. */
export function formatEuroDecimal(value: Cents): Result<string, MoneyErrorCode> {
  const checked = validateCents(value);
  if (!checked.ok) return checked;
  const signed = checked.value.toString();
  const negative = signed.startsWith('-');
  const digits = (negative ? signed.slice(1) : signed).padStart(3, '0');
  return { ok: true, value: `${negative ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}` };
}
