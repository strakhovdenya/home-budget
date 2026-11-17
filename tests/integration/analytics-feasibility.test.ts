import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { createBudgetRepository, originalEvidence } from '@/infrastructure/db/budget-update-repository';
import { readProjectionContext } from '@/infrastructure/db/projection-reader';
import { createHistoryIndexReader } from '@/infrastructure/db/financial-history-index';
import { createHistoryDetailReader } from '@/infrastructure/db/financial-history-detail';
import { prepareCommand } from '@/domain/updates/validation';
import { projectPeriod } from '@/domain/forecast/budget';
import * as schema from '@/infrastructure/db/schema';
import { date, value } from '../fixtures/checkpoints';
import { transitionCalendar } from '../fixtures/transition-calendar';

let admin: pg.Pool;
let database: ReturnType<typeof createDatabase>;
let readerDatabase: ReturnType<typeof createDatabase>;
let childName: string;
let calendar: ReturnType<typeof transitionCalendar>;
const measurements: Record<string, number> = {};

beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('LOCAL_TARGET_REQUIRED');
  const target = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: target.toString() });
  childName = `hb22_p1_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE "${childName}"`);
  target.pathname = `/${childName}`;
  database = createDatabase(target.toString());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  const clock = await database.db.execute<{ day: string }>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS day`);
  calendar = transitionCalendar(clock.rows[0].day);
  await database.db.execute(sql`CREATE ROLE hb22_p1_reader LOGIN PASSWORD 'synthetic_reader_only'`);
  await database.db.execute(sql`GRANT USAGE ON SCHEMA public TO hb22_p1_reader`);
  await database.db.execute(sql`GRANT SELECT ON ALL TABLES IN SCHEMA public TO hb22_p1_reader`);
  target.username = 'hb22_p1_reader';
  target.password = 'synthetic_reader_only';
  readerDatabase = createDatabase(target.toString());
});

afterAll(async () => {
  await readerDatabase?.close();
  await database?.close();
  if (admin && childName) await admin.query(`DROP DATABASE "${childName}"`);
  await admin?.end();
});

async function census() {
  const tables = await database.db.execute<{ name: string }>(sql`SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const result = [];
  for (const { name } of tables.rows) {
    if (!/^[a-z_]+$/.test(name)) throw new Error('UNEXPECTED_TABLE');
    const contents = await database.db.execute(sql`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS rows FROM ${sql.raw(name)} t`);
    result.push({ name, rows: contents.rows });
  }
  expect(result).toHaveLength(20);
  return result;
}

async function cashOnlyTransition() {
  const scope = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await database.db.insert(schema.users).values({ id: scope.ownerUserId });
  await database.db.insert(schema.accounts).values({ ...scope, id: scope.accountId, displayName: 'Synthetic HB22 P1' });
  const repository = createBudgetRepository(database);
  async function confirm(payload: unknown, effectiveDate: string) {
    const [account] = await database.db.select().from(schema.accounts).where(eq(schema.accounts.id, scope.accountId));
    const command = value(prepareCommand({ requestId: randomUUID(), expectedRevision: account.aggregateRevision,
      effectiveDate, reason: 'Synthetic HB22 P1 confirmation', payload }));
    const preview = value(await repository.preview(scope, command));
    return value(await repository.confirm(scope, value(prepareCommand(preview))));
  }
  const initial = await confirm({
    schemaVersion: 1, knowledgeCut: '0', baseCheckpointId: null, baseVectorId: null,
    effectiveDate: calendar.pastDay(20), completeVectorConfirmed: true,
    checkpoint: { observedDate: calendar.pastDay(20), observedAt: null, balanceCents: '10000',
      allocations: [{ period: calendar.past, amountCents: '10000' }], correction: null, placement: null },
    allocationChange: null, obligations: [], savings: [],
  }, calendar.pastDay(20));
  const [account] = await database.db.select().from(schema.accounts).where(eq(schema.accounts.id, scope.accountId));
  const [checkpoint] = await database.db.select().from(schema.balanceCheckpoints).where(eq(schema.balanceCheckpoints.accountId, scope.accountId));
  const transition = {
    schemaVersion: 1, intent: 'TRANSITION', mode: 'FRESH_START', observationMode: 'ACTUAL_CHECK',
    target: calendar.target, sources: [], balanceCents: '8000',
    allocations: [{ period: calendar.target, amountCents: '8000' }], futureEdits: [], fundingRefs: [],
    expectedCheckpointRevisionId: checkpoint.id, expectedAllocationRevisionId: account.activeAllocationRevisionId,
    effectiveDate: calendar.today,
    checkpoint: { observedDate: calendar.today, observedAt: null, balanceCents: '8000',
      allocations: [{ period: calendar.target, amountCents: '8000' }], correction: null, placement: null },
    placement: null,
    consent: { completeVectorConfirmed: true, fundingUnchangedAcknowledged: true,
      transitionConfirmed: true, fundingConfirmed: true, nonCarryConfirmed: true },
  };
  const moved = await confirm({
    schemaVersion: 1, knowledgeCut: account.recordedSeq.toString(), baseCheckpointId: checkpoint.id,
    baseVectorId: account.activeAllocationRevisionId, effectiveDate: calendar.today, completeVectorConfirmed: true,
    checkpoint: null, allocationChange: transition, obligations: [], savings: [],
  }, calendar.today);
  const [head] = await database.db.select().from(schema.accounts).where(eq(schema.accounts.id, scope.accountId));
  return { scope, initial, moved, head };
}

