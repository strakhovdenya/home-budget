import { MAX_CENTS } from '@/domain/money/money';
import { parseBerlinDate } from '@/shared/pure/calendar';
import type { Result } from '@/shared/pure/result';
import { normalizeValue } from './canonical-value';
import type { CanonicalValue, CommitReceipt, PreparedCommand } from './contracts';
// Runtime provenance for the private writer: a frozen forged object is not a validated command.
const preparedCommands = new WeakSet<object>();
export function isPreparedCommand(input: PreparedCommand): boolean { return preparedCommands.has(input); }
export function validUuid(input: unknown): input is string {
  return typeof input === 'string' && input.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}
export function record(input: CanonicalValue): input is { readonly [key: string]: CanonicalValue } {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}
function counter(input: unknown): bigint | null {
  if (typeof input === 'bigint') return input >= 0n && input <= MAX_CENTS ? input : null;
  if (typeof input !== 'string' || input.length > 19 || !/^(?:0|[1-9][0-9]*)$/.test(input) || input !== input.trim()) return null;
  const value = BigInt(input);
  return value <= MAX_CENTS ? value : null;
}
/** Only raw-command copy: payload is recursively copied/frozen before any await. */
export function prepareCommand(input: unknown): Result<PreparedCommand, 'INVALID_INPUT'> {
  try {
    const data = normalizeValue(input);
    if (!record(data) || Object.keys(data).sort().join(',') !== 'effectiveDate,expectedRevision,payload,reason,requestId') return { ok: false, code: 'INVALID_INPUT' };
    const date = parseBerlinDate(data.effectiveDate), revision = counter(data.expectedRevision);
    if (!validUuid(data.requestId) || revision === null || !date.ok || typeof data.reason !== 'string' ||
      data.reason.trim().length === 0 || data.reason.length > 1000) return { ok: false, code: 'INVALID_INPUT' };
    const command = Object.freeze({ requestId: data.requestId.toLowerCase(), expectedRevision: revision,
      effectiveDate: date.value, reason: data.reason, payload: data.payload });
    preparedCommands.add(command);
    return { ok: true, value: command };
  } catch { return { ok: false, code: 'INVALID_INPUT' }; }
}
export function parseReceipt(input: unknown): Result<CommitReceipt, 'STORAGE_ERROR'> {
  try {
    const data = normalizeValue(input);
    if (!record(data) || Object.keys(data).sort().join(',') !== 'aggregateRevision,recordedSeq,updateId' ||
      !validUuid(data.updateId) || typeof data.recordedSeq !== 'string' || typeof data.aggregateRevision !== 'string') return { ok: false, code: 'STORAGE_ERROR' };
    const seq = counter(data.recordedSeq), revision = counter(data.aggregateRevision);
    if (seq === null || revision === null || seq < 1n || revision < 1n) return { ok: false, code: 'STORAGE_ERROR' };
    return { ok: true, value: Object.freeze({ updateId: data.updateId, recordedSeq: data.recordedSeq, aggregateRevision: data.aggregateRevision }) };
  } catch { return { ok: false, code: 'STORAGE_ERROR' }; }
}
