'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/infrastructure/auth/auth';
import { authEnvironment } from '@/infrastructure/auth/policy';
import { authDiagnostic, authErrorCategory } from '@/infrastructure/auth/diagnostics';

export async function login() {
  if (!authEnvironment(process.env)) {authDiagnostic('AUTH_CONFIG_INVALID','signin');redirect('/login?error=Configuration');}
  try { await signIn('google', { redirectTo: '/' }); }
  catch (error) {
    if (error instanceof AuthError) {authDiagnostic(authErrorCategory(error.type),'signin');redirect('/login?error=SigninFailed');}
    throw error; // Preserve Next.js redirect control flow.
  }
}

export async function logout() {
  await signOut({ redirectTo: '/login' });
}
