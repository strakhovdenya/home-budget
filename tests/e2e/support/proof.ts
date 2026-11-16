import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { expect, test, type Page, type Request, type BrowserContext, type Locator } from '@playwright/test';

export type Action = { path: string; id: string; contentType: string; body: string };
export function assertTestOnlyBundleBoundary() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('B_SYNTHETIC_AUTH_REQUIRED');
  const markers = ['B_SYNTHETIC_AUTH_REQUIRED', 'B_SYNTHETIC_FIXTURES_PROVISIONED', secret];
  let files = 0;
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        const bytes = readFileSync(path); files++;
        if (markers.some(marker => bytes.includes(marker))) {
          throw new Error('B_TEST_FIXTURE_IN_PRODUCTION_BUNDLE');
        }
      }
    }
  }
  walk('.next/server'); walk('.next/static');
  expect(files > 0, 'B_REAL_BUILD_INSPECTED').toBe(true);
  test.info().annotations.push({ type: 'bundle-boundary', description: 'Real server/static build contains neither test fixture markers nor the run secret' });
}
// SSR visibility alone does not prove that React attached the control. Read the
// pinned React DOM marker; never invoke or replace an application handler.
export async function hydrated(control: Locator) {
  // A real pointer interaction also wakes a selectively hydrated Suspense tree.
  // Do this before the action capture so hydration cannot consume its first click.
  await control.hover({ timeout: 5000 });
  await expect.poll(() => control.evaluate(element => Object.keys(element).some(key => key.startsWith('__reactProps$'))),
    { message: 'B_HYDRATED_CONTROL_REQUIRED' }).toBe(true);
}
export function actionFrom(request: Request): Action {
  const id = request.headers()['next-action'], body = request.postData();
  if (!id || !body) throw new Error('B_BROWSER_ACTION_REQUIRED');
  return { path: new URL(request.url()).pathname, id, contentType: request.headers()['content-type'], body };
}
export async function capture(page: Page, click: () => Promise<unknown>): Promise<Action> {
  const pending = page.waitForRequest(r => r.method() === 'POST' && !!r.headers()['next-action']);
  await click(); return actionFrom(await pending);
}

export async function database<T>(read: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try { return await read(client); } finally { await client.end(); }
}
export async function census() {
  return database(async client => {
    const tables = (await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const rows: Record<string, string> = {};
    for (const { tablename } of tables) {
      if (!/^[a-z_]+$/.test(tablename)) throw new Error('B_UNEXPECTED_TABLE');
      rows[tablename] = (await client.query('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),\'[]\'::jsonb)::text AS rows FROM public."' + tablename + '" t')).rows[0].rows;
    }
    if (tables.length !== 20) throw new Error('B_INCOMPLETE_CENSUS');
    return JSON.stringify(rows);
  });
}
export async function noWrite<T>(label: string, action: () => Promise<T>): Promise<T> {
  const before = await census();
  try { return await action(); }
  finally {
    const after = await census();
    expect(after === before, 'B_EXACT_NO_WRITE_' + label).toBe(true);
    test.info().annotations.push({ type: 'no-write', description: label + ': exact 20-table rows equal; sha256=' + createHash('sha256').update(before).digest('hex') });
  }
}

export function argsOf(action: Action): unknown[] {
  try { const v = JSON.parse(action.body); if (Array.isArray(v)) return v; } catch { /* never print body */ }
  throw new Error('B_PLAIN_BROWSER_ARGUMENTS_REQUIRED');
}
export function resultOf(body: string): Record<string, unknown> | null {
  const bytes = Buffer.from(body, 'utf8');
  let offset = 0;
  while (offset < bytes.length) {
    if (bytes[offset] === 10) { offset++; continue; }
    const colon = bytes.indexOf(58, offset);
    if (colon < 0 || !/^[a-f0-9]+$/.test(bytes.subarray(offset, colon).toString())) return null;
    const start = colon + 1;
    // Pinned React emitTextChunk writes T<hex UTF-8 byte length>,payload
    // followed immediately by the next row. Never parse model-looking text
    // inside that payload as a business result.
    if (bytes[start] === 84) {
      const comma = bytes.indexOf(44, start);
      const length = comma < 0 ? '' : bytes.subarray(start + 1, comma).toString();
      if (!/^[a-f0-9]+$/.test(length)) return null;
      const size = Number.parseInt(length, 16);
      if (!Number.isSafeInteger(size) || size > bytes.length - comma - 1) return null;
      offset = comma + 1 + size; continue;
    }
    const newline = bytes.indexOf(10, start), end = newline < 0 ? bytes.length : newline;
    try { const v = JSON.parse(bytes.subarray(start, end).toString('utf8')); if (v && typeof v === 'object' && typeof v.ok === 'boolean') return v; } catch { /* other Flight rows */ }
    offset = end + 1;
  }
  return null;
}
export async function invoke(page: Page, action: Action, args?: unknown[]) {
  return page.evaluate(async input => {
    try {
      const response = await fetch(input.path, { method: 'POST', credentials: 'include',
        headers: { 'Next-Action': input.id, 'Content-Type': input.contentType, Accept: 'text/x-component' },
        body: input.body });
      return { status: response.status, body: await response.text() };
    } catch { throw new Error('B_DIRECT_BROWSER_REQUEST_FAILED'); }
  }, { ...action, body: args ? JSON.stringify(args) : action.body });
}
// Browsers cannot freely forge Origin/Host. This raw HTTP replay uses the actual
// captured browser action, with cookies kept only in memory and errors sanitized.
export async function forgedRequest(context: BrowserContext, action: Action, headers: Record<string, string>) {
  const cookie = (await context.cookies()).map(c => c.name + '=' + c.value).join('; ');
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port: 3000, path: action.path, method: 'POST',
      headers: { Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000', 'Next-Action': action.id,
        'Content-Type': action.contentType, Accept: 'text/x-component', Cookie: cookie, ...headers } }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; });
      response.once('end', () => resolve({ status: response.statusCode ?? 0, body }));
    });
    req.once('error', () => reject(new Error('B_FORGED_REQUEST_FAILED')));
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('B_FORGED_REQUEST_TIMEOUT')); });
    req.end(action.body);
  });
}
