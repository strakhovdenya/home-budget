import 'server-only';

import { createHash } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type {
  AnalyticsReader,
  AnalyticsResult,
  Basis,
  Check,
  Choices,
  ChoicesQuery,
  Comparison,
  Cursor,
  Month,
  OpenQuery,
  Page,
  Query,
  ReportRef,
  ReportSelection
} from '@/domain/analytics/contracts';
import { parseChoices, parseOpen, parseQuery } from '@/domain/analytics/validation';
import { groupFunding } from '@/domain/analytics/grouping';
import { correctionTips, indexHistory } from '@/domain/checkpoints/history';
import { reconcileInterval } from '@/domain/checkpoints/reconciliation';
import { exactKeys } from '@/domain/checkpoints/validation';
import { periodBudget, projectAccount } from '@/domain/forecast/budget';
import { ForecastFailure } from '@/domain/forecast/validation';
import type { Obligation, PeriodBudget } from '@/domain/forecast/contracts';
import type { HistoryError } from '@/domain/history/contracts';
import { calculatePeriodReserves, selectObligationState } from '@/domain/obligations/history';
import { calculatePeriodSavings, selectSavingState } from '@/domain/savings/history';
import { parsePeriod, shiftPeriod, startOfMonth } from '@/domain/periods/period';
import { validUuid } from '@/domain/updates/validation';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { ClosingFailure } from '@/domain/closing/serialization';
import type { createDatabase } from './client';
import { BatchFailure, type Transaction } from './commit';
import { ClosingReadBudget, documentHash, json, ownedReport, validateOriginal } from './closing-reader';
import { readProjectionContext } from './projection-reader';
import { databaseToday } from './transition-state';
import { indexAudits } from './history-read-context';
import * as s from './schema';

class AnalyticsReadFailure extends Error {
  constructor(readonly code: HistoryError) {
    super(code);
  }
}

function rejectRead(code: HistoryError): never {
  throw new AnalyticsReadFailure(code);
}

function requireValidSourceResult<T>(result: {
  ok: true;
  value: T;
} | {
  ok: false;
  code: string;
}): T {
  if (!result.ok) {
    rejectRead('HISTORY_SOURCE_INVALID');
  }

  return result.value;
}

type Context = Awaited<ReturnType<typeof readProjectionContext>>;

type Account = typeof s.accounts.$inferSelect;

type Scoped = PgTable & {
  ownerUserId: AnyPgColumn;
  accountId: AnyPgColumn;
};

const scoped = (table: Scoped, scope: AuthorizedScope) => and(
  eq(table.ownerUserId, scope.ownerUserId),
  eq(table.accountId, scope.accountId)
);

