import { encode } from 'next-auth/jwt';
import type { BrowserContext } from '@playwright/test';
import pg from 'pg';

export const sessionCookieName = 'authjs.session-token';
export const syntheticOwner = {
  accountId: '10000000-0000-4000-8000-000000000002',
  subject: 'hb021-synthetic-owner',
  email: 'owner@example.test',
} as const;

// Offline JWE only: no signIn call, test route, provider exchange or auth mock.
// Values stay in process/browser memory; never return them to a reporter.
export async function installSession(context: BrowserContext, options: {
  claims?: Record<string, unknown>; maxAge?: number; corrupt?: boolean;
} = {}) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || process.env.ALLOWED_GOOGLE_EMAIL !== syntheticOwner.email) throw new Error('B_SYNTHETIC_AUTH_REQUIRED');
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  let ownerId: string;
  try {
    const rows = await client.query('SELECT owner_user_id AS id FROM accounts WHERE id=$1', [syntheticOwner.accountId]);
    if (rows.rows.length !== 1) throw new Error('B_OWNER_FIXTURE_REQUIRED');
    ownerId = rows.rows[0].id;
  } finally { await client.end(); }
  let value = await encode({ secret, salt: sessionCookieName, maxAge: options.maxAge ?? 180,
    token: { sub: ownerId, googleSubject: syntheticOwner.subject, email: syntheticOwner.email, ...options.claims } });
  if (options.corrupt) value = 'invalid.' + value;
  await context.clearCookies();
  await context.addCookies([{ name: sessionCookieName, value, domain: '127.0.0.1', path: '/',
    httpOnly: true, sameSite: 'Lax', secure: false },
  { name: 'home-budget-locale', value: 'en', domain: '127.0.0.1', path: '/', sameSite: 'Lax' }]);
}
