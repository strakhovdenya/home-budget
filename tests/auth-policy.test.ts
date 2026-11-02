import { describe, expect, it } from 'vitest';
import { authEnvironment, googleIdentity } from '../src/infrastructure/auth/policy';

import { syntheticAuthEnvironment } from './fixtures/auth';
const profile = { sub: 'google-owner-123', email: ' OWNER@example.test ', email_verified: true };
describe('HB-007 trusted Google identity policy', () => {
  it('accepts only the verified normalized allowlisted Google identity', () => {
    expect(googleIdentity('google', profile, authEnvironment(syntheticAuthEnvironment))).toEqual({ subject: profile.sub, email: 'owner@example.test' });
  });
  it.each([
    ['github', profile], ['google', { ...profile, email: 'other@example.test' }],
    ['google', { ...profile, email: 'own.er@example.test' }],
    ['google', { ...profile, email: 'owner+tag@example.test' }],
    ['google', { ...profile, email_verified: false }], ['google', { ...profile, email_verified: 'true' }],
    ['google', { ...profile, sub: '' }], ['google', { ...profile, sub: ' bad ' }],
    ['google', { ...profile, sub: undefined }], ['google', undefined],
  ])('rejects invalid provider/profile %s %j', (provider, value) => {
    expect(googleIdentity(provider, value, authEnvironment(syntheticAuthEnvironment))).toBeNull();
  });
  it.each(Object.keys(syntheticAuthEnvironment))('fails closed without %s', (key) => {
    expect(authEnvironment({ ...syntheticAuthEnvironment, [key]: '' })).toBeNull();
  });
  it('rejects short secrets and multiple allowlist addresses', () => {
    expect(authEnvironment({ ...syntheticAuthEnvironment, AUTH_SECRET: 'short' })).toBeNull();
    expect(authEnvironment({ ...syntheticAuthEnvironment, ALLOWED_GOOGLE_EMAIL: 'a@example.test,b@example.test' })).toBeNull();
    expect(authEnvironment({ ...syntheticAuthEnvironment, AUTH_GOOGLE_ID: 'invalid' })).toBeNull();
    expect(authEnvironment({ ...syntheticAuthEnvironment, AUTH_GOOGLE_SECRET: 'invalid\nsecret' })).toBeNull();
  });
});
