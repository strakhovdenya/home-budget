import { beforeEach, expect, it, vi } from 'vitest';
import { ownerId, foreignId, syntheticAuthEnvironment } from './fixtures/auth';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), matches: vi.fn(), ownsAccount: vi.fn(), bind: vi.fn(), findAccountIdsForOwner: vi.fn() }));
vi.mock('next-auth', async (original) => ({ ...await original<typeof import('next-auth')>(), default: () => ({ auth: mocks.auth, signIn: mocks.signIn, signOut: mocks.signOut, handlers: {} }) }));
vi.mock('../src/infrastructure/auth/repository', () => ({ ownerRepository: mocks }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
import { currentOwner, requireOwner, requireOwnedAccount } from '../src/infrastructure/auth/auth';
import { login, logout } from '../src/app/auth-actions';
import HomePage from '../src/app/page';
import MonthsPage from '../src/app/months/page';
import ObligationsPage from '../src/app/obligations/page';
import SavingsPage from '../src/app/savings/page';
import SettingsPage from '../src/app/settings/page';

beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(syntheticAuthEnvironment)) vi.stubEnv(key, value);
  mocks.auth.mockResolvedValue(null);
  mocks.findAccountIdsForOwner.mockResolvedValue([]);
});
const protectedPages = [HomePage, MonthsPage, ObligationsPage, SavingsPage, SettingsPage].map(page => [page.name, page] as const);
it.each(protectedPages)('redirects anonymous visitors from the actual %s server page', async (_name, page) => {
  await expect(page()).rejects.toThrow('REDIRECT:/login');
});
it.each(protectedPages)('renders the actual %s page for a trusted server session', async (_name, page) => {
  mocks.auth.mockResolvedValue({ user: { id: ownerId, email: syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL } });
  expect(await page()).toBeTruthy();
});
it('rejects direct account authorization without a server session before database access', async () => {
  await expect(requireOwner()).rejects.toThrow('UNAUTHORIZED');
  await expect(requireOwnedAccount(ownerId)).rejects.toThrow('UNAUTHORIZED');
  expect(mocks.ownsAccount).not.toHaveBeenCalled();
});
it('gets owner ID solely from the session and denies foreign/malformed account IDs', async () => {
  mocks.auth.mockResolvedValue({ user: { id: ownerId, email: syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL } });
  mocks.ownsAccount.mockImplementation(async (owner, account) => owner === ownerId && account === ownerId);
  expect(await requireOwnedAccount(ownerId)).toEqual({ ownerUserId: ownerId, accountId: ownerId });
  await expect(requireOwnedAccount(foreignId)).rejects.toThrow('FORBIDDEN');
  await expect(requireOwnedAccount({ userId: foreignId })).rejects.toThrow('FORBIDDEN');
  expect(mocks.ownsAccount).toHaveBeenCalledWith(ownerId, foreignId);
});
it('fails closed on missing config, invalid session, and database failure', async () => {
  vi.stubEnv('AUTH_SECRET', '');
  expect(await currentOwner()).toBeNull();
  expect(mocks.auth).not.toHaveBeenCalled();
  vi.stubEnv('AUTH_SECRET', syntheticAuthEnvironment.AUTH_SECRET);
  mocks.auth.mockResolvedValue({ user: { id: 'forged', email: 'other@example.test' } });
  expect(await currentOwner()).toBeNull();
  mocks.auth.mockRejectedValue(new Error('private detail'));
  expect(await currentOwner()).toBeNull();
});
it('calls only Google sign-in with a fixed local return path and denies missing configuration', async () => {
  await login();
  expect(mocks.signIn).toHaveBeenCalledWith('google', { redirectTo: '/' });
  vi.stubEnv('ALLOWED_GOOGLE_EMAIL', '');
  await expect(login()).rejects.toThrow('REDIRECT:/login?error=Configuration');
});
it('delegates logout to Auth.js and rejects subsequent access without the session', async () => {
  await logout();
  expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: '/login' });
  await expect(requireOwner()).rejects.toThrow('UNAUTHORIZED');
});
it('HB16-A01 rejects a direct explicit period before discovering an account', async () => {
  await expect(MonthsPage({ searchParams: Promise.resolve({ period: '2026-12' }) })).rejects.toThrow('REDIRECT:/login');
  expect(mocks.findAccountIdsForOwner).not.toHaveBeenCalled();
});
it('HB16-A02 renders the actual dashboard empty state for an authenticated owner without accounts', async () => {
  mocks.auth.mockResolvedValue({ user: { id: ownerId, email: syntheticAuthEnvironment.ALLOWED_GOOGLE_EMAIL } });
  const page = await HomePage();
  expect(page.props.view).toEqual({ kind: 'NO_ACCOUNT' });
  expect(mocks.findAccountIdsForOwner).toHaveBeenCalledExactlyOnceWith(ownerId);
});
