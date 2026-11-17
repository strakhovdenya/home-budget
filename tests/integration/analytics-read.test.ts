import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { and, desc, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { createAnalyticsReader } from '@/infrastructure/db/analytics-reader';
import { commitBatch } from '@/infrastructure/db/commit';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { writeObligations } from '@/infrastructure/db/obligation-writer';
import { createClosingRepository } from '@/infrastructure/db/closing-repository';
import { createProposalRepository } from '@/infrastructure/db/transfer-proposal-repository';
import { prepareCommand } from '@/domain/updates/validation';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { Page, Query } from '@/domain/analytics/contracts';
import * as s from '@/infrastructure/db/schema';
import { value } from '../fixtures/checkpoints';
import { transitionCalendar } from '../fixtures/transition-calendar';

let admin: pg.Pool, database: ReturnType<typeof createDatabase>, readonlyDatabase: ReturnType<typeof createDatabase>;
let child: string, readerRole: string, calendar: ReturnType<typeof transitionCalendar>;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('LOCAL_TARGET_REQUIRED');
  const target = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: target.toString() });
  child = `hb22_read_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE "${child}"`);
  target.pathname = `/${child}`; database = createDatabase(target.toString());
  await migrate(database.db, { migrationsFolder: './drizzle' });
  calendar = transitionCalendar((await database.db.execute<{ day: string }>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text AS day`)).rows[0].day);
  readerRole = `hb22_${randomUUID().replaceAll('-', '')}`;
  await database.db.execute(sql`CREATE ROLE ${sql.identifier(readerRole)} LOGIN PASSWORD 'synthetic_readonly'`);
  await database.db.execute(sql`GRANT USAGE ON SCHEMA public TO ${sql.identifier(readerRole)}`);
  await database.db.execute(sql`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${sql.identifier(readerRole)}`);
  target.username = readerRole; target.password = 'synthetic_readonly';
  readonlyDatabase = createDatabase(target.toString());
});
afterAll(async () => {
  await readonlyDatabase?.close(); await database?.close();
  if (admin && child) await admin.query(`DROP DATABASE "${child}"`);
  if (admin && readerRole) await admin.query(`DROP ROLE "${readerRole}"`);
  await admin?.end();
});
async function fixture() {
  const scope = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await database.db.insert(s.users).values({ id: scope.ownerUserId });
  await database.db.insert(s.accounts).values({ ...scope, id: scope.accountId, displayName: 'Synthetic analytics' });
  return scope;
}
async function command(scope: AuthorizedScope, payload: unknown, day: string) {
  const [account] = await database.db.select().from(s.accounts).where(eq(s.accounts.id, scope.accountId));
  return value(prepareCommand({ requestId: randomUUID(), expectedRevision: account.aggregateRevision, effectiveDate: day, reason: 'Synthetic analytics read fixture', payload }));
}
async function observe(scope: AuthorizedScope, balance = '200000', allocations = [{ period: calendar.past, amountCents: '100000' }, { period: calendar.target, amountCents: '100000' }], day = calendar.pastDay(20)) {
  const [order] = await database.db.select().from(s.orderingRevisions).where(and(eq(s.orderingRevisions.accountId, scope.accountId), eq(s.orderingRevisions.historicalDate, day)))
    .orderBy(desc(s.orderingRevisions.recordedSeq)).limit(1);
  const members = (order?.manifest as { positionIds: string[] } | undefined)?.positionIds;
  const payload = { observedDate: day, observedAt: null, balanceCents: balance, allocations, correction: null,
    placement: order ? { expectedOrderingRevisionId: order.id, afterPositionId: members!.at(-1), beforePositionId: null } : null };
  return commitBatch(database.db, { scope, kind: 'BANK_CHECKPOINT', command: await command(scope, payload, day) }, writeBankCheckpoint);
}
async function census() {
  const tables = await database.db.execute<{ name: string }>(sql`SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const result = [];
  for (const { name } of tables.rows) {
    if (!/^[a-z_]+$/.test(name)) throw new Error('UNEXPECTED_TABLE');
    result.push({ name, rows: (await database.db.execute(sql`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) rows FROM ${sql.raw(name)} t`)).rows });
  }
  expect(result).toHaveLength(20); return result;
}
function open(scope: AuthorizedScope) {
  return createAnalyticsReader(readonlyDatabase).open(scope, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: null } });
}
function query(page: Page, view: Query['view'] = 'FUNDING'): Query {
  return { ...page.query, view, filters: { from: `${calendar.past}-01`, to: `${calendar.target}-28`, origin: null, funding: null }, cursor: null, compare: null };
}
it('HB22-01/11 distinguishes unknown/zero and fails foreign membership without any table writes', async () => {
  const scope = await fixture(), reader = createAnalyticsReader(readonlyDatabase);
  const before = await census(), initial = value(await open(scope));
  expect(initial.lastCheck).toBeNull();
  expect(initial.endBalance).toBeNull();
  const unknown = value(await reader.read(scope, query(initial, 'MONTHS')));
  expect(unknown.view).toBe('MONTHS');
  if (unknown.view !== 'MONTHS') throw new Error('MONTHS_REQUIRED');
  expect(unknown.months.every(month => month.allocated === null && month.free === null && month.reserved === '0')).toBe(true);
  expect(await open({ ownerUserId: randomUUID(), accountId: scope.accountId })).toEqual({ ok: false, code: 'FORBIDDEN' });
  expect(await census()).toEqual(before);
  await observe(scope, '0', [{ period: calendar.past, amountCents: '0' }]);
  const afterSeed = await census(), zero = value(await open(scope));
  expect(zero.lastCheck?.balance).toBe('0');
  expect(zero.endBalance).toBeNull();
  const months = value(await reader.read(scope, query(zero, 'MONTHS')));
  expect(months).toMatchObject({ months: expect.arrayContaining([{ period: calendar.past, allocated: '0', reserved: '0', savings: '0', free: '0', deficit: '0' }]) });
  const stranger = await fixture();
  const afterForeignSeed = await census();
  expect(await reader.read(stranger, zero.query)).toMatchObject({ ok: false });
  expect(await census()).toEqual(afterForeignSeed);
  expect(afterSeed.length).toBe(20);
});
it('HB22-17 groups all 24 identities before filters/paging, with full reserve equality and no writes', async () => {
  const scope = await fixture();
  const changes = [];
  let key = 0;
  for (const [origin, funding, cents] of [[calendar.older, calendar.past, '10000'], [calendar.older, calendar.target, '20000'], [calendar.past, calendar.past, '30000'], [calendar.past, calendar.target, '40000']]) {
    for (let index = 0; index < 6; index++) changes.push({ key: `o${key++}`, action: 'CREATE', obligationId: null, expectedStateRevisionId: null,
      correctionId: null, previousChangeKey: null, effectiveDate: calendar.pastDay(key + 1), bankDate: null, placement: null, bankCheck: null, paymentConfirmation: null,
      data: { title: 'Synthetic selected obligation', dueDate: null, originalCents: index === 0 ? cents : '1', isPossible: false, reserveFull: true, originatingPeriod: origin, fundingPeriod: funding } });
  }
  for (let offset = 0; offset < changes.length; offset += 6) {
    const batch = changes.slice(offset, offset + 6);
    await commitBatch(database.db, { scope, kind: 'OBLIGATION_CREATE', command: await command(scope, { changes: batch }, batch[0].effectiveDate) }, writeObligations);
  }
  await observe(scope);
  const before = await census(), reader = createAnalyticsReader(readonlyDatabase), initial = value(await open(scope));
  const request = query(initial), first = value(await reader.read(scope, request));
  expect(first).toMatchObject({ view: 'FUNDING', total: '100020', totalCount: 24, subtotal: '100020', subtotalCount: 24, identities: expect.any(Array) });
  if (first.view !== 'FUNDING') throw new Error('FUNDING_REQUIRED');
  expect(first.identities).toHaveLength(20); expect(first.next).not.toBeNull();
  const second = value(await reader.read(scope, { ...request, cursor: first.next }));
  expect(second).toMatchObject({ total: '100020', subtotal: '100020', totalCount: 24, subtotalCount: 24, next: null });
  if (second.view !== 'FUNDING') throw new Error('FUNDING_REQUIRED');
  expect(second.identities).toHaveLength(4);
  expect(new Set([...first.identities, ...second.identities].map(item => item.id)).size).toBe(24);
  expect(second.groups).toEqual(first.groups);
  for (const [origin, funding, subtotal, count] of [[calendar.older, null, '30010', 12], [null, calendar.target, '60010', 12], [calendar.older, calendar.target, '20005', 6], ['2000-01', null, '0', 0]] as const) {
    expect(await reader.read(scope, { ...request, filters: { ...request.filters, origin, funding } })).toMatchObject({ ok: true, value: { subtotal, subtotalCount: count, total: '100020' } });
  }
  expect(await reader.read(scope, { ...request, cursor: { ...first.next!, binding: '0'.repeat(64) } })).toEqual({ ok: false, code: 'INVALID_INPUT' });
  expect(await census()).toEqual(before);
});
it('HB22-02/03/08 >100 real points are stable across K+1; nonadjacent D and same-day order have no N+1', async () => {
  const scope = await fixture();
  for (let index = 0; index < 101; index++) await observe(scope);
  const reader = createAnalyticsReader(readonlyDatabase), first = value(await open(scope));
  if (first.view !== 'CHECKPOINTS') throw new Error('CHECKPOINTS_REQUIRED');
  expect(first.checks).toHaveLength(100); expect(first.count).toBe(101);
  const firstIds = first.checks.map(check => check.id);
  expect(new Set(firstIds).size).toBe(100);
  expect(first.checks.every(check => check.observedAt === null && check.balance === '200000')).toBe(true);
  await observe(scope);
  const afterAppend = await census();
  const spy = vi.spyOn(pg.Client.prototype, 'query');
  let second: Page, repeat: Page, sqlSecond: number, sqlRepeat: number;
  try {
    const start = spy.mock.calls.length;
    second = value(await reader.read(scope, { ...first.query, cursor: first.next }));
    sqlSecond = spy.mock.calls.length - start;
    const repeatedStart = spy.mock.calls.length;
    repeat = value(await reader.read(scope, first.query));
    sqlRepeat = spy.mock.calls.length - repeatedStart;
  } finally { spy.mockRestore(); }
  expect(second!.count).toBe(101);
  if (second!.view !== 'CHECKPOINTS' || repeat!.view !== 'CHECKPOINTS') throw new Error('CHECKPOINTS_REQUIRED');
  expect(second!.checks).toHaveLength(1); expect(repeat!.checks.map(check => check.id)).toEqual(firstIds);
  expect(sqlSecond).toBe(sqlRepeat); expect(sqlSecond).toBeLessThan(64);
  const comparison = value(await reader.read(scope, { ...first.query, compare: [first.checks[0].id, second!.checks[0].id] }));
  expect(comparison).toMatchObject({ comparison: { delta: '0', known: null, unexplained: null, evidence: 'NOT_AVAILABLE' } });
  expect(value(await open(scope)).count).toBe(102);
  expect(await census()).toEqual(afterAppend);
  console.info('Analytics 101-point whole-request SQL:', { second: sqlSecond, repeat: sqlRepeat });
}, 120000);
it('HB22-05 rejects corrupted shown bank evidence and returns no partial data', async () => {
  const scope = await fixture(); await observe(scope);
  const reader = createAnalyticsReader(readonlyDatabase), initial = value(await open(scope));
  await database.db.transaction(async tx => {
    await tx.execute(sql`SET LOCAL session_replication_role='replica'`);
    await tx.execute(sql`UPDATE audit_events SET before_after=jsonb_set(before_after,'{after,balanceCents}','"199999"'::jsonb)
      WHERE owner_user_id=${scope.ownerUserId} AND account_id=${scope.accountId} AND before_after->'entity'->>'type'='BANK_CHECKPOINT'`);
  });
  const before = await census();
  expect(await reader.read(scope, initial.query)).toEqual({ ok: false, code: 'HISTORY_SOURCE_INVALID' });
  expect(await open(scope)).toEqual({ ok: false, code: 'HISTORY_SOURCE_INVALID' });
  expect(await census()).toEqual(before);
});

