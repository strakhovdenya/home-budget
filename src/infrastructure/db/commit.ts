import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { MAX_CENTS } from '@/domain/money/money';
import { encodeCanonical } from '@/domain/updates/canonical-value';
import type { AuditDescriptor, AuthorizedScope, PreparedCommand, UpdateErrorCode, CommitReceipt } from '@/domain/updates/contracts';
import { isPreparedCommand, parseReceipt, validUuid } from '@/domain/updates/validation';
import { berlinDateFromEpochMilliseconds } from '@/shared/pure/berlin-date';
import { auditDocuments } from './audit-writer';
import * as schema from './schema';

export { canonicalPayload } from '@/domain/updates/canonical-value';
type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export interface CommitRequest {
  readonly scope: AuthorizedScope; readonly kind: string; readonly command: PreparedCommand;
  readonly replay?: (tx:Transaction,account:Readonly<typeof schema.accounts.$inferSelect>,identity:string)=>Promise<CommitReceipt|null>;
}
export type BatchContext = Readonly<{
  id: string; recordedSeq: bigint; recordedAt: string;
  account: Readonly<typeof schema.accounts.$inferSelect>; command: PreparedCommand;
}>;
export type BatchWriter = (tx: Transaction, context: BatchContext) => Promise<readonly AuditDescriptor[]>;
export class BatchFailure extends Error {
  constructor(readonly code: UpdateErrorCode) { super(code); }
}
/** Trusted writers throw expected domain refusals: returning an error would COMMIT. */
export function rejectBatch(code: UpdateErrorCode): never { throw new BatchFailure(code); }
/** Walks Drizzle error causes; never returns raw driver messages/SQL. */
export function classifyTransactionError(error: unknown, callbackCompleted: boolean): UpdateErrorCode {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (current instanceof BatchFailure) return current.code;
    if ('code' in current && typeof current.code === 'string') {
      if (['40001', '40P01', '55P03', '57014'].includes(current.code)) return 'RETRYABLE_STORAGE_ERROR';
      if (/^(?:22|23|25|42)[0-9A-Z]{3}$/.test(current.code)) return 'TRANSACTION_FAILED';
    }
    current = 'cause' in current ? current.cause : null;
  }
  return callbackCompleted ? 'COMMIT_OUTCOME_UNKNOWN' : 'TRANSACTION_FAILED';
}
/** Private persistence boundary; app composes authentication before invoking it. */
export async function commitBatch(db: Database, request: CommitRequest, write: BatchWriter) {
  let { ownerUserId, accountId } = request.scope;
  const { kind, command } = request;
  if (!validUuid(ownerUserId) || !validUuid(accountId)) throw new BatchFailure('FORBIDDEN');
  ownerUserId = ownerUserId.toLowerCase(); accountId = accountId.toLowerCase();
  if (typeof kind !== 'string' || kind !== kind.trim() || !/^[A-Z][A-Z0-9_]{0,63}$/.test(kind) || !isPreparedCommand(command)) throw new BatchFailure('INVALID_INPUT');
  if(request.replay&&kind!=='PERIOD_TRANSITION')throw new BatchFailure('INVALID_INPUT');
  const identity = createHash('sha256').update(encodeCanonical({ owner: ownerUserId, account: accountId, kind,
    expectedRevision: command.expectedRevision.toString(), payload: command.payload,
    effectiveDate: command.effectiveDate, reason: command.reason })).digest('hex');
  let callbackCompleted = false;
  try {
    return await db.transaction(async tx => {
      const scope = and(eq(schema.accounts.ownerUserId, ownerUserId), eq(schema.accounts.id, accountId));
      const [account] = await tx.select().from(schema.accounts).where(scope).for('update');
      if (!account) throw new BatchFailure('FORBIDDEN');
      const [prior] = await tx.select().from(schema.budgetUpdates).where(and(
        eq(schema.budgetUpdates.ownerUserId, ownerUserId), eq(schema.budgetUpdates.accountId, accountId),
        eq(schema.budgetUpdates.requestId, command.requestId),
      ));
      if (prior) {
        if (prior.payloadIdentity !== identity) throw new BatchFailure('REQUEST_PAYLOAD_CONFLICT');
        const receipt = parseReceipt(prior.result);
        if (!receipt.ok || prior.expectedRevision < 0n || prior.expectedRevision >= MAX_CENTS || receipt.value.updateId !== prior.id || receipt.value.recordedSeq !== prior.recordedSeq.toString() ||
          receipt.value.aggregateRevision !== (prior.expectedRevision + 1n).toString()) throw new BatchFailure('STORAGE_ERROR');
        callbackCompleted = true;
        return receipt.value;
      }
      if(request.replay){const replay=await request.replay(tx,account,identity);if(replay){const valid=parseReceipt(replay);if(!valid.ok)throw new BatchFailure('STORAGE_ERROR');callbackCompleted=true;return valid.value;}}
      if (account.aggregateRevision !== command.expectedRevision) throw new BatchFailure('STALE_REVISION');
      if (account.aggregateRevision < 0n || account.recordedSeq < 0n || account.aggregateRevision >= MAX_CENTS || account.recordedSeq >= MAX_CENTS) throw new BatchFailure('REVISION_RANGE');
      const timestamp = await tx.execute<{ recorded_at: string }>(sql`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS recorded_at`);
      const recordedAt = timestamp.rows[0].recorded_at;
      const today = berlinDateFromEpochMilliseconds(Date.parse(recordedAt));
      if (!today.ok || command.effectiveDate > today.value) throw new BatchFailure('INVALID_INPUT');
      const batch = Object.freeze({ id: randomUUID(), recordedSeq: account.recordedSeq + 1n, recordedAt,
        account: Object.freeze({ ...account }), command });
      const result = Object.freeze({ updateId: batch.id, recordedSeq: batch.recordedSeq.toString(), aggregateRevision: (account.aggregateRevision + 1n).toString() });
      await tx.insert(schema.budgetUpdates).values({ id: batch.id, ownerUserId, accountId,
        recordedSeq: batch.recordedSeq, recordedAt, requestId: command.requestId, payloadIdentity: identity,
        expectedRevision: command.expectedRevision, actorId: ownerUserId, kind, result });
      const descriptors = await write(tx, batch);
      let documents: ReturnType<typeof auditDocuments>;
      try { documents = auditDocuments(descriptors); } catch { throw new BatchFailure('INVALID_AUDIT'); }
      await tx.insert(schema.auditEvents).values(documents.map(beforeAfter => ({ id: randomUUID(), ownerUserId, accountId,
        budgetUpdateId: batch.id, recordedSeq: batch.recordedSeq, eventKind: kind,
        effectiveDate: command.effectiveDate, reason: command.reason, beforeAfter })));
      await tx.update(schema.accounts).set({ aggregateRevision: account.aggregateRevision + 1n, recordedSeq: batch.recordedSeq }).where(scope);
      callbackCompleted = true;
      return result;
    }, { isolationLevel: 'read committed' });
  } catch (error) { throw new BatchFailure(classifyTransactionError(error, callbackCompleted)); }
}
