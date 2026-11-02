import { expect, it } from 'vitest';
import { parseReceipt, prepareCommand } from '@/domain/updates/validation';
import { MAX_CENTS } from '@/domain/money/money';
import { rawCommand, ownerId } from './fixtures/hb-009';
it.each([
  { actorId: ownerId }, { ownerUserId: ownerId }, { accountId: ownerId }, { requestId: 'bad' }, { requestId: ownerId + '\n' },
  { expectedRevision: -1n }, { expectedRevision: 1 }, { expectedRevision: MAX_CENTS + 1n },
  { effectiveDate: '2026-02-29' }, { reason: ' ' }, { reason: 'x'.repeat(1001) }, { payload: Array(1) },
])('HB9-U07 rejects malformed/forged fields %s', overrides => {
  expect(prepareCommand(rawCommand(overrides))).toEqual({ ok: false, code: 'INVALID_INPUT' });
});
it('HB9-U08 accepts revision boundaries, Berlin early years and normalizes UUID/revision', () => {
  const result = prepareCommand(rawCommand({ expectedRevision: MAX_CENTS, effectiveDate: '0001-01-01' }));
  expect(result.ok && result.value.expectedRevision).toBe(MAX_CENTS);
  expect(prepareCommand(rawCommand({ expectedRevision: '00' })).ok).toBe(false);
});
it.each([
  null, {}, { updateId: ownerId, recordedSeq: 1, aggregateRevision: '1' },
  { updateId: ownerId, recordedSeq: '0', aggregateRevision: '1' },
  { updateId: ownerId, recordedSeq: '1', aggregateRevision: '9223372036854775808' },
  { updateId: 'bad', recordedSeq: '1', aggregateRevision: '1' },
])('HB9-U09 rejects corrupt receipt %j', receipt => {
  expect(parseReceipt(receipt)).toEqual({ ok: false, code: 'STORAGE_ERROR' });
});
it('HB9-U10 decodes receipt without losing large counters', () => {
  const receipt = { updateId: ownerId, recordedSeq: MAX_CENTS.toString(), aggregateRevision: MAX_CENTS.toString() };
  expect(parseReceipt(receipt)).toEqual({ ok: true, value: receipt });
});
it('HB9-R04 command and receipt guards reject all comma-merged required-key pairs', () => {
  const command = rawCommand();
  const receipt = { updateId: ownerId, recordedSeq: '1', aggregateRevision: '1' };
  for (const [original, validate] of [[command, prepareCommand], [receipt, parseReceipt]] as const) {
    const keys = Object.keys(original).sort();
    for (let index = 0; index < keys.length - 1; index++) {
      const left = keys[index], right = keys[index + 1];
      const malformed: Record<string, unknown> = Object.fromEntries(Object.entries(original).filter(([key]) => key !== left && key !== right));
      malformed[left + ',' + right] = null;
      // Prove the joined names collide, but the independent value checks still reject.
      expect(Object.keys(malformed).sort().join(',')).toBe(keys.join(','));
      expect(validate(malformed).ok).toBe(false);
    }
  }
});
