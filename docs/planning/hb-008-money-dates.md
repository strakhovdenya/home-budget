# HB-008 — Money, dates and financial-period primitives

Status: implemented, Review; independent review and owner acceptance pending.
The owner approved the chat plan and implementation clarifications on 2026-11-02.
Branch: `feat/hb-008-money-dates`. No commit, push or PR requested or created.

## Requirements and boundaries

Sources: [HB-008](../TASKS.md), [BR-10/11](../BUSINESS_RULES.md),
[architecture](../ARCHITECTURE.md), [machine-readable layers](../architecture.json),
[data model](../DATA_MODEL.md), [conventions](../conventions.md),
[ADR 0001](../adr/0001-checkpoints-and-allocations.md),
[ADR 0002](../adr/0002-month-closing-and-corrections.md) and
[ADR 0003](../adr/0003-daily-forecast-and-liquidity.md).

Deliver signed EUR cents with checked int64 operands, intermediates and results;
exact boundary codecs; validated Berlin civil dates and financial months; pure
Gregorian date arithmetic for AD 0001..9999. UTC instants are converted explicitly.
No runtime clock is read. No new dependency is needed.

HB-009+ event writers, snapshots, operations, allocation validation, forecasts,
liquidity, reminders, historical ordering and month closing are outside this task.
No database/schema/migration/auth/UI changes. `.env.local` and
`.vscode/extensions.json` are untouched. No Neon connection or DB command.

The accepted nonnegative cash-allocation policy remains separate from signed
money: F may be negative when full R/S exceed A. These primitives neither cap
reserves nor implement a negative-bank allocation/overdraft policy. Checkpoint
authority, payment without double debit, future-fund isolation and immutable
history remain later use-case responsibilities.

## Files and dependencies

| Module | Purpose |
|---|---|
| `src/shared/pure/brand.ts` | ADR-compatible `Brand<T, N>` |
| `src/shared/pure/result.ts` | Shared readonly discriminated `Result<T, E>` |
| `src/shared/pure/calendar.ts` | BerlinDate construction, ordinal and civil arithmetic |
| `src/shared/pure/berlin-date.ts` | Known epoch-millisecond instant to BerlinDate |
| `src/domain/money/money.ts` | Types, limits, checked signed arithmetic |
| `src/domain/money/money-codec.ts` | Exact cents and EUR decimal string codecs |
| `src/domain/periods/period.ts` | Period construction, comparisons and boundaries |

Domain imports only shared/pure or its own modules. Shared/pure has no domain,
framework, ORM, Node or external package imports. There is no root shared barrel.
Existing architecture tests check every import edge; their rules are unchanged.
Existing Drizzle bigint declarations and `commit.ts` payload identity encoding
remain infrastructure-specific and unchanged; they are not duplicate public
domain primitives. Repository-wide inspection found no existing domain/calendar
implementation to reuse.

TypeScript target changes to ES2020 to permit bigint literals. Existing scripts,
lockfile, dependencies and strict settings remain in place.

## Types and errors

```ts
type Brand<T, N extends string> = T & { readonly __brand: N };
type Result<T, E extends string> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; code: E }>;
type Cents = bigint;
type NonNegativeCents = Brand<bigint, 'NonNegativeCents'>;
type NegativeCents = Brand<bigint, 'NegativeCents'>;
type BerlinDate = Brand<string, 'BerlinDate'>;
type Period = Brand<string, 'Period'>;
```

These names, brands and result shape match ADR 0003. A future forecast's
`Outcome<T>` can be the shared Result specialized with its ForecastErrorCode.
The primitive modules do not introduce a competing production Outcome type or
premature forecast error vocabulary. Compile-time tests demonstrate structural
compatibility, discrimination and rejection of date/period interchange.

Money errors: `INVALID_MONEY`, `MONEY_RANGE`, `MONEY_SIGN`, `INVALID_DIVISOR`.
Calendar/period constructors return `INVALID_DATE` / `INVALID_PERIOD`.
Shifts return `INVALID_DAY_OFFSET` / `DATE_RANGE` and
`INVALID_MONTH_OFFSET` / `PERIOD_RANGE` respectively. Instant conversion returns
`INVALID_INSTANT` / `DATE_RANGE`. Errors contain no raw input or financial data.

