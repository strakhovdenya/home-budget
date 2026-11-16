import { spawn } from 'node:child_process';
import { assertFreePort } from '../../../scripts/e2e/server';
import { assertTargets, cleanEnvironment } from '../../../scripts/e2e/safety';
import {allLayoutCases,journeyCases} from '../../../scripts/e2e/layout-harness';
import { startLayoutTLS } from './layout-tls';

async function serve() {
  const { HB_E2E_RUN_ID: id, HB_E2E_DATABASE: database, HB_E2E_PASSWORD: password } = process.env;
  if (!id || !/^[a-f0-9]{32}$/.test(id) || database !== 'hb_e2e_' + id || !password || !process.env.AUTH_SECRET ||
    process.env.AUTH_URL !== 'http://127.0.0.1:3000' || process.env.ALLOWED_GOOGLE_EMAIL !== 'owner@example.test') throw Error('H_SERVER_ADMISSION_REQUIRED');
  if(!allLayoutCases.includes(process.env.HB_H_CASE??''))throw Error('H_SERVER_CASE_REQUIRED');
  assertTargets(process.env, { database, password, user: journeyCases.includes(process.env.HB_H_CASE!)?'hb_h_writer':'hb_h_runtime', port: 5432 }); await assertFreePort(3000);
  const env: NodeJS.ProcessEnv = { ...cleanEnvironment(process.env), NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', TZ: 'Europe/Berlin' };
  for (const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','TEST_DATABASE_URL','AUTH_SECRET','AUTH_GOOGLE_ID','AUTH_GOOGLE_SECRET','ALLOWED_GOOGLE_EMAIL','AUTH_URL']) env[key] = process.env[key];
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'], { cwd: process.cwd(), env, stdio: 'inherit' });
  let closeTLS: (() => void) | undefined;
  try {
    if (process.env.HB_H_CASE!.startsWith('H-WK')) closeTLS = await startLayoutTLS(id);
    for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => { closeTLS?.(); child.kill(signal); });
    await new Promise<void>((resolve,reject) => { child.once('error', () => reject(Error('H_START_FAILED'))); child.once('exit', code => code === 0 ? resolve() : reject(Error('H_EXIT_FAILED'))); });
  } finally { closeTLS?.(); child.kill('SIGTERM'); }
}
serve().catch(() => { console.error('H_SERVER_REFUSED'); process.exitCode = 1; });
