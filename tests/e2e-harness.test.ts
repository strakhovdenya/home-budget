import { describe, expect, it } from 'vitest';
import { createServer } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertFreePort } from '../scripts/e2e/server';
import { assertChildPath, assertNoPublishedPorts, assertOwnedContainer, assertTargets, cleanEnvironment,
  copyTree, labelKey, publishedPort, rejectDatabaseOverrides, removeSnapshot, type ContainerInspection } from '../scripts/e2e/safety';

const expected = { database: 'hb_e2e_synthetic', port: 55432, user: 'hb_runtime', password: 'synthetic_only' };
const url = 'postgresql://hb_runtime:synthetic_only@127.0.0.1:55432/hb_e2e_synthetic';
const targets = (value = url) => ({ DATABASE_URL: value, DATABASE_URL_UNPOOLED: value, TEST_DATABASE_URL: value });

describe('HB21-A fail-closed admission', () => {
  it('accepts only the exact three owned local database destinations', () => {
    expect(() => assertTargets(targets(), expected)).not.toThrow();
  });
  for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'TEST_DATABASE_URL']) {
    for (const invalid of [
      url.replace('127.0.0.1', 'example.test'), url + '?host=example.test', url + '?HOSTADDR=1.2.3.4',
      url + '?service=production', url + '?options=-csearch_path=public', url + '#ignored',
      url.replace('55432', '5432'), url.replace('hb_e2e_synthetic', 'foreign'),
      url.replace('hb_runtime', 'foreign'), '',
    ]) it('refuses ' + key + ' override variant ' + [
      url.replace('127.0.0.1', 'example.test'), url + '?host=example.test', url + '?HOSTADDR=1.2.3.4',
      url + '?service=production', url + '?options=-csearch_path=public', url + '#ignored',
      url.replace('55432', '5432'), url.replace('hb_e2e_synthetic', 'foreign'), url.replace('hb_runtime', 'foreign'), '',
    ].indexOf(invalid), () => {
      expect(() => assertTargets({ ...targets(), [key]: invalid }, expected)).toThrow();
    });
  }
  it('does not inherit database/auth/cloud/proxy/Node execution credentials', () => {
    const env = { PATH: '/tools', DATABASE_URL: 'remote', AUTH_SECRET: 'private', NEON_API_KEY: 'private',
      NODE_OPTIONS: '--import=foreign', HTTPS_PROXY: 'foreign', HOME: '/private', PGHOST: 'foreign' };
    expect(cleanEnvironment(env)).toEqual({ PATH: '/tools', NODE_ENV: 'test' });
    expect(() => rejectDatabaseOverrides(env)).toThrow('E2E_DATABASE_OVERRIDE_REFUSED');
    expect(() => rejectDatabaseOverrides({})).not.toThrow();
  });
  it('refuses foreign container identities and non-loopback published ports', () => {
    const owned = { id: 'a'.repeat(64), name: 'hb21-test', runId: 'synthetic-run', imageId: 'sha256:owned', network: 'owned-net' };
    const info = { Id: owned.id, Name: '/' + owned.name, Image: owned.imageId,
      Config: { Labels: { [labelKey]: owned.runId }, Env: [] }, HostConfig: { NetworkMode: owned.network, PortBindings: {} },
      NetworkSettings: { Networks: {}, Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '55432' }] } },
      State: { Running: true } } satisfies ContainerInspection;
    expect(() => assertOwnedContainer(info, owned)).not.toThrow();
    for (const changed of [{ Id: 'foreign' }, { Name: '/foreign' }, { Image: 'foreign' },
      { Config: { Labels: {}, Env: [] } }, { HostConfig: { NetworkMode: 'bridge', PortBindings: {} } }]) {
      expect(() => assertOwnedContainer({ ...info, ...changed }, owned)).toThrow('E2E_FOREIGN_CONTAINER_REFUSED');
    }
    expect(publishedPort(info, '5432/tcp')).toBe(55432);
    expect(() => assertNoPublishedPorts(info)).toThrow('E2E_HOST_PORT_PUBLICATION_REFUSED');
    expect(() => assertNoPublishedPorts({ ...info, NetworkSettings: { Networks: {}, Ports: {} } })).not.toThrow();
    expect(() => publishedPort({ ...info, NetworkSettings: { Networks: {}, Ports: {
      '5432/tcp': [{ HostIp: '0.0.0.0', HostPort: '55432' }],
    } } }, '5432/tcp')).toThrow('E2E_LOOPBACK_PORT_REQUIRED');
  });
  it('never recursively deletes its parent or an unrelated path', () => {
    expect(() => assertChildPath('/owned', '/owned/run')).not.toThrow();
    for (const p of ['/owned', '/foreign/run', '/owned/../foreign']) expect(() => assertChildPath('/owned', p)).toThrow();
  });
  it('refuses a live foreign server without closing it, then admits the released port', async () => {
    const foreign = createServer();
    await new Promise<void>(r => foreign.listen(0, '127.0.0.1', r));
    const address = foreign.address();
    if (!address || typeof address === 'string') throw new Error('TEST_PORT_REQUIRED');
    try {
      await expect(assertFreePort(address.port)).rejects.toThrow('E2E_FOREIGN_SERVER_REFUSED');
      expect(foreign.listening).toBe(true);
    } finally { await new Promise<void>(r => foreign.close(() => r())); }
    await expect(assertFreePort(address.port)).resolves.toBeUndefined();
  });
  it('server startup failure exits nonzero without auth/DB admission', async () => {
    await expect(promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/e2e/server.ts'], {
      cwd: process.cwd(), env: { ...cleanEnvironment(process.env), ...(process.platform === 'win32' ? { USERPROFILE: tmpdir() } : {}) },
    })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('E2E_SERVER_REFUSED') });
  });
  it('real runner refuses inherited remote targets before provisioning', async () => {
    await expect(promisify(execFile)(process.execPath, ['--import', 'tsx', 'scripts/e2e/run.ts'], {
      cwd: process.cwd(), env: { ...cleanEnvironment(process.env), DATABASE_URL: 'postgresql://synthetic:synthetic@example.test/forbidden',
        ...(process.platform === 'win32' ? { USERPROFILE: tmpdir() } : {}) },
    })).rejects.toMatchObject({ code: 1, stdout: '', stderr: expect.stringContaining('E2E_ADMISSION_REFUSED') });
  });
  it('snapshot refuses private env paths; failure cleanup removes only its child', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'hb21-safety-'));
    const source = join(parent, 'source'), dest = join(parent, 'copy');
    await mkdir(source); await writeFile(join(source, '.env.local'), 'SYNTHETIC_CANARY');
    try {
      await expect(copyTree(source, dest)).rejects.toThrow('E2E_SNAPSHOT_PRIVATE_PATH_REFUSED');
      await removeSnapshot(parent, dest);
      expect(await readFile(join(source, '.env.local'), 'utf8')).toBe('SYNTHETIC_CANARY');
    } finally { await rm(parent, { recursive: true }); }
  });
});