it('HB22-02/09 resolves a moved correction at K before H and the date range', async () => {
  const scope = await fixture(), original = await observe(scope, '80000', [{ period: calendar.past, amountCents: '80000' }]);
  const [check] = await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId, scope.accountId));
  const [vector] = await database.db.select().from(s.allocationRevisions).where(eq(s.allocationRevisions.accountId, scope.accountId));
  const payload = { observedDate: calendar.pastDay(21), observedAt: null, balanceCents: '76000', allocations: [{ period: calendar.past, amountCents: '76000' }],
    correction: { checkpointId: check.id, allocationRevisionId: vector.id, reposition: true }, placement: null };
  await commitBatch(database.db, { scope, kind: 'BANK_CHECKPOINT', command: await command(scope, payload, calendar.pastDay(21)) }, writeBankCheckpoint);
  const before = await census(), reader = createAnalyticsReader(readonlyDatabase);
  const earlier = value(await reader.open(scope, { schemaVersion: 1, selection: { dayH: calendar.pastDay(20), knowledgeAnchor: original.updateId, report: null } }));
  const later = value(await reader.open(scope, { schemaVersion: 1, selection: { dayH: calendar.pastDay(20), knowledgeAnchor: null, report: null } }));
  expect(earlier).toMatchObject({ count: 1, lastCheck: { balance: '80000' } });
  expect(later).toMatchObject({ count: 0, lastCheck: null, endBalance: null });
  expect(await census()).toEqual(before);
});

