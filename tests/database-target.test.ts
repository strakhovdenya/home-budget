import { expect, it } from 'vitest';
import { requireLocalDatabaseTargets } from '../src/infrastructure/db/local-target';

const local = 'postgresql://synthetic:synthetic@127.0.0.1:5432/synthetic_test';
const environment = { DATABASE_URL: local, DATABASE_URL_UNPOOLED: local, TEST_DATABASE_URL: local };

it('requires explicit local overrides for all three database variables', () => {
  expect(requireLocalDatabaseTargets(environment)).toEqual(environment);
  for (const name of Object.keys(environment)) {
    expect(() => requireLocalDatabaseTargets({ ...environment, [name]: undefined })).toThrow();
    expect(() => requireLocalDatabaseTargets({ ...environment, [name]: 'postgresql://synthetic@development.example.invalid/test' })).toThrow();
  }
});

it('rejects host overrides and ambiguous/nonlocal connection destinations without exposing values', () => {
  for (const value of [
    'invalid-private-value',
    'https://127.0.0.1:5432/test',
    'postgresql://synthetic@localhost:5432/test',
    'postgresql://synthetic@127.0.0.1/test',
    'postgresql://synthetic@127.0.0.1:5432/',
    local + '?host=development.example.invalid',
    local + '?hostaddr=192.0.2.1',
    local + '?port=5433',
    local + '?dbname=other',
  ]) {
    expect(() => requireLocalDatabaseTargets({ ...environment, TEST_DATABASE_URL: value })).toThrow('TEST_DATABASE_URL_');
    try { requireLocalDatabaseTargets({ ...environment, TEST_DATABASE_URL: value }); }
    catch (error) { expect(String(error)).not.toContain(value); }
  }
});