/** Additional whole-request admission; existing source guards still run unchanged. */
async function admitSource(tx: Transaction, scope: AuthorizedScope, cut: bigint) {
  const tables = [
    s.balanceCheckpoints,
    s.allocationRevisions,
    s.historicalPositions,
    s.orderingRevisions,
    s.obligations,
    s.obligationEvents,
    s.savingsGoals,
    s.savingsEvents,
    s.auditEvents,
    s.transitionDecisions
  ] as const;
  const counts: bigint[] = [];
  let rows = 0n;
  let bytes = 0n;
  let nodes = 0n;

  for (const table of tables) {
    const result = await tx.execute<{
      n: string;
      bytes: string;
      nodes: string;
    }>(sql`SELECT count(*)::text n,
      coalesce(sum(octet_length(to_jsonb(${table})::text)),0)::text bytes,
      coalesce(sum(length(to_jsonb(${table})::text)-length(translate(to_jsonb(${table})::text,'{}[]:,',''))+1),0)::text nodes
      FROM ${table} WHERE ${scoped(table, scope)} AND ${table.recordedSeq}<=${cut}`);
    const count = BigInt(result.rows[0].n);
    counts.push(count);
    rows += count;
    bytes += BigInt(result.rows[0].bytes);
    nodes += BigInt(result.rows[0].nodes);
    if (
      rows > 20000n
      || bytes > 8388608n
    ) {
      rejectRead('HISTORY_LIMIT_EXCEEDED');
    }
  }
  for (const table of [s.periodAllocations, s.budgetPeriods]) {
    const predicate = table === s.periodAllocations ? sql`EXISTS(SELECT 1 FROM ${s.allocationRevisions}
      WHERE ${s.allocationRevisions.id}=${s.periodAllocations.allocationRevisionId} AND ${s.allocationRevisions.recordedSeq}<=${cut})` : sql`true`;
    const result = await tx.execute<{
      n: string;
      bytes: string;
    }>(sql`SELECT count(*)::text n,
      coalesce(sum(octet_length(to_jsonb(${table})::text)),0)::text bytes FROM ${table} WHERE ${scoped(table, scope)} AND ${predicate}`);
    rows += BigInt(result.rows[0].n);
    bytes += BigInt(result.rows[0].bytes);
    if (
      rows > 20000n
      || bytes > 8388608n
      || table === s.budgetPeriods
      && BigInt(result.rows[0].n) > 1200n
    ) {
      rejectRead('HISTORY_LIMIT_EXCEEDED');
    }
  }
  const days = await tx.execute<{
    n: string;
  }>(sql`SELECT count(DISTINCT historical_date)::text n FROM ${s.historicalPositions}
    WHERE ${scoped(s.historicalPositions, scope)} AND ${s.historicalPositions.recordedSeq}<=${cut}`);
  const [checks, vectors, positions, orderings, , obligations, , savings] = counts;
  const workRows = checks + vectors + positions + orderings + obligations + savings;
  if (workRows * workRows > 4000000n) {
    rejectRead('HISTORY_LIMIT_EXCEEDED');
  }
  // Day scans, vector anchor/predecessor scans, lifecycle scans, sorting and
  // bounded descriptor/canonical traversals across the complete source set.

  const indexWork = 4n * BigInt(days.rows[0].n) * (positions + orderings)
    + 2n * vectors * (checks + vectors) + 8n * workRows;
  const totalWork = 12n * indexWork + 4n * (checks + vectors) ** 2n
    + 16n * (obligations + savings) ** 2n + 4n * rows * (obligations + savings + 1n) + 12n * nodes + 300000n;
  if (totalWork > 4000000n) {
    rejectRead('HISTORY_LIMIT_EXCEEDED');
  }
}

/** Same typed retained bank/vector/order evidence fields used by history detail. */
function validateBankEvidence(context: Context) {
  const { auditByEntity } = indexAudits(context.audits);

  function matches(kind: string, id: string, seq: bigint, expected: Record<string, unknown>) {
    const rows = auditByEntity.get(`${kind}:${id}`) ?? [];
    const row = rows[0];
    const document = row?.beforeAfter;
    if (
      rows.length !== 1
      || row.recordedSeq !== seq
      || !exactKeys(document, ['schemaVersion', 'eventIndex', 'entity', 'before', 'after'])
      || document.schemaVersion !== 1
      || !Number.isSafeInteger(document.eventIndex)
      || Number(document.eventIndex) < 0
      || !exactKeys(document.entity, ['type', 'id'])
      || !document.after
      || typeof document.after !== 'object'
      || Array.isArray(document.after)
    ) {
      rejectRead('HISTORY_SOURCE_INVALID');
    }

    const after = document.after as Record<string, unknown>;

    for (const [key, value] of Object.entries(expected)) {
      if (
        !Object.hasOwn(after, key)
        || documentHash(json(after[key])) !== documentHash(json(value))
      ) {
        rejectRead('HISTORY_SOURCE_INVALID');
      }
    }
  }

  for (const check of context.history.checkpoints) {
    matches(
      'BANK_CHECKPOINT',
      check.id,
      check.recordedSeq,
      {
        id: check.id,
        logicalFactId: check.logicalFactId,
        supersedesId: check.supersedesId,
        recordedSeq: check.recordedSeq,
        positionId: check.positionId,
        observedDate: check.observedDate,
        observedAt: check.observedAt,
        balanceCents: check.balanceCents,
      });
  }
  for (const vector of context.history.vectors) {
    matches(
      'ALLOCATION_REVISION',
      vector.id,
      vector.recordedSeq,
      {
        id: vector.id,
        logicalFactId: vector.logicalFactId,
        supersedesId: vector.supersedesId,
        recordedSeq: vector.recordedSeq,
        positionId: vector.positionId,
        checkpointId: vector.checkpointId,
        previousRevisionId: vector.previousRevisionId,
        effectiveDate: vector.effectiveDate,
        allocations: vector.allocations,
      });
  }
  for (const order of context.history.orderings) {
    const row = auditByEntity.get(`DAY_ORDERING:${order.id}`)?.[0];
    const after = (row?.beforeAfter as {
      after?: Record<string, unknown>;
    } | undefined)?.after;
    if (
      !after
      || (after.date ?? after.historicalDate) !== order.historicalDate
    ) {
      rejectRead('HISTORY_SOURCE_INVALID');
    }

    matches(
      'DAY_ORDERING',
      order.id,
      order.recordedSeq,
      {
        positionIds: order.positionIds,
        edges: order.edges
      });
  }
}

