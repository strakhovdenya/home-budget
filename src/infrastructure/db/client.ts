import 'server-only';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Lazy construction keeps build/site access independent of database availability.
// Node.js runtime only. Use Neon pooled TLS URL; migrations use a separate direct URL.
export function createDatabase(connectionString: string) {
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error('INVALID_DATABASE_URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('INVALID_DATABASE_PROTOCOL');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    !['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')) throw new Error('REMOTE_DATABASE_TLS_REQUIRED');
  const pool = new pg.Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  pool.on('error', () => { /* Never log driver errors: they can contain financial values/credentials. */ });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

export function databaseFromEnvironment() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL_REQUIRED');
  return environmentDatabase ??= createDatabase(connectionString);
}

let environmentDatabase: ReturnType<typeof createDatabase> | undefined;
