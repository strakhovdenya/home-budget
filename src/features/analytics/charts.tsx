'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box, Button, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Check, Month } from '@/domain/analytics/contracts';

type AmountFormatter = (value: string | null) => string;
type DateFormatter = (value: string) => string;
type Scale = Readonly<{ minimum: bigint; maximum: bigint }>;
const plotTop = 28;
const plotBottom = 220;

function ordinate(value: bigint, scale: Scale): number {
  return plotTop + Number((scale.maximum - value) * BigInt(plotBottom - plotTop)
    / (scale.maximum - scale.minimum));
}

function checkLayout(checks: readonly Check[], width: number, formatAmount: AmountFormatter) {
  const balances = checks.map(check => BigInt(check.balance));
  const minimum = balances.reduce((left, right) => left < right ? left : right);
  const maximum = balances.reduce((left, right) => left > right ? left : right);
  const padding = (maximum - minimum) / 10n || 1n;
  const scale = {
    minimum: minimum > padding ? minimum - padding : 0n,
    maximum: maximum + padding > 9223372036854775807n ? 9223372036854775807n : maximum + padding
  };
  const days = checks.map(check => BigInt(Date.parse(`${check.observedDate}T00:00:00Z`)));
  const first = days.reduce((left, right) => left < right ? left : right);
  const last = days.reduce((left, right) => left > right ? left : right);
  const labelLength = Math.max(formatAmount(scale.minimum.toString()).length, formatAmount(scale.maximum.toString()).length);
  const left = Math.min(width - 70, Math.max(95, labelLength * 7 + 18));
  const right = width - 30;
  const points = checks.map((check, index) => ({
    check,
    x: first === last ? Math.floor((left + right) / 2)
      : left + Number((days[index] - first) * BigInt(right - left) / (last - first)),
    y: ordinate(BigInt(check.balance), scale)
  }));

  return { scale, points, left, right, first, last };
}

function canConnect(from: Check, to: Check): boolean {
  if (from.observedDate !== to.observedDate) {
    return from.observedDate < to.observedDate;
  }
  if (from.observedAt === null || to.observedAt === null) {
    return false;
  }
  // Preserve sub-millisecond evidence: Date.parse would collapse distinct instants.
  return from.observedAt < to.observedAt;
}

