import { test, expect } from '@playwright/test';
import pg from 'pg';

test('HB21-A-R01 runtime password cannot authenticate as hb_migrator on real PostgreSQL', async () => {
  const runtimeUrl = new URL(process.env.TEST_DATABASE_URL!);
  expect(runtimeUrl.username).toBe('hb_runtime');
  const runtime = new pg.Client({ connectionString: runtimeUrl.toString(), connectionTimeoutMillis: 5000 });
  await runtime.connect();
  try {
    expect((await runtime.query('SELECT current_user AS role')).rows[0].role).toBe('hb_runtime');
  } finally { await runtime.end(); }

  // Change only the requested role; this process never receives the migrator password.
  const forbiddenUrl = new URL(runtimeUrl);
  forbiddenUrl.username = 'hb_migrator';
  const forbidden = new pg.Client({ connectionString: forbiddenUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    await expect(forbidden.connect()).rejects.toMatchObject({ code: '28P01' });
    test.info().annotations.push({ type: 'postgres-role-isolation', description: 'hb_runtime TCP login succeeds; hb_migrator with runtime password refuses with SQLSTATE 28P01' });
  } finally { await forbidden.end(); }
});

test('HB21-A real anonymous Next browser smoke leaves the isolated database empty', async ({ page, context }) => {
  const unexpected: string[] = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:3000') {
      unexpected.push('EXTERNAL_REQUEST_REFUSED');
      return route.abort();
    }
    return route.continue();
  });
  const errors: string[] = [];
  page.on('pageerror', () => errors.push('PAGE_ERROR'));
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    const census = async () => {
      const tables = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
      const counts: Record<string, string> = {};
      for (const { tablename } of tables.rows) {
        if (!/^[a-z_]+$/.test(tablename)) throw new Error('UNEXPECTED_TABLE');
        counts[tablename] = (await client.query('SELECT count(*)::text AS n FROM public."' + tablename + '"')).rows[0].n;
      }
      return counts;
    };
    const before = await census();
    expect(Object.keys(before)).toHaveLength(20);
    expect(new Set(Object.values(before))).toEqual(new Set(['0']));
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Google/i })).toBeDisabled();
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login$/);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
    expect(await census()).toEqual(before);
    // Role is separate from the migrator; even an accidental write cannot seed finance.
    await expect(client.query("INSERT INTO users (id) VALUES ('00000000-0000-4000-8000-000000000001')")).rejects.toThrow();
    await expect(client.query('CREATE TABLE public.forbidden (id integer)')).rejects.toThrow();
  } finally { await client.end(); }
});
