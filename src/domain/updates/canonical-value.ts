import type { CanonicalValue } from './contracts';
export const MAX_CANONICAL_DEPTH = 32;
export const MAX_CANONICAL_SIZE = 65536; // UTF-16 code units, including encoded keys/values.
export const MAX_CANONICAL_NODES = 4096;

/** Copies data descriptors only, never invokes accessors; freezes the whole new graph. */
export function normalizeValue(input: unknown): CanonicalValue {
  const ancestors = new Set<object>();
  let nodes = 0, size = 0;
  function budget(text: string) {
    size += text.length;
    if (size > MAX_CANONICAL_SIZE) throw new Error('INVALID_CANONICAL_PAYLOAD');
  }
  function visit(value: unknown, depth: number): CanonicalValue {
    if (++nodes > MAX_CANONICAL_NODES || depth > MAX_CANONICAL_DEPTH) throw new Error('INVALID_CANONICAL_PAYLOAD');
    if (value === null || typeof value === 'boolean') { budget(String(value)); return value; }
    if (typeof value === 'string') {
      if (value.length > MAX_CANONICAL_SIZE) throw new Error('INVALID_CANONICAL_PAYLOAD');
      budget(JSON.stringify(value)); return value;
    }
    if (typeof value === 'bigint') { budget('bigint:' + value.toString()); return value; }
    if (typeof value === 'number' && Number.isSafeInteger(value)) { budget(String(value)); return value === 0 ? 0 : value; }
    if (!value || typeof value !== 'object' || ancestors.has(value)) throw new Error('INVALID_CANONICAL_PAYLOAD');
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) throw new Error('INVALID_CANONICAL_PAYLOAD');
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key !== 'string') || keys.length > MAX_CANONICAL_NODES) throw new Error('INVALID_CANONICAL_PAYLOAD');
    ancestors.add(value);
    budget('[]');
    if (array) {
      if (value.length > MAX_CANONICAL_NODES || keys.length !== value.length + 1) throw new Error('INVALID_CANONICAL_PAYLOAD');
      const copy: CanonicalValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) throw new Error('INVALID_CANONICAL_PAYLOAD');
        budget(','); copy.push(visit(descriptor.value, depth + 1));
      }
      ancestors.delete(value);
      return Object.freeze(copy);
    }
    const copy: Record<string, CanonicalValue> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || key.length > MAX_CANONICAL_SIZE) throw new Error('INVALID_CANONICAL_PAYLOAD');
      budget(JSON.stringify(key) + ':,');
      Object.defineProperty(copy, key, { value: visit(descriptor.value, depth + 1), enumerable: true });
    }
    ancestors.delete(value);
    return Object.freeze(copy);
  }
  return visit(input, 0);
}
/** Legacy HB-006 bytes for supported dense data, unchanged. Input must be normalized. */
export function encodeCanonical(value: CanonicalValue): string {
  if (typeof value === 'bigint') return 'bigint:' + value.toString();
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(encodeCanonical).join(',') + ']';
  const object = value as { readonly [key: string]: CanonicalValue };
  return '{' + Object.keys(object).sort().map(key => JSON.stringify(key) + ':' + encodeCanonical(object[key])).join(',') + '}';
}
export function canonicalPayload(input: unknown): string { return encodeCanonical(normalizeValue(input)); }