function MoneyAxis({ scale, left, right, formatAmount }: {
  scale: Scale;
  left: number;
  right: number;
  formatAmount: AmountFormatter;
}) {
  const ticks = [...new Set([0n, 1n, 2n, 3n, 4n].map(index => (
    scale.minimum + (scale.maximum - scale.minimum) * index / 4n
  )))];

  return (
    <g fill="currentColor" fontSize="13">
      <line x1={left} x2={left} y1={plotTop} y2={plotBottom} stroke="currentColor" />
      {ticks.map(value => (
        <g key={value.toString()}>
          <line x1={left} x2={right} y1={ordinate(value, scale)} y2={ordinate(value, scale)}
            stroke="currentColor" opacity={0.15} />
          <text x={left - 9} y={ordinate(value, scale)} textAnchor="end" dominantBaseline="middle">
            {formatAmount(value.toString())}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Pure plot callbacks identify observations; the screen decides whether to inspect or compare. */
export function CheckDots({ checks, label, pointLabel, onSelect, connect = false,
  formatAmount = value => value ?? '', formatDate = value => value, onPreview }: {
  checks: readonly Check[];
  label: string;
  pointLabel: (check: Check) => string;
  onSelect: (id: string) => void;
  connect?: boolean;
  formatAmount?: AmountFormatter;
  formatDate?: DateFormatter;
  onPreview?: (check: Check | null) => void;
}) {
  const theme = useTheme();
  const palette = theme.vars?.palette ?? theme.palette;
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  if (!checks.length) {
    return null;
  }
  const width = isMobile ? 320 : 800;
  const { scale, points, left, right, first, last } = checkLayout(checks, width, formatAmount);
  const firstDate = new Date(Number(first)).toISOString().slice(0, 10);
  const lastDate = new Date(Number(last)).toISOString().slice(0, 10);

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} 260`}
      style={{ width: '100%', display: 'block' }}>
      <title>{label}</title>
      <MoneyAxis scale={scale} left={left} right={right} formatAmount={formatAmount} />
      <line x1={left} y1={plotBottom} x2={right} y2={plotBottom} stroke="currentColor" />
      <g fill="currentColor" fontSize="13">
        <text x={first === last ? points[0].x : left} y="250" textAnchor={first === last ? 'middle' : 'start'}>
          {formatDate(firstDate)}
        </text>
        {last !== first && <text x={right} y="250" textAnchor="end">{formatDate(lastDate)}</text>}
      </g>
      {connect && points.slice(1).map((point, index) => {
        const previous = points[index];
        if (!canConnect(previous.check, point.check)) {
          return null;
        }
        return (
          <line key={point.check.id} data-check-connection="true"
            x1={previous.x} y1={previous.y} x2={point.x} y2={point.y}
            stroke={palette.primary.main} strokeWidth="2" pointerEvents="none" />
        );
      })}
      {points.map(({ check, x, y }) => {
        const coincident = points.filter(point => point.x === x && point.y === y);
        const ordinal = coincident.findIndex(point => point.check.id === check.id);
        const isCoincident = coincident.length > 1;
        const circumference = 2 * Math.PI * 7;
        const segment = circumference / coincident.length;
        let accessibleLabel = pointLabel(check);
        if (isCoincident) {
          accessibleLabel = `${accessibleLabel} (${ordinal + 1}/${coincident.length})`;
        }
        return (
          <g key={check.id}>
            <rect x={x - 22} y={y - 22} width="44" height="44" fill="transparent"
              style={{ cursor: 'pointer' }} onClick={() => onSelect(check.id)}
              onPointerEnter={event => {
                if (event.pointerType === 'mouse') {
                  onPreview?.(check);
                }
              }} onPointerLeave={() => onPreview?.(null)}>
              <title>{accessibleLabel}</title>
            </rect>
            <circle cx={x} cy={y} r={isCoincident ? 7 : 5}
              fill={isCoincident ? 'none' : palette.primary.main}
              stroke={isCoincident ? palette.primary.main : undefined}
              strokeWidth={isCoincident ? 6 : undefined}
              strokeDasharray={isCoincident ? `${segment * 0.8} ${circumference - segment * 0.8}` : undefined}
              strokeDashoffset={isCoincident ? -ordinal * segment : undefined}
              role="button" tabIndex={0} aria-label={accessibleLabel} style={{ cursor: 'pointer' }}
              onClick={() => onSelect(check.id)} onPointerEnter={event => {
                if (event.pointerType === 'mouse') {
                  onPreview?.(check);
                }
              }} onPointerLeave={() => onPreview?.(null)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(check.id);
                }
              }}>
              <title>{accessibleLabel}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

export function CheckChart({ checks, label, pointLabel, formatAmount, formatDate, onSelect }: {
  checks: readonly Check[];
  label: string;
  pointLabel: (check: Check) => string;
  formatAmount: AmountFormatter;
  formatDate: DateFormatter;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('analytics');
  const locale = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [connect, setConnect] = useState(false);
  const [details, setDetails] = useState<readonly Check[]>([]);
  const [preview, setPreview] = useState<Check | null>(null);
  if (!checks.length) {
    return null;
  }
  const last = checks[checks.length - 1];
  const shortDate = (value: string) => new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit'
  }).format(new Date(`${value}T00:00:00Z`));

  function inspect(id: string) {
    const { points } = checkLayout(checks, isMobile ? 320 : 800, formatAmount);
    const selected = points.find(point => point.check.id === id);
    if (!selected) {
      return;
    }
    const nearby = points.filter(point => Math.hypot(point.x - selected.x, point.y - selected.y) <= 28);
    setPreview(null);
    setDetails(nearby.map(point => point.check));
  }

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2">{t('chartPageChecks')}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>
        {t('chartLastShown')}: <strong>{formatDate(last.observedDate)} · {formatAmount(last.balance)}</strong>
      </Typography>
      <ToggleButtonGroup exclusive value={connect} size="small" aria-label={t('chartDisplay')}
        onChange={(_, value: boolean | null) => {
          if (value !== null) {
            setConnect(value);
          }
        }} sx={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        <ToggleButton value={false}>{t('chartPoints')}</ToggleButton>
        <ToggleButton value={true}>{t('chartConnect')}</ToggleButton>
      </ToggleButtonGroup>
      {connect && <Typography variant="body2">{t('chartLineNotice')}</Typography>}
      <Typography variant="body2">{t('chartBalanceAxis')}</Typography>
      <CheckDots checks={checks} label={connect ? t('chartConnect') : label} pointLabel={pointLabel} onSelect={inspect}
        connect={connect} formatAmount={formatAmount} formatDate={shortDate} onPreview={setPreview} />
      <Typography variant="body2" sx={{ textAlign: 'center' }}>{t('chartDateAxis')}</Typography>
      {preview && <Typography role="status">{pointLabel(preview)}</Typography>}
      {details.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('chartDetails')}</Typography>
              {details.length > 1 && <Typography variant="body2">{t('chartNearby')}</Typography>}
              {details.map((check, index) => (
                <Box key={check.id} sx={{ overflowWrap: 'anywhere' }}>
                  {details.length > 1 ? (
                    <Button fullWidth onClick={() => setDetails([check])}>
                      {index + 1}. {pointLabel(check)}
                    </Button>
                  ) : (
                    <Stack spacing={1}>
                      <Typography>{pointLabel(check)}</Typography>
                      <Typography variant="body2">{check.observedAt ?? t('timeUnknown')}</Typography>
                      <Button onClick={() => onSelect(check.id)}>{t('chooseCheck')}</Button>
                    </Stack>
                  )}
                </Box>
              ))}
              <Button onClick={() => setDetails([])}>{t('chartClose')}</Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

const series = ['allocated', 'reserved', 'savings', 'free'] as const;
type Series = typeof series[number];
type MonthValue = Readonly<{ month: Month; series: Series }>;

export function MonthBars({ months, label, formatAmount, formatPeriod }: {
  months: readonly Month[];
  label: string;
  formatAmount: AmountFormatter;
  formatPeriod: DateFormatter;
}) {
  const theme = useTheme();
  const palette = theme.vars?.palette ?? theme.palette;
  const t = useTranslations('analytics');
  const locale = useLocale();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [windowIndex, setWindowIndex] = useState(0);
  const [details, setDetails] = useState<MonthValue | null>(null);
  const [preview, setPreview] = useState<MonthValue | null>(null);
  if (!months.length) {
    return null;
  }
  const values = months.flatMap(month => series.flatMap(key => {
    const value = month[key];
    return value === null ? [] : [BigInt(value)];
  }));
  const maximum = values.reduce((left, right) => left > right ? left : right, 1n);
  const minimum = values.reduce((left, right) => left < right ? left : right, 0n);
  const scale = { minimum, maximum };
  const width = isMobile ? 320 : 1000;
  const labelLength = Math.max(formatAmount(minimum.toString()).length, formatAmount(maximum.toString()).length);
  const left = Math.min(width - 70, Math.max(95, labelLength * 7 + 18));
  const right = width - 20;
  const windowSize = isMobile ? 1 : 3;
  const start = Math.min(windowIndex, Math.max(0, months.length - windowSize));
  const visible = months.slice(start, start + windowSize);
  const groupWidth = (right - left) / visible.length;
  const zero = ordinate(0n, scale);
  const colors = {
    allocated: palette.primary.main,
    reserved: palette.warning.main,
    savings: palette.secondary.main,
    free: palette.error.main
  };
  const shortMonth = (period: string) => new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Berlin', month: 'short', year: '2-digit'
  }).format(new Date(`${period}-01T00:00:00Z`));
  const valueLabel = (value: MonthValue) => (
    `${formatPeriod(value.month.period)} · ${t(value.series)}: ${formatAmount(value.month[value.series])}`
  );

  function showWindow(next: number) {
    setWindowIndex(next);
    setDetails(null);
    setPreview(null);
  }

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        {series.map(key => (
          <Stack key={key} direction="row" sx={{ alignItems: 'center' }} spacing={0.75}>
            <Box component="span" sx={{ width: 14, height: 14, bgcolor: colors[key], border: '1px solid currentColor' }} />
            <Typography variant="body2">{t(key)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Typography variant="body2">{t('chartMonthRange', {
        from: formatPeriod(visible[0].period), to: formatPeriod(visible[visible.length - 1].period)
      })}</Typography>
      <Typography variant="body2">EUR</Typography>
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} 275`}
        data-scale-min={minimum.toString()} data-scale-max={maximum.toString()}
        style={{ width: '100%', display: 'block' }}>
        <title>{label}</title>
        <MoneyAxis scale={scale} left={left} right={right} formatAmount={formatAmount} />
        <line data-zero-axis="true" x1={left} x2={right} y1={zero} y2={zero} stroke="currentColor" />
        <text x={width - 3} y={zero - 7} textAnchor="end" fontSize="13" fill="currentColor">0</text>
        {visible.map((month, index) => (
          <g key={month.period}>
            {series.map((key, column) => {
              const amount = month[key];
              if (amount === null) {
                return null;
              }
              const y = ordinate(BigInt(amount), scale);
              const barWidth = groupWidth / 5;
              const x = left + index * groupWidth + column * barWidth + barWidth / 2;
              const selection = { month, series: key };
              const text = valueLabel(selection);
              const showValue = !isMobile && formatAmount(amount).length * 7 < barWidth;

              return (
                <g key={key}>
                  <rect data-series={key} data-period={month.period} x={x} y={Math.min(zero, y)}
                    width={barWidth * 0.8} height={Math.abs(zero - y)} fill={colors[key]} />
                  <rect x={x - 4} y={Math.min(zero, y) - 10} width={barWidth * 0.8 + 8}
                    height={Math.max(44, Math.abs(zero - y) + 20)} fill="transparent"
                    role="button" tabIndex={0} aria-label={text} style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setPreview(null);
                      setDetails(selection);
                    }} onPointerEnter={event => {
                      if (event.pointerType === 'mouse') {
                        setPreview(selection);
                      }
                    }} onPointerLeave={() => setPreview(null)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setDetails(selection);
                      }
                    }}>
                    <title>{text}</title>
                  </rect>
                  {showValue && (
                    <text x={x + barWidth * 0.4} y={BigInt(amount) < 0n ? y + 17 : y - 8}
                      fontSize="13" textAnchor="middle" fill="currentColor" pointerEvents="none">
                      {formatAmount(amount)}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={left + (index + 0.5) * groupWidth} y="266" textAnchor="middle" fontSize="14" fill="currentColor">
              {shortMonth(month.period)}
            </text>
          </g>
        ))}
      </svg>
      <Typography variant="body2" sx={{ textAlign: 'center' }}>{t('financialMonths')}</Typography>
      {visible.some(month => month.allocated === null || month.free === null) && (
        <Typography variant="body2">{t('unknown')}</Typography>
      )}
      {months.length > windowSize && (
        <Stack direction="row" spacing={1}>
          <Button disabled={start === 0} onClick={() => showWindow(Math.max(0, start - windowSize))}>{t('chartPrevious')}</Button>
          <Button disabled={start + windowSize >= months.length} onClick={() => showWindow(start + windowSize)}>{t('chartNext')}</Button>
        </Stack>
      )}
      {preview && <Typography role="status" sx={{ overflowWrap: 'anywhere' }}>{valueLabel(preview)}</Typography>}
      {details && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography sx={{ overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>{valueLabel(details)}</Typography>
              <Button onClick={() => setDetails(null)}>{t('chartClose')}</Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
