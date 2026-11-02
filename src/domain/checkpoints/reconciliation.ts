import { addCents, subtractCents, validateCents } from '@/domain/money/money';
import { validUuid } from '@/domain/updates/validation';
import type { Result } from '@/shared/pure/result';
import type { Checkpoint, CheckpointErrorCode } from './contracts';

export type ConfirmedOperation = Readonly<{
  accountId: string; fromCheckpointId: string; toCheckpointId: string;
  operationId: string; revisionId: string; amountCents: bigint;
}>;
/** Future trusted source must supply the authoritative revision at this knowledge cut.
 * This contract is not an endpoint and does not attest client-supplied operations. */
export type OperationEvidence = Readonly<{ status: 'NOT_AVAILABLE' }> | Readonly<{
  status: 'CONFIRMED_SET'; accountId: string; fromCheckpointId: string; toCheckpointId: string;
  knowledgeCut: bigint; currentRevisions: readonly Readonly<{ operationId: string; revisionId: string }>[];
  operations: readonly ConfirmedOperation[];
}>;
export type Reconciliation = Readonly<{ deltaCents: bigint; grossCompleteness: 'NOT_ASSERTED' }>
  & (Readonly<{ evidenceStatus: 'NOT_AVAILABLE'; knownCents: null; unexplainedCents: null }>
    | Readonly<{ evidenceStatus: 'CONFIRMED_SET'; knownCents: bigint; unexplainedCents: bigint }>);

export function reconcileInterval(accountId: string, knowledgeCut: bigint, from: Checkpoint, to: Checkpoint,
  evidence: OperationEvidence): Result<Reconciliation, CheckpointErrorCode> {
  const bad = { ok: false, code: 'EVIDENCE_CONFLICT' } as const;
  const sameId = (a: string, b: string) => validUuid(a) && validUuid(b) && a.toLowerCase() === b.toLowerCase();
  if (!validUuid(accountId) || !validUuid(from.id) || !validUuid(to.id) || sameId(from.id, to.id) || from.observedDate > to.observedDate
    || (from.observedDate === to.observedDate && from.observedAt !== null && to.observedAt !== null && from.observedAt > to.observedAt)
    || from.recordedSeq > knowledgeCut || to.recordedSeq > knowledgeCut
    || !validateCents(knowledgeCut).ok || knowledgeCut < 0n || from.balanceCents < 0n || to.balanceCents < 0n) return bad;
  const delta = subtractCents(to.balanceCents, from.balanceCents);
  if (!delta.ok) return { ok: false, code: 'MONEY_RANGE' };
  if (evidence.status === 'NOT_AVAILABLE') return { ok: true, value: { deltaCents: delta.value, grossCompleteness: 'NOT_ASSERTED', evidenceStatus: 'NOT_AVAILABLE', knownCents: null, unexplainedCents: null } };
  if (evidence.status !== 'CONFIRMED_SET' || !sameId(evidence.accountId, accountId) || evidence.knowledgeCut !== knowledgeCut
    || !sameId(evidence.fromCheckpointId, from.id) || !sameId(evidence.toCheckpointId, to.id)) return bad;
  const current = new Map<string, string>();
  for (const p of evidence.currentRevisions) {
    if (!validUuid(p.operationId) || !validUuid(p.revisionId)) return bad;
    const opId = p.operationId.toLowerCase(), revisionId = p.revisionId.toLowerCase();
    if (current.has(opId) && current.get(opId) !== revisionId) return bad;
    current.set(opId, revisionId);
  }
  const revisions = new Map<string, Map<string, bigint>>();
  for (const op of evidence.operations) {
    if (!sameId(op.accountId, accountId) || !sameId(op.fromCheckpointId, from.id) || !sameId(op.toCheckpointId, to.id)
      || !validUuid(op.operationId) || !validUuid(op.revisionId)) return bad;
    const opId = op.operationId.toLowerCase(), revisionId = op.revisionId.toLowerCase();
    if (!current.has(opId)) return bad;
    if (!validateCents(op.amountCents).ok) return { ok: false, code: 'MONEY_RANGE' };
    const values = revisions.get(opId) ?? new Map<string, bigint>();
    if (values.has(revisionId) && values.get(revisionId) !== op.amountCents) return bad;
    values.set(revisionId, op.amountCents); revisions.set(opId, values);
  }
  let known = 0n;
  // Stable identity order makes intermediate int64 checks deterministic.
  for (const [id, revision] of [...current].sort(([a], [b]) => a.localeCompare(b))) {
    const amount = revisions.get(id)?.get(revision);
    if (amount === undefined) return bad;
    const sum = addCents(known, amount);
    if (!sum.ok) return { ok: false, code: 'MONEY_RANGE' };
    known = sum.value;
  }
  const unexplained = subtractCents(delta.value, known);
  if (!unexplained.ok || !addCents(known, unexplained.value).ok) return { ok: false, code: 'MONEY_RANGE' };
  return { ok: true, value: { deltaCents: delta.value, knownCents: known, unexplainedCents: unexplained.value,
    evidenceStatus: 'CONFIRMED_SET', grossCompleteness: 'NOT_ASSERTED' } };
}