async function readOwnedAnchor(tx: Transaction, scope: AuthorizedScope, id: string) {
  const [row] = await tx.select({
    id: s.budgetUpdates.id,
    seq: s.budgetUpdates.recordedSeq,
    at: sql<string> `to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`
  })
    .from(s.budgetUpdates).where(and(scoped(s.budgetUpdates, scope), eq(s.budgetUpdates.id, id)));
  if (!row) {
    rejectRead('FORBIDDEN');
  }

  return row;
}

async function readAnchorAtCut(tx: Transaction, scope: AuthorizedScope, cut: bigint) {
  if (cut === 0n) {
    return null;
  }

  const [row] = await tx.select({
    id: s.budgetUpdates.id
  }).from(s.budgetUpdates)
    .where(and(scoped(s.budgetUpdates, scope), eq(s.budgetUpdates.recordedSeq, cut)));
  if (!row) {
    rejectRead('HISTORY_SOURCE_INVALID');
  }

  return row.id;
}

async function readReportContext(
  tx: Transaction,
  scope: AuthorizedScope,
  account: Account,
  ref: ReportSelection,
  indexCut: bigint
) {
  const report = await ownedReport(tx, scope, ref.id);
  if (
    report.budgetUpdateId !== ref.batchId
    || report.version !== ref.version
    || report.recordedSeq > indexCut
  ) {
    rejectRead('INVALID_INPUT');
  }

  const [batch] = await tx.select()
    .from(s.budgetUpdates)
    .where(and(scoped(s.budgetUpdates, scope), eq(s.budgetUpdates.id, ref.batchId)));
  if (!batch) {
    rejectRead('FORBIDDEN');
  }

  const budget = new ClosingReadBudget();
  const proof = await validateOriginal(tx, scope, account, batch, budget);
  const digest = documentHash(proof.result.document, budget);
  if (
    ref.digest !== null
    && digest !== ref.digest
  ) {
    rejectRead('HISTORY_SOURCE_INVALID');
  }

  const context = budget.cuts.get(`${report.historicalThroughDate}/${report.evidenceRecordedCutoffSeq}`);
  if (!context) {
    rejectRead('HISTORY_SOURCE_INVALID');
  }

  budget.charge(300000);

  return {
    context,
    report: {
      ...ref,
      digest
    },
    dayH: report.historicalThroughDate,
    stateCut: report.evidenceRecordedCutoffSeq,
    stateAnchor: await readAnchorAtCut(tx, scope, report.evidenceRecordedCutoffSeq),
    endBalance: report.endBalanceCents?.toString() ?? null
  };
}

function toCheck(check: Context['history']['checkpoints'][number]): Check {
  return {
    id: check.id,
    logicalFactId: check.logicalFactId,
    positionId: check.positionId,
    observedDate: check.observedDate,
    observedAt: check.observedAt,
    balance: check.balanceCents.toString()
  };
}

