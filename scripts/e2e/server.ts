import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertTargets, cleanEnvironment } from './safety';

export async function assertFreePort(port: number) {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('E2E_FOREIGN_SERVER_REFUSED')));
    probe.listen(port, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolve()));
  });
}

export async function serve() {
  const { HB_E2E_RUN_ID: runId, HB_E2E_DATABASE: database, HB_E2E_PASSWORD: password } = process.env;
  if (!runId || !/^[0-9a-f]{32}$/.test(runId) || database !== 'hb_e2e_' + runId || !password) {
    throw new Error('E2E_SERVER_ADMISSION_REQUIRED');
  }
  assertTargets(process.env, { database, password, user: 'hb_runtime', port: 5432 });
  await assertFreePort(3000);
  const env: NodeJS.ProcessEnv = { ...cleanEnvironment(process.env), DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED, TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production', TZ: 'Europe/Berlin' };
  // No shell, OAuth config, inherited NODE_OPTIONS or external test endpoint.
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000'], {
    cwd: process.cwd(), env, stdio: 'inherit',
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => child.kill(signal));
  await new Promise<void>((resolve, reject) => {
    child.once('error', () => reject(new Error('E2E_SERVER_START_FAILED')));
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('E2E_SERVER_EXIT_FAILED')));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serve().catch(() => { console.error('E2E_SERVER_REFUSED'); process.exitCode = 1; });
}
