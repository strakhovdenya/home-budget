import { expect, it } from 'vitest';
import { auditDocuments } from '@/infrastructure/db/audit-writer';
import { BatchFailure, classifyTransactionError } from '@/infrastructure/db/commit';
import { ownerId } from './fixtures/hb-009';
import type { AuditDescriptor } from '@/domain/updates/contracts';
it('HB9-U14 serializes full signed bigint snapshots as decimal strings and indexes events', () => {
  const entry = { entityType: 'TEST_METADATA', entityId: ownerId, before: { cents: -9223372036854775808n }, after: { cents: 9223372036854775807n } };
  const docs = auditDocuments([entry, { ...entry, before: null }]);
  expect(docs[0].before).toEqual({ cents: '-9223372036854775808' });
  expect(docs[0].after).toEqual({ cents: '9223372036854775807' });
  expect(docs[1].eventIndex).toBe(1);
  expect(() => JSON.stringify(docs)).not.toThrow();
});
it('HB9-U15 requires complete valid audit descriptors', () => {
  expect(() => auditDocuments([])).toThrow('INVALID_AUDIT');
  expect(() => auditDocuments([{ entityType: 'bad', entityId: ownerId, before: null, after: null }])).toThrow();
  expect(() => auditDocuments([{ entityType: 'TEST\n', entityId: ownerId, before: null, after: null }])).toThrow();
  expect(() => auditDocuments([{ entityType: 'TEST', entityId: ownerId, before: null, after: 9223372036854775808n }])).toThrow();
});
it('HB9-R01 rejects a comma-containing key that aliases the required before/after key list', () => {
  const malformed = { 'after,before': null, entityId: ownerId, entityType: 'TEST' };
  expect(() => auditDocuments([malformed as unknown as AuditDescriptor])).toThrow('INVALID_AUDIT');
});
it.each(['before', 'after'])('HB9-R02 requires an own %s field', missing => {
  const malformed: Record<string, unknown> = { entityType: 'TEST', entityId: ownerId, before: null, after: null };
  delete malformed[missing];
  expect(() => auditDocuments([malformed as unknown as AuditDescriptor])).toThrow('INVALID_AUDIT');
});
it('HB9-R03 preserves explicit null before and after in serialized audit', () => {
  const docs = auditDocuments([{ entityType: 'TEST', entityId: ownerId, before: null, after: null }]);
  const decoded: { before: unknown; after: unknown }[] = JSON.parse(JSON.stringify(docs));
  expect(Object.hasOwn(decoded[0], 'before')).toBe(true);
  expect(Object.hasOwn(decoded[0], 'after')).toBe(true);
  expect(decoded[0].before).toBeNull();
  expect(decoded[0].after).toBeNull();
});
it.each([
  [new BatchFailure('STALE_REVISION'), false, 'STALE_REVISION'],
  [{ cause: { code: '23514' } }, true, 'TRANSACTION_FAILED'],
  [{ cause: { code: '40P01' } }, false, 'RETRYABLE_STORAGE_ERROR'],
  [{ code: '55P03' }, false, 'RETRYABLE_STORAGE_ERROR'],
  [{ code: 'ECONNRESET', message: 'secret SQL' }, true, 'COMMIT_OUTCOME_UNKNOWN'],
  [new Error('secret'), true, 'COMMIT_OUTCOME_UNKNOWN'],
  [new Error('secret'), false, 'TRANSACTION_FAILED'],
])('HB9-U16 distinguishes transaction outcomes', (error, completed, expected) => {
  expect(classifyTransactionError(error, completed as boolean)).toBe(expected);
});