it('HB22-04/16 pins an immutable report while later FRESH_START preserves historical state reachability', async () => {
  const scope = await fixture();
  const initial = await observe(scope, '10000', [{ period: calendar.past, amountCents: '4000' }, { period: calendar.target, amountCents: '6000' }]);
  const closing = createClosingRepository(database);
  const preview = value(await closing.preview(scope, await command(scope, { schemaVersion: 1, operation: 'INITIAL', period: calendar.past,
    expectedHeadId: null, expectedHeadVersion: null }, calendar.today))) as { command: unknown };
  const receipt = value(await closing.confirm(scope, value(prepareCommand(preview.command))));
  const [stored] = await database.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId, scope.accountId));
  const loaded = value(await closing.load(scope, { period: calendar.past, version: 1, offset: 0, digest: null })) as { report: { digest: string } };
  const ref = { id: stored.id, batchId: receipt.updateId, version: 1, digest: loaded.report.digest };
  const [account] = await database.db.select().from(s.accounts).where(eq(s.accounts.id, scope.accountId));
  const [check] = await database.db.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId, scope.accountId));
  const transition = { schemaVersion: 1, intent: 'TRANSITION', mode: 'FRESH_START', observationMode: 'ACTUAL_CHECK', target: calendar.target, sources: [],
    balanceCents: '8000', allocations: [{ period: calendar.target, amountCents: '8000' }], futureEdits: [], fundingRefs: [],
    expectedCheckpointRevisionId: check.id, expectedAllocationRevisionId: account.activeAllocationRevisionId, effectiveDate: calendar.today,
    checkpoint: { observedDate: calendar.today, observedAt: null, balanceCents: '8000', allocations: [{ period: calendar.target, amountCents: '8000' }], placement: null, correction: null },
    placement: null, consent: { completeVectorConfirmed: true, fundingUnchangedAcknowledged: true, transitionConfirmed: true, fundingConfirmed: true, nonCarryConfirmed: true } };
  const proposals = createProposalRepository(database);
  const prepared = value(await proposals.prepare(scope, await command(scope, transition, calendar.today))) as { proposalId: string; proposalIdentity: string; input: unknown; review: unknown };
  await proposals.confirm(scope, await command(scope, { proposalId: prepared.proposalId, proposalIdentity: prepared.proposalIdentity, input: prepared.input, review: prepared.review }, calendar.today));
  await observe(scope, '7600', [{ period: calendar.past, amountCents: '3600' }, { period: calendar.target, amountCents: '4000' }], calendar.pastEnd);
  const revised = value(await closing.preview(scope, await command(scope, { schemaVersion: 1, operation: 'REVISION', period: calendar.past,
    expectedHeadId: stored.id, expectedHeadVersion: 1 }, calendar.today))) as { command: unknown };
  const secondReceipt = value(await closing.confirm(scope, value(prepareCommand(revised.command))));
  const [secondStored] = await database.db.select().from(s.monthClosings).where(and(eq(s.monthClosings.accountId, scope.accountId), eq(s.monthClosings.version, 2)));
  const secondLoaded = value(await closing.load(scope, { period: calendar.past, version: 2, offset: 0, digest: null })) as { report: { digest: string } };
  const secondRef = { id: secondStored.id, batchId: secondReceipt.updateId, version: 2, digest: secondLoaded.report.digest };
  const before = await census(), reader = createAnalyticsReader(readonlyDatabase);
  const report = value(await reader.open(scope, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: ref } }));
  expect(report).toMatchObject({ count: 1, lastCheck: { balance: '10000', observedDate: calendar.pastDay(20) }, endBalance: null });
  expect(report.basis.report).toEqual(ref);
  const choices = value(await reader.choices(scope, { schemaVersion: 1, basis: report.basis, beforeSeq: null }));
  const picked = choices.items.find(item => item.report?.id === stored.id)?.report;
  if (!picked) throw new Error('REPORT_CHOICE_REQUIRED');
  const { period: choicePeriod, ...selection } = picked;
  expect(choicePeriod).toBe(calendar.past);
  expect(selection.digest).toBeNull();
  expect(await reader.open(scope, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: selection } }))
    .toMatchObject({ ok: true, value: { basis: { report: ref } } });
  expect(await reader.open(scope, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: secondRef } }))
    .toMatchObject({ ok: true, value: { basis: { report: secondRef }, lastCheck: { balance: '7600' }, endBalance: '7600' } });
  expect(value(await reader.read(scope, query(report, 'MONTHS')))).toMatchObject({ months: expect.arrayContaining([
    { period: calendar.past, allocated: '4000', reserved: '0', savings: '0', free: '4000', deficit: '0' },
  ]) });
  const current = value(await open(scope));
  expect(value(await reader.read(scope, query(current, 'MONTHS')))).toMatchObject({ months: expect.arrayContaining([
    { period: calendar.past, allocated: '0', reserved: '0', savings: '0', free: '0', deficit: '0' },
  ]) });
  const old = value(await reader.open(scope, { schemaVersion: 1, selection: { dayH: calendar.pastEnd, knowledgeAnchor: initial.updateId, report: null } }));
  expect(value(await reader.read(scope, query(old, 'MONTHS')))).toMatchObject({ months: expect.arrayContaining([
    { period: calendar.past, allocated: '4000', reserved: '0', savings: '0', free: '4000', deficit: '0' },
  ]) });
  expect(await reader.open(scope, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: { ...ref, digest: '0'.repeat(64) } } })).toEqual({ ok: false, code: 'HISTORY_SOURCE_INVALID' });
  expect(await reader.open({ ownerUserId: randomUUID(), accountId: scope.accountId }, { schemaVersion: 1, selection: { dayH: null, knowledgeAnchor: null, report: ref } })).toEqual({ ok: false, code: 'FORBIDDEN' });
  expect(await census()).toEqual(before);
});

