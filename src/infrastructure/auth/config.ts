import 'server-only';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { authEnvironment, googleIdentity, normalizeEmail, validId, validSubject } from './policy';
import type { ownerRepository } from './repository';
import { authDiagnostic, authErrorCategory } from './diagnostics';

export function createAuthConfig(env: Record<string, string | undefined>, repository: typeof ownerRepository): NextAuthConfig {
  const config = authEnvironment(env);
  return {
    secret: config?.secret,
    providers: config ? [Google({ clientId: config.clientId, clientSecret: config.clientSecret, checks: ['pkce', 'state', 'nonce'], authorization: { params: { scope: 'openid email profile' } } })] : [],
    pages: { signIn: '/login', error: '/login' },
    session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
    // Auth.js errors may contain provider/driver details. Log only a fixed safe category.
    logger: { error(error) { authDiagnostic(authErrorCategory('type' in error?error.type:null),'callback'); }, warn() {}, debug() {} },
    callbacks: {
      async signIn({ account, profile, user }) {
        const identity = googleIdentity(account?.provider, profile, config);
        if (!identity || account?.providerAccountId !== identity.subject) {authDiagnostic(config?'AUTH_POLICY_DENIED':'AUTH_CONFIG_INVALID','callback');return false;}
        try {
          const id = await repository.bind(identity.subject);
          if (!id) {authDiagnostic('AUTH_IDENTITY_BINDING_CONFLICT','callback');return false;}
          user.id = id;
          return true;
        } catch {authDiagnostic('AUTH_STORAGE_UNAVAILABLE','callback');return false;}
      },
      async jwt({ token, account, profile, user }) {
        if (!config) {authDiagnostic('AUTH_CONFIG_INVALID','session');return null;}
        if (account) {
          const identity = googleIdentity(account.provider, profile, config);
          if (!identity || account.providerAccountId !== identity.subject || !validId(user.id)) return null;
          // Explicit projection: no Google access/refresh tokens or client update payloads.
          return { sub: user.id, googleSubject: identity.subject, email: identity.email };
        }
        // Ignore session update data entirely. These claims come only from our encrypted cookie.
        if (!validId(token.sub) || !validSubject(token.googleSubject) || token.email !== config.email) return null;
        try {if(await repository.matches(token.sub, token.googleSubject))return token;
          authDiagnostic('AUTH_SESSION_VALIDATION_FAILED','session');return null;}
        catch {authDiagnostic('AUTH_STORAGE_UNAVAILABLE','session');return null;}
      },
      async session({ session, token }) {
        // Expose only internal identity and allowlisted email, never provider credentials.
        return { expires: session.expires, user: { id: validId(token.sub) ? token.sub : '', email: normalizeEmail(token.email) ?? '' } };
      },
    },
  };
}