it('HB22-01/05/07/16 exposes the cash-only source-proof gap without financial writes', async () => {
  const { scope, initial, moved, head } = await cashOnlyTransition();
  const index = createHistoryIndexReader(readerDatabase);
  const detail = createHistoryDetailReader(readerDatabase);
  const query = { schemaVersion: 1, basis: value(await index.open(scope, null)).basis,
    batchId: moved.updateId, dayH: calendar.today, perspective: 'SOURCE', offset: 0 };
  const before = await census();
  expect(await detail.read(scope, query)).toMatchObject({ ok: true });
  const context = await readerDatabase.db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL statement_timeout='10000ms'`);
    return readProjectionContext(tx, scope, head, date(calendar.today), head.recordedSeq);
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
  expect(value(projectPeriod(context.snapshot, calendar.today, calendar.past))).toMatchObject({
    kind: 'PERIOD_ESTIMATE', budget: { allocated: 0n, reserved: 0n, savings: 0n, free: 0n },
  });
  expect(value(projectPeriod(context.snapshot, calendar.today, calendar.future))).toMatchObject({
    kind: 'PERIOD_ESTIMATE', budget: { allocated: 0n, reserved: 0n, savings: 0n, free: 0n },
  });
  expect(await census()).toEqual(before);

  const [batch] = await database.db.select().from(schema.budgetUpdates).where(eq(schema.budgetUpdates.id, moved.updateId));
  const [initialBatch] = await database.db.select().from(schema.budgetUpdates).where(eq(schema.budgetUpdates.id, initial.updateId));
  const spy = vi.spyOn(pg.Client.prototype, 'query');
  try {
    const start = spy.mock.calls.length;
    await readerDatabase.db.transaction(tx => originalEvidence(tx, scope, batch), { isolationLevel: 'repeatable read', accessMode: 'read only' });
    measurements.oneSourceQueries = spy.mock.calls.length - start;
    const twoStart = spy.mock.calls.length;
    await readerDatabase.db.transaction(async tx => {
      await originalEvidence(tx, scope, initialBatch);
      await originalEvidence(tx, scope, batch);
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
    measurements.twoSourceQueries = spy.mock.calls.length - twoStart;
    expect(measurements.twoSourceQueries).toBeGreaterThan(measurements.oneSourceQueries);
  } finally {
    spy.mockRestore();
  }
  expect(await census()).toEqual(before);

  // Privileged fixture corruption is separate from the SELECT-only reader.
  // SET LOCAL restores the replication setting at transaction end.
  await database.db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL session_replication_role='replica'`);
    await tx.execute(sql`UPDATE audit_events SET before_after=jsonb_set(before_after,'{after,command,reason}','"Synthetic changed confirmation"'::jsonb)
      WHERE owner_user_id=${scope.ownerUserId} AND account_id=${scope.accountId} AND budget_update_id=${moved.updateId}
      AND before_after->'entity'->>'type'='BUDGET_UPDATE_REVIEW'`);
  });
  expect((await database.db.execute<{ setting: string }>(sql`SELECT current_setting('session_replication_role') AS setting`)).rows[0].setting).toBe('origin');
  const corrupted = await census();
  const ordinary = await readerDatabase.db.transaction(tx => readProjectionContext(tx, scope, head, date(calendar.today), head.recordedSeq),
    { isolationLevel: 'repeatable read', accessMode: 'read only' });
  expect(ordinary.snapshot).toEqual(context.snapshot);
  expect(value(await index.open(scope, null)).sourceValidity).toBe('VALID');
  expect(await detail.read(scope, query)).toEqual({ ok: false, code: 'HISTORY_SOURCE_INVALID' });
  expect(await census()).toEqual(corrupted);

  const foreign = { ownerUserId: randomUUID(), accountId: scope.accountId };
  expect(await index.open(foreign, null)).toEqual({ ok: false, code: 'FORBIDDEN' });
  expect(await census()).toEqual(corrupted);
  expect(measurements.oneSourceQueries).toBeGreaterThan(0);
  console.info('HB22 P1 SQL counts (no financial values):', measurements);
});
