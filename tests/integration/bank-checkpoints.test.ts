import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabase } from '@/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '@/infrastructure/db/local-target';
import { commitBatch, rejectBatch, type Transaction, type CommitRequest } from '@/infrastructure/db/commit';
import { writeBankCheckpoint } from '@/infrastructure/db/checkpoint-writer';
import { createCheckpointReader, readCheckpointIntervals } from '@/infrastructure/db/checkpoint-reader';
import { loadCheckpointHistory } from '@/infrastructure/db/checkpoint-history';
import { createUpdateExecutor } from '@/features/budget-updates/execute-update';
import { createUpdateRepository } from '@/infrastructure/db/update-repository';
import { createBankStateReader } from '@/features/bank-checkpoints/read-state';
import { prepareCommand } from '@/domain/updates/validation';
import { MAX_CENTS } from '@/domain/money/money';
import { input, date, value } from '../fixtures/checkpoints';
import * as s from '@/infrastructure/db/schema';
import { savingAuditAfter } from '@/domain/savings/evidence';
import type { SavingEvent } from '@/domain/savings/contracts';

let database: ReturnType<typeof createDatabase>, admin: pg.Pool, testUrl: string;
beforeAll(async () => {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw new Error('LOCAL_TARGET_REQUIRED');
  const url = new URL(requireLocalDatabaseTargets(process.env).TEST_DATABASE_URL);
  admin = new pg.Pool({ connectionString: url.toString() });
  const name = 'hb010_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE "' + name + '"');
  url.pathname = '/' + name; testUrl = url.toString(); database = createDatabase(testUrl);
  await migrate(database.db, { migrationsFolder: './drizzle' });
});
afterAll(async () => { await database?.close(); await admin?.end(); });

async function fixture(revision = 0n, sequence = 0n) {
  const scope = { ownerUserId: randomUUID(), accountId: randomUUID() };
  await database.db.insert(s.users).values({ id: scope.ownerUserId });
  await database.db.insert(s.accounts).values({ id: scope.accountId, ownerUserId: scope.ownerUserId, displayName: 'Synthetic HB-010 card', aggregateRevision: revision, recordedSeq: sequence });
  return scope;
}
type Scope = Awaited<ReturnType<typeof fixture>>;
function request(scope: Scope, day: string, balance: string | bigint, revision: bigint, overrides: Record<string, unknown> = {}, requestId: string = randomUUID()): CommitRequest {
  return { scope, kind: 'BANK_CHECKPOINT', command: value(prepareCommand({ requestId, expectedRevision: revision, effectiveDate: day,
    reason: 'Synthetic explicit balance and complete allocation confirmation', payload: input(day, balance, overrides) })) };
}
const confirm = (f: Scope, day = '2026-10-05', balance: string | bigint = '50000', revision = 0n, overrides: Record<string, unknown> = {}) => commitBatch(database.db, request(f, day, balance, revision, overrides), writeBankCheckpoint);
async function snapshot(f: Scope) {
  const [account] = await database.db.select().from(s.accounts).where(eq(s.accounts.id, f.accountId));
  const tables = [s.budgetUpdates, s.balanceCheckpoints, s.allocationRevisions, s.periodAllocations, s.budgetPeriods, s.historicalPositions, s.orderingRevisions, s.auditEvents, s.monthClosings, s.reportHeads] as const;
  const counts: number[] = [];
  for (const t of tables) counts.push((await database.db.select({ id: t.id }).from(t).where(eq(t.accountId, f.accountId))).length);
  return { account, counts };
}
async function current(f: Scope, day = '2026-11-02') { return value(await createCheckpointReader(database).read(f, date(day))); }
async function append(f: Scope, day: string) {
  const rows = await database.db.select().from(s.orderingRevisions).where(and(eq(s.orderingRevisions.accountId, f.accountId), eq(s.orderingRevisions.historicalDate, day)));
  const tip = rows.sort((a, b) => a.recordedSeq < b.recordedSeq ? -1 : 1).at(-1);
  const history = await loadCheckpointHistory(database.db, f, (await snapshot(f)).account.recordedSeq);
  const order = history.orderings.find(o => o.id === tip?.id);
  return { expectedOrderingRevisionId: tip?.id ?? null, afterPositionId: order?.positionIds.at(-1) ?? null, beforePositionId: null };
}

