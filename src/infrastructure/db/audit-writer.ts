import { normalizeValue } from '@/domain/updates/canonical-value';
import type { AuditDescriptor, CanonicalValue } from '@/domain/updates/contracts';
import { record, validUuid } from '@/domain/updates/validation';
import { validateCents } from '@/domain/money/money';
const requiredKeys = ['before', 'after', 'entityId', 'entityType'] as const;
function jsonValue(value: CanonicalValue): unknown {
  if (typeof value === 'bigint') {
    if (!validateCents(value).ok) throw new Error('INVALID_AUDIT');
    return value.toString();
  }
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(jsonValue);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, jsonValue(entry)]));
}
/** Trusted-handler outputs are still validated before insertion. */
export function auditDocuments(input: readonly AuditDescriptor[]) {
  const data = normalizeValue(input);
  if (!Array.isArray(data) || data.length === 0) throw new Error('INVALID_AUDIT');
  return data.map((entry, eventIndex) => {
    if (!record(entry) || Object.keys(entry).length !== requiredKeys.length ||
      !requiredKeys.every(key => Object.hasOwn(entry, key)) ||
      !validUuid(entry.entityId) || typeof entry.entityType !== 'string' ||
      entry.entityType !== entry.entityType.trim() || !/^[A-Z][A-Z0-9_]{0,63}$/.test(entry.entityType)) throw new Error('INVALID_AUDIT');
    return { schemaVersion: 1, eventIndex, entity: { type: entry.entityType, id: entry.entityId },
      before: jsonValue(entry.before), after: jsonValue(entry.after) };
  });
}
