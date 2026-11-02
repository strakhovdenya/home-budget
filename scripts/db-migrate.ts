import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '../src/infrastructure/db/local-target';

if (process.env.HB_DATABASE_TARGET !== 'isolated-development') {
  throw new Error('Set HB_DATABASE_TARGET=isolated-development only for a reviewed isolated database');
}
const targets = requireLocalDatabaseTargets(process.env);
console.log('All database targets verified: explicit 127.0.0.1 destinations');
const database = createDatabase(targets.DATABASE_URL_UNPOOLED);
try {
  await migrate(database.db, { migrationsFolder: './drizzle' });
  console.log('Versioned migrations applied');
} catch {
  process.exitCode = 1;
  console.error('Migration failed; inspect database privately. Connection and driver details suppressed.');
} finally {
  await database.close();
}
