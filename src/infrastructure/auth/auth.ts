import 'server-only';
import NextAuth from 'next-auth';
import { cache } from 'react';
import { createAuthConfig } from './config';
import { ownerRepository } from './repository';
import { authEnvironment, validId } from './policy';

export const { auth, handlers, signIn, signOut } = NextAuth(() => createAuthConfig(process.env, ownerRepository));

export const currentOwner = cache(async function currentOwner() {
  const config = authEnvironment(process.env);
  if (!config) return null;
  try {
    const session = await auth();
    return validId(session?.user?.id) && session?.user?.email === config.email ? { id: session.user.id, email: session.user.email } : null;
  } catch { return null; }
});

export async function requireOwner() {
  const owner = await currentOwner();
  if (!owner) throw new Error('UNAUTHORIZED');
  return owner;
}

export async function requireOwnedAccount(accountId: unknown) {
  const owner = await requireOwner();
  if (typeof accountId !== 'string') throw new Error('FORBIDDEN');
  try {
    if (await ownerRepository.ownsAccount(owner.id, accountId)) return { ownerUserId: owner.id, accountId };
  } catch { /* Fail closed without leaking driver details. */ }
  throw new Error('FORBIDDEN');
}
