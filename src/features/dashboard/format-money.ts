import { parseCentsString, serializeCents } from '@/domain/money/money-codec';

/** Exact EUR cents, including negative sub-euro amounts and both int64 endpoints. */
export function formatMoney(cents: string | bigint, locale: string): string {
  const parsed = typeof cents === 'bigint' ? serializeCents(cents) : parseCentsString(cents);
  if (!parsed.ok) throw new Error('INVALID_MONEY');
  const signed = parsed.value.toString(), negative = signed.startsWith('-');
  const magnitude = BigInt(negative ? signed.slice(1) : signed);
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whole = formatter.formatToParts(magnitude / 100n).filter(p => p.type === 'integer' || p.type === 'group').map(p => p.value).join('');
  const fraction = (magnitude % 100n).toString().padStart(2, '0');
  // The negative template retains its minus sign even when the whole part is zero.
  return formatter.formatToParts(negative ? -1n : 1n).map(p => p.type === 'integer' ? whole : p.type === 'fraction' ? fraction : p.value).join('');
}
