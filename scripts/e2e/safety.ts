import { lstat, mkdir, readdir, copyFile, realpath, rm, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { requireLocalDatabaseTargets } from '../../src/infrastructure/db/local-target';

export const labelKey = 'home-budget.hb021.run';
export const postgresImage = 'postgres@sha256:3a4264520e121176619f54ff867d12774bc81e95e7b84db58d63bccdb6144b81';
export const browserImage = 'mcr.microsoft.com/playwright@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe';
export const databaseKeys = ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'TEST_DATABASE_URL'] as const;

export function cleanEnvironment(source: Readonly<Record<string, string | undefined>>): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = { NODE_ENV: 'test' };
  // No HOME/USERPROFILE, NODE_OPTIONS, PG*, AUTH*, proxy, cloud or npm credentials.
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP']) {
    if (source[key]) result[key] = source[key];
  }
  return result;
}

export function rejectDatabaseOverrides(env: Readonly<Record<string, string | undefined>>) {
  if (databaseKeys.some(key => env[key] !== undefined)) throw new Error('E2E_DATABASE_OVERRIDE_REFUSED');
}

export function assertTargets(env: Readonly<Record<string, string | undefined>>, expected: { database: string; port: number; user: string; password: string }) {
  const targets = requireLocalDatabaseTargets(env);
  for (const key of databaseKeys) {
    const url = new URL(targets[key]);
    if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' ||
        url.port !== String(expected.port) || url.pathname !== '/' + expected.database ||
        url.username !== expected.user || url.password !== expected.password || url.search || url.hash) {
      throw new Error('E2E_DATABASE_IDENTITY_MISMATCH');
    }
  }
}

export type ContainerInspection = {
  Id: string; Name: string; Image: string; Config: { Labels: Record<string, string>; Env: string[] };
  HostConfig: { NetworkMode: string; PortBindings: Record<string, { HostIp: string; HostPort: string }[]> };
  NetworkSettings: { Networks: Record<string, unknown>; Ports: Record<string, { HostIp: string; HostPort: string }[]> };
  State: { Running: boolean };
};

export function assertOwnedContainer(info: ContainerInspection, expected: {
  id: string; name: string; runId: string; imageId: string; network: string;
}) {
  if (info.Id !== expected.id || info.Name !== '/' + expected.name || info.Image !== expected.imageId ||
      info.Config.Labels?.[labelKey] !== expected.runId || info.HostConfig.NetworkMode !== expected.network) {
    throw new Error('E2E_FOREIGN_CONTAINER_REFUSED');
  }
}

export function publishedPort(info: ContainerInspection, port: string): number {
  const bindings = info.NetworkSettings.Ports[port];
  if (bindings?.length !== 1 || bindings[0].HostIp !== '127.0.0.1' ||
      !/^\d+$/.test(bindings[0].HostPort) || Number(bindings[0].HostPort) < 1) {
    throw new Error('E2E_LOOPBACK_PORT_REQUIRED');
  }
  return Number(bindings[0].HostPort);
}

export function assertNoPublishedPorts(info: ContainerInspection) {
  if (Object.values(info.HostConfig.PortBindings ?? {}).some(bindings => bindings?.length) ||
      Object.values(info.NetworkSettings.Ports ?? {}).some(bindings => bindings?.length)) {
    throw new Error('E2E_HOST_PORT_PUBLICATION_REFUSED');
  }
}

export async function copyTree(source: string, destination: string) {
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) throw new Error('E2E_SNAPSHOT_LINK_REFUSED');
  if (stat.isDirectory()) {
    await mkdir(destination, { recursive: true });
    for (const entry of await readdir(source)) {
      if (entry.startsWith('.env') || entry === '.vercel' || entry === 'node_modules' || entry === '.git') {
        throw new Error('E2E_SNAPSHOT_PRIVATE_PATH_REFUSED');
      }
      await copyTree(join(source, entry), join(destination, entry));
    }
  } else if (stat.isFile()) await copyFile(source, destination);
  else throw new Error('E2E_SNAPSHOT_SPECIAL_FILE_REFUSED');
}

export async function snapshotInventory(root: string, prefix = ''): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const name of (await readdir(join(root, prefix))).sort()) {
    const relative = prefix ? prefix + '/' + name : name;
    const absolute = join(root, relative), stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error('E2E_SNAPSHOT_LINK_REFUSED');
    if (stat.isDirectory()) Object.assign(result, await snapshotInventory(root, relative));
    else if (stat.isFile()) result[relative] = createHash('sha256').update(await readFile(absolute)).digest('hex');
    else throw new Error('E2E_SNAPSHOT_SPECIAL_FILE_REFUSED');
  }
  return result;
}

export function assertChildPath(root: string, candidate: string) {
  const base = resolve(root), target = resolve(candidate);
  if (!target.startsWith(base + sep)) throw new Error('E2E_CLEANUP_PATH_REFUSED');
}

export async function removeSnapshot(root: string, candidate: string) {
  assertChildPath(root, candidate);
  const actual = await realpath(candidate);
  if (actual !== resolve(candidate)) throw new Error('E2E_CLEANUP_LINK_REFUSED');
  await rm(candidate, { recursive: true });
}
