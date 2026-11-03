import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../../src/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '../../src/infrastructure/db/local-target';
import { identityRepository } from '../../src/infrastructure/auth/repository';
import { accounts, users } from '../../src/infrastructure/db/schema';

let database: ReturnType<typeof createDatabase>;
let admin: pg.Pool;
// Each test owns a fresh migrated database, including the empty first-login case.
// Do not truncate shared tables or weaken their immutable-history constraints.
beforeEach(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('DISPOSABLE_DATABASE_REQUIRED');
  const url = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: url.toString() });
  const name = 'hb_auth_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"');
  url.pathname = '/' + name;
  database = createDatabase(url.toString());
  await migrate(database.db, { migrationsFolder: './drizzle' });
});
afterEach(async () => { await database?.close(); await admin?.end(); });

it('AUTH-DB01 serializes first login, reuses the stable identity and never provisions finance data', async () => {
  const repository = identityRepository(database);
  const ids = await Promise.all([repository.bind('synthetic-google-owner'), repository.bind('synthetic-google-owner')]);
  expect(ids[0]).toBeTruthy(); expect(ids[1]).toBe(ids[0]);
  expect(await database.db.select().from(users)).toHaveLength(1);
  expect(await database.db.select().from(accounts)).toHaveLength(0);
  expect(await repository.bind('different-subject')).toBeNull();
  expect(await database.db.select().from(users)).toHaveLength(1);
});
it('AUTH-DB02 validates subject binding, UUIDs and database ownership for account lookups', async () => {
  const repository = identityRepository(database);
  const owner = (await repository.bind('synthetic-google-owner'))!;
  expect(await repository.matches(owner, 'synthetic-google-owner')).toBe(true);
  expect(await repository.matches(owner, 'different-subject')).toBe(false);
  expect(await repository.matches(randomUUID(), 'synthetic-google-owner')).toBe(false);
  expect(await repository.matches('invalid', 'synthetic-google-owner')).toBe(false);
  const other = randomUUID(), account = randomUUID();
  await database.db.insert(users).values({ id: other });
  await database.db.insert(accounts).values({ id: account, ownerUserId: other, displayName: 'Synthetic foreign account' });
  expect(await repository.ownsAccount(owner, account)).toBe(false);
  expect(await repository.ownsAccount(other, account)).toBe(true);
  expect(await repository.ownsAccount(owner, 'invalid')).toBe(false);
  expect(await repository.ownsAccount(owner, randomUUID())).toBe(false);
});
it('AUTH-DB03 refuses ambiguous/preexisting owners without rebinding or changing financial counters', async () => {
  const owner = randomUUID(), other = randomUUID();
  await database.db.insert(users).values([
    { id: owner, googleSubject: 'synthetic-google-owner', emailVerified: true },
    { id: other },
  ]);
  await database.db.insert(accounts).values({
    id: randomUUID(), ownerUserId: other, displayName: 'Synthetic preexisting account',
    aggregateRevision: BigInt(3), recordedSeq: BigInt(5),
  });
  const usersBefore = await database.db.select().from(users).orderBy(users.id);
  const before = await database.db.execute(sql`SELECT id, aggregate_revision, recorded_seq FROM accounts ORDER BY id`);
  expect(before.rows).toHaveLength(1);
  expect(await identityRepository(database).bind('synthetic-google-owner')).toBeNull();
  expect(await identityRepository(database).bind('replacement-subject')).toBeNull();
  const after = await database.db.execute(sql`SELECT id, aggregate_revision, recorded_seq FROM accounts ORDER BY id`);
  expect(after.rows).toEqual(before.rows);
  expect(await database.db.select().from(users).orderBy(users.id)).toEqual(usersBefore);
});

it('HB16-A02/A03/A04 PG bounds account discovery to the trusted owner without provisioning', async () => {
  const repo = identityRepository(database), owner = (await repo.bind('synthetic-hb016-owner'))!;
  const foreignOwner = randomUUID();
  await database.db.insert(users).values({ id: foreignOwner });
  await database.db.insert(accounts).values({ id: randomUUID(), ownerUserId: foreignOwner, displayName: 'Synthetic foreign' });
  const before = await database.db.select().from(accounts);
  expect(await repo.findAccountIdsForOwner(owner)).toEqual([]);
  expect(await database.db.select().from(accounts)).toEqual(before);
  const own = randomUUID();
  await database.db.insert(accounts).values({ id: own, ownerUserId: owner, displayName: 'Synthetic own' });
  expect(await repo.findAccountIdsForOwner(owner)).toEqual([own]);
  await database.db.insert(accounts).values([1,2].map(() => ({ id: randomUUID(), ownerUserId: owner, displayName: 'Synthetic additional' })));
  const allBefore = await database.db.select().from(accounts).orderBy(accounts.id);
  const discovered = await repo.findAccountIdsForOwner(owner);
  expect(discovered).toHaveLength(2);
  expect(discovered.every(id => allBefore.some(a => a.id === id && a.ownerUserId === owner))).toBe(true);
  await expect(repo.findAccountIdsForOwner('forged')).rejects.toThrow('FORBIDDEN');
  expect(await database.db.select().from(accounts).orderBy(accounts.id)).toEqual(allBefore);
});
