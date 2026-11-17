'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import type { Basis, Choices, Filters, Page, Query, Selection, View } from '@/domain/analytics/contracts';
import { sameBasis } from '@/domain/analytics/validation';
import type { AnalyticsActions } from './read-analytics';
import { matchesQuery, matchesSelection } from './response';
import { CheckDots, MonthBars } from './charts';
import { formatMoney } from '@/features/dashboard/format-money';
import { formatCalendarDate, formatMonth } from '@/features/dashboard/presentation';

const currentSelection: Selection = {
  dayH: null,
  knowledgeAnchor: null,
  report: null
};

const numericStyle = {
  fontVariantNumeric: 'tabular-nums',
  overflowWrap: 'anywhere'
} as const;

function visibleRowCount(page: Page): number {
  if (page.view === 'CHECKPOINTS') {
    return page.checks.length;
  }

  if (page.view === 'MONTHS') {
    return page.months.length;
  }

  return page.identities.length;
}

export function AnalyticsScreen({ actions }: {
  actions: AnalyticsActions;
}) {
  const t = useTranslations('analytics');
  const locale = useLocale();
  const [page, setPage] = useState<Page | null>(null);
  const [view, setView] = useState<View>('CHECKPOINTS');
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters | null>(null);
  const [previous, setPrevious] = useState<Query[]>([]);
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
  const [day, setDay] = useState('');
  const [knowledge, setKnowledge] = useState('');
  const [choices, setChoices] = useState<Choices | null>(null);
  const [areChoicesBusy, setAreChoicesBusy] = useState(false);
  const requestGeneration = useRef(0);
  const currentBasis = useRef<Basis | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const choicesGeneration = useRef(0);
  const retry = useRef<(() => void) | null>(null);
  const enqueue = useCallback(
    <T,>(run: () => Promise<T>): Promise<T> => {
      const next = queue.current.catch(() => undefined).then(run);
      queue.current = next;

      return next;
    },
    []);
  const formatAmount = (value: string | null) => value === null ? t('unknown') : formatMoney(value, locale);
  const formatDate = (value: string) => formatCalendarDate(value, locale);

  function formatSavedAt(value: string) {
    return new Intl.DateTimeFormat(
      locale,
      {
        timeZone: 'Europe/Berlin',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
  }

  const openAction = actions.open;
  useEffect(
    () => {
      const token = ++requestGeneration.current;
      let disposed = false;
      void enqueue(() => openAction({
        schemaVersion: 1,
        selection: currentSelection
      })).then(result => {
        if (
          disposed
          || token !== requestGeneration.current
        ) {
          return;
        }

        if (!result.ok) {
          setError(result.code);

          return;
        }

        if (!matchesSelection(result.value, currentSelection)) {
          setError('INVALID_INPUT');

          return;
        }

        currentBasis.current = result.value.basis;
        setPage(result.value);
        setFilters(result.value.query.filters);
        setDay(result.value.basis.dayH);
      }).catch(() => {
        if (
          !disposed
          && token === requestGeneration.current
        ) {
          setError('STORAGE_ERROR');
        }
      })
        .finally(() => {
          if (
            !disposed
            && token === requestGeneration.current
          ) {
            setIsBusy(false);
          }
        });

      return () => {
        disposed = true;
        requestGeneration.current++;
        choicesGeneration.current++;
      };
    },
    [enqueue, openAction]);

  async function openSelection(selection: Selection, expected?: Basis) {
    const token = ++requestGeneration.current;
    choicesGeneration.current++;
    setAreChoicesBusy(false);
    setIsBusy(true);
    setError('');
    setPage(null);
    currentBasis.current = null;
    setSelectedCheckIds([]);
    setPrevious([]);
    setChoices(null);
    setKnowledge('');
    retry.current = () => {
      void openSelection(selection, expected);
    };

    try {
      const result = await enqueue(() => actions.open({
        schemaVersion: 1,
        selection
      }));
      if (token !== requestGeneration.current) {
        return;
      }

      if (!result.ok) {
        setError(result.code);

        return;
      }

      if (
        !matchesSelection(result.value, selection)
        || expected
        && (result.value.basis.dayH !== expected.dayH
          || result.value.basis.stateCut !== expected.stateCut)
      ) {
        setError('INVALID_INPUT');

        return;
      }

      currentBasis.current = result.value.basis;
      setPage(result.value);
      setFilters(result.value.query.filters);
      setDay(result.value.basis.dayH);
      setKnowledge('');
      setView('CHECKPOINTS');
    } catch {
      if (token === requestGeneration.current) {
        setError('STORAGE_ERROR');
      }
    } finally {
      if (token === requestGeneration.current) {
        setIsBusy(false);
      }
    }
  }

  async function loadPage(query: Query, stack: Query[] = []) {
    const token = ++requestGeneration.current;
    setIsBusy(true);
    setError('');
    retry.current = () => {
      void loadPage(query, stack);
    };

    try {
      const result = await enqueue(() => actions.read(query));
      if (token !== requestGeneration.current) {
        return;
      }

      if (!result.ok) {
        setError(result.code);

        return;
      }

      if (!matchesQuery(result.value, query)) {
        setError('INVALID_INPUT');

        return;
      }

      setPage(result.value);
      setFilters(result.value.query.filters);
      setPrevious(stack);
      setView(result.value.view);
    } catch {
      if (token === requestGeneration.current) {
        setError('STORAGE_ERROR');
      }
    } finally {
      if (token === requestGeneration.current) {
        setIsBusy(false);
      }
    }
  }

  async function loadChoices(beforeSeq: string | null) {
    if (!page) {
      return;
    }

    const basis = page.basis;
    const token = ++choicesGeneration.current;
    setAreChoicesBusy(true);

    try {
      const result = await enqueue(() => actions.choices({
        schemaVersion: 1,
        basis,
        beforeSeq
      }));
      if (
        token !== choicesGeneration.current
        || !currentBasis.current
        || !sameBasis(currentBasis.current, basis)
      ) {
        return;
      }

      if (!result.ok) {
        setError(result.code);

        return;
      }

      if (!sameBasis(result.value.basis, basis)) {
        setError('INVALID_INPUT');

        return;
      }

      setChoices(result.value);
    } catch {
      if (token === choicesGeneration.current) {
        setError('STORAGE_ERROR');
      }
    } finally {
      if (token === choicesGeneration.current) {
        setAreChoicesBusy(false);
      }
    }
  }

  function chooseCheck(id: string) {
    if (
      !page
      || page.view !== 'CHECKPOINTS'
      || page.basis.report !== null
    ) {
      return;
    }

    let next: string[];

    if (selectedCheckIds.includes(id)) {
      next = selectedCheckIds.filter(value => value !== id);
    } else {
      next = [...selectedCheckIds, id].slice(-2);
    }

    setSelectedCheckIds(next);
    if (next.length === 2) {
      void loadPage({
        ...page.query,
        cursor: null,
        compare: [next[0], next[1]]
      });
    }
  }

  function changeView(next: View) {
    if (
      !page
      || !filters
    ) {
      return;
    }

    setSelectedCheckIds([]);
    setView(next);
    void loadPage({
      ...page.query,
      view: next,
      filters,
      cursor: null,
      compare: null
    });
  }

  function renderFilterField(key: keyof Filters, label: string, type = 'date') {
    if (!filters) {
      return null;
    }

    return (
      <TextField
        label={label}
        type={type}
        value={filters[key] ?? ''}
        disabled={isBusy}
        size="small"
        slotProps={{
          inputLabel: {
            shrink: true
          }
        }}
        sx={{
          minWidth: 0,
          flex: {
            xs: '0 0 auto',
            sm: '1 1 160px'
          },
          width: {
            xs: '100%',
            sm: 'auto'
          }
        }}
        onChange={event => {
          const value = event.target.value;
          if (
            key === 'from'
            || key === 'to'
          ) {
            setFilters({
              ...filters,
              [key]: value
            });
          } else {
            setFilters({
              ...filters,
              [key]: value
                || null
            });
          }
        }}
      />
    );
  }

  const hasVisiblePage = page
    && !isBusy
    && !error;
  const filterControls = page
    && filters
    && (
      <Box
        component="fieldset"
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          minWidth: 0
        }}
      >
        <legend>
          {view === 'CHECKPOINTS' ? t('checkDates') : t('financialMonths')}
        </legend>
        <Stack
          direction={{
            xs: 'column',
            sm: 'row'
          }}
          spacing={2}
          sx={{
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          {renderFilterField('from', t('from'))}
          {renderFilterField('to', t('to'))}
          {view === 'FUNDING'
            && (
              <>
                {renderFilterField('origin', t('origin'), 'month')}
                {renderFilterField('funding', t('fundingMonth'), 'month')}
              </>
            )}
        </Stack>
        <Typography variant="caption">
          {t('windowHint')}
        </Typography>
        <Button
          disabled={isBusy}
          onClick={() => {
            setSelectedCheckIds([]);
            void loadPage({
              ...page.query,
              view,
              filters,
              cursor: null,
              compare: null
            });
          }}
        >
          {t('apply')}
        </Button>
      </Box>
    );

  return (
    <Stack spacing={3} sx={{
      minWidth: 0,
      maxWidth: '100%',
      overflowWrap: 'anywhere'
    }}>
      <Typography variant="h4" component="h1">
        {t('title')}
      </Typography>
      <Typography color="text.secondary">
        {t('intro')}
      </Typography>
      {page
        && (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6" component="h2">
                  {t('stateDate')}: {formatDate(page.basis.dayH)}
                </Typography>
                <Typography>
                  {t('bankDate')}: {page.lastCheck ? formatDate(page.lastCheck.observedDate) : t('unknown')}
                </Typography>
                <Typography variant="h5" sx={numericStyle}>
                  {t('lastBalance')}: {formatAmount(page.lastCheck?.balance ?? null)}
                </Typography>
                {page.lastCheck
                  && page.lastCheck.observedDate < page.basis.dayH
                  && (
                    <Alert severity="info">
                      {t('olderCheck')}
                    </Alert>
                  )}
                {page.basis.report
                  && (
                    <>
                      <Typography>
                        {t('reportVersion', {
                          version: page.basis.report.version
                        })}
                      </Typography>
                      <Typography>
                        {t('endBalance')}: {formatAmount(page.endBalance)}
                      </Typography>
                    </>
                  )}
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    void openSelection({
                      dayH: page.basis.report ? null : page.basis.dayH,
                      knowledgeAnchor: null,
                      report: page.basis.report
                    });
                  }}
                >
                  {t('refresh')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      <Box
        component="details"
        onToggle={event => {
          if (
            event.currentTarget.open
            && page
            && !choices
            && !areChoicesBusy
          ) {
            void loadChoices(null);
          }
        }}
      >
        <Box component="summary" sx={{
          cursor: 'pointer',
          py: 1
        }}>
          {t('sourcesSettings')}
        </Box>
        <Stack spacing={2} sx={{
          pt: 2
        }}>
          <TextField
            label={t('stateDate')}
            type="date"
            value={day}
            disabled={isBusy}
            slotProps={{
              inputLabel: {
                shrink: true
              }
            }}
            onChange={event => setDay(event.target.value)}
          />
          <TextField
            label={t('knowledge')}
            select
            value={knowledge}
            disabled={isBusy
              || areChoicesBusy}
            onChange={event => setKnowledge(event.target.value)}
          >
            <MenuItem value="">
              {t('sameKnowledge')}
            </MenuItem>
            {choices?.items.map(item => (
              <MenuItem key={item.id} value={item.id}>
                {formatSavedAt(item.recordedAt)}
              </MenuItem>
            ))}
          </TextField>
          <Button
            disabled={isBusy
              || !page
              || !knowledge
              && page.basis.stateCut === '0'}
            onClick={() => {
              void openSelection({
                dayH: day,
                knowledgeAnchor: knowledge
                  || page?.basis.stateAnchor
                  || null,
                report: null
              });
            }}
          >
            {t('showState')}
          </Button>
          {choices?.items.filter(item => item.report !== null).map(item => (
            <Button
              key={item.id}
              disabled={isBusy}
              onClick={() => {
                if (!item.report) {
                  return;
                }

                const { period, ...report } = item.report;
                void period;
                void openSelection({
                  dayH: null,
                  knowledgeAnchor: null,
                  report
                });
              }}
            >
              {t(
                'reportChoice',
                {
                  month: formatMonth(item.report!.period, locale),
                  version: item.report!.version
                })}
            </Button>
          ))}
          {choices
            && !choices.items.some(item => item.report !== null)
            && (
              <Typography>
                {t('noReportsOnPage')}
              </Typography>
            )}
          {choices?.nextBeforeSeq
            && (
              <Button disabled={areChoicesBusy
                || isBusy} onClick={() => {
                  void loadChoices(choices.nextBeforeSeq);
                }}>
                {t('olderChoices')}
              </Button>
            )}
          {page
            && (
              <Typography
                component="pre"
                variant="caption"
                sx={{
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere'
                }}
              >
                {JSON.stringify(page.basis, null, 2)}
              </Typography>
            )}
          <Typography variant="caption">
            {t('historyManual')}
          </Typography>
        </Stack>
      </Box>
      <Tabs
        value={view}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={t('tabs')}
        onChange={(_, next: View) => changeView(next)}
      >
        <Tab
          value="CHECKPOINTS"
          label={t('checks')}
          id="analytics-checkpoints-tab"
          aria-controls="analytics-panel"
          disabled={isBusy}
        />
        <Tab
          value="MONTHS"
          label={t('months')}
          id="analytics-months-tab"
          aria-controls="analytics-panel"
          disabled={isBusy}
        />
        <Tab
          value="FUNDING"
          label={t('funding')}
          id="analytics-funding-tab"
          aria-controls="analytics-panel"
          disabled={isBusy}
        />
      </Tabs>
      {filterControls}
      {isBusy
        && (
          <Typography role="status">
            {t('loading')}
          </Typography>
        )}
      {error
        && (
          <Alert severity="error" role="alert">
            {t('error')} <Button
              onClick={() => {
                if (retry.current) {
                  retry.current();
                } else {
                  void openSelection(currentSelection);
                }
              }}
            >
              {t('retry')}
            </Button>
          </Alert>
        )}
      {hasVisiblePage
        && (
          <Box
            role="tabpanel"
            id="analytics-panel"
            aria-labelledby={`analytics-${view.toLowerCase()}-tab`}
            sx={{
              minWidth: 0
            }}
          >
            {page.view === 'CHECKPOINTS'
              && (
                <Stack spacing={2}>
                  {page.basis.report ? (
                    <>
                      <Typography>
                        {t('reportChecks')}
                      </Typography>
                      <Typography>
                        {t('endBalance')}: {formatAmount(page.endBalance)}
                      </Typography>
                      <Button
                        disabled={page.basis.stateAnchor === null}
                        onClick={() => {
                          void openSelection(
                            {
                              dayH: page.basis.dayH,
                              knowledgeAnchor: page.basis.stateAnchor,
                              report: null
                            },
                            page.basis);
                        }}
                      >
                        {t('showSeries')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <CheckDots
                        checks={page.checks}
                        label={t('checkChart')}
                        pointLabel={check => `${formatDate(check.observedDate)}: ${formatAmount(check.balance)}`}
                        onSelect={chooseCheck}
                      />
                      <Typography>
                        {t('differenceNotice')}
                      </Typography>
                      {page.comparison
                        && selectedCheckIds.length === 2
                        && (
                          <Alert severity="info">
                            {formatDate(page.comparison.from.observedDate)} → {formatDate(page.comparison.to.observedDate)}: <strong>
                              {formatAmount(page.comparison.delta)}
                            </strong>
                          </Alert>
                        )}
                    </>
                  )}
                  {!page.checks.length
                    && (
                      <Typography>
                        {t('noChecks')}
                      </Typography>
                    )}
                  <Box
                    sx={{
                      display: {
                        xs: 'none',
                        md: 'block'
                      }
                    }}
                  >
                    <Box
                      component="table"
                      sx={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        '& th, & td': {
                          p: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          textAlign: 'left',
                          ...numericStyle
                        }
                      }}
                    >
                      <thead>
                        <tr>
                          <th scope="col">
                            {t('bankDate')}
                          </th>
                          <th scope="col">
                            {t('lastBalance')}
                          </th>
                          <th scope="col">
                            {t('source')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.checks.map(check => (
                          <tr key={check.id}>
                            <th scope="row">
                              {formatDate(check.observedDate)}
                              <Typography variant="caption" component="div">
                                {check.observedAt ? formatSavedAt(check.observedAt) : t('timeUnknown')}
                              </Typography>
                            </th>
                            <td>
                              {formatAmount(check.balance)}
                              {!page.basis.report
                                && (
                                  <Button aria-pressed={selectedCheckIds.includes(check.id)} onClick={() => chooseCheck(check.id)}>
                                    {t('chooseCheck')}
                                  </Button>
                                )}
                            </td>
                            <td>
                              <details>
                                <summary>
                                  {t('source')}
                                </summary>
                                {check.id} · {check.logicalFactId} · {check.positionId}
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: {
                        xs: 'grid',
                        md: 'none'
                      },
                      gap: 2
                    }}
                  >
                    {page.checks.map(check => (
                      <Card key={check.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Typography sx={numericStyle}>
                              {formatDate(check.observedDate)} · <strong>
                                {formatAmount(check.balance)}
                              </strong>
                            </Typography>
                            <Typography variant="caption">
                              {check.observedAt ? formatSavedAt(check.observedAt) : t('timeUnknown')}
                            </Typography>
                            {!page.basis.report
                              && (
                                <Button aria-pressed={selectedCheckIds.includes(check.id)} onClick={() => chooseCheck(check.id)}>
                                  {t('chooseCheck')}
                                </Button>
                              )}
                            <Box component="details">
                              <summary>
                                {t('source')}
                              </summary>
                              <Typography variant="caption" sx={{
                                overflowWrap: 'anywhere'
                              }}>
                                {check.id} · {check.logicalFactId} · {check.positionId}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Stack>
              )}
            {page.view === 'MONTHS'
              && (
                <Stack spacing={2}>
                  <Typography>
                    {t('monthsNotice')}
                  </Typography>
                  <Box
                    sx={{
                      display: {
                        xs: 'none',
                        md: 'block'
                      }
                    }}
                  >
                    <Box
                      component="table"
                      sx={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        '& th, & td': {
                          p: 1,
                          borderBottom: 1,
                          borderColor: 'divider',
                          textAlign: 'right',
                          ...numericStyle
                        }
                      }}
                    >
                      <thead>
                        <tr>
                          <th scope="col">
                            {t('month')}
                          </th>
                          {(['allocated', 'reserved', 'savings', 'free'] as const).map(key => (
                            <th scope="col" key={key}>
                              {t(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {page.months.map(month => (
                          <tr key={month.period}>
                            <th scope="row">
                              {formatMonth(month.period, locale)}
                            </th>
                            {(['allocated', 'reserved', 'savings', 'free'] as const).map(key => (
                              <td key={key}>
                                {formatAmount(month[key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: {
                        xs: 'grid',
                        md: 'none'
                      },
                      gap: 2
                    }}
                  >
                    {page.months.map(month => (
                      <Card key={month.period} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Typography component="h3" variant="h6">
                              {formatMonth(month.period, locale)}
                            </Typography>
                            {(['allocated', 'reserved', 'savings', 'free'] as const).map(key => (
                              <Typography key={key} sx={numericStyle}>
                                {t(key)}: {formatAmount(month[key])}
                              </Typography>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                  {page.months.filter(month => month.deficit !== null
                    && BigInt(month.deficit) > 0n).map(month => (
                      <Alert key={month.period} severity="warning">
                        {formatMonth(month.period, locale)}: {t('deficit')} {formatAmount(month.deficit)}
                      </Alert>
                    ))}
                  <Typography variant="caption">A · {t('allocated')} / R · {t('reserved')} / S · {t('savings')} / F · {t('free')}
                  </Typography>
                  <MonthBars months={page.months} label={t('monthChart')} />
                </Stack>
              )}
            {page.view === 'FUNDING'
              && (
                <Stack spacing={2}>
                  <Typography sx={numericStyle}>
                    {t('fullTotal')}: {formatAmount(page.total)} · {page.totalCount}
                  </Typography>
                  <Typography sx={numericStyle}>
                    {t('filteredTotal')}: {formatAmount(page.subtotal)} · {page.subtotalCount}
                  </Typography>
                  {page.groups.map(group => (
                    <Card key={`${group.origin}/${group.funding}`} variant="outlined">
                      <CardContent>
                        <Typography>
                          {t(
                            'originToFunding',
                            {
                              origin: formatMonth(group.origin, locale),
                              funding: formatMonth(group.funding, locale)
                            })}
                        </Typography>
                        <Typography sx={numericStyle}>
                          {formatAmount(group.amount)} · {t('identities')}: {group.count}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {!page.identities.length
                    && (
                      <Typography>
                        {t('noIdentities')}
                      </Typography>
                    )}
                  {page.identities.map(identity => (
                    <Box
                      component="details"
                      key={identity.id}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2
                      }}
                    >
                      <summary>
                        {identity.title} · {formatAmount(identity.outstanding)}
                      </summary>
                      <Stack spacing={1} sx={{
                        pt: 1
                      }}>
                        <Typography>
                          {t(
                            'originToFunding',
                            {
                              origin: formatMonth(identity.origin, locale),
                              funding: formatMonth(identity.funding, locale)
                            })}
                        </Typography>
                        <Typography>
                          {t('original')}: {formatAmount(identity.original)} · {t('outstanding')}: {formatAmount(identity.outstanding)}
                        </Typography>
                        <Typography>
                          {t('unpaidFull')} · {identity.isPossible ? t('possibleSelected') : t('ordinary')}
                        </Typography>
                        <Typography variant="caption">
                          {identity.id} · {identity.revisionId}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                  <Typography variant="caption">
                    {t('fundingNotice')}
                  </Typography>
                </Stack>
              )}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexWrap: 'wrap',
                pt: 2
              }}
            >
              <Button
                disabled={!previous.length}
                onClick={() => {
                  const target = previous.at(-1);
                  if (target) {
                    void loadPage(target, previous.slice(0, -1));
                  }
                }}
              >
                {t('previous')}
              </Button>
              <Button
                disabled={!page.next}
                onClick={() => {
                  void loadPage({
                    ...page.query,
                    cursor: page.next
                  }, [...previous, page.query]);
                }}
              >
                {t('next')}
              </Button>
            </Stack>
            <Typography variant="caption">
              {t('pageCount', {
                visible: visibleRowCount(page),
                count: page.count
              })}
            </Typography>
          </Box>
        )}
    </Stack>
  );
}
