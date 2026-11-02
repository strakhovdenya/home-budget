'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/infrastructure/auth/auth';
import { authEnvironment } from '@/infrastructure/auth/policy';

export async function login() {
  if (!authEnvironment(process.env)) redirect('/login?error=Configuration');
  try { await signIn('google', { redirectTo: '/' }); }
  catch (error) {
    if (error instanceof AuthError) redirect('/login?error=AccessDenied');
    throw error; // Preserve Next.js redirect control flow.
  }
}

export async function logout() {
  await signOut({ redirectTo: '/login' });
}