it('HB22-11/12 reads known future reserves before a bank check and signed F after confirmation', async () => {
  const scope = await fixture();
  const changes = [{ key: 'future', action: 'CREATE', obligationId: null, expectedStateRevisionId: null, correctionId: null, previousChangeKey: null,
    effectiveDate: calendar.pastDay(2), bankDate: null, placement: null, bankCheck: null, paymentConfirmation: null,
    data: { title: 'Synthetic future reserve', dueDate: null, originalCents: '20000', isPossible: false, reserveFull: true,
      originatingPeriod: calendar.past, fundingPeriod: calendar.future } }];
  await commitBatch(database.db, { scope, kind: 'OBLIGATION_CREATE', command: await command(scope, { changes }, calendar.pastDay(2)) }, writeObligations);
  const reader = createAnalyticsReader(readonlyDatabase), unknown = value(await open(scope));
  const unknownQuery = { ...query(unknown, 'MONTHS'), filters: { from: `${calendar.target}-01`, to: `${calendar.future}-28`, origin: null, funding: null } };
  const before = await census();
  expect(await reader.read(scope, unknownQuery)).toMatchObject({ ok: true, value: { months: expect.arrayContaining([
    { period: calendar.future, allocated: null, reserved: '20000', savings: '0', free: null, deficit: null },
  ]) } });
  expect(await census()).toEqual(before);
  await observe(scope, '10000', [{ period: calendar.target, amountCents: '10000' }, { period: calendar.future, amountCents: '0' }]);
  const observed = value(await open(scope)), afterSeed = await census();
  expect(await reader.read(scope, { ...unknownQuery, basis: observed.basis })).toMatchObject({ ok: true, value: { months: expect.arrayContaining([
    { period: calendar.target, allocated: '10000', reserved: '0', savings: '0', free: '10000', deficit: '0' },
    { period: calendar.future, allocated: '0', reserved: '20000', savings: '0', free: '-20000', deficit: '20000' },
  ]) } });
  expect(await census()).toEqual(afterSeed);
});