## Money API and boundary contract

All functions return Result; arithmetic and constructors use MoneyErrorCode.

| API | Successful value |
|---|---|
| `validateCents(unknown)` | Cents |
| `nonNegativeCents(unknown)` | NonNegativeCents, including zero |
| `negativeCents(unknown)` | NegativeCents, strictly below zero |
| `addCents(Cents, Cents)` | Checked sum |
| `subtractCents(Cents, Cents)` | Checked signed difference |
| `multiplyCents(Cents, bigint)` | Checked product; integer factor also int64 |
| `negateCents(Cents)` | Checked negation |
| `absCents(Cents)` | NonNegativeCents |
| `sumCents(readonly Cents[])` | Checked input-order sum; empty is 0n |
| `divideNonNegativeCents(NonNegativeCents, bigint)` | Readonly nonnegative quotient/remainder |
| `parseCentsString(unknown)` | Cents from canonical signed integer string |
| `serializeCents(Cents)` | Canonical cents string |
| `parseEuroDecimal(unknown)` | Cents from exact machine EUR decimal |
| `formatEuroDecimal(Cents)` | Canonical EUR decimal with two fractional digits |

`MIN_CENTS = -9223372036854775808n`, `MAX_CENTS = 9223372036854775807n`.
Every arithmetic operand is checked before use, including a factor/divisor and
values passed through a forged brand. Every result and every partial sum is
checked. `[MAX_CENTS, 1n, -1n]` fails immediately; regrouping does not conceal
overflow. Negating or taking abs of MIN_CENTS returns MONEY_RANGE. Operations
never convert money to number. Negative free amounts remain representable.

Division requires a nonnegative amount and positive int64 divisor. It preserves
`q*d+r=amount` and `0<=r<d`, with no rounding or cent disposal. Converting bounded
calendar counts to bigint belongs to the eventual caller. Clamping negative F
before forecast division remains HB-014 behavior.

Cents strings accept `0` or an optional minus followed by a nonzero-leading
decimal integer. Whitespace, plus, -0, leading zeroes, fractions, exponent,
non-ASCII digits, number and bigint inputs are rejected by the string parser.
`validateCents` accepts bigint only, rejecting even integer number inputs.

EUR input accepts `12`, `12.3`, `12.30`, `-0.01`; only dot is a separator, with
one or two digits when a fractional part exists. More digits are rejected, never
rounded. `-0` and `-0.00` become 0n. Locale punctuation is a future UI concern.
Output always has two digits: 1230n -> `12.30`, 1n -> `0.01`, 0n -> `0.00`.
Both int64 extrema round-trip; string manipulation avoids overflowing a positive
temporary monetary magnitude for MIN_CENTS. Length guards bound BigInt creation.

JSON is explicit at typed fields:

```ts
const encoded = serializeCents(amount);
if (encoded.ok) JSON.stringify({ amountCents: encoded.value });
// Decode JSON as untrusted data, then pass amountCents to parseCentsString.
```

No global bigint JSON patch/reviver or inference from arbitrary numeric strings.
Actual infrastructure adapters must adopt these codecs in their own later tasks;
this task does not silently rewrite their existing payload contracts.

## Calendar and period API

Constructors accept unknown and return Result. Functions consuming BerlinDate
or Period require a validated brand. A brand is a compile-time contract, not a
replacement for revalidating JSON/server input; unsafe casts bypass that contract.

| API | Return / meaning |
|---|---|
| `parseBerlinDate(unknown)` | Result of strict YYYY-MM-DD, years 0001..9999 |
| `calendarOrdinal(BerlinDate)` | number, 0001-01-01 = 1; 9999-12-31 = 3652059 |
| `calendarDaysBetween(from, to)` | Signed number: ordinal(to) - ordinal(from) |
| `compareDates(a, b)` | -1 / 0 / 1 |
| `remainingDaysInMonth(BerlinDate)` | Positive number including the supplied date |
| `addCalendarDays(BerlinDate, number)` | Result of shift, rejecting unsafe/fractional offset or out-of-range date |
| `berlinDateFromEpochMilliseconds(unknown)` | Result of Berlin date from a known integer-millisecond instant |
| `parsePeriod(unknown)` | Result of strict YYYY-MM, years 0001..9999 |
| `periodOf(BerlinDate)` | Period |
| `comparePeriods(a, b)` | -1 / 0 / 1 |
| `daysInMonth(Period)` | number, 28..31 |
| `startOfMonth(Period)` / `endOfMonth(Period)` | BerlinDate |
| `shiftPeriod(Period, number)` | Result of integer month shift within supported years |

