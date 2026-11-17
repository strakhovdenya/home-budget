'use client';

import { useTheme } from '@mui/material/styles';
import type { Check, Month } from '@/domain/analytics/contracts';

/** Integer pixel coordinates only; no financial amount is rounded or recomputed. */
export function CheckDots({ checks, label, pointLabel, onSelect }: {
  checks: readonly Check[];
  label: string;
  pointLabel: (check: Check) => string;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  if (!checks.length) {
    return null;
  }

  const days = checks.map(check => BigInt(Date.parse(`${check.observedDate}T00:00:00Z`)));
  const minimum = days.reduce((left, right) => left < right ? left : right);
  const maximum = days.reduce((left, right) => left > right ? left : right);
  const maximumBalance = checks.reduce(
    (total, check) => BigInt(check.balance) > total ? BigInt(check.balance) : total,
    1n
  );
  const span = maximum - minimum || 1n;
  const points = checks.map((check, index) => ({
    check,
    x: 35 + Number((days[index] - minimum) * 530n / span),
    y: 155 - Number(BigInt(check.balance) * 125n / maximumBalance)
  }));

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 600 180"
      style={{
        width: '100%',
        maxHeight: 220
      }}
    >
      <title>
        {label}
      </title>
      <line
        x1="35"
        y1="155"
        x2="565"
        y2="155"
        stroke={theme.palette.text.secondary}
      />
      {points.map(({ check, x, y }) => {
        const coincident = points.filter(point => point.x === x && point.y === y);
        const ordinal = coincident.findIndex(point => point.check.id === check.id);
        const isCoincident = coincident.length > 1;
        const circumference = 2 * Math.PI * 7;
        const segment = circumference / coincident.length;
        const label = pointLabel(check);
        let accessibleLabel = label;
        if (isCoincident) {
          accessibleLabel = `${label} (${ordinal + 1}/${coincident.length})`;
        }

        // Disjoint arcs share the true coordinate; no date or balance is displaced.
        return (
          <circle
            key={check.id}
            cx={x}
            cy={y}
            r={isCoincident ? 7 : 5}
            fill={isCoincident ? 'none' : theme.palette.primary.main}
            stroke={isCoincident ? theme.palette.primary.main : undefined}
            strokeWidth={isCoincident ? 6 : undefined}
            strokeDasharray={isCoincident ? `${segment * 0.8} ${circumference - segment * 0.8}` : undefined}
            strokeDashoffset={isCoincident ? -ordinal * segment : undefined}
            role="button"
            tabIndex={0}
            aria-label={accessibleLabel}
            style={{
              cursor: 'pointer'
            }}
            onClick={() => onSelect(check.id)}
            onKeyDown={event => {
              if (
                event.key === 'Enter'
                || event.key === ' '
              ) {
                event.preventDefault();
                onSelect(check.id);
              }
            }}
          >
            <title>
              {accessibleLabel}
            </title>
          </circle>
        );
      })}
    </svg>
  );
}

export function MonthBars({ months, label }: {
  months: readonly Month[];
  label: string;
}) {
  const theme = useTheme();
  const known = months.filter(month => month.allocated !== null
    && month.free !== null);
  if (!known.length) {
    return null;
  }

  const values = known.flatMap(month => [
    BigInt(month.allocated!),
    BigInt(month.reserved),
    BigInt(month.savings),
    BigInt(month.free!)
  ]);
  const maximum = values.reduce((left, right) => left > right ? left : right, 1n);
  const minimum = values.reduce((left, right) => left < right ? left : right, 0n);
  const span = maximum - minimum;
  const y = (value: bigint) => 15 + Number((maximum - value) * 150n / span);
  const zero = y(0n);
  const colors = [
    theme.palette.primary.main,
    theme.palette.warning.main,
    theme.palette.secondary.main,
    theme.palette.error.main
  ];

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 720 195"
      style={{
        width: '100%',
        maxHeight: 240
      }}
    >
      <title>
        {label}
      </title>
      <line
        x1="25"
        y1={zero}
        x2="710"
        y2={zero}
        stroke={theme.palette.text.secondary}
      />
      <text
        x="2"
        y={zero}
        fill="currentColor"
        fontSize="11"
      >0</text>
      {known.map((month, index) => {
        const width = Math.floor(680 / known.length);

        return (
          <g key={month.period}>
            {[month.allocated!, month.reserved, month.savings, month.free!].map((amount, column) => {
              const ordinate = y(BigInt(amount));

              return (
                <rect
                  key={column}
                  x={30 + index * width + column * Math.max(3, Math.floor(width / 5))}
                  y={Math.min(zero, ordinate)}
                  width={Math.max(2, Math.floor(width / 6))}
                  height={Math.abs(zero - ordinate)}
                  fill={colors[column]}
                />
              );
            })}
            <text
              x={30 + index * width}
              y="190"
              fontSize="9"
              fill="currentColor"
            >
              {month.period}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
