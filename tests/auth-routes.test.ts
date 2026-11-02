import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { ownerId, foreignId, syntheticAuthEnvironment } from './fixtures/auth';

const mocks = vi.hoisted(() => ({ bind: vi.fn(), matches: vi.fn(), ownsAccount: vi.fn(), headers: new Headers() }));
vi.mock('../src/infrastructure/auth/repository', () => ({ ownerRepository: mocks }));
vi.mock('next/headers', () => ({ headers: async () => mocks.headers }));
import { GET, POST } from '../src/app/api/auth/[...nextauth]/route';
import { requireOwner, requireOwnedAccount } from '../src/infrastructure/auth/auth';

const origin = 'http://localhost:3000';
const cookieName = 'authjs.session-token';
beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(syntheticAuthEnvironment)) vi.stubEnv(key, value);
  vi.stubEnv('AUTH_TRUST_HOST', 'true');
  mocks.headers = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' });
  mocks.matches.mockImplementation(async (id, subject) => id === ownerId && subject === 'synthetic-subject');
  mocks.ownsAccount.mockResolvedValue(false);
});
function request(path: string, cookie = '', body?: URLSearchParams) {
  return new NextRequest(`${origin}/api/auth/${path}`, { method: body ? 'POST' : 'GET', headers: { cookie, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) }, body });
}
async function sessionCookie(id = ownerId) {
  const token = await encode({ secret: syntheticAuthEnvironment.AUTH_SECRET, salt: cookieName, maxAge: 3600,
    token: { sub: id, googleSubject: 'synthetic-subject', email: syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL } });
  return `${cookieName}=${token}`;
}
it('returns no session for anonymous or forged cookies at the actual Auth.js route', async () => {
  expect(await (await GET(request('session'))).json()).toBeNull();
  expect(await (await GET(request('session', `${cookieName}=forged`))).json()).toBeNull();
  await expect(requireOwner()).rejects.toThrow('UNAUTHORIZED');
});
it('validates a real encrypted test cookie and rejects a substituted internal user ID', async () => {
  const cookie = await sessionCookie();
  const session = await (await GET(request('session', cookie))).json();
  expect(session.user).toEqual({ id: ownerId, email: syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL });
  mocks.headers.set('cookie', cookie);
  expect((await requireOwner()).id).toBe(ownerId);
  await expect(requireOwnedAccount(foreignId)).rejects.toThrow('FORBIDDEN');
  expect(await (await GET(request('session', await sessionCookie(foreignId)))).json()).toBeNull();
});
it('requires CSRF on logout, clears the session cookie on valid logout and denies the next request', async () => {
  const cookie = await sessionCookie();
  const rejected = await POST(request('signout', cookie, new URLSearchParams({ callbackUrl: '/login' })));
  expect(rejected.headers.get('location')).toContain('MissingCSRF');
  expect(rejected.headers.getSetCookie().some((c) => c.startsWith(`${cookieName}=`))).toBe(false);
  const csrf = await GET(request('csrf', cookie));
  const { csrfToken } = await csrf.json();
  const csrfCookies = csrf.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const result = await POST(request('signout', `${cookie}; ${csrfCookies}`, new URLSearchParams({ csrfToken, callbackUrl: '/login' })));
  expect(result.headers.get('location')).toBe(`${origin}/login`);
  expect(result.headers.getSetCookie().some((c) => c.startsWith(`${cookieName}=;`) && c.includes('Max-Age=0'))).toBe(true);
  mocks.headers.delete('cookie'); // Browser applies the expired Set-Cookie returned by Auth.js.
  expect(await (await GET(request('session'))).json()).toBeNull();
  await expect(requireOwnedAccount(ownerId)).rejects.toThrow('UNAUTHORIZED');
});
it('denies a previously issued cookie when configuration is removed', async () => {
  const cookie = await sessionCookie();
  vi.stubEnv('ALLOWED_GOOGLE_EMAIL', '');
  expect(await (await GET(request('session', cookie))).json()).toBeNull();
});