Pure proleptic Gregorian leap-year/ordinal arithmetic supports early years
without Date.UTC, Date constructor year remapping, elapsed milliseconds or
24-hour day assumptions. Binary search resolves an ordinal back to a year;
month arithmetic stays in bounded integers. No date-to-instant conversion is
needed for civil calculations. Advancing beyond 9999-12-31 or before 0001-01-01
fails explicitly; month-end construction works even for 9999-12.

Only explicit instant conversion uses Date, with a supplied safe integer
millisecond value in the Date-supported range, and Intl.formatToParts with
Europe/Berlin, Gregorian calendar, Latin digits and an AD-era check. A date
outside supported Berlin years returns DATE_RANGE. No hidden now/system zone.
IANA historical offsets are used rather than a hardcoded +01/+02 assumption.
ICU/tzdata availability/version remains a runtime dependency of this conversion.

No parser for ambiguous or nonexistent local wall-clock time is introduced.
Callers must supply a known instant; date-only facts remain date-only. A bank
date does not determine the financing month or historical same-day ordering.

## Reviewable implementation blocks and proof

These are subdivisions of HB-008, not new backlog tasks. Each block has at most
five acceptance gates and seven grouped test cases.

1. Shared types and arithmetic: ADR-compatible types; int64 checked operands and
   results; ordered partial sums; explicit sign checks; exact division.
   Cases: exact signed arithmetic; >safe-number precision; result overflow;
   invalid operands hidden by cancellation/zero; MIN negation/abs; ordered sums;
   quotient/remainder and invalid divisors.
2. Boundary codecs: explicit strings; exact EUR; canonical two-digit output;
   JSON precision; bounded BigInt construction.
   Cases: cents round-trip; invalid syntax/types; cents range; decimal examples;
   decimal syntax/no rounding; decimal extrema/range; outbound revalidation.
3. Gregorian calendar and periods: strict brands; all supported years; civil
   ordinal arithmetic; bounded shifts; inclusive days and comparisons.
   Cases: valid/invalid formats; independently pinned ordinals; leap/century
   transitions; date shifts/range; month boundaries; period shifts/comparisons;
   first/last-day round-trips in every month of all 9999 supported years.
4. Instant conversion: explicit known milliseconds; Berlin timezone; Gregorian
   AD range; DST civil semantics; no implicit clock.
   Cases: UTC/local midnight boundaries; early/late years; invalid instants;
   out-of-range dates; spring 23-hour day; autumn 25-hour day; seven civil days
   across 167/169 elapsed hours.
5. Integration of primitives: compile-time safety; no external imports; existing
   app checks; timezone independence; evidence/status review gate.
   Cases: forbidden money number/date/period types; Outcome compatibility;
   existing architecture test; full unit suite; both process timezone runs;
   lint/types/build; tracked and untracked whitespace/status inspection.

Scenario trace: [HB3-002/003/008/009/023..026/032](../../tests/scenarios/phase-01/hb-003-daily-forecast.md),
[HBL-015/025/026](../../tests/scenarios/phase-01/hb-003-safe-liquidity.md),
[core BR examples](../../tests/scenarios/phase-01/core-rules.md).
Only their primitive arithmetic/calendar assertions are implemented here.
No complete financial scenario or forecast API is claimed implemented.

Commands, actual results, residual risks and independent-review checklist are in
[verification](hb-008-verification.md). HB-008 remains Review until independent
review and explicit owner acceptance. No unresolved product assumption was
implemented; existing overdraft and multi-source CARRY questions remain excluded.
