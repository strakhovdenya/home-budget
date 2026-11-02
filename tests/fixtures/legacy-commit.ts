// HB-006 fixture compatibility only; no production fallback audit is allowed.
import { commitBatch as commit, type Transaction, type BatchContext } from '@/infrastructure/db/commit';
import { prepareCommand } from '@/domain/updates/validation';
export interface CommitRequest {
  ownerUserId: string; accountId: string; requestId: string; expectedRevision: bigint; kind: string; payload: unknown;
}
export async function commitBatch(
  db: Parameters<typeof commit>[0], request: CommitRequest,
  write: (tx: Transaction, context: BatchContext) => Promise<void>,
) {
  const prepared = prepareCommand({ requestId: request.requestId, expectedRevision: request.expectedRevision,
    effectiveDate: '2020-11-20', reason: 'Synthetic persistence fixture', payload: request.payload });
  if (!prepared.ok) throw new Error(prepared.code);
  return commit(db, { scope: { ownerUserId: request.ownerUserId, accountId: request.accountId }, kind: request.kind, command: prepared.value }, async (tx, context) => {
    await write(tx, context);
    return [{ entityType: 'PERSISTENCE_FIXTURE', entityId: request.accountId,
      before: { aggregateRevision: context.account.aggregateRevision }, after: { aggregateRevision: context.account.aggregateRevision + 1n } }];
  });
}