it('HB22-05 admits 1200 owned period references and refuses 1201 before returning any data', async () => {
  const scope = await fixture(); await observe(scope, '0', [{ period: calendar.past, amountCents: '0' }]);
  await database.db.execute(sql`INSERT INTO budget_periods(id,owner_user_id,account_id,period)
    SELECT gen_random_uuid(),${scope.ownerUserId}::uuid,${scope.accountId}::uuid,
      (3000+(n/12))::text||'-'||lpad((1+(n%12))::text,2,'0') FROM generate_series(0,1198) n`);
  const before = await census(); expect(await open(scope)).toMatchObject({ ok: true }); expect(await census()).toEqual(before);
  await database.db.insert(s.budgetPeriods).values({ id: randomUUID(), ownerUserId: scope.ownerUserId, accountId: scope.accountId, period: '5000-01' });
  const over = await census(); expect(await open(scope)).toEqual({ ok: false, code: 'HISTORY_LIMIT_EXCEEDED' }); expect(await census()).toEqual(over);
});

it.each(['rows', 'work', 'bytes'] as const)('HB22-05 %s source admission refuses without materializing a partial result', async limit => {
  const scope = await fixture(), receipt = await observe(scope);
  if (limit === 'bytes') {
    await database.db.transaction(async tx => {
      await tx.execute(sql`SET LOCAL session_replication_role='replica'`);
      await tx.execute(sql`UPDATE audit_events SET before_after=before_after||jsonb_build_object('synthetic_padding',repeat('x',8388609))
        WHERE owner_user_id=${scope.ownerUserId} AND account_id=${scope.accountId} AND before_after->'entity'->>'type'='BANK_CHECKPOINT'`);
    });
  } else {
    const count = limit === 'rows' ? 20001 : 2001;
    await database.db.execute(sql`INSERT INTO historical_positions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,kind)
      SELECT gen_random_uuid(),${scope.ownerUserId}::uuid,${scope.accountId}::uuid,${receipt.updateId}::uuid,${BigInt(receipt.recordedSeq)},${calendar.pastDay(20)}::date,'SYNTHETIC_LIMIT'
      FROM generate_series(1,${count})`);
  }
  const before = await census();
  expect(await open(scope)).toEqual({ ok: false, code: 'HISTORY_LIMIT_EXCEEDED' });
  expect(await census()).toEqual(before);
});