it('HB10-DB01 fresh migration chain has 20 tables and reapplication twice is a no-op', async () => {
  const before = await database.db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  expect(before.rows).toHaveLength(20);
  await migrate(database.db, { migrationsFolder: './drizzle' }); await migrate(database.db, { migrationsFolder: './drizzle' });
  expect((await database.db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`)).rows).toEqual(before.rows);
  expect((await database.db.execute(sql`SELECT * FROM drizzle.__drizzle_migrations`)).rows).toHaveLength(6);
});
it('HB10-DB02 first confirmation atomically stores actual B, full A, shared position, audit and provenance', async () => {
  const f = await fixture();
  const receipt = await confirm(f, '2026-10-05', '10000', 0n, { allocations: [{ period: '2026-10', amountCents: '6000' }, { period: '2026-12', amountCents: '4000' }] });
  const state = await current(f), stored = await snapshot(f);
  expect(state.checkpoint?.balanceCents).toBe(10000n); expect(state.vector?.allocations.map(a => a.amountCents)).toEqual([6000n, 4000n]);
  expect(state.vector?.positionId).toBe(state.checkpoint?.positionId); expect(state.vector?.effectiveDate).toBe('2026-10-05');
  expect(state.knowledgeCut.toString()).toBe(receipt.recordedSeq); expect(state.orderingRevisionIds).toHaveLength(1);
  expect(stored.account.aggregateRevision).toBe(1n); expect(stored.counts.slice(0, 4)).toEqual([1, 1, 1, 2]); expect(stored.counts[7]).toBe(4);
});
it.each(['0', MAX_CENTS.toString()])('HB10-DB03 accepts signed-int64 endpoint B=%s with no required operations', async balance => {
  const f = await fixture(); await confirm(f, '2026-10-05', balance, 0n, balance === '0' ? { allocations: [] } : {});
  const c = await current(f); expect(c.checkpoint?.balanceCents).toBe(BigInt(balance)); expect(c.status).toBe('OBSERVED');
  expect(value(await readCheckpointIntervals(database, f))).toEqual([]);
});
it.each([
  [{ balanceCents: '-1' }, 'OVERDRAFT_POLICY_REQUIRED'],
  [{ balanceCents: MAX_CENTS + 1n }, 'MONEY_RANGE'],
  [{ allocations: [{ period: '2026-10', amountCents: '49999' }] }, 'ALLOCATION_SUM_MISMATCH'],
  [{ allocations: [{ period: '2026-10', amountCents: '50001' }] }, 'ALLOCATION_SUM_MISMATCH'],
  [{ allocations: [{ period: '2026-10', amountCents: '-1' }] }, 'NEGATIVE_CASH_ALLOCATION'],
  [{ allocations: [{ period: '2026-10', amountCents: '25000' }, { period: '2026-10', amountCents: '25000' }] }, 'DUPLICATE_PERIOD'],
])('HB10-DB04 domain refusal %# rolls back committed request and every partial row', async (overrides, code) => {
  const f = await fixture(), before = await snapshot(f);
  await expect(confirm(f, '2026-10-05', '50000', 0n, overrides)).rejects.toThrow(code);
  expect(await snapshot(f)).toEqual(before);
});
it('HB10-DB05 same request replay precedes stale check; changed payload conflicts; new same-B check is real', async () => {
  const f = await fixture(), r = request(f, '2026-10-05', '50000', 0n);
  const receipt = await commitBatch(database.db, r, writeBankCheckpoint);
  await confirm(f, '2026-10-06', '50000', 1n);
  expect(await commitBatch(database.db, r, writeBankCheckpoint)).toEqual(receipt);
  await expect(commitBatch(database.db, request(f, '2026-10-05', '50001', 0n, {}, r.command.requestId), writeBankCheckpoint)).rejects.toThrow('REQUEST_PAYLOAD_CONFLICT');
  expect((await snapshot(f)).counts.slice(0, 3)).toEqual([2, 2, 2]);
});
it('HB10-DB06 C7 insertion preserves exact C10/V10, counters advance, original historical facts remain immutable', async () => {
  const f = await fixture(); await confirm(f); const c5 = await current(f);
  await confirm(f, '2026-10-10', '45000', 1n); const c10 = await current(f);
  await confirm(f, '2026-10-07', '48000', 2n); const latest = await current(f);
  expect(latest.checkpoint).toEqual(c10.checkpoint); expect(latest.vector).toEqual(c10.vector);
  expect((await snapshot(f)).account.activeAllocationRevisionId).toBe(c10.vector?.id);
  expect((await snapshot(f)).account.recordedSeq).toBe(3n);
  expect((await current(f, '2026-10-06')).checkpoint?.id).toBe(c5.checkpoint?.id);
  expect((await current(f, '2026-10-07')).checkpoint?.balanceCents).toBe(48000n);
  expect((await current(f, '2026-10-31')).endBalanceCents).toBeNull();
});
it('HB10-DB07 null same-day time needs explicit placement, and stale/reversed known placement rolls back', async () => {
  const f = await fixture(); await confirm(f); const before = await snapshot(f);
  await expect(confirm(f, '2026-10-05', '49000', 1n)).rejects.toThrow('ORDERING_CONFLICT'); expect(await snapshot(f)).toEqual(before);
  await confirm(f, '2026-10-05', '49000', 1n, { placement: await append(f, '2026-10-05') });
  expect((await current(f)).checkpoint?.observedAt).toBeNull();
  await expect(confirm(f, '2026-10-05', '48000', 2n, { placement: { expectedOrderingRevisionId: null, afterPositionId: null, beforePositionId: null } })).rejects.toThrow('ORDERING_CONFLICT');
});
it('HB10-DB08 PostgreSQL retains microseconds and orders by confirmed position, not JS milliseconds', async () => {
  const f = await fixture(); await confirm(f, '2026-10-10', '1', 0n, { observedAt: '2026-10-10T08:00:00.000001Z' });
  const a = await current(f);
  await confirm(f, '2026-10-10', '2', 1n, { observedAt: '2026-10-10T08:00:00.000003Z', placement: await append(f, '2026-10-10') });
  const b = await current(f), order = await append(f, '2026-10-10');
  await confirm(f, '2026-10-10', '3', 2n, { observedAt: '2026-10-10T08:00:00.000002Z', placement: { ...order, afterPositionId: a.checkpoint!.positionId, beforePositionId: b.checkpoint!.positionId } });
  expect((await current(f)).checkpoint?.observedAt).toBe('2026-10-10T08:00:00.000003Z');
  const rows = await database.db.execute<{ micros: string }>(sql`SELECT to_char(observed_at AT TIME ZONE 'UTC','US') AS micros FROM balance_checkpoints WHERE account_id=${f.accountId} ORDER BY observed_at`);
  expect(rows.rows.map(r => r.micros)).toEqual(['000001', '000002', '000003']);
  const before = await snapshot(f);
  await expect(confirm(f, '2026-10-10', '4', 3n, { observedAt: '2026-10-10T08:00:00.000002Z', placement: await append(f, '2026-10-10') })).rejects.toThrow('ORDERING_CONFLICT');
  expect(await snapshot(f)).toEqual(before);
});
it.each([
  ['2026-03-29', '2026-03-29T02:30:00+01:00'],
  ['2026-10-25', '2026-10-25T02:30:00+02:00'],
  ['2026-10-25', '2026-10-25T02:30:00+01:00'],
  ['0001-01-01', '0001-01-01T00:00:00Z'],
  ['0099-12-31', '0099-12-31T12:00:00.000001Z'],
])('HB10-DB09 explicit DST/early-year instant %s %s survives SQL round-trip', async (day, at) => {
  const f = await fixture(); await confirm(f, day, '1', 0n, { observedAt: at });
  expect((await current(f)).checkpoint?.observedDate).toBe(day);
});
it('HB10-DB10 amount correction keeps position/logical identity and creates full companion; stale-tip fork rolls back', async () => {
  const f = await fixture(); await confirm(f); const a = await current(f);
  await confirm(f, '2026-10-05', '51000', 1n, { correction: { checkpointId: a.checkpoint!.id, allocationRevisionId: a.vector!.id, reposition: false } });
  const b = await current(f);
  expect(b.checkpoint?.positionId).toBe(a.checkpoint?.positionId); expect(b.checkpoint?.logicalFactId).toBe(a.checkpoint?.logicalFactId);
  expect(b.checkpoint?.supersedesId).toBe(a.checkpoint?.id); expect(b.vector?.supersedesId).toBe(a.vector?.id);
  expect(b.vector?.allocations[0].amountCents).toBe(51000n); expect((await snapshot(f)).counts[5]).toBe(1);
  const before = await snapshot(f);
  await expect(confirm(f, '2026-10-05', '52000', 2n, { correction: { checkpointId: a.checkpoint!.id, allocationRevisionId: a.vector!.id, reposition: false } })).rejects.toThrow('CORRECTION_CONFLICT');
  expect(await snapshot(f)).toEqual(before);
});
it('HB10-DB11 date correction creates position and both day manifests; K resolves corrections before H', async () => {
  const f = await fixture(); await confirm(f); const a = await current(f);
  await confirm(f, '2026-10-10', '45000', 1n);
  const oldOrders = await database.db.select().from(s.orderingRevisions).where(eq(s.orderingRevisions.accountId, f.accountId));
  await confirm(f, '2026-10-11', '51000', 2n, { correction: { checkpointId: a.checkpoint!.id, allocationRevisionId: a.vector!.id, reposition: true } });
  const b = await current(f);
  expect(b.checkpoint?.positionId).not.toBe(a.checkpoint?.positionId); expect(b.checkpoint?.logicalFactId).toBe(a.checkpoint?.logicalFactId);
  expect((await current(f, '2026-10-07')).status).toBe('NO_OBSERVATION');
  for (const o of oldOrders) expect((await database.db.select().from(s.orderingRevisions).where(eq(s.orderingRevisions.id, o.id)))[0]).toEqual(o);
  expect((await snapshot(f)).counts[6]).toBe(4);
});
it('HB10-DB12 correcting older amount preserves later bank/vector and its immutable predecessor reference', async () => {
  const f = await fixture(); await confirm(f); const a = await current(f);
  await confirm(f, '2026-10-10', '45000', 1n); const b = await current(f);
  await confirm(f, '2026-10-05', '51000', 2n, { correction: { checkpointId: a.checkpoint!.id, allocationRevisionId: a.vector!.id, reposition: false } });
  expect((await current(f)).vector).toEqual(b.vector); expect((await current(f)).checkpoint).toEqual(b.checkpoint);
});
it('HB10-DB25 same-day order correction creates a new position/manifests without another logical bank check', async () => {
  const f = await fixture(); await confirm(f); const a = await current(f);
  await confirm(f, '2026-10-05', '45000', 1n, { placement: await append(f, '2026-10-05') });
  await confirm(f, '2026-10-05', '51000', 2n, { correction: { checkpointId: a.checkpoint!.id, allocationRevisionId: a.vector!.id, reposition: true }, placement: await append(f, '2026-10-05') });
  const b = await current(f);
  expect(b.checkpoint?.logicalFactId).toBe(a.checkpoint?.logicalFactId); expect(b.checkpoint?.positionId).not.toBe(a.checkpoint?.positionId);
  expect(b.checkpoint?.balanceCents).toBe(51000n); expect(b.vector?.checkpointId).toBe(b.checkpoint?.id);
  expect((await snapshot(f)).counts[6]).toBe(3);
});
it('HB10-DB13 old-anchor redistribution makes C7 a HISTORICAL_STATE_CONFLICT and fully rolls back', async () => {
  const f = await fixture(); await confirm(f); const a = await current(f);
  await commitBatch(database.db, request(f, '2026-10-08', '50000', 1n), async (tx, b) => {
    const base = { ...f, budgetUpdateId: b.id, recordedSeq: b.recordedSeq }, pid = randomUUID(), vid = randomUUID();
    await tx.insert(s.historicalPositions).values({ ...base, id: pid, historicalDate: '2026-10-08', kind: 'SYNTHETIC_HB013_FIXTURE' });
    await tx.insert(s.orderingRevisions).values({ ...base, id: randomUUID(), historicalDate: '2026-10-08', manifest: { schemaVersion: 1, positionIds: [pid] }, dependencies: { schemaVersion: 1, edges: [] } });
    await tx.insert(s.allocationRevisions).values({ ...base, id: vid, logicalFactId: vid, checkpointId: a.checkpoint!.id, positionId: pid, effectiveDate: '2026-10-08', changeKind: 'SYNTHETIC_REDISTRIBUTION', previousRevisionId: a.vector!.id });
    const [period] = await tx.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId, f.accountId));
    await tx.insert(s.periodAllocations).values({ ...f, id: randomUUID(), allocationRevisionId: vid, periodId: period.id, amountCents: 50000n });
    await tx.update(s.accounts).set({ activeAllocationRevisionId: vid }).where(eq(s.accounts.id, f.accountId));
    return [{ entityType: 'TEST_FIXTURE', entityId: vid, before: null, after: { checkpointId: a.checkpoint!.id } }];
  });
  await confirm(f, '2026-10-10', '45000', 2n); const before = await snapshot(f);
  await expect(confirm(f, '2026-10-07', '48000', 3n)).rejects.toThrow('HISTORICAL_STATE_CONFLICT');
  expect(await snapshot(f)).toEqual(before);
});
it('HB10-DB14 domain rejection AFTER real writes causes PostgreSQL rollback, not a committed Result.error', async () => {
  const f = await fixture(), before = await snapshot(f);
  await expect(commitBatch(database.db, request(f, '2026-10-05', '50000', 0n), async (tx, b) => {
    await writeBankCheckpoint(tx, b);
    return rejectBatch('HISTORICAL_STATE_CONFLICT');
  })).rejects.toThrow('HISTORICAL_STATE_CONFLICT');
  expect(await snapshot(f)).toEqual(before);
});
it('HB10-DB15 audit failure and deferred SQL failure roll back entire checkpoint batch', async () => {
  for (const failure of ['audit', 'deferred']) {
    const f = await fixture(), before = await snapshot(f);
    await expect(commitBatch(database.db, request(f, '2026-10-05', '50000', 0n), async (tx, b) => {
      const audit = await writeBankCheckpoint(tx, b);
      if (failure === 'audit') return [];
      const cp = await tx.select().from(s.balanceCheckpoints).where(eq(s.balanceCheckpoints.accountId, f.accountId));
      const [v] = await tx.select().from(s.allocationRevisions).where(eq(s.allocationRevisions.accountId, f.accountId));
      // A second vector of zero against nonzero B fails the deferred complete-vector guard at COMMIT.
      await tx.insert(s.allocationRevisions).values({ ...f, id: randomUUID(), logicalFactId: randomUUID(), checkpointId: cp[0].id,
        positionId: v.positionId, effectiveDate: v.effectiveDate, budgetUpdateId: b.id, recordedSeq: b.recordedSeq, changeKind: 'SYNTHETIC_INVALID' });
      return audit;
    })).rejects.toThrow(failure === 'audit' ? 'INVALID_AUDIT' : 'TRANSACTION_FAILED');
    expect(await snapshot(f)).toEqual(before);
  }
});
it('HB10-DB16 server authorization precedes replay/read; foreign owner and forged actor reject', async () => {
  const f = await fixture(); const r = request(f, '2026-10-05', '50000', 0n); await commitBatch(database.db, r, writeBankCheckpoint);
  const before = await snapshot(f);
  const denied = createUpdateExecutor({ authorize: async () => { throw new Error('UNAUTHORIZED'); }, repository: createUpdateRepository(database, 'BANK_CHECKPOINT', writeBankCheckpoint) });
  expect(await denied(f.accountId, { ...r.command })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  const other = await fixture();
  await expect(commitBatch(database.db, { ...r, scope: { ...f, ownerUserId: other.ownerUserId } }, writeBankCheckpoint)).rejects.toThrow('FORBIDDEN');
  expect(await createCheckpointReader(database).read({ ...f, ownerUserId: other.ownerUserId }, date('2026-10-31'))).toEqual({ ok: false, code: 'FORBIDDEN' });
  const deniedRead = createBankStateReader(async () => { throw new Error('UNAUTHORIZED'); }, createCheckpointReader(database));
  expect(await deniedRead(f.accountId, '2026-10-31')).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  expect(prepareCommand({ ...r.command, actorId: other.ownerUserId }).ok).toBe(false);
  expect(await snapshot(f)).toEqual(before);
});
it('HB10-DB17 mutable input is copied before async auth; original mutation cannot change execution/hash', async () => {
  const f = await fixture(), payload = input(), raw = { requestId: randomUUID(), expectedRevision: 0n, effectiveDate: '2026-10-05', reason: 'Synthetic', payload };
  const executor = createUpdateExecutor({ authorize: async () => { payload.balanceCents = '1'; payload.allocations[0].amountCents = '1'; return f; }, repository: createUpdateRepository(database, 'BANK_CHECKPOINT', writeBankCheckpoint) });
  expect((await executor(f.accountId, raw)).ok).toBe(true); expect((await current(f)).checkpoint?.balanceCents).toBe(50000n);
  const replay = await commitBatch(database.db, { scope: f, kind: 'BANK_CHECKPOINT', command: value(prepareCommand({ ...raw, payload: input() })) }, writeBankCheckpoint);
  expect(replay.aggregateRevision).toBe('1');
});
it.each([[MAX_CENTS, 0n], [0n, MAX_CENTS]])('HB10-DB18 signed int64 counter endpoint refuses without rows [case %#]', async (rev, seq) => {
  const f = await fixture(rev, seq), before = await snapshot(f);
  await expect(confirm(f, '2026-10-05', '1', rev)).rejects.toThrow('REVISION_RANGE'); expect(await snapshot(f)).toEqual(before);
});
it('HB10-DB19 interval read splits C5..C10 at C7 and never substitutes an empty operation ledger', async () => {
  const f = await fixture(); await confirm(f); await confirm(f, '2026-10-10', '45000', 1n);
  expect(value(await readCheckpointIntervals(database, f)).map(i => i.reconciliation)).toMatchObject([{ deltaCents: -5000n, knownCents: null, unexplainedCents: null, evidenceStatus: 'NOT_AVAILABLE' }]);
  await confirm(f, '2026-10-07', '48000', 2n);
  const intervals = value(await readCheckpointIntervals(database, f));
  expect(intervals.map(i => i.reconciliation.deltaCents)).toEqual([-2000n, -3000n]); expect(intervals.every(i => i.knowledgeCut === 3n)).toBe(true);
});

async function closeFixture(f: Scope, month: string, revision: bigint, selectionVersion = 1) {
  const through = month + (month.endsWith('-09') ? '-30' : '-31'), state = await current(f, through);
  const c = state.checkpoint!, v = state.vector!, headId = randomUUID(), closingId = randomUUID();
  await commitBatch(database.db, { ...request(f, through, c.balanceCents, revision), kind: 'SYNTHETIC_CLOSE_FIXTURE' }, async (tx, batch) => {
    const [period] = await tx.select().from(s.budgetPeriods).where(and(eq(s.budgetPeriods.accountId, f.accountId), eq(s.budgetPeriods.period, month)));
    const allocated = v.allocations.find(a => a.period === month)?.amountCents ?? 0n;
    await tx.insert(s.monthClosings).values({ ...f, id: closingId, budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq,
      periodId: period.id, version: 1, historicalThroughDate: through, closedAt: batch.recordedAt, closedBy: f.ownerUserId,
      evidenceRecordedCutoffSeq: batch.account.recordedSeq, evidenceRecordedCutoffAt: batch.recordedAt, reason: 'Synthetic immutable v1 fixture', changeEvidenceRefs: [],
      lastCheckpointId: c.id, lastBankObservedDate: c.observedDate, lastBankObservedAt: c.observedAt, lastObservedBalanceCents: c.balanceCents,
      historicalAllocationRevisionId: v.id, allocationEffectiveDate: v.effectiveDate, endCheckpointId: c.observedDate === through ? c.id : null,
      endBalanceCents: c.observedDate === through ? c.balanceCents : null, bankDataCompleteness: c.observedDate === through ? 'END_DATE_OBSERVED' : 'INCOMPLETE',
      operationDetailStatus: 'NOT_PROVIDED', historicalAllocatedCents: allocated, historicalReservedCents: 0n, historicalSavingsCents: 0n, historicalFreeCents: allocated,
      snapshotSchemaVersion: 1, selectionContractVersion: selectionVersion, snapshotJson: { syntheticFixture: true },
      sourceManifest: { checkpointId: c.id, allocationRevisionId: v.id }, orderingRevisionRefs: state.orderingRevisionIds });
    await tx.insert(s.reportHeads).values({ ...f, id: headId, periodId: period.id, closingId });
    return [{ entityType: 'TEST_CLOSING', entityId: closingId, before: null, after: { headId } }];
  });
  return { headId, closingId };
}
it('HB10-DB22 historical entry marks ONLY affected closed head, atomically audits it, leaves every v1 byte intact', async () => {
  const f = await fixture();
  await confirm(f, '2026-09-20', '80000', 0n, { allocations: [{ period: '2026-09', amountCents: '60000' }, { period: '2026-10', amountCents: '20000' }] });
  const sep = await closeFixture(f, '2026-09', 1n);
  await confirm(f, '2026-10-02', '75000', 2n); const active = await current(f);
  const oct = await closeFixture(f, '2026-10', 3n);
  const before = await database.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId, f.accountId));
  await confirm(f, '2026-09-30', '76000', 4n, { allocations: [{ period: '2026-09', amountCents: '56000' }, { period: '2026-10', amountCents: '20000' }] });
  expect(await database.db.select().from(s.monthClosings).where(eq(s.monthClosings.accountId, f.accountId))).toEqual(before);
  const heads = await database.db.select().from(s.reportHeads).where(eq(s.reportHeads.accountId, f.accountId));
  expect(heads.find(h => h.id === sep.headId)).toMatchObject({ closingId: sep.closingId, correctionPending: true });
  expect(heads.find(h => h.id === oct.headId)).toMatchObject({ closingId: oct.closingId, correctionPending: false });
  expect((await current(f)).vector?.id).toBe(active.vector?.id);
  const audit = await database.db.select().from(s.auditEvents).where(and(eq(s.auditEvents.accountId, f.accountId), eq(s.auditEvents.recordedSeq, 5n)));
  expect(audit.map(a => a.beforeAfter)).toContainEqual(expect.objectContaining({ entity: { type: 'REPORT_REVIEW_REQUIRED', id: sep.headId },
    before: { closingId: sep.closingId, correctionPending: false }, after: { closingId: sep.closingId, correctionPending: true } }));
  expect((await current(f, '2026-09-30')).endBalanceCents).toBe(76000n);
});
it('HB10-DB23 audit failure also rolls back report pending flag; unsupported report selection is explicit refusal', async () => {
  for (const selectionVersion of [1, 2]) {
    const f = await fixture(); await confirm(f, '2026-09-20', '80000', 0n, { allocations: [{ period: '2026-09', amountCents: '80000' }] });
    await closeFixture(f, '2026-09', 1n, selectionVersion); const before = await snapshot(f);
    await expect(commitBatch(database.db, request(f, '2026-09-30', '76000', 2n), async (tx, b) => { await writeBankCheckpoint(tx, b); return []; }))
      .rejects.toThrow(selectionVersion === 1 ? 'INVALID_AUDIT' : 'REPORT_IMPACT_REVIEW_REQUIRED');
    expect(await snapshot(f)).toEqual(before);
    expect((await database.db.select().from(s.reportHeads).where(eq(s.reportHeads.accountId, f.accountId)))[0].correctionPending).toBe(false);
  }
});
it('HB10-DB24 existing R/S above B survives a new actual checkpoint without automatic debit or reserve trimming', async () => {
  const f = await fixture(); await confirm(f, '2026-10-05', '10000'); const state = await current(f);
  await commitBatch(database.db, { ...request(f, '2026-10-05', '10000', 1n), kind: 'SYNTHETIC_EARMARK_FIXTURE' }, async (tx, b) => {
    const base = { ...f, budgetUpdateId: b.id, recordedSeq: b.recordedSeq }, obligationId = randomUUID(), savingsId = randomUUID();
    const [period] = await tx.select().from(s.budgetPeriods).where(eq(s.budgetPeriods.accountId, f.accountId));
    await tx.insert(s.obligations).values({ ...base, id: obligationId, originatingPeriodId: period.id });
    await tx.insert(s.obligationEvents).values({ title: 'Synthetic obligation', ...base, id: randomUUID(), logicalFactId: randomUUID(), obligationId, positionId: state.checkpoint!.positionId,
      fundingPeriodId: period.id, effectiveDate: '2026-10-05', action: 'CREATE', originalCents: 20000n, outstandingCents: 20000n, status: 'UNPAID', isPossible: false, reserveFull: true });
    await tx.insert(s.savingsGoals).values({ ...base, id: savingsId, originatingPeriodId: period.id });
    const eventId = randomUUID();
    const saving: SavingEvent = { ...base, title: 'Synthetic savings', id: eventId, logicalFactId: eventId, savingsId,
      originatingPeriodId: period.id, positionId: state.checkpoint!.positionId, fundingPeriodId: period.id, effectiveDate: date('2026-10-05'),
      action: 'CREATE', amountCents: 5000n, status: 'ACTIVE', previousRevisionId: null, supersedesId: null, beforeState: null,
      confirmedAt: b.recordedAt, confirmedIncreaseAmount: null, confirmedReleasedAmount: null };
    await tx.insert(s.savingsEvents).values({ ...base, ...saving });
    return [{ entityType: 'TEST_EARMARK', entityId: obligationId, before: null, after: { savingsId } },
      { entityType: 'SAVINGS_STATE', entityId: saving.id, before: null, after: savingAuditAfter(saving) }];
  });
  const beforeO = await database.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId, f.accountId));
  const beforeS = await database.db.select().from(s.savingsEvents).where(eq(s.savingsEvents.accountId, f.accountId));
  await confirm(f, '2026-10-06', '15000', 2n);
  expect((await current(f)).checkpoint?.balanceCents).toBe(15000n);
  expect(await database.db.select().from(s.obligationEvents).where(eq(s.obligationEvents.accountId, f.accountId))).toEqual(beforeO);
  expect(await database.db.select().from(s.savingsEvents).where(eq(s.savingsEvents.accountId, f.accountId))).toEqual(beforeS);
});

function latch() { let release!: () => void; const promise = new Promise<void>(r => { release = r; }); return { promise, release }; }
async function blocked() {
  const until = Date.now() + 5000;
  do {
    const r = await database.db.execute<{ n: number }>(sql`SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0`);
    if (r.rows[0].n > 0) return;
    await new Promise(r => setTimeout(r, 10));
  } while (Date.now() < until);
  throw new Error('SECOND_REAL_CONNECTION_NOT_BLOCKED');
}
it.each([true, false])('HB10-DB20 controlled real-connection concurrency same request=%s', async same => {
  const f = await fixture(), a = request(f, '2026-10-05', '50000', 0n), b = same ? a : request(f, '2026-10-05', '49000', 0n);
  const entered = latch(), proceed = latch();
  const first = commitBatch(database.db, a, async (tx, batch) => { entered.release(); await proceed.promise; return writeBankCheckpoint(tx, batch); });
  await entered.promise;
  const second = commitBatch(database.db, b, writeBankCheckpoint).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
  try { await blocked(); } finally { proceed.release(); }
  const receipt = await first, other = await second;
  if (same) { expect(other.ok).toBe(true); if (other.ok) expect(other.value).toEqual(receipt); }
  else { expect(other.ok).toBe(false); if (!other.ok) expect(other.error.message).toBe('STALE_REVISION'); }
  expect((await snapshot(f)).counts.slice(0, 3)).toEqual([1, 1, 1]);
});
it('HB10-DB21 lost acknowledgement after real COMMIT replays the exact original receipt', async () => {
  const f = await fixture(), r = request(f, '2026-10-05', '50000', 0n), connection = new pg.Client({ connectionString: testUrl }); await connection.connect();
  let lost = false;
  const query = connection.query.bind(connection);
  Object.defineProperty(connection, 'query', { value: async (...args: unknown[]) => {
    const q = args[0];
    const text = typeof q === 'string' ? q : q && typeof q === 'object' && 'text' in q ? q.text : '';
    const result = await Reflect.apply(query, connection, args);
    if (typeof text === 'string' && text.trim().toLowerCase() === 'commit' && !lost) {
      lost = true; throw new Error('SYNTHETIC_ACK_LOST');
    }
    return result;
  } });
  try {
    await expect(commitBatch(drizzle(connection, { schema: s }), r, writeBankCheckpoint)).rejects.toThrow('COMMIT_OUTCOME_UNKNOWN');
    expect(lost).toBe(true);
    const receipt = await commitBatch(database.db, r, writeBankCheckpoint);
    expect(receipt.recordedSeq).toBe('1'); expect((await snapshot(f)).counts.slice(0, 3)).toEqual([1, 1, 1]);
  } finally { await connection.end(); }
});

// Direct SQL deliberately bypasses HB-010's writer/validators to prove ONLY SQL guarantees.
async function rawBatch(f: Scope, seq: bigint, run: (tx: Transaction, updateId: string) => Promise<void>) {
  return database.db.transaction(async tx => {
    const updateId = randomUUID();
    await tx.execute(sql`INSERT INTO budget_updates(id,owner_user_id,account_id,request_id,payload_identity,expected_revision,recorded_seq,actor_id,result,kind)
      VALUES(${updateId},${f.ownerUserId},${f.accountId},${randomUUID()},'synthetic',${seq - 1n},${seq},${f.ownerUserId},'{}','DIRECT_SQL_FIXTURE')`);
    await run(tx, updateId);
  });
}
async function rejectsSql(promise: Promise<unknown>, expected: string) {
  let found = false;
  try { await promise; } catch (e) {
    let cause: unknown = e;
    while (cause && typeof cause === 'object') {
      if ('message' in cause && typeof cause.message === 'string' && cause.message.includes(expected)) found = true;
      if ('constraint' in cause && cause.constraint === expected) found = true;
      cause = 'cause' in cause ? cause.cause : null;
    }
  }
  expect(found, 'expected database guard ' + expected).toBe(true);
}
it.each(['checkpoint', 'allocation'])('HB10-SQL01 position date guard for %s cannot be bypassed', async target => {
  const f = await fixture(), before = await snapshot(f);
  await rejectsSql(rawBatch(f, 1n, async (tx, batch) => {
    const cp = randomUUID(), v = randomUUID(), p1 = randomUUID(), p2 = randomUUID();
    await tx.execute(sql`INSERT INTO historical_positions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,kind) VALUES
      (${p1},${f.ownerUserId},${f.accountId},${batch},1,${target === 'checkpoint' ? '2026-10-06' : '2026-10-05'}::date,'TEST'),
      (${p2},${f.ownerUserId},${f.accountId},${batch},1,${target === 'allocation' ? '2026-10-06' : '2026-10-05'}::date,'TEST')`);
    await tx.execute(sql`INSERT INTO balance_checkpoints(id,owner_user_id,account_id,budget_update_id,recorded_seq,logical_fact_id,position_id,observed_date,balance_cents,reason)
      VALUES(${cp},${f.ownerUserId},${f.accountId},${batch},1,${cp},${p1},'2026-10-05',0,'Synthetic')`);
    await tx.execute(sql`INSERT INTO allocation_revisions(id,owner_user_id,account_id,budget_update_id,recorded_seq,logical_fact_id,checkpoint_id,position_id,effective_date,change_kind)
      VALUES(${v},${f.ownerUserId},${f.accountId},${batch},1,${v},${cp},${p2},'2026-10-05','ACTUAL_CHECK')`);
  }), 'POSITION_DATE_MISMATCH');
  expect(await snapshot(f)).toEqual(before);
});
async function rawOrder(tx: Transaction, f: Scope, batch: string, seq: bigint, orderId: string, day: string, prior: string | null) {
  await tx.execute(sql`INSERT INTO ordering_revisions(id,owner_user_id,account_id,budget_update_id,recorded_seq,historical_date,previous_revision_id,manifest,dependencies)
    VALUES(${orderId},${f.ownerUserId},${f.accountId},${batch},${seq},${day}::date,${prior},'{}','{}')`);
}
it('HB10-SQL02 one root per account/day and no branching predecessor are enforced by SQL', async () => {
  const f = await fixture(), root = randomUUID();
  await rawBatch(f, 1n, (tx, b) => rawOrder(tx, f, b, 1n, root, '2026-10-05', null));
  await rejectsSql(rawBatch(f, 2n, (tx, b) => rawOrder(tx, f, b, 2n, randomUUID(), '2026-10-05', null)), 'ordering_one_root');
  await rawBatch(f, 2n, (tx, b) => rawOrder(tx, f, b, 2n, randomUUID(), '2026-10-05', root));
  await rejectsSql(rawBatch(f, 3n, (tx, b) => rawOrder(tx, f, b, 3n, randomUUID(), '2026-10-05', root)), 'ordering_one_child');
});
it.each(['day', 'scope', 'equal-seq', 'future-seq'])('HB10-SQL03 ordering predecessor rejects %s using direct SQL', async mode => {
  const f = await fixture(), other = mode === 'scope' ? await fixture() : f, root = randomUUID();
  if (mode === 'equal-seq' || mode === 'future-seq') {
    await rejectsSql(rawBatch(f, 1n, async (tx, b) => {
      if (mode === 'equal-seq') {
        await rawOrder(tx, f, b, 1n, root, '2026-10-05', null);
        await rawOrder(tx, f, b, 1n, randomUUID(), '2026-10-05', root);
      } else {
        const futureBatch = randomUUID();
        await tx.execute(sql`INSERT INTO budget_updates(id,owner_user_id,account_id,request_id,payload_identity,expected_revision,recorded_seq,actor_id,result,kind)
          VALUES(${futureBatch},${f.ownerUserId},${f.accountId},${randomUUID()},'synthetic',1,2,${f.ownerUserId},'{}','DIRECT_SQL_FIXTURE')`);
        await rawOrder(tx, f, futureBatch, 2n, root, '2026-10-05', null);
        await rawOrder(tx, f, b, 1n, randomUUID(), '2026-10-05', root);
      }
    }), 'INVALID_ORDERING_PREDECESSOR');
  } else {
    await rawBatch(other, 1n, (tx, b) => rawOrder(tx, other, b, 1n, root, '2026-10-05', null));
    await rejectsSql(rawBatch(f, mode === 'scope' ? 1n : 2n, (tx, b) => rawOrder(tx, f, b, mode === 'scope' ? 1n : 2n, randomUUID(), mode === 'day' ? '2026-10-06' : '2026-10-05', root)), mode === 'scope' ? 'ordering_revisions_previous_revision_id_scope_fk' : 'INVALID_ORDERING_PREDECESSOR');
  }
});
