import { expect, it } from 'vitest';
import { canonicalPayload, normalizeValue } from '@/domain/updates/canonical-value';
it.each([
  [null, 'null'], [true, 'true'], ['bigint:1', '"bigint:1"'], [1n, 'bigint:1'],
  [{ b: 1n, a: '1' }, '{"a":"1","b":bigint:1}'], [[1, '1', 1n], '[1,"1",bigint:1]'],
  [{ $bigint: '1' }, '{"$bigint":"1"}'],
])('HB9-U01 preserves legacy canonical bytes for %s', (value, expected) => {
  expect(canonicalPayload(value)).toBe(expected);
});
it('HB9-U02 sorts keys but preserves array order and types', () => {
  expect(canonicalPayload({ a: 1, b: 2 })).toBe(canonicalPayload({ b: 2, a: 1 }));
  expect(new Set([1, '1', 1n].map(canonicalPayload)).size).toBe(3);
  expect(canonicalPayload([1, 2])).not.toBe(canonicalPayload([2, 1]));
});
it.each([undefined, NaN, Infinity, 1.5, new Date(0), new Map(), Object.create(null), Array(1), [undefined], () => 1])('HB9-U03 rejects unsafe value %s', value => {
  expect(() => canonicalPayload(value)).toThrow('INVALID_CANONICAL_PAYLOAD');
});
it('HB9-U04 rejects accessors/symbols/non-enumerables/array extras without calling getters', () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, 'secret', { enumerable: true, get() { calls++; return 1; } });
  const array = [1]; Object.defineProperty(array, 'extra', { value: 2 });
  const arrayGetter = Object.defineProperty([1], '0', { enumerable: true, get() { calls++; return 1; } });
  for (const value of [accessor, array, arrayGetter, { [Symbol('x')]: 1 }, Object.defineProperty({}, 'x', { value: 1 })]) {
    expect(() => canonicalPayload(value)).toThrow();
  }
  expect(calls).toBe(0);
});
it('HB9-U05 enforces cycles, depth, nodes and aggregate encoded size', () => {
  const cyclic: unknown[] = []; cyclic.push(cyclic);
  let deep: unknown = 0;
  for (let i = 0; i < 34; i++) deep = [deep];
  for (const value of [cyclic, deep, Array(4096).fill(0), 'x'.repeat(65537), Array(100).fill('x'.repeat(1000))]) {
    expect(() => canonicalPayload(value)).toThrow();
  }
});
it('HB9-U06 snapshots/freeze nested data, shared refs and __proto__ as data', () => {
  const leaf = { amount: 1n }, raw = { a: leaf, b: leaf };
  const normalized = normalizeValue(raw);
  leaf.amount = 2n;
  expect(canonicalPayload(normalized)).toBe('{"a":{"amount":bigint:1},"b":{"amount":bigint:1}}');
  expect(Object.isFrozen(normalized)).toBe(true);
  const proto = normalizeValue(JSON.parse('{"__proto__":{"x":1}}'));
  expect(Object.getPrototypeOf(proto)).toBe(Object.prototype);
  expect(canonicalPayload(proto)).toBe('{"__proto__":{"x":1}}');
});