function paginate<T>(
  scope: AuthorizedScope,
  query: Query,
  rows: readonly T[],
  key: (item: T) => string,
  limit: number
) {
  const binding = createHash('sha256').update(JSON.stringify({
    scope,
    query: {
      ...query,
      cursor: null
    }
  })).digest('hex');
  let start = 0;
  if (query.cursor !== null) {
    if (query.cursor.binding !== binding) {
      rejectRead('INVALID_INPUT');
    }

    const index = rows.findIndex(item => key(item) === query.cursor!.lastKey);
    if (
      index < 0
      || (index + 1) % limit !== 0
      || index === rows.length - 1
    ) {
      rejectRead('INVALID_INPUT');
    }

    start = index + 1;
  }

  const items = rows.slice(start, start + limit);
  let next: Cursor | null = null;

  if (start + items.length < rows.length) {
    next = {
      binding,
      lastKey: key(items.at(-1)!)
    };
  }

  return {
    items,
    count: rows.length,
    next
  };
}

function presentPage(scope: AuthorizedScope, query: Query, context: Context, reportEnd?: string | null): Page {
  const basis = query.basis;
  const historicalDate = requireValidSourceResult(parseBerlinDate(basis.dayH));
  const index = requireValidSourceResult(indexHistory(context.history));
  const tips = requireValidSourceResult(correctionTips(context.history.checkpoints, BigInt(basis.stateCut)));
  const observations = [...tips]
    .filter(item => item.observedDate <= basis.dayH)
    .sort((left, right) => index.compare(left.positionId, right.positionId));
  let lastCheck: Check | null = null;

  if (observations.length) {
    lastCheck = toCheck(observations.at(-1)!);
  }

  let endBalance: string | null = reportEnd ?? null;
  if (basis.report === null) {
    endBalance = null;
    if (lastCheck?.observedDate === basis.dayH) {
      endBalance = lastCheck.balance;
    }
  }

  const common = {
    schemaVersion: 1 as const,
    basis,
    query,
    completeness: 'COMPLETE' as const,
    lastCheck,
    endBalance
  };
  if (query.view === 'CHECKPOINTS') {
    let shown: typeof observations;

    if (basis.report === null) {
      shown = observations.filter(item => (
        item.observedDate >= query.filters.from && item.observedDate <= query.filters.to
      ));
    } else {
      shown = observations.filter(item => item.id === lastCheck?.id);
    }

    const page = paginate(scope, query, shown.map(toCheck), item => item.id, 100);
    let comparison: Comparison | null = null;
    if (query.compare !== null) {
      const pair = query.compare.map(id => observations.find(item => item.id === id));
      if (
        !pair[0]
        || !pair[1]
      ) {
        rejectRead('FORBIDDEN');
      }

      pair.sort((left, right) => index.compare(left!.positionId, right!.positionId));
      const from = pair[0]!;
      const to = pair[1]!;
      const result = requireValidSourceResult(reconcileInterval(
        scope.accountId,
        BigInt(basis.stateCut),
        from,
        to,
        {
          status: 'NOT_AVAILABLE'
        }));
      comparison = {
        from: toCheck(from),
        to: toCheck(to),
        delta: result.deltaCents.toString(),
        evidence: 'NOT_AVAILABLE' as const,
        known: null,
        unexplained: null
      };
    }

    return {
      ...common,
      view: 'CHECKPOINTS',
      checks: page.items,
      count: page.count,
      next: page.next,
      comparison
    };
  }

  const snapshot = context.snapshot;
  const projection = requireValidSourceResult(projectAccount(snapshot, historicalDate));
  const reserves = new Map<string, bigint>();
  const savings = new Map<string, bigint>();
  if (projection.kind === 'ACCOUNT_ESTIMATE') {
    for (const row of projection.periods) {
      reserves.set(row.period, row.reserved);
      savings.set(row.period, row.savings);
    }
  } else if (snapshot.kind === 'NO_OBSERVATION') {
    const names = new Map(context.periods.map(item => [item.id, item.period]));
    const obligationState = requireValidSourceResult(selectObligationState(context.obligationHistory, historicalDate));
    const periodReserves = requireValidSourceResult(calculatePeriodReserves(obligationState.states));

    for (const [id, amount] of periodReserves) {
      const name = names.get(id);
      if (!name) {
        rejectRead('HISTORY_SOURCE_INVALID');
      }

      reserves.set(name, amount);
    }
    const savingState = requireValidSourceResult(selectSavingState(context.savingHistory, historicalDate));
    const periodSavings = requireValidSourceResult(calculatePeriodSavings(savingState.states));

    for (const [id, amount] of periodSavings) {
      const name = names.get(id);
      if (!name) {
        rejectRead('HISTORY_SOURCE_INVALID');
      }

      savings.set(name, amount);
    }
  } else {
    rejectRead('HISTORY_SOURCE_INVALID');
  }

  if (query.view === 'MONTHS') {
    const months: Month[] = [];
    const first = requireValidSourceResult(parsePeriod(query.filters.from.slice(0, 7)));

    for (let offset = 0; offset < 12; offset++) {
      const period = shiftPeriod(first, offset);
      if (
        !period.ok
        || period.value > query.filters.to.slice(0, 7)
      ) {
        break;
      }

      if (snapshot.kind === 'ACTIVE_COMPLETE') {
        let row: PeriodBudget | null | undefined = null;

        if (projection.kind === 'ACCOUNT_ESTIMATE') {
          row = projection.periods.find(item => item.period === period.value);
        }

        const budget = row ?? periodBudget(snapshot, historicalDate, period.value);
        months.push({
          period: period.value,
          allocated: budget.allocated.toString(),
          reserved: budget.reserved.toString(),
          savings: budget.savings.toString(),
          free: budget.free.toString(),
          deficit: budget.deficit.toString()
        });
      } else {
        months.push({
          period: period.value,
          allocated: null,
          reserved: (reserves.get(period.value) ?? 0n).toString(),
          savings: (savings.get(period.value) ?? 0n).toString(),
          free: null,
          deficit: null
        });
      }
    }
    if (query.cursor !== null) {
      rejectRead('INVALID_INPUT');
    }

    return {
      ...common,
      view: 'MONTHS',
      months,
      count: months.length,
      next: null
    };
  }

  let obligations: readonly Obligation[];
  if (snapshot.kind === 'ACTIVE_COMPLETE') {
    obligations = snapshot.obligations;
  } else if (snapshot.kind === 'NO_OBSERVATION') {
    obligations = snapshot.knownObligations;
  } else {
    rejectRead('HISTORY_SOURCE_INVALID');
  }

  const grouped = groupFunding(obligations, reserves, query.filters);
  const page = paginate(scope, query, grouped.identities, item => item.id, 20);

  return {
    ...common,
    view: 'FUNDING',
    ...grouped,
    identities: page.items,
    count: page.count,
    next: page.next
  };
}

