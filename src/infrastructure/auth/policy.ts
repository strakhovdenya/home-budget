// Inputs here must come from the provider response verified by Auth.js, never a request body.
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email) && email.length <= 254 ? email : null;
}

export function authEnvironment(env: Record<string, string | undefined>) {
  const email = normalizeEmail(env.ALLOWED_GOOGLE_EMAIL);
  const secret = env.AUTH_SECRET;
  const clientId = env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = env.AUTH_GOOGLE_SECRET?.trim();
  if (!email || !secret || secret.trim() !== secret || secret.length < 32 ||
    !clientId || !/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
    !clientSecret || !/^[\x21-\x7e]+$/.test(clientSecret)) return null;
  return { email, secret, clientId, clientSecret };
}

export function validSubject(value: unknown): value is string {
  return typeof value === 'string' && /^[\x21-\x7e]{1,255}$/.test(value);
}

export function googleIdentity(provider: unknown, profile: unknown, config: ReturnType<typeof authEnvironment>) {
  if (!config || provider !== 'google' || !profile || typeof profile !== 'object') return null;
  const p = profile as Record<string, unknown>;
  const email = normalizeEmail(p.email);
  return p.email_verified === true && email === config.email && validSubject(p.sub)
    ? { subject: p.sub, email } : null;
}

export function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
