// Compiled by pnpm typecheck; intentionally not executed as a runtime test.
import { addCents, divideNonNegativeCents, nonNegativeCents, type Cents } from '@/domain/money/money';
import { parseCentsString } from '@/domain/money/money-codec';
import { comparePeriods, parsePeriod, type Period } from '@/domain/periods/period';
import { calendarOrdinal, parseBerlinDate, type BerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';

// The concrete error union belongs to a future forecast module, as in ADR 0003.
type Outcome<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; code: 'MONEY_RANGE' }>;

export function checkHb008Types(cents: Cents, date: BerlinDate, period: Period): void {
  addCents(cents, 1n);
  calendarOrdinal(date);
  comparePeriods(period, period);

  // @ts-expect-error Fractional number cannot be assigned to money.
  const fractional: Cents = 0.01;
  // @ts-expect-error Even integer number cannot enter arithmetic implicitly.
  addCents(1, cents);
  // @ts-expect-error Raw strings require a date constructor.
  calendarOrdinal('2026-01-01');
  // @ts-expect-error Period and BerlinDate have distinct ADR brands.
  calendarOrdinal(period);
  // @ts-expect-error BerlinDate cannot masquerade as a financial period.
  comparePeriods(date, period);
  // @ts-expect-error Signed cents need an explicit nonnegative check before division.
  divideNonNegativeCents(cents, 3n);
  void fractional;

  const checked = nonNegativeCents(cents);
  if (checked.ok) divideNonNegativeCents(checked.value, 3n);
  const parsed = parseCentsString('1');
  if (parsed.ok) {
    const exact: bigint = parsed.value;
    void exact;
  } else {
    const code: string = parsed.code;
    void code;
    // @ts-expect-error Error branch has no invented value.
    void parsed.value;
  }
  const parsedDate = parseBerlinDate('2026-01-01');
  if (parsedDate.ok) calendarOrdinal(parsedDate.value);
  const parsedPeriod = parsePeriod('2026-01');
  if (parsedPeriod.ok) comparePeriods(parsedPeriod.value, period);

  const result: Result<Cents, 'MONEY_RANGE'> = { ok: true, value: cents };
  const outcome: Outcome<Cents> = result;
  const compatible: Result<Cents, 'MONEY_RANGE'> = outcome;
  const error: Outcome<Cents> = { ok: false, code: 'MONEY_RANGE' };
  const compatibleError: Result<Cents, 'MONEY_RANGE'> = error;
  void compatible;
  void compatibleError;
}