async function validateCapturedBasis(
  tx: Transaction,
  scope: AuthorizedScope,
  account: Account,
  clock: Awaited<ReturnType<typeof databaseToday>>,
  basis: Basis
) {
  if (
    basis.accountId !== scope.accountId
    || basis.today > clock.today
    || basis.capturedAt > clock.now
    || BigInt(basis.indexCut) > account.recordedSeq
  ) {
    rejectRead('INVALID_INPUT');
  }

  if (basis.indexAnchor !== null) {
    const index = await readOwnedAnchor(tx, scope, basis.indexAnchor);
    if (
      index.seq.toString() !== basis.indexCut
      || index.at > basis.capturedAt
    ) {
      rejectRead('INVALID_INPUT');
    }
  }

  if (
    basis.stateAnchor !== null
    && (await readOwnedAnchor(tx, scope, basis.stateAnchor)).seq.toString() !== basis.stateCut
  ) {
    rejectRead('INVALID_INPUT');
  }
}

export function createAnalyticsReader(database: ReturnType<typeof createDatabase>): AnalyticsReader {
  async function run<T>(
    scope: AuthorizedScope,
    operation: (
      tx: Transaction,
      account: Account,
      clock: Awaited<ReturnType<typeof databaseToday>>
    ) => Promise<T>
  ): Promise<AnalyticsResult<T>> {
    try {
      if (
        !validUuid(scope.ownerUserId)
        || !validUuid(scope.accountId)
      ) {
        rejectRead('FORBIDDEN');
      }

      const page = await database.db.transaction(
        async (tx) => {
          await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);
          const [account] = await tx.select()
            .from(s.accounts)
            .where(and(eq(s.accounts.ownerUserId, scope.ownerUserId), eq(s.accounts.id, scope.accountId)));
          if (!account) {
            rejectRead('FORBIDDEN');
          }

          const lock = await tx.execute<{
            locked: boolean;
          }>(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${scope.accountId},19019)) locked`);
          if (!lock.rows[0].locked) {
            rejectRead('RETRYABLE_STORAGE_ERROR');
          }

          const result = await operation(tx, account, await databaseToday(tx));
          if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 1048576) {
            rejectRead('HISTORY_LIMIT_EXCEEDED');
          }

          return result;
        },
        {
          isolationLevel: 'repeatable read',
          accessMode: 'read only'
        });

      return {
        ok: true as const,
        value: page
      };
    } catch (error) {
      if (error instanceof AnalyticsReadFailure) {
        return {
          ok: false as const,
          code: error.code
        };
      }

      if (
        error instanceof ForecastFailure
        || error instanceof ClosingFailure
        || error instanceof BatchFailure
      ) {
        if (error.code.includes('LIMIT')) {
          return {
            ok: false,
            code: 'HISTORY_LIMIT_EXCEEDED'
          };
        }

        return {
          ok: false,
          code: 'HISTORY_SOURCE_INVALID'
        };
      }

      if (
        error instanceof Error
        && error.message === 'HISTORY_SOURCE_INVALID'
      ) {
        return {
          ok: false as const,
          code: 'HISTORY_SOURCE_INVALID' as const
        };
      }

      return {
        ok: false as const,
        code: 'STORAGE_ERROR' as const
      };
    }
  }

  return {
    choices(scope, raw) {
      let input: ChoicesQuery;

      try {
        input = parseChoices(raw);
      } catch {
        return Promise.resolve({
          ok: false,
          code: 'INVALID_INPUT'
        });
      }

      return run(
        scope,
        async (tx, account, clock): Promise<Choices> => {
          await validateCapturedBasis(tx, scope, account, clock, input.basis);
          if (input.beforeSeq !== null) {
            const rank = await tx.execute<{
              n: string;
              member: boolean;
            }>(sql`SELECT count(*)::text n,bool_or(recorded_seq=${BigInt(input.beforeSeq)}) member FROM ${s.budgetUpdates}
            WHERE ${scoped(s.budgetUpdates, scope)} AND recorded_seq<=${BigInt(input.basis.indexCut)} AND recorded_seq>=${BigInt(input.beforeSeq)}`);
            if (
              !rank.rows[0].member
              || BigInt(rank.rows[0].n) % 20n !== 0n
            ) {
              rejectRead('INVALID_INPUT');
            }
          }

          const rows = await tx.select({
            id: s.budgetUpdates.id,
            seq: s.budgetUpdates.recordedSeq,
            recordedAt: sql<string> `to_char(${s.budgetUpdates.recordedAt} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
            reportId: s.monthClosings.id,
            version: s.monthClosings.version,
            period: s.budgetPeriods.period
          })
            .from(s.budgetUpdates).leftJoin(
              s.monthClosings,
              and(scoped(s.monthClosings, scope), eq(s.monthClosings.budgetUpdateId, s.budgetUpdates.id)))
            .leftJoin(
              s.budgetPeriods,
              and(scoped(s.budgetPeriods, scope), eq(s.budgetPeriods.id, s.monthClosings.periodId)))
            .where(and(
              scoped(s.budgetUpdates, scope),
              sql`${s.budgetUpdates.recordedSeq}<=${BigInt(input.basis.indexCut)}`,
              input.beforeSeq === null ? sql`true` : sql`${s.budgetUpdates.recordedSeq}<${BigInt(input.beforeSeq)}`))
            .orderBy(desc(s.budgetUpdates.recordedSeq)).limit(21);
          if (new Set(rows.map(row => row.id)).size !== rows.length) {
            rejectRead('HISTORY_SOURCE_INVALID');
          }

          const items: Choices['items'] = rows.slice(0, 20).map(row => {
            let report: Choices['items'][number]['report'] = null;

            if (row.reportId && row.version && row.period) {
              report = {
                id: row.reportId,
                batchId: row.id,
                version: row.version,
                digest: null,
                period: row.period
              };
            }

            return {
              id: row.id,
              seq: row.seq.toString(),
              recordedAt: row.recordedAt,
              report
            };
          });
          let nextBeforeSeq: string | null = null;

          if (rows.length > 20) {
            nextBeforeSeq = rows[19].seq.toString();
          }

          return {
            basis: input.basis,
            items,
            nextBeforeSeq
          };
        });
    },
    open(scope, raw) {
      let input: OpenQuery;

      try {
        input = parseOpen(raw);
      } catch {
        return Promise.resolve({
          ok: false,
          code: 'INVALID_INPUT'
        });
      }

      return run(
        scope,
        async (tx, account, clock) => {
          const indexAnchor = await readAnchorAtCut(tx, scope, account.recordedSeq);
          let stateAnchor = input.selection.knowledgeAnchor ?? indexAnchor;
          let stateCut = 0n;

          if (stateAnchor !== null) {
            stateCut = (await readOwnedAnchor(tx, scope, stateAnchor)).seq;
          }

          let dayH = input.selection.dayH ?? clock.today;
          if (
            dayH > clock.today
            || stateCut > account.recordedSeq
          ) {
            rejectRead('INVALID_INPUT');
          }

          let context: Context;
          let reportEnd: string | null | undefined;
          let selectedReport: ReportRef | null = null;
          if (input.selection.report !== null) {
            const selected = await readReportContext(tx, scope, account, input.selection.report, account.recordedSeq);
            ({
              context,
              dayH,
              stateAnchor,
              stateCut
            } = selected);
            reportEnd = selected.endBalance;
            selectedReport = selected.report;
          } else {
            await admitSource(tx, scope, stateCut);
            context = await readProjectionContext(
              tx,
              scope,
              account,
              requireValidSourceResult(parseBerlinDate(dayH)),
              stateCut
            );
            validateBankEvidence(context);
          }

          const basis: Basis = {
            schemaVersion: 1,
            accountId: scope.accountId,
            indexAnchor,
            indexCut: account.recordedSeq.toString(),
            stateAnchor,
            stateCut: stateCut.toString(),
            dayH,
            today: clock.today,
            capturedAt: clock.now,
            report: selectedReport
          };
          const period = requireValidSourceResult(parsePeriod(dayH.slice(0, 7)));
          const first = shiftPeriod(period, -2);
          let firstPeriod = period;

          if (first.ok) {
            firstPeriod = first.value;
          }

          const query: Query = {
            schemaVersion: 1,
            basis,
            view: 'CHECKPOINTS',
            filters: {
              from: startOfMonth(firstPeriod),
              to: dayH,
              origin: null,
              funding: null
            },
            cursor: null,
            compare: null
          };

          return presentPage(scope, query, context, reportEnd);
        });
    },
    read(scope, raw) {
      let query: Query;

      try {
        query = parseQuery(raw);
      } catch {
        return Promise.resolve({
          ok: false,
          code: 'INVALID_INPUT'
        });
      }

      return run(
        scope,
        async (tx, account, clock) => {
          const basis = query.basis;
          await validateCapturedBasis(tx, scope, account, clock, basis);
          if (basis.report !== null) {
            const selected = await readReportContext(tx, scope, account, basis.report, BigInt(basis.indexCut));
            if (
              selected.dayH !== basis.dayH
              || selected.stateCut.toString() !== basis.stateCut
              || selected.stateAnchor !== basis.stateAnchor
            ) {
              rejectRead('INVALID_INPUT');
            }

            return presentPage(scope, query, selected.context, selected.endBalance);
          }

          await admitSource(tx, scope, BigInt(basis.stateCut));
          const context = await readProjectionContext(
            tx,
            scope,
            account,
            requireValidSourceResult(parseBerlinDate(basis.dayH)),
            BigInt(basis.stateCut)
          );
          validateBankEvidence(context);

          return presentPage(scope, query, context);
        });
    },
  };
}
