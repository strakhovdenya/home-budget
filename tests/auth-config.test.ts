import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Profile, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { createAuthConfig } from '../src/infrastructure/auth/config';
import { ownerId, foreignId, syntheticAuthEnvironment as env } from './fixtures/auth';

const repository = { bind: vi.fn(), matches: vi.fn(), ownsAccount: vi.fn(), findAccountIdsForOwner: vi.fn() };
const profile: Profile = { sub: 'google-owner-123', email: env.ALLOWED_GOOGLE_EMAIL, email_verified: true };
const account: Account = { provider: 'google', type: 'oidc', providerAccountId: profile.sub!, access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' };
const callbacks = createAuthConfig(env, repository).callbacks!;
const signIn = callbacks.signIn!;
const jwt = callbacks.jwt!;
beforeEach(() => { vi.resetAllMocks(); repository.bind.mockResolvedValue(ownerId); repository.matches.mockResolvedValue(true); });

describe('HB-007 Auth.js callback wiring', () => {
  it('binds the verified subject before issuing minimal session claims', async () => {
    const user: User = { id: 'provider-id', email: 'ignored-client-value' };
    expect(await signIn({ user, account, profile })).toBe(true);
    expect(repository.bind).toHaveBeenCalledWith(profile.sub);
    expect(user.id).toBe(ownerId);
    const token = await jwt({ token: {}, user, account, profile, trigger: 'signIn' });
    expect(token).toEqual({ sub: ownerId, googleSubject: profile.sub, email: env.ALLOWED_GOOGLE_EMAIL });
    const sessionUser = { id: ownerId, email: '', emailVerified: null };
    const session = await callbacks.session!({ session: { expires: new Date('2030-01-01') as Date & string, user: sessionUser, sessionToken: 'synthetic-session', userId: ownerId }, token: token!, user: sessionUser, newSession: {}, trigger: 'update' });
    expect(session.user).toEqual({ id: ownerId, email: env.ALLOWED_GOOGLE_EMAIL });
    expect(JSON.stringify({ token, session })).not.toMatch(/synthetic-access|synthetic-refresh/);
  });
  it.each([
    { ...profile, email: 'other@example.test' }, { ...profile, email_verified: false },
    { ...profile, sub: '' }, { ...profile, sub: 'different-subject' },
  ])('rejects invalid provider identity without provisioning a user: %j', async (p) => {
    expect(await signIn({ user: {}, account, profile: p })).toBe(false);
    expect(repository.bind).not.toHaveBeenCalled();
  });
  it('rejects a different provider and a subject collision', async () => {
    expect(await signIn({ user: {}, account: { ...account, provider: 'github' }, profile })).toBe(false);
    repository.bind.mockResolvedValue(null);
    expect(await signIn({ user: {}, account, profile })).toBe(false);
  });
  it('rejects database failures without leaking their details', async () => {
    repository.bind.mockRejectedValue(new Error('private driver details'));
    expect(await signIn({ user: {}, account, profile })).toBe(false);
  });
  it('ignores client session update fields and rechecks stored identity', async () => {
    const token: JWT = { sub: ownerId, googleSubject: profile.sub, email: env.ALLOWED_GOOGLE_EMAIL };
    const result = await jwt({ token, user: {}, account: null, trigger: 'update', session: { user: { id: foreignId }, email: 'other@example.test', googleSubject: 'forged' } });
    expect(result).toEqual(token);
    expect(repository.matches).toHaveBeenCalledWith(ownerId, profile.sub);
    repository.matches.mockResolvedValue(false);
    expect(await jwt({ token, user: {}, account: null })).toBeNull();
  });
  it('rejects invalid or removed configuration and malformed claims', async () => {
    const invalid = createAuthConfig({}, repository);
    expect(invalid.providers).toEqual([]);
    expect(await invalid.callbacks!.signIn!({ user: {}, account, profile })).toBe(false);
    expect(await invalid.callbacks!.jwt!({ token: {}, user: {}, account: null })).toBeNull();
    expect(await jwt({ token: { sub: foreignId, email: 'other@example.test' }, user: {}, account: null })).toBeNull();
    expect(repository.matches).not.toHaveBeenCalled();
  });
});
