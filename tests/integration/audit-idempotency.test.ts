import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { commitBatch, canonicalPayload, type BatchWriter, type CommitRequest } from '@/infrastructure/db/commit';
import { prepareCommand } from '@/domain/updates/validation';
import { MAX_CENTS } from '@/domain/money/money';
import type { AuditDescriptor } from '@/domain/updates/contracts';
import * as s from '@/infrastructure/db/schema';

let database: ReturnType<typeof createDatabase>, admin: pg.Pool;
let testDatabaseUrl: string;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('LOCAL_TARGET_REQUIRED');
  const url = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: url.toString() });
  const name = 'hb009_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"');
  url.pathname = '/' + name;
  testDatabaseUrl = url.toString();
  database = createDatabase(url.toString());
  await migrate(database.db, { migrationsFolder: './drizzle' });
});
afterAll(async () => { await database?.close(); await admin?.end(); });
async function fixture(revision = 0n, sequence = 0n) {
  const ownerUserId = randomUUID(), accountId = randomUUID();
  await database.db.insert(s.users).values({ id: ownerUserId });
  await database.db.insert(s.accounts).values({ id: accountId, ownerUserId, displayName: 'Before', aggregateRevision: revision, recordedSeq: sequence });
  const raw = { requestId: randomUUID(), expectedRevision: revision, effectiveDate: '2020-11-20', reason: 'Synthetic reviewed change', payload: { name: 'After' } };
  return { scope: { ownerUserId, accountId }, kind: 'TEST_METADATA', raw };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
function request(f: Fixture, overrides: Record<string, unknown> = {}): CommitRequest {
  const command = prepareCommand({ ...f.raw, ...overrides });
  if (!command.ok) throw new Error(command.code);
  return { scope: f.scope, kind: f.kind, command: command.value };
}
const writer: BatchWriter = async (tx, context) => {
  const payload = context.command.payload;
  if (!payload || typeof payload !== 'object' || !('name' in payload) || typeof payload.name !== 'string') throw new Error('BAD_FIXTURE');
  await tx.update(s.accounts).set({ displayName: payload.name }).where(and(eq(s.accounts.id, context.account.id), eq(s.accounts.ownerUserId, context.account.ownerUserId)));
  const positionId = randomUUID();
  await tx.insert(s.historicalPositions).values({ id: positionId, ownerUserId: context.account.ownerUserId,
    accountId: context.account.id, budgetUpdateId: context.id, recordedSeq: context.recordedSeq,
    historicalDate: context.command.effectiveDate, kind: 'SYNTHETIC_METADATA' });
  const descriptors: readonly AuditDescriptor[] = [
    { entityType: 'TEST_METADATA', entityId: context.account.id, before: { name: context.account.displayName }, after: { name: payload.name } },
    { entityType: 'TEST_POSITION', entityId: positionId, before: null, after: { date: context.command.effectiveDate } },
  ];
  return descriptors;
};
async function state(f: Fixture) {
  const [account] = await database.db.select().from(s.accounts).where(eq(s.accounts.id, f.scope.accountId));
  const updates = await database.db.select().from(s.budgetUpdates).where(eq(s.budgetUpdates.accountId, f.scope.accountId));
  const audits = await database.db.select().from(s.auditEvents).where(eq(s.auditEvents.accountId, f.scope.accountId));
  const positions = await database.db.select().from(s.historicalPositions).where(eq(s.historicalPositions.accountId, f.scope.accountId));
  return { account, updates, audits, positions };
}
function latch() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
async function waitUntilBlocked() {
  const deadline = Date.now() + 5000;
  do {
    const result = await database.db.execute<{ waiting: number }>(sql`SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname=current_database() AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0`);
    if (result.rows[0].waiting > 0) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  } while (Date.now() < deadline);
  throw new Error('SECOND_CONNECTION_DID_NOT_WAIT_FOR_LOCK');
}
it('HB9-001 first commit has complete audit, provenance and backdated effective date', async () => {
  const f = await fixture(), result = await commitBatch(database.db, request(f), writer);
  const stored = await state(f);
  expect(stored.account.displayName).toBe('After');
  expect(stored.account.aggregateRevision).toBe(1n);
  expect(stored.account.recordedSeq).toBe(1n);
  expect(stored.updates).toHaveLength(1);
  expect(stored.audits).toHaveLength(2);
  expect(stored.positions).toHaveLength(1);
  expect(stored.updates[0].result).toEqual(result);
  expect(stored.updates[0].actorId).toBe(f.scope.ownerUserId);
  expect(stored.updates[0].recordedAt.slice(0, 4) > '2020').toBe(true);
  for (const audit of stored.audits) {
    expect(audit.effectiveDate).toBe('2020-11-20');
    expect(audit.budgetUpdateId).toBe(result.updateId);
    expect(audit.recordedSeq).toBe(1n);
    expect(audit.reason).toBe(f.raw.reason);
  }
  const metadata = stored.audits.find(a => (a.beforeAfter as { eventIndex: number }).eventIndex === 0)!;
  expect(metadata.beforeAfter).toMatchObject({ schemaVersion: 1, before: { name: 'Before' }, after: { name: 'After' } });
});
it('HB9-002/003 lost response replay returns original receipt even after later commits', async () => {
  const f = await fixture(), req = request(f);
  const first = await commitBatch(database.db, req, writer); // Simulate discarding the response after COMMIT.
  await commitBatch(database.db, request(f, { requestId: randomUUID(), expectedRevision: 1n }), writer);
  let calls = 0;
  const replay = await commitBatch(database.db, req, async () => { calls++; return []; });
  expect(replay).toEqual(first); expect(calls).toBe(0);
  const stored = await state(f);
  expect(stored.updates).toHaveLength(2); expect(stored.audits).toHaveLength(4);
  expect(stored.account.aggregateRevision).toBe(2n);
});
it.each([
  { payload: { name: 'Other' } }, { reason: 'Other' }, { effectiveDate: '2020-11-21' }, { expectedRevision: 1n },
])('HB9-004 same key changed semantic data rejects: %s', async overrides => {
  const f = await fixture(); await commitBatch(database.db, request(f), writer);
  await expect(commitBatch(database.db, request(f, overrides), writer)).rejects.toThrow('REQUEST_PAYLOAD_CONFLICT');
  expect((await state(f)).updates).toHaveLength(1);
});
it.each(['IDENTICAL', 'DIFFERENT_KEY', 'DIFFERENT_PAYLOAD', 'FIRST_ROLLBACK'])('HB9-005/006/007 controlled separate-connection concurrency: %s', async mode => {
  const f = await fixture(), entered = latch(), release = latch();
  let calls = 0;
  const first = commitBatch(database.db, request(f), async (tx, context) => {
    calls++; entered.release(); await release.promise;
    const descriptors = await writer(tx, context);
    if (mode === 'FIRST_ROLLBACK') throw new Error('TEST_ROLLBACK');
    return descriptors;
  });
  const firstObserved = first.catch(error => error);
  await entered.promise;
  const overrides = mode === 'DIFFERENT_KEY' ? { requestId: randomUUID() } : mode === 'DIFFERENT_PAYLOAD' ? { payload: { name: 'Other' } } : {};
  const second = commitBatch(database.db, request(f, overrides), async (tx, context) => { calls++; return writer(tx, context); });
  const secondObserved = second.catch(error => error);
  try { await waitUntilBlocked(); } finally { release.release(); }
  const a = await firstObserved, b = await secondObserved;
  if (mode === 'FIRST_ROLLBACK') { expect(a.message).toBe('TRANSACTION_FAILED'); expect(b.updateId).toBeTruthy(); expect(calls).toBe(2); }
  else if (mode === 'IDENTICAL') { expect(a).toEqual(b); expect(calls).toBe(1); }
  else { expect(b.message).toBe(mode === 'DIFFERENT_KEY' ? 'STALE_REVISION' : 'REQUEST_PAYLOAD_CONFLICT'); expect(calls).toBe(1); }
  const stored = await state(f);
  expect(stored.updates).toHaveLength(1); expect(stored.audits).toHaveLength(2);
  expect(stored.positions).toHaveLength(1); expect(stored.account.aggregateRevision).toBe(1n);
});
it('HB9-008 stale version rejects with no writes', async () => {
  const f = await fixture(), before = await state(f);
  await expect(commitBatch(database.db, request(f, { expectedRevision: 1n }), writer)).rejects.toThrow('STALE_REVISION');
  expect(await state(f)).toEqual(before);
});
it.each(['HANDLER', 'DESCRIPTOR', 'DEFERRED'])('HB9-009/010/011 whole-batch rollback on %s failure', async mode => {
  const f = await fixture(), before = await state(f);
  await expect(commitBatch(database.db, request(f), async (tx, context) => {
    const audit = await writer(tx, context);
    if (mode === 'HANDLER') throw new Error('SENSITIVE_TEST_PAYLOAD');
    if (mode === 'DESCRIPTOR') return [];
    await tx.insert(s.orderingRevisions).values({ id: randomUUID(), ownerUserId: f.scope.ownerUserId, accountId: f.scope.accountId,
      budgetUpdateId: context.id, recordedSeq: context.recordedSeq, historicalDate: '2020-11-20',
      previousRevisionId: randomUUID(), manifest: [], dependencies: [] }); // Deferred FK fails only at COMMIT.
    return audit;
  })).rejects.toThrow(mode === 'DESCRIPTOR' ? 'INVALID_AUDIT' : 'TRANSACTION_FAILED');
  expect(await state(f)).toEqual(before);
  expect(await database.db.select().from(s.orderingRevisions).where(eq(s.orderingRevisions.accountId, f.scope.accountId))).toHaveLength(0);
  await commitBatch(database.db, request(f), writer); // Failed request key was not consumed.
});
it('HB9-012 audit SQL insertion error rolls back prior state/fact/update writes', async () => {
  await database.db.execute(sql`CREATE FUNCTION hb9_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.event_kind='TEST_AUDIT_FAILURE' THEN RAISE EXCEPTION 'Synthetic failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);
  await database.db.execute(sql`CREATE TRIGGER hb9_test_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION hb9_test_audit_failure()`);
  const f = await fixture(), before = await state(f);
  await expect(commitBatch(database.db, { ...request(f), kind: 'TEST_AUDIT_FAILURE' }, writer)).rejects.toThrow('TRANSACTION_FAILED');
  expect(await state(f)).toEqual(before);
});
it('HB9-013 immutable audit and batch UPDATE/DELETE reject without changing original rows', async () => {
  const f = await fixture(); await commitBatch(database.db, request(f), writer);
  const before = await state(f);
  await expect(database.db.update(s.auditEvents).set({ reason: 'tamper' }).where(eq(s.auditEvents.accountId, f.scope.accountId))).rejects.toThrow();
  await expect(database.db.delete(s.auditEvents).where(eq(s.auditEvents.accountId, f.scope.accountId))).rejects.toThrow();
  await expect(database.db.update(s.budgetUpdates).set({ kind: 'TAMPER' }).where(eq(s.budgetUpdates.accountId, f.scope.accountId))).rejects.toThrow();
  await expect(database.db.delete(s.budgetUpdates).where(eq(s.budgetUpdates.accountId, f.scope.accountId))).rejects.toThrow();
  expect(await state(f)).toEqual(before);
});
it('HB9-014 ownership is checked inside transaction before replay', async () => {
  const a = await fixture(), b = await fixture();
  await commitBatch(database.db, request(a), writer);
  const before = await state(a);
  await expect(commitBatch(database.db, { ...request(a), scope: { ownerUserId: b.scope.ownerUserId, accountId: a.scope.accountId } }, writer)).rejects.toThrow('FORBIDDEN');
  expect(await state(a)).toEqual(before);
});
it.each(['REVISION', 'SEQUENCE', 'LAST_VALUE'])('HB9-015 protects int64 counter boundary: %s', async mode => {
  const f = await fixture(mode === 'REVISION' ? MAX_CENTS : mode === 'LAST_VALUE' ? MAX_CENTS - 1n : 0n,
    mode === 'SEQUENCE' ? MAX_CENTS : mode === 'LAST_VALUE' ? MAX_CENTS - 1n : 0n);
  const before = await state(f);
  if (mode === 'LAST_VALUE') {
    const result = await commitBatch(database.db, request(f), writer);
    expect(result.aggregateRevision).toBe(MAX_CENTS.toString()); expect(result.recordedSeq).toBe(MAX_CENTS.toString());
    expect(await commitBatch(database.db, request(f), writer)).toEqual(result);
  } else {
    await expect(commitBatch(database.db, request(f), writer)).rejects.toThrow('REVISION_RANGE');
    expect(await state(f)).toEqual(before);
  }
});
it.each(['SHAPE', 'ID', 'SEQUENCE', 'REVISION'])('HB9-016 corrupt stored receipt cannot be replayed: %s', async mode => {
  const f = await fixture(), req = request(f), c = req.command;
  const identity = createHash('sha256').update(canonicalPayload({ owner: f.scope.ownerUserId, account: f.scope.accountId, kind: f.kind,
    expectedRevision: c.expectedRevision.toString(), payload: c.payload, effectiveDate: c.effectiveDate, reason: c.reason })).digest('hex');
  const id = randomUUID();
  const result = mode === 'SHAPE' ? { updateId: 'corrupt' } : { updateId: mode === 'ID' ? randomUUID() : id,
    recordedSeq: mode === 'SEQUENCE' ? '2' : '1', aggregateRevision: mode === 'REVISION' ? '2' : '1' };
  await database.db.insert(s.budgetUpdates).values({ id, ...f.scope, requestId: c.requestId, payloadIdentity: identity,
    expectedRevision: 0n, recordedSeq: 1n, actorId: f.scope.ownerUserId, kind: f.kind, result });
  await expect(commitBatch(database.db, req, writer)).rejects.toThrow('STORAGE_ERROR');
  expect((await state(f)).audits).toHaveLength(0);
});
it('HB9-017 command mutation after lock wait cannot change hash or execution', async () => {
  const f = await fixture(), req = request(f);
  f.raw.payload.name = 'Mutated outside'; f.raw.reason = 'Mutated outside';
  await commitBatch(database.db, req, writer);
  expect((await state(f)).account.displayName).toBe('After');
});
it('HB9-018 future effective date rejects before any financial writes', async () => {
  const f = await fixture(), before = await state(f);
  await expect(commitBatch(database.db, request(f, { effectiveDate: '9999-12-31' }), writer)).rejects.toThrow('INVALID_INPUT');
  expect(await state(f)).toEqual(before);
});

it('HB9-019 real commit with lost driver acknowledgement reports unknown; retry recovers saved receipt', async () => {
  const f = await fixture(), req = request(f), client = new pg.Client({ connectionString: testDatabaseUrl });
  await client.connect();
  const original = client.query.bind(client);
  let lost = false;
  Object.defineProperty(client, 'query', { value: async (...args: unknown[]) => {
    const query = args[0];
    const text = typeof query === 'string' ? query : query && typeof query === 'object' && 'text' in query ? query.text : '';
    const result = await Reflect.apply(original, client, args);
    if (!lost && typeof text === 'string' && text.trim().toLowerCase() === 'commit') {
      lost = true;
      throw Object.assign(new Error('Synthetic lost acknowledgement'), { code: 'ECONNRESET' });
    }
    return result;
  } });
  try {
    await expect(commitBatch(drizzle(client, { schema: s }), req, writer)).rejects.toThrow('COMMIT_OUTCOME_UNKNOWN');
    expect(lost).toBe(true);
    const stored = await state(f);
    expect(stored.updates).toHaveLength(1);
    expect(stored.audits).toHaveLength(2);
    expect(await commitBatch(database.db, req, writer)).toEqual(stored.updates[0].result);
    expect((await state(f)).updates).toHaveLength(1);
  } finally { await client.end(); }
});
it('HB9-020 forged frozen command cannot bypass normalization', async () => {
  const f = await fixture(), req = request(f);
  await expect(commitBatch(database.db, { ...req, command: Object.freeze({ ...req.command, payload: { name: 'Forged' } }) }, writer)).rejects.toThrow('INVALID_INPUT');
  expect((await state(f)).updates).toHaveLength(0);
});
it('HB9-021 dedicated PostgreSQL requires a password for TCP connections', async () => {
  const url = new URL(testDatabaseUrl); url.password = 'intentionally-incorrect-synthetic-password';
  const client = new pg.Client({ connectionString: url.toString() });
  try { await expect(client.connect()).rejects.toMatchObject({ code: '28P01' }); }
  finally { await client.end(); }
});
it('HB9-022 SQL actor constraint rejects a forged actor', async () => {
  const f = await fixture(), other = await fixture();
  await expect(database.db.insert(s.budgetUpdates).values({ id: randomUUID(), ...f.scope,
    requestId: f.raw.requestId, expectedRevision: 0n, recordedSeq: 1n, actorId: other.scope.ownerUserId,
    payloadIdentity: 'synthetic', kind: 'TEST_METADATA', result: {} })).rejects.toThrow();
  expect((await state(f)).updates).toHaveLength(0);
});
it('HB9-R05 comma-key audit descriptor rolls back state, facts, receipt, audit and counters', async () => {
  const f = await fixture(), before = await state(f), req = request(f);
  const outcome = await commitBatch(database.db, req, async (tx, context) => {
    await writer(tx, context); // Real metadata and historical-position writes before audit validation.
    const malformed = { 'after,before': null, entityId: context.account.id, entityType: 'TEST' };
    return [malformed as unknown as AuditDescriptor];
  }).then(() => null, (error: unknown) => error);
  expect.soft(outcome).toMatchObject({ code: 'INVALID_AUDIT' });
  const after = await state(f);
  expect(after).toEqual(before);
  expect(after.updates).toHaveLength(0);
  expect(after.audits).toHaveLength(0);
  expect(after.positions).toHaveLength(0);
  expect(after.account.displayName).toBe('Before');
  expect(after.account.aggregateRevision).toBe(0n);
  expect(after.account.recordedSeq).toBe(0n);
  // A rejected request must not consume its idempotency key.
  await commitBatch(database.db, req, writer);
  expect((await state(f)).updates).toHaveLength(1);
});
