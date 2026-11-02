import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

type Database = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Private persistence primitive, not an authenticated application use case or public API.
// The caller must supply a server-authenticated owner, validated dates and reviewed facts.
export interface CommitRequest {
  ownerUserId: string;
  accountId: string;
  requestId: string;
  expectedRevision: bigint;
  kind: string;
  payload: unknown;
}

export function canonicalPayload(value: unknown): string {
  if (typeof value === 'bigint') return 'bigint:' + value.toString();
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalPayload).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalPayload((value as Record<string, unknown>)[key])).join(',') + '}';
  }
  throw new Error('INVALID_CANONICAL_PAYLOAD');
}

export async function commitBatch(
  db: Database, request: CommitRequest,
  write: (tx: Transaction, batch: { id: string; recordedSeq: bigint }) => Promise<void>,
) {
  const identity = createHash('sha256').update(canonicalPayload({
    owner: request.ownerUserId, account: request.accountId, kind: request.kind,
    expectedRevision: request.expectedRevision.toString(), payload: request.payload,
  })).digest('hex');
  return db.transaction(async tx => {
    const scope = and(eq(schema.accounts.ownerUserId, request.ownerUserId), eq(schema.accounts.id, request.accountId));
    const [account] = await tx.select().from(schema.accounts).where(scope).for('update');
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');
    const [prior] = await tx.select().from(schema.budgetUpdates).where(and(
      eq(schema.budgetUpdates.ownerUserId, request.ownerUserId), eq(schema.budgetUpdates.accountId, request.accountId),
      eq(schema.budgetUpdates.requestId, request.requestId),
    ));
    if (prior) {
      if (prior.payloadIdentity !== identity) throw new Error('REQUEST_PAYLOAD_CONFLICT');
      return prior.result as { updateId: string; recordedSeq: string; aggregateRevision: string };
    }
    if (account.aggregateRevision !== request.expectedRevision) throw new Error('STALE_REVISION');
    const batch = { id: randomUUID(), recordedSeq: account.recordedSeq + BigInt(1) };
    const result = { updateId: batch.id, recordedSeq: batch.recordedSeq.toString(), aggregateRevision: (account.aggregateRevision + BigInt(1)).toString() };
    await tx.insert(schema.budgetUpdates).values({
      ...batch, ownerUserId: request.ownerUserId, accountId: request.accountId,
      requestId: request.requestId, payloadIdentity: identity, expectedRevision: request.expectedRevision,
      actorId: request.ownerUserId, kind: request.kind, result,
    });
    await write(tx, batch);
    await tx.insert(schema.auditEvents).values({
      id: randomUUID(), ownerUserId: request.ownerUserId, accountId: request.accountId,
      budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq, eventKind: request.kind,
      effectiveDate: sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Berlin')::date`,
      reason: 'Persistence batch committed', beforeAfter: { payloadIdentity: identity, result },
    });
    await tx.update(schema.accounts).set({ aggregateRevision: account.aggregateRevision + BigInt(1), recordedSeq: batch.recordedSeq }).where(scope);
    return result;
  }, { isolationLevel: 'read committed' }); // Account row lock serializes this account's batches.
}
