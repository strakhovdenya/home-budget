import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { createBudgetRepository } from '@/infrastructure/db/budget-update-repository';
import { prepareCommand } from '@/domain/updates/validation';
import * as schema from '@/infrastructure/db/schema';
import { value } from '../fixtures/checkpoints';
import { checkpoint } from '../fixtures/budget-update';
import { transitionCalendar } from '../fixtures/transition-calendar';

let admin: pg.Pool, writer: ReturnType<typeof createDatabase>, reader: ReturnType<typeof createDatabase>;
let databaseName: string, role: string, readUrl: string, calendar: ReturnType<typeof transitionCalendar>;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw Error('LOCAL_DB_REQUIRED');
  const url = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: url.toString() });
  databaseName = 'hb21_read_' + randomUUID().replaceAll('-', '');
  role = 'hb21_read_' + randomUUID().replaceAll('-', '');
  const password = randomBytes(24).toString('hex');
  await admin.query('CREATE DATABASE "' + databaseName + '"');
  url.pathname = '/' + databaseName; writer = createDatabase(url.toString());
  await migrate(writer.db, { migrationsFolder: './drizzle' });
  const provisioner = new pg.Client({ connectionString: url.toString() }); await provisioner.connect();
  try {
    await provisioner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${databaseName} TO ${role}; GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role}`);
    calendar = transitionCalendar((await provisioner.query("SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today")).rows[0].today);
  } finally { await provisioner.end(); }
  url.username = role; url.password = password; readUrl = url.toString(); reader = createDatabase(readUrl);
});
afterAll(async () => {
  await reader?.close(); await writer?.close();
  try {
    if (databaseName && /^hb21_read_[a-f0-9]{32}$/.test(databaseName)) await admin.query('DROP DATABASE "' + databaseName + '"');
    if (role && /^hb21_read_[a-f0-9]{32}$/.test(role)) await admin.query('DROP ROLE ' + role);
  } finally { await admin?.end(); }
});
async function census() {
  const client = new pg.Client({ connectionString: readUrl }); await client.connect();
  try {
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const rows = [];
    for (const { tablename } of tables) {
      if (!/^[a-z_]+$/.test(tablename)) throw Error('UNEXPECTED_TABLE');
      rows.push((await client.query('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),\'[]\'::jsonb)::text rows FROM "' + tablename + '" t')).rows[0].rows);
    }
    expect(tables).toHaveLength(20); return JSON.stringify(rows);
  } finally { await client.end(); }
}
async function fixture() {
  const scope = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await writer.db.insert(schema.users).values({ id: scope.ownerUserId });
  await writer.db.insert(schema.accounts).values({ id: scope.accountId, ownerUserId: scope.ownerUserId, displayName: 'Synthetic readonly regression' });
  const repo = createBudgetRepository(writer);
  async function command(day: string, amount: string) {
    const base = value(await repo.load(scope)) as unknown as { revision: string; knowledgeCut: string; baseCheckpointId: string | null; baseVectorId: string | null };
    const raw = value(prepareCommand({ requestId: randomUUID(), expectedRevision: base.revision, effectiveDate: day, reason: 'Synthetic readonly regression',
      payload: { schemaVersion: 1, knowledgeCut: base.knowledgeCut, baseCheckpointId: base.baseCheckpointId, baseVectorId: base.baseVectorId, effectiveDate: day,
        checkpoint: checkpoint(day, amount, { [calendar.target]: amount }), allocationChange: null, completeVectorConfirmed: true, obligations: [], savings: [] } }));
    return value(prepareCommand(value(await repo.preview(scope, raw))));
  }
  const first = await command(calendar.pastDay(20), '100000'), receipt = value(await repo.confirm(scope, first));
  return { scope, repo, first, receipt, command, readonly: createBudgetRepository(reader) };
}
it('HB21-B-R02 SELECT-only status/history prove own original receipt and refuse foreign scope without writes', async () => {
  const own = await fixture(), foreign = await fixture(), before = await census();
  expect(value(await own.readonly.status(own.scope, own.first.requestId))).toEqual(own.receipt);
  expect(value(await own.readonly.history(own.scope, own.receipt.updateId))).toMatchObject([{ receipt: own.receipt, review: { financial: { bank: { balanceCents: '100000' } } } }]);
  expect(value(await own.readonly.status(own.scope, foreign.first.requestId))).toBeNull();
  expect(value(await own.readonly.history(own.scope, foreign.receipt.updateId))).toEqual([]);
  const denied = { ...own.scope, ownerUserId: foreign.scope.ownerUserId };
  expect(await own.readonly.status(denied, own.first.requestId)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  expect(await own.readonly.history(denied, null)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  expect(await census()).toBe(before);
});
it('HB21-B-R02 runtime remains SELECT-only and cannot acquire FOR UPDATE or perform DML/DDL', async () => {
  const client = new pg.Client({ connectionString: readUrl }); await client.connect(); const before = await census();
  try {
    expect((await client.query('SELECT current_user role')).rows[0].role).toBe(role);
    for (const statement of ['SELECT id FROM accounts FOR UPDATE', 'UPDATE accounts SET display_name=display_name WHERE false', 'CREATE TABLE hb21_forbidden(id int)']) {
      await expect(client.query(statement)).rejects.toMatchObject({ code: '42501' });
    }
    expect(await census()).toBe(before);
  } finally { await client.end(); }
});
async function bounded<T>(promise: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('SNAPSHOT_BARRIER_TIMEOUT')), 5000); })]); }
  finally { clearTimeout(timer); }
}
it.each(['status', 'history'] as const)('HB21-B-R02 %s keeps one read-only snapshot while a real writer commits and replay preserves history', async operation => {
  const f = await fixture(), next = await f.command(calendar.today, '110000');
  const client = new pg.Client({ connectionString: readUrl }); await client.connect(); const query = client.query.bind(client);
  let enter!: () => void, release!: () => void, armed = true;
  const entered = new Promise<void>(resolve => { enter = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
  Object.defineProperty(client, 'query', { value: async (...args: unknown[]) => {
    const result = await Reflect.apply(query, client, args), input = args[0];
    const text = typeof input === 'string' ? input : input && typeof input === 'object' && 'text' in input ? String(input.text) : '';
    if (armed && /from "accounts"/i.test(text)) {
      armed = false;
      const settings = (await query("SELECT current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') readonly")).rows[0];
      expect(settings).toEqual({ isolation: 'repeatable read', readonly: 'on' });
      enter(); await released;
    }
    return result;
  } });
  const repo = createBudgetRepository({ db: drizzle(client, { schema }) });
  const pending = operation === 'status' ? repo.status(f.scope, next.requestId) : repo.history(f.scope, null);
  try {
    await bounded(entered);
    const receipt = value(await bounded(f.repo.confirm(f.scope, next))), committed = await census();
    release(); const old = value(await pending);
    if (operation === 'status') expect(old).toBeNull();
    else expect(old).toMatchObject([{ receipt: f.receipt }]);
    if (Array.isArray(old)) expect(old).toHaveLength(1);
    expect(value(await f.readonly.status(f.scope, next.requestId))).toEqual(receipt);
    expect(value(await f.readonly.history(f.scope, null))).toHaveLength(2);
    expect(value(await f.repo.confirm(f.scope, f.first))).toEqual(f.receipt);
    expect(value(await f.readonly.history(f.scope, f.receipt.updateId))).toMatchObject([{ receipt: f.receipt, review: { financial: { bank: { balanceCents: '100000' } } } }]);
    expect(await census()).toBe(committed);
  } finally { release(); await pending; await client.end(); }
});
